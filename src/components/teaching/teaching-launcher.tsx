"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startTeachingPracticeAction } from "@/app/(app)/session/actions";

const levels = ["", "A1", "A2", "B1", "B2", "C1", "C2"] as const;
const types = [
  ["", "Let the mentor choose"],
  ["explain_concept", "Explain a concept"],
  ["correct_student_error", "Correct a student error"],
  ["answer_student_question", "Answer a student's question"],
  ["plan_activity", "Plan an activity"],
  ["give_feedback", "Give feedback on student work"],
] as const;

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function TeachingLauncher() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [age, setAge] = useState("");
  const [level, setLevel] = useState<(typeof levels)[number]>("");
  const [concept, setConcept] = useState("");
  const [type, setType] = useState<(typeof types)[number][0]>("");

  function launch() {
    start(async () => {
      const result = await startTeachingPracticeAction({
        studentAge: age ? Number(age) : undefined,
        studentLevel: level || undefined,
        concept: concept || undefined,
        challengeType: type || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push(`/session/${result.data.sessionId}`);
    });
  }

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        launch();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="age">Student age</Label>
        <Input id="age" type="number" min={5} max={80} placeholder="e.g. 13" value={age} onChange={(e) => setAge(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="level">Student level (CEFR)</Label>
        <select id="level" className={selectClass} value={level} onChange={(e) => setLevel(e.target.value as (typeof levels)[number])}>
          {levels.map((l) => <option key={l} value={l}>{l || "Any"}</option>)}
        </select>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="concept">Concept to teach</Label>
        <Input id="concept" placeholder="e.g. present perfect vs past simple, articles, word stress…" value={concept} maxLength={200} onChange={(e) => setConcept(e.target.value)} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="type">Challenge type</Label>
        <select id="type" className={selectClass} value={type} onChange={(e) => setType(e.target.value as (typeof types)[number][0])}>
          {types.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />} {pending ? "Preparing the student…" : "Start simulation"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">Example: “Explain the present perfect to a 13-year-old A2 learner.”</p>
      </div>
    </form>
  );
}
