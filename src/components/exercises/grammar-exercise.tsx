"use client";

import { useState } from "react";
import { z } from "zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { GrammarContent, GrammarResponse } from "@/lib/ai/schemas";
import type { ExerciseProps } from "./types";

type R = z.infer<typeof GrammarResponse>;

const labels: Record<GrammarContent["tasks"][number]["type"], string> = {
  transform: "Transform",
  complete: "Complete",
  correct: "Correct the error",
  produce: "Produce",
};

export function GrammarExercise({ content, onSubmit, submitting, evaluation, savedResponse }: ExerciseProps<GrammarContent, R>) {
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(content.tasks.map((t) => [t.id, savedResponse?.answers.find((a) => a.id === t.id)?.answer ?? ""])),
  );
  const readOnly = Boolean(evaluation);
  const ready = content.tasks.every((t) => answers[t.id].trim().length > 0);

  return (
    <div className="space-y-6">
      <p className="text-sm italic text-muted-foreground">{content.why_this}</p>
      <div className="grid gap-3 rounded-xl border p-4 text-sm sm:grid-cols-2">
        <Field label="Meaning" value={content.explanation.meaning} />
        <Field label="Form" value={content.explanation.form} />
        <Field label="Use" value={content.explanation.use} />
        <Field label="Register" value={content.explanation.register} />
        <div className="sm:col-span-2">
          <p className="font-medium">Pitfalls</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
            {content.explanation.pitfalls.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Examples</p>
        <ul className="space-y-2">
          {content.examples.map((ex, i) => (
            <li key={i} className="rounded-lg bg-muted/50 p-3 text-sm">
              <p>“{ex.sentence}”</p>
              <p className="mt-1 text-xs text-muted-foreground">{ex.note}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-4">
        {content.tasks.map((t, i) => {
          const judged = evaluation?.per_item?.find((p) => p.id === t.id);
          return (
            <section key={t.id} className="rounded-xl border p-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{i + 1}</Badge>
                <span className="text-sm font-medium">{labels[t.type]}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{t.instruction}</p>
              <p className="mt-2 text-sm">{t.prompt}</p>
              <Textarea
                className="mt-3 min-h-16"
                value={answers[t.id]}
                readOnly={readOnly}
                onChange={(e) => setAnswers((a) => ({ ...a, [t.id]: e.target.value }))}
                aria-label={`Answer ${i + 1}`}
              />
              {readOnly && (
                <div className="mt-2 space-y-1 text-sm">
                  {judged && <p className={judged.correct === false ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}>{judged.feedback}</p>}
                  <p className="text-muted-foreground"><span className="font-medium text-foreground">Model answer:</span> {t.model_answer}</p>
                </div>
              )}
            </section>
          );
        })}
      </div>
      {!readOnly && (
        <div className="flex justify-end">
          <Button onClick={() => onSubmit({ answers: content.tasks.map((t) => ({ id: t.id, answer: answers[t.id].trim() })) })} disabled={!ready || submitting}>
            {submitting && <Loader2Icon className="animate-spin" />} Submit for feedback
          </Button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-medium">{label}</p>
      <p className="mt-1 text-muted-foreground">{value}</p>
    </div>
  );
}
