"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { CheckIcon, ClipboardCopyIcon, Loader2Icon, PrinterIcon, SendIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Markdown } from "@/components/shared/markdown";
import { PlanEditor } from "./plan-editor";
import { ProposalDiff } from "./proposal-diff";
import type { LessonBrief, LessonPlan } from "@/lib/ai/lesson-schemas";
import { planToMarkdown } from "@/lib/learning/lesson-markdown";
import {
  applyProposalAction,
  discardProposalAction,
  saveReflectionAction,
  sendLessonMessageAction,
  setLessonStatusAction,
  updatePlanAction,
} from "@/app/(app)/lessons/actions";
import { cn } from "@/lib/utils";

export interface WorkspaceMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  questions: string[];
  proposal: { summary: string; plan: LessonPlan } | null;
  proposal_status: "pending" | "applied" | "discarded" | null;
}

interface LessonMeta {
  id: string;
  title: string;
  status: "drafting" | "ready" | "taught" | "archived";
  reflection: string | null;
  taught_on: string | null;
}

export function LessonWorkspace({ lesson, brief, plan: initialPlan, messages: initialMessages }: { lesson: LessonMeta; brief: LessonBrief; plan: LessonPlan; messages: WorkspaceMessage[] }) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [messages, setMessages] = useState(initialMessages);
  const [status, setStatus] = useState(lesson.status);
  const [input, setInput] = useState("");
  const [sending, startSend] = useTransition();
  const [busy, startBusy] = useTransition();
  const [tab, setTab] = useState<"chat" | "plan">("chat");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, sending]);

  function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    setInput("");
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "user", content, questions: [], proposal: null, proposal_status: null }]);
    startSend(async () => {
      const result = await sendLessonMessageAction(lesson.id, content);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setMessages((m) => [
        ...m,
        { id: result.data.id, role: "assistant", content: result.data.content, questions: result.data.questions, proposal: result.data.proposal, proposal_status: result.data.proposal ? "pending" : null },
      ]);
    });
  }

  function apply(message: WorkspaceMessage, edited?: LessonPlan) {
    startBusy(async () => {
      const result = await applyProposalAction(message.id, edited);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPlan(result.data.plan);
      setMessages((m) => m.map((x) => (x.id === message.id ? { ...x, proposal_status: "applied" } : x)));
      toast.success("Applied to your plan.");
      setTab("plan");
    });
  }

  function discard(message: WorkspaceMessage) {
    startBusy(async () => {
      const result = await discardProposalAction(message.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setMessages((m) => m.map((x) => (x.id === message.id ? { ...x, proposal_status: "discarded" } : x)));
    });
  }

  function savePlan(next: LessonPlan) {
    startBusy(async () => {
      const result = await updatePlanAction(lesson.id, next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPlan(result.data.plan);
      toast.success("Plan saved.");
    });
  }

  function changeStatus(next: LessonMeta["status"]) {
    startBusy(async () => {
      const result = await setLessonStatusAction(lesson.id, next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setStatus(next);
      router.refresh();
    });
  }

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(planToMarkdown(plan, brief));
      toast.success("Copied as Markdown.");
    } catch {
      toast.error("Clipboard unavailable.");
    }
  }

  const pendingProposal = messages.some((m) => m.proposal_status === "pending");

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{plan.title || lesson.title}</h1>
          <Badge variant={status === "ready" ? "default" : "secondary"}>{{ drafting: "Planning", ready: "Ready to teach", taught: "Taught", archived: "Archived" }[status]}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {brief.class_name} · {brief.student_ages} · CEFR {brief.level} · {brief.class_size} students · {brief.duration_minutes} min
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={copyMarkdown}><ClipboardCopyIcon /> Copy Markdown</Button>
        <LinkButton variant="outline" size="sm" href={`/lessons/${lesson.id}/print`}><PrinterIcon /> Print</LinkButton>
        {status === "drafting" && <Button size="sm" disabled={busy || plan.stages.length === 0} onClick={() => changeStatus("ready")}><CheckIcon /> Mark ready</Button>}
        {status === "ready" && <Button size="sm" variant="secondary" disabled={busy} onClick={() => changeStatus("drafting")}>Back to planning</Button>}
      </div>
    </div>
  );

  const chat = (
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl border bg-card">
      <div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">Tell the coach how you see this class, or ask it what it needs to know.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[92%] space-y-3 rounded-2xl px-4 py-3 text-sm leading-relaxed", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
              {m.role === "assistant" ? <Markdown text={m.content} /> : <p className="whitespace-pre-wrap">{m.content}</p>}
              {m.questions.length > 0 && (
                <ol className="list-decimal space-y-1 rounded-lg bg-background/60 p-3 pl-7">
                  {m.questions.map((q, i) => <li key={i}>{q}</li>)}
                </ol>
              )}
              {m.proposal && (
                <ProposalCard message={m} currentPlan={plan} durationMinutes={brief.duration_minutes} busy={busy} onApply={(edited) => apply(m, edited)} onDiscard={() => discard(m)} />
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground"><Loader2Icon className="size-4 animate-spin" /> The coach is thinking about your class…</div>
          </div>
        )}
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
          placeholder={pendingProposal ? "Decide on the proposal above, or reply to adjust it…" : "Answer, add ideas, or ask for a proposal (e.g. “Propose objectives and a stage outline”)."}
          className="min-h-10 max-h-40 flex-1 resize-none"
          rows={2}
          aria-label="Message to the coach"
        />
        <Button type="submit" size="icon" disabled={sending || !input.trim()} aria-label="Send"><SendIcon /></Button>
      </form>
    </div>
  );

  const planPanel = (
    <div className="space-y-4">
      <PlanEditor plan={plan} durationMinutes={brief.duration_minutes} onSave={savePlan} saving={busy} />
      <ReflectionPanel lessonId={lesson.id} status={status} reflection={lesson.reflection} onReply={(reply) => {
        setStatus("taught");
        if (reply) setMessages((m) => [...m, { id: `refl-${Date.now()}`, role: "assistant", content: reply, questions: [], proposal: null, proposal_status: null }]);
      }} />
    </div>
  );

  return (
    <div className="space-y-4">
      {header}
      {/* Desktop: side by side. Mobile: tabs. */}
      <div className="hidden min-h-[calc(100dvh-14rem)] grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-4 lg:grid">
        <div className="flex min-h-0 flex-col">{chat}</div>
        <div className="min-h-0 overflow-y-auto pr-1">{planPanel}</div>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as "chat" | "plan")} className="lg:hidden">
        <TabsList className="w-full">
          <TabsTrigger value="chat" className="flex-1">Conversation</TabsTrigger>
          <TabsTrigger value="plan" className="flex-1">Plan {plan.stages.length > 0 && `(${plan.stages.length} stages)`}</TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="mt-3 flex h-[calc(100dvh-20rem)] flex-col">{chat}</TabsContent>
        <TabsContent value="plan" className="mt-3">{planPanel}</TabsContent>
      </Tabs>
    </div>
  );
}

function ProposalCard({ message, currentPlan, durationMinutes, busy, onApply, onDiscard }: { message: WorkspaceMessage; currentPlan: LessonPlan; durationMinutes: number; busy: boolean; onApply: (edited?: LessonPlan) => void; onDiscard: () => void }) {
  const [editing, setEditing] = useState(false);
  const proposal = message.proposal!;
  const state = message.proposal_status;
  return (
    <div className="rounded-xl border bg-background p-3 text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Proposal</p>
        {state === "applied" && <Badge>Applied</Badge>}
        {state === "discarded" && <Badge variant="secondary">Discarded</Badge>}
      </div>
      <p className="mt-1 text-sm">{proposal.summary}</p>
      <details className="mt-2 text-sm" open={state === "pending"}>
        <summary className="cursor-pointer text-muted-foreground">What would change</summary>
        <div className="mt-2"><ProposalDiff current={currentPlan} proposed={proposal.plan} /></div>
      </details>
      {state === "pending" && !editing && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={() => onApply()}><CheckIcon /> Apply to my plan</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(true)}>Edit, then apply</Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={onDiscard}><XIcon /> Discard</Button>
        </div>
      )}
      {state === "pending" && editing && (
        <div className="mt-3">
          <PlanEditor plan={proposal.plan} durationMinutes={durationMinutes} onSave={(p) => onApply(p)} saving={busy} saveLabel="Apply edited version" compact />
        </div>
      )}
    </div>
  );
}

function ReflectionPanel({ lessonId, status, reflection, onReply }: { lessonId: string; status: LessonMeta["status"]; reflection: string | null; onReply: (reply: string | null) => void }) {
  const [text, setText] = useState(reflection ?? "");
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(Boolean(reflection));
  if (status === "drafting") return null;
  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="font-medium">After the class</h2>
      <p className="mt-1 text-sm text-muted-foreground">How did it go? What you write here is remembered for the next time you plan for this group, and the coach replies in the conversation.</p>
      <Textarea className="mt-3 min-h-24" value={text} onChange={(e) => setText(e.target.value)} placeholder="What worked, what didn't, what surprised you, timing, student reactions…" />
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" disabled={pending || text.trim().length < 10} onClick={() => start(async () => {
          const result = await saveReflectionAction(lessonId, text);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          setSaved(true);
          onReply(result.data.reply);
          toast.success("Reflection saved.");
        })}>
          {pending && <Loader2Icon className="animate-spin" />} {saved ? "Update reflection" : "Save reflection and mark as taught"}
        </Button>
      </div>
    </section>
  );
}
