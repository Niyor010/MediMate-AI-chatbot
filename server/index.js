import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import Database from "better-sqlite3";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import { GoogleGenerativeAI } from "@google/generative-ai";
import cors from "cors";

dotenv.config();

const app = express();
const httpServer = createServer(app);

// ── CORS & Socket.io setup ─────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ── Gemini setup ───────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("⚠️  GEMINI_API_KEY not set in .env — AI responses will fail.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

// MediMate system prompt — keeps Gemini focused on medical topics
const SYSTEM_PROMPT = `You are MediMate, a friendly and knowledgeable AI medical assistant. 
Your role is to:
- Help users understand their symptoms and health concerns
- Provide clear, accurate medical information
- Suggest when to seek professional medical help
- Offer wellness and preventive health tips
- Answer questions about medications, conditions, and treatments

Important rules:
- Always remind users that you are an AI and not a substitute for professional medical advice
- For emergencies, always tell users to call 112 (India) or visit the nearest emergency room
- Be empathetic, clear, and concise
- Use simple language that patients can understand
- Do not diagnose definitively — always say "this could be" or "you may want to check with a doctor"`;

// ── Socket.io — Gemini streaming ───────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  // Keep conversation history per socket
  const conversationHistory = [];

  socket.on("message", async ({ message }) => {
    if (!message?.trim()) return;

    console.log(`📨 [${socket.id}] User: ${message}`);

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: SYSTEM_PROMPT,
      });

      // Add user message to history
      conversationHistory.push({
        role: "user",
        parts: [{ text: message }],
      });

      // Start streaming chat
      const chat = model.startChat({
        history: conversationHistory.slice(0, -1), // all except last
      });

      const result = await chat.sendMessageStream(message);

      let fullResponse = "";

      // Stream each chunk to the frontend
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          fullResponse += chunkText;
          socket.emit("aiChunk", chunkText);
        }
      }

      // Add assistant response to history for context
      conversationHistory.push({
        role: "model",
        parts: [{ text: fullResponse }],
      });

      // Signal completion
      socket.emit("aiComplete", fullResponse);
      console.log(`✅ [${socket.id}] Response complete (${fullResponse.length} chars)`);

    } catch (err) {
      console.error("❌ Gemini error:", err);
      socket.emit("aiError", {
        error: err?.message || "AI service error. Please try again.",
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);
  });
});

// ── REST: translate endpoint ───────────────────────────────────────────────
app.post("/api/translate", async (req, res) => {
  const { text, targetLang } = req.body;
  if (!text || !targetLang)
    return res.status(400).json({ error: "text and targetLang required" });

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
    const prompt = `Translate the following text to ${targetLang}. Return only the translated text, nothing else:\n\n${text}`;
    const result = await model.generateContent(prompt);
    const translatedText = result.response.text();
    res.json({ translatedText });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Existing routes (kept intact) ─────────────────────────────────────────

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;
const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const HEALTH_VACCINATION_SOURCE = process.env.HEALTH_VACCINATION_SOURCE;
const HEALTH_ALERTS_SOURCE = process.env.HEALTH_ALERTS_SOURCE;

// Cache
const cache = new Map();
function setCache(key, value, ttl = 300) {
  cache.set(key, { value, expires: Date.now() + ttl * 1000 });
}
function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { cache.delete(key); return null; }
  return entry.value;
}

// SQLite subscribers
const dbPath = process.env.NOTIFY_DB_PATH || path.join(process.cwd(), "notify.sqlite");
const db = new Database(dbPath);
db.exec(`CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL UNIQUE,
  keywords TEXT,
  createdAt INTEGER
)`);

function addSubscriber(phone, keywords) {
  db.prepare("INSERT OR REPLACE INTO subscribers (phone, keywords, createdAt) VALUES (?, ?, ?)")
    .run(phone, JSON.stringify(keywords || []), Date.now());
}
function listSubscribers() {
  return db.prepare("SELECT id, phone, keywords, createdAt FROM subscribers ORDER BY createdAt DESC").all();
}
function removeSubscriberById(id) {
  return db.prepare("DELETE FROM subscribers WHERE id = ?").run(id);
}

async function sendWhatsAppViaTwilio(to, message) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    console.log("Twilio not configured; skipping send");
    return { skipped: true };
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const params = new URLSearchParams();
  params.append("From", TWILIO_WHATSAPP_FROM);
  params.append("To", `whatsapp:${to}`);
  params.append("Body", message);
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(TWILIO_ACCOUNT_SID + ":" + TWILIO_AUTH_TOKEN).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

app.post("/api/whatsapp/send", async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: "to and message are required" });
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM)
    return res.status(501).json({ error: "Twilio not configured on server" });
  try {
    const data = await sendWhatsAppViaTwilio(to, message);
    res.json({ success: true, sid: data.sid });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get("/api/health/india/latest", async (req, res) => {
  res.json({ message: "Proxy not implemented." });
});

app.get("/api/health/news/latest", async (req, res) => {
  res.json([]);
});

app.get("/api/health/vaccination", async (req, res) => {
  const cacheKey = "vaccination_latest";
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);
  try {
    const days = 90;
    const today = new Date();
    const timeseries = [];
    let cumulative = 900000000;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const daily = Math.floor(500000 + Math.random() * 400000);
      cumulative += daily;
      timeseries.push({ date: d.toISOString().slice(0, 10), daily, cumulative });
    }
    const sample = {
      totals: { doses_administered: cumulative, daily_doses: timeseries[timeseries.length - 1].daily, coverage_percent: 75.3 },
      states: [
        { state: "Maharashtra", doses: 120000000 },
        { state: "Uttar Pradesh", doses: 110000000 },
        { state: "West Bengal", doses: 70000000 },
        { state: "Karnataka", doses: 50000000 },
        { state: "Tamil Nadu", doses: 48000000 },
      ],
      timeseries,
      updated_at: new Date().toISOString(),
    };
    setCache(cacheKey, sample, 600);
    res.json(sample);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get("/api/health/alerts", async (req, res) => {
  const cached = getCache("alerts_latest");
  if (cached) return res.json(cached);
  const sampleAlerts = [
    { id: "alert-1", title: "Dengue advisory: increased cases in Mumbai", date: "2025-11-01", severity: "high", source: "MoHFW" },
    { id: "alert-2", title: "Seasonal influenza spike in Delhi NCR", date: "2025-11-02", severity: "medium", source: "State Health Dept" },
    { id: "alert-3", title: "Water-borne illness advisory in coastal areas", date: "2025-11-03", severity: "low", source: "Local Municipality" },
  ];
  setCache("alerts_latest", sampleAlerts, 300);
  res.json(sampleAlerts);
});

app.get("/api/health/news", async (req, res) => {
  const cached = getCache("news_latest");
  if (cached) return res.json(cached);
  try {
    if (NEWSAPI_KEY) {
      const r = await fetch(`https://newsapi.org/v2/top-headlines?category=health&country=in&apiKey=${NEWSAPI_KEY}`);
      const data = await r.json();
      setCache("news_latest", data.articles || [], 300);
      return res.json(data.articles || []);
    }
    const mockNews = [
      { source: "Health News India", title: "New vaccination drive reaches rural districts", publishedAt: new Date().toISOString() },
      { source: "Medical Times", title: "Study shows improved outcomes with early diagnosis", publishedAt: new Date().toISOString() },
    ];
    setCache("news_latest", mockNews, 300);
    res.json(mockNews);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post("/api/notify/subscribe", (req, res) => {
  const { phone, keywords } = req.body;
  if (!phone) return res.status(400).json({ error: "phone required" });
  try { addSubscriber(phone, keywords || []); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: String(err) }); }
});

app.get("/api/notify/subscribers", (req, res) => {
  try { res.json(listSubscribers()); }
  catch (err) { res.status(500).json({ error: String(err) }); }
});

app.delete("/api/notify/subscribers/:id", (req, res) => {
  try { removeSubscriberById(Number(req.params.id)); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: String(err) }); }
});

// ── Start server ───────────────────────────────────────────────────────────
const port = process.env.PORT || 5000;
httpServer.listen(port, () => {
  console.log(`🚀 MediMate server running on port ${port}`);
  console.log(`🤖 Gemini AI: ${GEMINI_API_KEY ? "✅ Connected" : "❌ No API key"}`);
});