"use client";

import { useState } from "react";
import { Loader2Icon, UserRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { TeachingContent } from "@/lib/ai/schemas";
import type { ExerciseProps } from "./types";

const typeLabel: Record<TeachingContent["challenge_type"], string> = {
  explain_concept: "Explain a concept",
  correct_student_error: "Correct a student error",
  plan_activity: "Plan an activity",
  answer_student_question: "Answer a student's question",
  give_feedback: "Give feedback",
};

export function TeachingExercise({ content, onSubmit, submitting, evaluation, savedResponse }: ExerciseProps<TeachingContent, { text: string }>) {
  const [text, setText] = useState(savedResponse?.text ?? "");
  const readOnly = Boolean(evaluation);
  const words = text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{typeLabel[content.challenge_type]}</Badge>
        <Badge variant="secondary">{content.concept}</Badge>
      </div>
      <div className="flex gap-3 rounded-xl border bg-muted/40 p-4 text-sm">
        <UserRoundIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="font-medium">
            Student: {content.student.age} years old · CEFR {content.student.level} · {content.student.group}
          </p>
          <p className="mt-1 text-muted-foreground">{content.student.context}</p>
        </div>
      </div>
      <div className="rounded-xl border p-4">
        <p className="text-sm font-medium">Your task</p>
        <p className="mt-1 text-sm">{content.task}</p>
        {content.student_input && (
          <blockquote className="mt-3 border-l-2 pl-3 text-sm italic text-muted-foreground">Student: “{content.student_input}”</blockquote>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Evaluated on:</span> {content.evaluation_focus.join(" · ")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground"><span className="font-medium text-foreground">Hint:</span> {content.methodology_hint}</p>
      </div>
      <div>
        <label htmlFor="teaching-response" className="text-sm font-medium">Your response (as you would say or write it to the student)</label>
        <Textarea
          id="teaching-response"
          className="mt-1 min-h-44"
          value={text}
          readOnly={readOnly}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write naturally — concept-checking questions, examples and board work are all welcome."
        />
        <p className="mt-1 text-xs text-muted-foreground">{words} words</p>
      </div>
      {!readOnly && (
        <div className="flex justify-end">
          <Button onClick={() => onSubmit({ text: text.trim() })} disabled={words < 15 || submitting}>
            {submitting && <Loader2Icon className="animate-spin" />} Submit for mentoring
          </Button>
        </div>
      )}
    </div>
  );
}
