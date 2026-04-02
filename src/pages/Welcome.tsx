import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  Brain,
  MessageSquare,
  Shield,
  Activity,
  ChevronRight,
  Stethoscope,
  Heart,
  Pill,
  Microscope,
  Zap,
  Globe,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Animated floating particle ────────────────────────────────────────────────
const Particle = ({
  style,
}: {
  style: React.CSSProperties;
}) => (
  <div
    className="absolute rounded-full pointer-events-none"
    style={{
      background:
        "radial-gradient(circle, hsl(263 70% 65% / 0.6), transparent 70%)",
      animation: "float linear infinite",
      ...style,
    }}
  />
);

// ── Feature card ──────────────────────────────────────────────────────────────
const FeatureCard = ({
  icon: Icon,
  title,
  desc,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  delay: string;
}) => (
  <div
    className="group relative bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-6 hover:border-primary/40 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl"
    style={{ animationDelay: delay }}
  >
    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="relative z-10">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors duration-300">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="font-semibold text-foreground mb-2 text-lg">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
    </div>
  </div>
);

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({
  value,
  label,
  icon: Icon,
}: {
  value: string;
  label: string;
  icon: React.ElementType;
}) => (
  <div className="flex flex-col items-center gap-2 px-8 py-4">
    <div className="flex items-center gap-2">
      <Icon className="w-5 h-5 text-primary" />
      <span className="text-3xl font-bold text-foreground tracking-tight">
        {value}
      </span>
    </div>
    <span className="text-sm text-muted-foreground">{label}</span>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const Welcome = () => {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  // Subtle parallax glow that follows the mouse
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Diagnosis",
      desc: "Describe your symptoms and get evidence-based insights powered by advanced medical AI.",
    },
    {
      icon: MessageSquare,
      title: "24/7 Chat Support",
      desc: "Ask any health question any time. Get clear, reliable answers whenever you need them.",
    },
    {
      icon: Shield,
      title: "Privacy First",
      desc: "Your health data stays yours. End-to-end encryption and zero third-party sharing.",
    },
    {
      icon: Stethoscope,
      title: "Find a Doctor",
      desc: "Connect with verified specialists near you based on your symptoms and location.",
    },
    {
      icon: Activity,
      title: "Health Dashboard",
      desc: "Track vitals, trends, and health insights in one beautiful, intuitive dashboard.",
    },
    {
      icon: Globe,
      title: "Multilingual",
      desc: "Communicate in your language. MediMate supports dozens of languages worldwide.",
    },
  ];

  return (
    <>
      {/* ── Global keyframes ── */}
      <style>{`
        @keyframes float {
          0%   { transform: translateY(0px) scale(1);   opacity: 0.4; }
          50%  { transform: translateY(-30px) scale(1.1); opacity: 0.7; }
          100% { transform: translateY(0px) scale(1);   opacity: 0.4; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes pulseRing {
          0%   { transform: scale(1);   opacity: 0.6; }
          50%  { transform: scale(1.15); opacity: 0.2; }
          100% { transform: scale(1);   opacity: 0.6; }
        }
        .fade-up {
          animation: fadeSlideUp 0.7s ease forwards;
          opacity: 0;
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }
        .delay-600 { animation-delay: 0.6s; }
      `}</style>

      <div className="min-h-screen bg-background overflow-x-hidden">
        {/* ── Navbar ── */}
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-xl border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">
              Medi<span className="text-primary">Mate</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#stats"    className="hover:text-foreground transition-colors">About</a>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth")}
              className="text-muted-foreground hover:text-foreground"
            >
              Log in
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/auth")}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
            >
              Get Started
            </Button>
          </div>
        </nav>

        {/* ── Hero Section ── */}
        <section
          ref={heroRef}
          className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 pt-20"
        >
          {/* Mouse-tracking glow */}
          <div
            className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
            style={{
              background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, hsl(263 70% 50% / 0.07), transparent 60%)`,
            }}
          />

          {/* Background floating blobs */}
          <div className="absolute inset-0 overflow-hidden">
            <Particle style={{ width: 400, height: 400, top: "-10%", left: "-5%",  animationDuration: "14s", opacity: 0.25 }} />
            <Particle style={{ width: 300, height: 300, bottom: "5%",  right: "-8%", animationDuration: "18s", opacity: 0.2 }} />
            <Particle style={{ width: 200, height: 200, top: "40%",   left: "60%",  animationDuration: "22s", opacity: 0.15 }} />
          </div>

          {/* Pill badge */}
          <div className="fade-up delay-100 relative z-10 inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold px-4 py-1.5 rounded-full mb-8">
            <Zap className="w-3.5 h-3.5" />
            AI-Powered Medical Assistant
          </div>

          {/* Headline */}
          <h1 className="fade-up delay-200 relative z-10 text-5xl md:text-7xl font-extrabold text-foreground leading-[1.1] tracking-tight mb-6 max-w-4xl">
            Your Health,{" "}
            <span className="relative inline-block">
              <span className="text-primary">Understood</span>
              <span className="absolute -inset-1 bg-primary/10 blur-2xl rounded-full" />
            </span>{" "}
            Instantly
          </h1>

          {/* Sub-headline */}
          <p className="fade-up delay-300 relative z-10 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-10">
            MediMate is your personal AI health companion — ask questions,
            understand symptoms, track your wellness, and connect with real doctors,
            all in one place.
          </p>

          {/* CTAs */}
          <div className="fade-up delay-400 relative z-10 flex flex-wrap items-center justify-center gap-4 mb-16">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="h-13 px-8 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/25 transition-all duration-300 hover:scale-[1.03]"
            >
              Start for Free
              <ChevronRight className="ml-1 w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/chat")}
              className="h-13 px-8 text-base font-semibold border-border hover:border-primary/40 transition-all duration-300"
            >
              <MessageSquare className="mr-2 w-4 h-4" />
              Try the Chat
            </Button>
          </div>

          {/* Hero mockup card */}
          <div className="fade-up delay-500 relative z-10 w-full max-w-2xl">
            <div className="bg-card/70 backdrop-blur-md border border-border/70 rounded-3xl shadow-2xl p-6 text-left">
              {/* Top bar */}
              <div className="flex items-center gap-2 mb-5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-auto text-xs text-muted-foreground font-medium">MediMate Chat</span>
              </div>
              {/* Mock messages */}
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-muted-foreground">You</span>
                  </div>
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-xs">
                    I have a headache and mild fever since this morning. Should I be worried?
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <div className="bg-muted rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-sm text-foreground">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Heart className="w-3.5 h-3.5 text-primary fill-primary" />
                      <span className="text-xs font-semibold text-primary">MediMate</span>
                    </div>
                    A headache with mild fever is often caused by a viral infection like the common cold. Rest, stay hydrated, and monitor your temperature. If fever exceeds 103°F or symptoms worsen in 48h, see a doctor.
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-muted-foreground">You</span>
                  </div>
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-xs">
                    What medication can I take?
                  </div>
                </div>
              </div>
              {/* Input bar */}
              <div className="mt-5 flex items-center gap-3 bg-background/60 border border-border rounded-xl px-4 py-2.5">
                <Pill className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground flex-1">Ask a health question…</span>
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section id="stats" className="py-16 px-4 border-y border-border/50 bg-card/30">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center divide-x divide-border/50">
            <StatCard value="50K+" label="Active Users"       icon={Heart} />
            <StatCard value="98%"  label="Accuracy Rate"     icon={Star} />
            <StatCard value="30+"  label="Languages"          icon={Globe} />
            <StatCard value="24/7" label="Always Available"  icon={Activity} />
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="py-24 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
                <Microscope className="w-3.5 h-3.5" />
                Everything you need
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-4">
                Built for your wellbeing
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                From symptom checking to doctor discovery, MediMate covers every step
                of your health journey.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f, i) => (
                <FeatureCard
                  key={f.title}
                  icon={f.icon}
                  title={f.title}
                  desc={f.desc}
                  delay={`${i * 80}ms`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary/15 via-primary/8 to-transparent border border-primary/20 rounded-3xl p-12 relative overflow-hidden">
            <div
              className="absolute inset-0 rounded-3xl"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 0%, hsl(263 70% 50% / 0.15), transparent 70%)",
              }}
            />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-6 ring-8 ring-primary/10">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
                Ready to take charge of your health?
              </h2>
              <p className="text-muted-foreground mb-8 text-lg">
                Join thousands of users who trust MediMate for daily health guidance.
              </p>
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="px-10 h-13 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/25 hover:scale-[1.03] transition-all duration-300"
              >
                Create Free Account
                <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-border/50 py-8 px-4">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Heart className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="font-bold text-foreground text-sm">
                Medi<span className="text-primary">Mate</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} MediMate. Not a substitute for professional medical advice.
            </p>
            <div className="flex gap-5 text-xs text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Welcome;