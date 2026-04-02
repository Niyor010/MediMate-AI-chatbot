import { createContext, useContext, useState, ReactNode } from "react";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  timestamp: string;
  messages: Message[];
}

interface ChatContextType {
  conversations: Conversation[];
  activeConversationId: string;
  isCollapsed: boolean;
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversationId: (id: string) => void;
  setIsCollapsed: (collapsed: boolean) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  addMessage: (conversationId: string, message: Message) => void;
  appendMessageChunk: (
    conversationId: string,
    messageId: string,
    chunk: string
  ) => void;
  setMessageContent: (
    conversationId: string,
    messageId: string,
    content: string
  ) => void;
  translateConversation: (
    conversationId: string,
    targetLang: string
  ) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: "1",
      title: "New Chat",
      timestamp: "Just now",
      messages: [],
    },
  ]);

  const [activeConversationId, setActiveConversationId] = useState<string>("1");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const addConversation = (conversation: Conversation) => {
    setConversations((prev) => [conversation, ...prev]);
  };

  const updateConversation = (id: string, updates: Partial<Conversation>) => {
    setConversations((prev) =>
      prev.map((conv) => (conv.id === id ? { ...conv, ...updates } : conv))
    );
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((conv) => conv.id !== id));
    if (activeConversationId === id) {
      const remaining = conversations.filter((conv) => conv.id !== id);
      setActiveConversationId(remaining[0]?.id || "");
    }
  };

  const addMessage = (conversationId: string, message: Message) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: [...conv.messages, message],
              title:
                conv.messages.length === 0
                  ? message.content.slice(0, 30) + "..."
                  : conv.title,
            }
          : conv
      )
    );
  };

  const appendMessageChunk = (
    conversationId: string,
    messageId: string,
    chunk: string
  ) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: conv.messages.map((m) =>
                m.id === messageId ? { ...m, content: m.content + chunk } : m
              ),
            }
          : conv
      )
    );
  };

  const setMessageContent = (
    conversationId: string,
    messageId: string,
    content: string
  ) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: conv.messages.map((m) =>
                m.id === messageId ? { ...m, content } : m
              ),
            }
          : conv
      )
    );
  };

  // Translate the messages of a conversation into the target language.
  // This tries to POST to /api/translate with { text, targetLang } and expects { translatedText }.
  // If the API is not available or returns an error, we fall back to annotating the message content.
  const translateConversation = async (
    conversationId: string,
    targetLang: string
  ) => {
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) return;

    // Translate messages sequentially and update them progressively so the UI reflects progress.
    for (const msg of conv.messages) {
      try {
        const res = await fetch(`/api/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: msg.content, targetLang }),
        });

        if (res.ok) {
          const data = await res.json();
          const translated =
            data?.translatedText ?? `${msg.content} [${targetLang}]`;
          setMessageContent(conversationId, msg.id, translated);
          // small delay so UI updates feel progressive (but keep it short)
          await new Promise((r) => setTimeout(r, 60));
        } else {
          // fallback
          setMessageContent(
            conversationId,
            msg.id,
            `${msg.content} [${targetLang}]`
          );
        }
      } catch (err) {
        // network or other error — fallback to annotated content
        setMessageContent(
          conversationId,
          msg.id,
          `${msg.content} [${targetLang}]`
        );
      }
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversationId,
        isCollapsed,
        setConversations,
        setActiveConversationId,
        setIsCollapsed,
        addConversation,
        updateConversation,
        deleteConversation,
        addMessage,
        appendMessageChunk,
        setMessageContent,
        translateConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}