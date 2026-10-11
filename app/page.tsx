"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

type Track = "python" | "dsa" | "system_design" | "interview";
type Message = { role: "user" | "assistant"; content: string };
type Chat = {
  id: string;
  track: Track;
  title: string;
  messages: Message[];
  updatedAt: number;
};

const TRACKS: { id: Track; title: string; subtitle: string; icon: string }[] = [
  { id: "python", title: "Python Tutor", subtitle: "Learn programming from scratch", icon: "⌘" },
  { id: "dsa", title: "DSA Coach", subtitle: "Patterns, brute force to optimal", icon: "◇" },
  { id: "system_design", title: "System Design", subtitle: "Architecture and trade-offs", icon: "▦" },
  { id: "interview", title: "Interview Coach", subtitle: "Explain your thinking clearly", icon: "✳" },
];

const STARTERS: Record<Track, string[]> = {
  python: [
    "Teach me Python variables from absolute scratch.",
    "Explain loops with a simple example and dry run.",
    "Teach me functions and explain every line of code.",
  ],
  dsa: [
    "Teach me Two Sum from first principles: brute force to optimal.",
    "Explain time and space complexity with examples.",
    "Teach me how to recognize sliding-window problems.",
  ],
  system_design: [
    "Teach me system design from absolute scratch.",
    "Design a simple RAG question-answering system step by step.",
    "Explain APIs, databases, caching, and queues in simple terms.",
  ],
  interview: [
    "Help me explain a Python solution clearly in an interview.",
    "Give me a framework for answering DSA interview questions.",
    "Teach me how to explain system-design trade-offs.",
  ],
};

const STORAGE_KEY = "ai-interview-academy-v1";

function makeChat(track: Track): Chat {
  const now = Date.now();
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    track,
    title: "New conversation",
    messages: [],
    updatedAt: now,
  };
}

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Chat[];
        if (Array.isArray(parsed) && parsed.length) {
          setChats(parsed);
          setActiveId(parsed[0].id);
        } else {
          const initial = makeChat("python");
          setChats([initial]);
          setActiveId(initial.id);
        }
      } else {
        const initial = makeChat("python");
        setChats([initial]);
        setActiveId(initial.id);
      }
    } catch {
      const initial = makeChat("python");
      setChats([initial]);
      setActiveId(initial.id);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }, [chats, hydrated]);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeId) ?? null,
    [chats, activeId]
  );
  const activeTrack = activeChat?.track ?? "python";
  const trackInfo = TRACKS.find((track) => track.id === activeTrack) ?? TRACKS[0];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeChat?.messages, loading]);

  function createChat(track: Track) {
    const chat = makeChat(track);
    setChats((previous) => [chat, ...previous]);
    setActiveId(chat.id);
    setInput("");
    setSidebarOpen(false);
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }

  function updateChat(chatId: string, updater: (chat: Chat) => Chat) {
    setChats((previous) =>
      previous.map((chat) => (chat.id === chatId ? updater(chat) : chat))
    );
  }

  async function sendMessage(textOverride?: string) {
    const content = (textOverride ?? input).trim();
    if (!content || loading || !activeChat) return;

    const chatId = activeChat.id;
    const track = activeChat.track;
    const nextMessages: Message[] = [
      ...activeChat.messages,
      { role: "user", content },
    ];
    updateChat(chatId, (chat) => ({
      ...chat,
      title: chat.messages.length === 0
        ? content.slice(0, 42) + (content.length > 42 ? "…" : "")
        : chat.title,
      messages: nextMessages,
      updatedAt: Date.now(),
    }));
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track, messages: nextMessages }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The request failed.");
      updateChat(chatId, (chat) => ({
        ...chat,
        messages: [...chat.messages, { role: "assistant", content: data.reply }],
        updatedAt: Date.now(),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      updateChat(chatId, (chat) => ({
        ...chat,
        messages: [
          ...chat.messages,
          {
            role: "assistant",
            content: `I couldn't complete that request. ${message}\n\nCheck that GROQ_API_KEY is configured in your local environment or Vercel project settings, then try again.`,
          },
        ],
        updatedAt: Date.now(),
      }));
    } finally {
      setLoading(false);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function deleteChat(chatId: string) {
    const remaining = chats.filter((chat) => chat.id !== chatId);
    if (!remaining.length) {
      const next = makeChat(activeTrack);
      setChats([next]);
      setActiveId(next.id);
    } else {
      setChats(remaining);
      if (activeId === chatId) setActiveId(remaining[0].id);
    }
  }

  const groupedChats = TRACKS.map((track) => ({
    ...track,
    chats: chats.filter((chat) => chat.track === track.id).sort((a, b) => b.updatedAt - a.updatedAt),
  }));

  return (
    <main className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <div className="brand-title">Interview Academy</div>
            <div className="brand-caption">Your personal learning lab</div>
          </div>
          <button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">×</button>
        </div>

        <button className="new-chat-button" onClick={() => createChat(activeTrack)}>
          <span>＋</span> New conversation
        </button>

        <div className="sidebar-label">LEARNING TRACKS</div>
        <nav className="track-list" aria-label="Learning tracks">
          {TRACKS.map((track) => (
            <button
              key={track.id}
              className={`track-button ${activeTrack === track.id ? "track-selected" : ""}`}
              onClick={() => {
                const existing = chats.find((chat) => chat.track === track.id);
                if (existing) setActiveId(existing.id);
                else createChat(track.id);
                setSidebarOpen(false);
              }}
            >
              <span className="track-icon">{track.icon}</span>
              <span className="track-copy">
                <strong>{track.title}</strong>
                <small>{track.subtitle}</small>
              </span>
            </button>
          ))}
        </nav>

        <div className="history-heading">
          <div className="sidebar-label">RECENT CHATS</div>
          <span className="history-count">{chats.length}</span>
        </div>
        <div className="chat-history">
          {groupedChats.map((group) => group.chats.length > 0 && (
            <div className="history-group" key={group.id}>
              <div className="history-group-label">{group.title}</div>
              {group.chats.map((chat) => (
                <div className={`history-row ${chat.id === activeId ? "history-active" : ""}`} key={chat.id}>
                  <button className="history-chat" onClick={() => { setActiveId(chat.id); setSidebarOpen(false); }}>
                    <span className="history-dot" />
                    <span>{chat.title}</span>
                  </button>
                  <button className="delete-chat" title="Delete conversation" aria-label={`Delete ${chat.title}`} onClick={() => deleteChat(chat.id)}>×</button>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="status-dot" />
          <div>
            <strong>Learning workspace</strong>
            <small>Chats saved in this browser</small>
          </div>
        </div>
      </aside>

      {sidebarOpen && <button className="sidebar-backdrop" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}

      <section className="main-panel">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">☰</button>
          <div className="breadcrumb">Academy <span>/</span> {trackInfo.title}</div>
          <div className="topbar-right">
            <span className="model-pill"><span className="model-dot" /> Groq · {process.env.NEXT_PUBLIC_MODEL_LABEL || "GPT OSS 20B"}</span>
          </div>
        </header>

        <div className="conversation-scroll">
          <div className="conversation-inner">
            {!activeChat || activeChat.messages.length === 0 ? (
              <div className="welcome">
                <div className="welcome-icon">{trackInfo.icon}</div>
                <div className="eyebrow">YOUR PERSONAL AI MENTOR</div>
                <h1>{trackInfo.title}</h1>
                <p className="welcome-description">
                  {activeTrack === "python" && "Build programming logic from the ground up. Understand the why, trace the code, and grow one concept at a time."}
                  {activeTrack === "dsa" && "Learn to recognize patterns, start with brute force, improve the bottleneck, and justify optimal solutions."}
                  {activeTrack === "system_design" && "Learn to design reliable systems through requirements, architecture, trade-offs, and real-world constraints."}
                  {activeTrack === "interview" && "Practise explaining your reasoning, complexity, architecture decisions, and trade-offs with clarity."}
                </p>
                <div className="starter-grid">
                  {STARTERS[activeTrack].map((starter) => (
                    <button key={starter} className="starter-card" onClick={() => void sendMessage(starter)}>
                      <span>{starter}</span><span className="starter-arrow">↗</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="messages">
                <div className="conversation-date">CONVERSATION</div>
                {activeChat.messages.map((message, index) => (
                  <article className={`message message-${message.role}`} key={`${activeChat.id}-${index}`}>
                    <div className={`avatar avatar-${message.role}`}>{message.role === "user" ? "Y" : trackInfo.icon}</div>
                    <div className="message-content">
                      <div className="message-author">{message.role === "user" ? "You" : trackInfo.title}</div>
                      <div className="message-text">{message.content}</div>
                    </div>
                  </article>
                ))}
                {loading && (
                  <article className="message message-assistant">
                    <div className="avatar avatar-assistant">{trackInfo.icon}</div>
                    <div className="message-content">
                      <div className="message-author">{trackInfo.title}</div>
                      <div className="typing"><span /><span /><span /></div>
                    </div>
                  </article>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>

        <div className="composer-wrap">
          <form className="composer" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${trackInfo.title}…`}
              rows={1}
              aria-label="Message your AI tutor"
              disabled={loading || !hydrated}
            />
            <button type="submit" className="send-button" disabled={!input.trim() || loading || !hydrated} aria-label="Send message">
              {loading ? <span className="send-spinner" /> : "↑"}
            </button>
          </form>
          <div className="composer-note">Learn step by step · Enter to send · Shift + Enter for a new line</div>
        </div>
      </section>
    </main>
  );
}
