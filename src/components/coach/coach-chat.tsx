"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2Icon, SendIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/shared/markdown";
import { cn } from "@/lib/utils";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const starters = [
  "What's the difference between 'in spite of' and 'despite' in formal writing?",
  "Give me a 3-minute plan to explain articles to a B1 adult.",
  "How should I approach Write for an Academic Discussion in 10 minutes?",
  "Quiz me on my weakest grammar point.",
];

export function CoachChat({ initial, name, onClear }: { initial: Msg[]; name: string; onClear: () => Promise<void> }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [clearing, startClear] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;
    setInput("");
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content };
    const assistantId = crypto.randomUUID();
    setMessages((m) => [...m, userMsg, { id: assistantId, role: "assistant", content: "" }]);
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const msg = await res.text();
        toast.error(msg || "The coach is unavailable right now.");
        setMessages((m) => m.filter((x) => x.id !== assistantId));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, content: acc } : x)));
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error("Connection lost. Please try again.");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl border bg-card">
      <div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mx-auto max-w-md space-y-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">Hi {name.split(" ")[0]} — I&apos;m your English Mastery Coach. Try one of these:</p>
            <div className="grid gap-2">
              {starters.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {m.role === "assistant" ? (
                m.content ? <Markdown text={m.content} /> : <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask the coach… (Enter to send, Shift+Enter for a new line)"
          className="min-h-10 max-h-40 flex-1 resize-none"
          rows={1}
          aria-label="Message"
        />
        <Button type="submit" size="icon" disabled={streaming || !input.trim()} aria-label="Send">
          {streaming ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Clear conversation"
          disabled={clearing || messages.length === 0}
          onClick={() =>
            startClear(async () => {
              await onClear();
              setMessages([]);
            })
          }
        >
          <Trash2Icon />
        </Button>
      </form>
    </div>
  );
}
