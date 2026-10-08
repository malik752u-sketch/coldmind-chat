"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  CircleHelp,
  Command,
  Menu,
  MessageSquarePlus,
  MoreHorizontal,
  Snowflake,
  Sparkles,
} from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const suggestions = [
  "Help me think through a big decision",
  "Explain something complicated simply",
  "Turn a rough idea into a clear plan",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  async function sendMessage(text: string) {
    const content = text.trim();
    if (!content || isSending) return;

    const nextMessages: Message[] = [
      ...messages,
      { id: crypto.randomUUID(), role: "user", content },
    ];
    const assistantId = crypto.randomUUID();
    setMessages([...nextMessages, { id: assistantId, role: "assistant", content: "" }]);
    setDraft("");
    setError("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.map(({ role, content: body }) => ({ role, content: body })) }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "ColdMind couldn't answer. Please try again.");
      }
      if (!response.body) throw new Error("The response stream was unavailable. Please try again.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      function appendAnswer(text: string) {
        if (!text) return;
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? { ...message, content: message.content + text }
              : message,
          ),
        );
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        appendAnswer(decoder.decode(value, { stream: true }));
      }
      appendAnswer(decoder.decode());
    } catch (caught) {
      setMessages((current) => current.filter((message) => message.id !== assistantId));
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function startNewChat() {
    if (isSending) return;
    setMessages([]);
    setError("");
    setDraft("");
    inputRef.current?.focus();
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <div className="brand-row">
          <div className="brand-mark"><Snowflake size={19} strokeWidth={2.1} /></div>
          <span className="brand-name">ColdMind</span>
          <button className="icon-button sidebar-toggle" onClick={() => setIsSidebarOpen(false)} aria-label="Close sidebar" title="Close sidebar">
            <Menu size={17} />
          </button>
        </div>

        <button className="new-chat-button" onClick={startNewChat}>
          <MessageSquarePlus size={17} strokeWidth={1.8} />
          <span>New conversation</span>
          <span className="new-chat-shortcut"><Command size={11} /> K</span>
        </button>

        <div className="sidebar-section-label">WORKSPACE</div>
        <div className="session-row">
          <span className="session-indicator" />
          <span>Current conversation</span>
          <MoreHorizontal className="session-more" size={17} />
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-rule" />
          <div className="model-caption">YOUR THINKING PARTNER</div>
          <p>Clear head. Open mind.</p>
          <button className="help-link" type="button" title="About ColdMind">
            <CircleHelp size={16} />
            <span>About ColdMind</span>
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          {!isSidebarOpen && (
            <button className="icon-button reopen-sidebar" onClick={() => setIsSidebarOpen(true)} aria-label="Open sidebar" title="Open sidebar">
              <Menu size={18} />
            </button>
          )}
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>New conversation</strong></div>
          <button className="model-chip" type="button" title="Model configured on the server">
            <span className="model-dot" />
            Ling 3.1 Flash
            <ChevronDown size={14} />
          </button>
        </header>

        <section className={`conversation ${messages.length ? "conversation-active" : "conversation-empty"}`}>
          {messages.length === 0 ? (
            <div className="welcome-block">
              <div className="welcome-kicker"><Sparkles size={14} /> A little room to think</div>
              <h1>What&apos;s on<br className="mobile-break" /> your mind?</h1>
              <p className="welcome-copy">Bring a question, a half-formed thought, or a problem you can&apos;t quite untangle.</p>
              <div className="suggestion-list" aria-label="Try asking">
                {suggestions.map((suggestion, index) => (
                  <button className="suggestion-button" key={suggestion} onClick={() => void sendMessage(suggestion)}>
                    <span className={`suggestion-index suggestion-index-${index + 1}`}>0{index + 1}</span>
                    <span>{suggestion}</span>
                    <ArrowDown className="suggestion-arrow" size={15} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message) => (
                <article className={`message message-${message.role}`} key={message.id}>
                  {message.role === "assistant" ? (
                    <div className="assistant-avatar"><Snowflake size={16} /></div>
                  ) : (
                    <div className="user-avatar">Y</div>
                  )}
                  <div className="message-body">
                    <div className="message-author">{message.role === "assistant" ? "ColdMind" : "You"}</div>
                    <p className="message-content">{message.content || (isSending ? <span className="typing-indicator"><i /><i /><i /></span> : "")}</p>
                  </div>
                </article>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </section>

        <div className="composer-wrap">
          {error && <div className="error-banner" role="alert">{error}</div>}
          <form className="composer" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask ColdMind anything..."
              aria-label="Message ColdMind"
              rows={1}
              maxLength={8000}
              disabled={isSending}
            />
            <div className="composer-footer">
              <span className="composer-hint">Thoughtful answers, one question at a time.</span>
              <div className="composer-actions">
                <span className="keyboard-hint">Shift + Enter for a new line</span>
                <button className="send-button" type="submit" disabled={!draft.trim() || isSending} aria-label="Send message" title="Send message">
                  <ArrowUp size={17} strokeWidth={2.4} />
                </button>
              </div>
            </div>
          </form>
          <div className="privacy-note"><span className="privacy-dot" /> Your messages are sent securely to OpenRouter</div>
        </div>
      </main>
    </div>
  );
}
