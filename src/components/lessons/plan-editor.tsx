"use client";

import { useEffect, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, Loader2Icon, PlusIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LessonPlan } from "@/lib/ai/lesson-schemas";
import { stageTotal } from "@/lib/learning/lesson-markdown";
import { cn } from "@/lib/utils";

const linesToList = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

export function PlanEditor({
  plan,
  durationMinutes,
  onSave,
  saving,
  saveLabel = "Save plan",
  compact = false,
}: {
  plan: LessonPlan;
  durationMinutes?: number;
  onSave: (plan: LessonPlan) => void;
  saving: boolean;
  saveLabel?: string;
  compact?: boolean;
}) {
  const [draft, setDraft] = useState<LessonPlan>(plan);
  const [dirty, setDirty] = useState(false);
  const [prevPlan, setPrevPlan] = useState(plan);
  if (prevPlan !== plan) {
    // A new plan arrived from the server (e.g. a proposal was applied): reset the draft.
    setPrevPlan(plan);
    setDraft(plan);
    setDirty(false);
  }
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof LessonPlan>(key: K, value: LessonPlan[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  };
  const setStage = (i: number, patch: Partial<LessonPlan["stages"][number]>) => {
    setDraft((d) => ({ ...d, stages: d.stages.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
    setDirty(true);
  };
  const moveStage = (i: number, dir: -1 | 1) => {
    setDraft((d) => {
      const stages = d.stages.slice();
      const j = i + dir;
      if (j < 0 || j >= stages.length) return d;
      [stages[i], stages[j]] = [stages[j], stages[i]];
      return { ...d, stages };
    });
    setDirty(true);
  };
  const total = stageTotal(draft);
  const over = durationMinutes != null && total !== durationMinutes;

  return (
    <div className={cn("space-y-4 rounded-2xl border bg-card", compact ? "p-3" : "p-4")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">{compact ? "Edit proposal" : "Your plan"}</h2>
        <Button size="sm" disabled={saving || (!compact && !dirty)} onClick={() => onSave({ ...draft, homework: draft.homework?.trim() ? draft.homework : null })}>
          {saving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />} {saveLabel}
        </Button>
      </div>

      <Field label="Title"><Input value={draft.title} onChange={(e) => set("title", e.target.value)} /></Field>
      <Field label="Objectives (one per line)">
        <Textarea className="min-h-20" value={draft.objectives.join("\n")} onChange={(e) => set("objectives", linesToList(e.target.value))} placeholder="By the end of the lesson, students will be able to…" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Target language"><Textarea className="min-h-16" value={draft.target_language} onChange={(e) => set("target_language", e.target.value)} /></Field>
        <Field label="Assumed knowledge"><Textarea className="min-h-16" value={draft.assumed_knowledge} onChange={(e) => set("assumed_knowledge", e.target.value)} /></Field>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label>Stages</Label>
          <span className={cn("text-xs tabular-nums", over ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
            {total} min{durationMinutes != null ? ` of ${durationMinutes}` : ""}
          </span>
        </div>
        <div className="mt-2 space-y-3">
          {draft.stages.map((s, i) => (
            <div key={s.id} className="rounded-xl border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">{i + 1}</span>
                <Input className="min-w-40 flex-1" value={s.name} onChange={(e) => setStage(i, { name: e.target.value })} placeholder="Stage name" aria-label="Stage name" />
                <Input className="w-20" type="number" min={1} value={s.minutes} onChange={(e) => setStage(i, { minutes: Number(e.target.value) || 0 })} aria-label="Minutes" />
                <Input className="w-28" value={s.interaction} onChange={(e) => setStage(i, { interaction: e.target.value })} placeholder="T–Ss / pairs" aria-label="Interaction" />
                <div className="ml-auto flex gap-1">
                  <Button size="icon-xs" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => moveStage(i, -1)}><ArrowUpIcon /></Button>
                  <Button size="icon-xs" variant="ghost" aria-label="Move down" disabled={i === draft.stages.length - 1} onClick={() => moveStage(i, 1)}><ArrowDownIcon /></Button>
                  <Button size="icon-xs" variant="ghost" aria-label="Remove stage" onClick={() => { set("stages", draft.stages.filter((_, j) => j !== i)); }}><Trash2Icon /></Button>
                </div>
              </div>
              <Input className="mt-2" value={s.aim} onChange={(e) => setStage(i, { aim: e.target.value })} placeholder="Aim of this stage" aria-label="Stage aim" />
              <Textarea className="mt-2 min-h-20" value={s.procedure} onChange={(e) => setStage(i, { procedure: e.target.value })} placeholder="Procedure: what you do, what students do" aria-label="Procedure" />
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Textarea className="min-h-14" value={s.materials} onChange={(e) => setStage(i, { materials: e.target.value })} placeholder="Materials" aria-label="Materials" />
                <Textarea className="min-h-14" value={s.checks} onChange={(e) => setStage(i, { checks: e.target.value })} placeholder="CCQs / instruction checks / monitoring" aria-label="Checks" />
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => set("stages", [...draft.stages, { id: `s${Date.now().toString(36)}`, name: "", minutes: 5, aim: "", procedure: "", interaction: "", materials: "", checks: "" }])}
          >
            <PlusIcon /> Add a stage
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Materials list (one per line)"><Textarea className="min-h-16" value={draft.materials_list.join("\n")} onChange={(e) => set("materials_list", linesToList(e.target.value))} /></Field>
        <Field label="Anticipated problems (problem — solution, one per line)">
          <Textarea
            className="min-h-16"
            value={draft.anticipated_problems.map((p) => `${p.problem} — ${p.solution}`).join("\n")}
            onChange={(e) =>
              set(
                "anticipated_problems",
                linesToList(e.target.value).map((l) => {
                  const [problem, ...rest] = l.split(/\s[—–-]\s/);
                  return { problem: problem.trim(), solution: rest.join(" — ").trim() };
                }),
              )
            }
          />
        </Field>
        <Field label="Differentiation"><Textarea className="min-h-16" value={draft.differentiation} onChange={(e) => set("differentiation", e.target.value)} /></Field>
        <Field label="Assessment"><Textarea className="min-h-16" value={draft.assessment} onChange={(e) => set("assessment", e.target.value)} /></Field>
        <Field label="Homework"><Textarea className="min-h-16" value={draft.homework ?? ""} onChange={(e) => set("homework", e.target.value)} /></Field>
      </div>
      {dirty && !compact && <p className="text-xs text-muted-foreground">Unsaved changes.</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
