import { useState, useRef, useEffect } from "react";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { Send, Square, RotateCcw, Settings } from "lucide-react";

const MODELS = [
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro" },
  { id: "google/gemini-2.5-flash-preview", label: "Gemini 2.5 Flash" },
  { id: "anthropic/claude-4.6-sonnet-20260217", label: "Claude 4.6 Sonnet" },
  { id: "moonshot/kimi-2.6", label: "Kimi 2.6" },
];

export function AIChat() {
  const [model, setModel] = useState(MODELS[0].id);
  const [input, setInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, isStreaming, sendMessage, stop, reset } = useStreamingChat({
    model,
    systemPrompt:
      "You are a Doctor of Physical Therapy AI assistant. Help with exercise programming, movement analysis, clinical reasoning, and patient education. Be concise and evidence-based.",
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      {/* Settings Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <h2 className="text-xl font-semibold">AI Chat</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="p-2 rounded-md hover:bg-secondary"
            title="Reset chat"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-md hover:bg-secondary"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="p-3 bg-muted rounded-md mt-3">
          <label className="text-sm font-medium">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="mt-1 w-full p-2 rounded-md border border-input bg-background text-sm"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            Ask me anything about exercise programming, movement analysis, or clinical reasoning.
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {msg.content}
              {isStreaming && i === messages.length - 1 && msg.role === "assistant" && (
                <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-3 border-t border-border">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about exercises, programming, clinical reasoning..."
          className="flex-1 px-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={stop}
            className="px-4 py-2 rounded-lg bg-destructive text-white"
          >
            <Square className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </form>
    </div>
  );
}
