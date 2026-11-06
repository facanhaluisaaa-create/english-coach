"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowRightIcon, CheckIcon, FlameIcon, Loader2Icon, SkipForwardIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import { ExerciseSwitch } from "@/components/exercises/exercise-switch";
import { EvaluationCard } from "./evaluation-card";
import type { Evaluation, ExerciseContent, SessionPlan, SessionSummary } from "@/lib/ai/schemas";
import { completeSessionAction, skipExerciseAction, submitExerciseAction } from "@/app/(app)/session/actions";
import { cn } from "@/lib/utils";

export interface RunnerExercise {
  id: string;
  position: number;
  title: string;
  skill: string;
  estimated_minutes: number;
  status: "pending" | "submitted" | "evaluated" | "skipped";
  content: ExerciseContent;
  response: unknown;
  evaluation: Evaluation | null;
}

export interface RunnerSession {
  id: string;
  kind: "daily" | "practice";
  status: "planned" | "in_progress" | "completed";
  plan: SessionPlan;
  summary: SessionSummary | null;
  total_score: number | null;
  max_score: number | null;
}

const skillLabel: Record<string, string> = {
  vocabulary: "Vocabulary",
  grammar: "Grammar",
  toefl: "TOEFL",
  teaching: "Teaching",
  review: "Review",
};

export function SessionRunner({ session, exercises: initial, streak }: { session: RunnerSession; exercises: RunnerExercise[]; streak: number }) {
  const router = useRouter();
  const [exercises, setExercises] = useState(initial);
  const firstOpen = useMemo(() => initial.findIndex((e) => e.status !== "evaluated" && e.status !== "skipped"), [initial]);
  const [index, setIndex] = useState(firstOpen === -1 ? 0 : firstOpen);
  const [phase, setPhase] = useState<"exercise" | "feedback" | "summary">(
    session.status === "completed" ? "summary" : firstOpen === -1 ? "summary" : "exercise",
  );
  const [summary, setSummary] = useState<SessionSummary | null>(session.summary);
  const [finalScore, setFinalScore] = useState<{ total: number | null; max: number | null }>({ total: session.total_score, max: session.max_score });
  const [finalStreak, setFinalStreak] = useState(streak);
  const [submitting, startSubmit] = useTransition();
  const [completing, startComplete] = useTransition();

  const current = exercises[index];
  const doneCount = exercises.filter((e) => e.status === "evaluated" || e.status === "skipped").length;

  function submit(response: unknown) {
    startSubmit(async () => {
      const seconds = (response as { seconds_used?: number | null })?.seconds_used ?? null;
      const result = await submitExerciseAction(current.id, response, seconds);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setExercises((list) => list.map((e) => (e.id === current.id ? { ...e, status: "evaluated", response, evaluation: result.data.evaluation } : e)));
      setPhase("feedback");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function skip() {
    startSubmit(async () => {
      const result = await skipExerciseAction(current.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setExercises((list) => list.map((e) => (e.id === current.id ? { ...e, status: "skipped" } : e)));
      next(true);
    });
  }

  function next(afterSkip = false) {
    const list = afterSkip ? exercises.map((e) => (e.id === current.id ? { ...e, status: "skipped" as const } : e)) : exercises;
    const nextIdx = list.findIndex((e, i) => i > index && e.status !== "evaluated" && e.status !== "skipped");
    if (nextIdx !== -1) {
      setIndex(nextIdx);
      setPhase("exercise");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    finish();
  }

  function finish() {
    if (session.status === "completed" && summary) {
      setPhase("summary");
      return;
    }
    startComplete(async () => {
      const result = await completeSessionAction(session.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSummary(result.data.summary);
      setFinalScore({ total: result.data.totalScore, max: result.data.maxScore });
      setFinalStreak(result.data.streak);
      setPhase("summary");
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Progress rail */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {exercises.map((e, i) => {
          const done = e.status === "evaluated";
          const skipped = e.status === "skipped";
          const active = phase !== "summary" && i === index;
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => {
                setIndex(i);
                setPhase(done ? "feedback" : "exercise");
              }}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                active && "border-primary bg-primary text-primary-foreground",
                done && !active && "bg-muted",
                skipped && "line-through opacity-60",
              )}
            >
              {done ? <CheckIcon className="size-3" /> : skipped ? <SkipForwardIcon className="size-3" /> : <span>{i + 1}</span>}
              {skillLabel[e.skill] ?? e.skill}
              {done && e.evaluation && <span className="opacity-80">{Math.round(e.evaluation.score)}</span>}
            </button>
          );
        })}
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">{doneCount}/{exercises.length}</span>
      </div>

      {phase === "summary" ? (
        <SummaryView session={session} summary={summary} score={finalScore} streak={finalStreak} completing={completing} exercises={exercises} onReview={(i) => { setIndex(i); setPhase("feedback"); }} />
      ) : (
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{skillLabel[current.skill] ?? current.skill}</Badge>
              <span className="text-xs text-muted-foreground">~{current.estimated_minutes} min</span>
            </div>
            <h1 className="mt-2 text-xl font-semibold tracking-tight">{current.title}</h1>
          </div>

          {phase === "feedback" && current.evaluation && <EvaluationCard evaluation={current.evaluation} />}

          <div className={cn("rounded-2xl border bg-card p-4 sm:p-6", phase === "feedback" && "opacity-95")}>
            <ExerciseSwitch
              key={current.id}
              content={current.content}
              onSubmit={submit}
              submitting={submitting}
              evaluation={phase === "feedback" ? current.evaluation : null}
              savedResponse={current.response}
            />
          </div>

          <div className="flex items-center justify-between">
            {phase === "exercise" ? (
              <Button variant="ghost" size="sm" onClick={skip} disabled={submitting}>
                <SkipForwardIcon /> Skip this block
              </Button>
            ) : <span />}
            {phase === "feedback" && (
              <Button onClick={() => next()} disabled={completing}>
                {completing ? <Loader2Icon className="animate-spin" /> : null}
                {exercises.some((e, i) => i > index && e.status !== "evaluated" && e.status !== "skipped") ? "Next block" : session.status === "completed" ? "Back to summary" : "Finish session"}
                <ArrowRightIcon />
              </Button>
            )}
          </div>
          {submitting && (
            <p className="text-center text-sm text-muted-foreground" aria-live="polite">The coach is reading your answer carefully… this takes a few seconds.</p>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryView({
  session,
  summary,
  score,
  streak,
  completing,
  exercises,
  onReview,
}: {
  session: RunnerSession;
  summary: SessionSummary | null;
  score: { total: number | null; max: number | null };
  streak: number;
  completing: boolean;
  exercises: RunnerExercise[];
  onReview: (index: number) => void;
}) {
  const pct = score.total != null && score.max ? Math.round((score.total / score.max) * 100) : null;
  if (completing) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Writing your session summary…</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{session.kind === "daily" ? "Session complete" : "Practice complete"}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{summary?.headline ?? session.plan.title}</h1>
          </div>
          <div className="flex items-center gap-4">
            {pct != null && <div className="text-3xl font-semibold tabular-nums">{pct}%</div>}
            {session.kind === "daily" && (
              <div className="flex items-center gap-1 text-sm"><FlameIcon className="size-4 text-orange-500" /> {streak}-day streak</div>
            )}
          </div>
        </div>
        {summary && (
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Wins</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">{summary.wins.map((w, i) => <li key={i}>• {w}</li>)}</ul>
            </div>
            <div>
              <p className="text-sm font-medium">Focus next</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">{summary.focus_next.map((w, i) => <li key={i}>• {w}</li>)}</ul>
            </div>
            <p className="text-sm sm:col-span-2">{summary.encouragement}</p>
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium">Blocks</p>
        <ul className="mt-2 divide-y rounded-xl border">
          {exercises.map((e, i) => (
            <li key={e.id} className="flex items-center justify-between p-3 text-sm">
              <button type="button" className="text-left hover:underline" onClick={() => onReview(i)} disabled={!e.evaluation}>
                <span className="font-medium">{e.title}</span>
                <span className="text-muted-foreground"> · {skillLabel[e.skill]}</span>
              </button>
              <span className="tabular-nums text-muted-foreground">{e.evaluation ? `${Math.round(e.evaluation.score)}/100` : e.status === "skipped" ? "skipped" : "—"}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-2">
        <LinkButton href="/today">Back to Today</LinkButton>
        <LinkButton variant="outline" href="/progress">See progress</LinkButton>
        <LinkButton variant="outline" href="/toefl">Extra TOEFL practice</LinkButton>
      </div>
    </div>
  );
}
