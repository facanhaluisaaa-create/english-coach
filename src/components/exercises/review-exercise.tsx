"use client";

import { useState } from "react";
import { z } from "zod";
import { EyeIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { ReviewContent, ReviewResponse } from "@/lib/ai/schemas";
import type { ExerciseProps } from "./types";
import { cn } from "@/lib/utils";

type R = z.infer<typeof ReviewResponse>;

const ratings = [
  { v: 1, label: "Forgot" },
  { v: 2, label: "Hard" },
  { v: 3, label: "OK" },
  { v: 4, label: "Good" },
  { v: 5, label: "Easy" },
];

export function ReviewExercise({ content, onSubmit, submitting, evaluation, savedResponse }: ExerciseProps<ReviewContent, R>) {
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(content.items.map((it) => [it.id, savedResponse?.answers.find((a) => a.id === it.id)?.answer ?? ""])),
  );
  const [ratingsState, setRatings] = useState<Record<string, number>>(() =>
    Object.fromEntries(content.items.map((it) => [it.id, savedResponse?.answers.find((a) => a.id === it.id)?.self_rating ?? 0])),
  );
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const readOnly = Boolean(evaluation);
  const ready = content.items.every((it) => answers[it.id].trim().length > 0 && ratingsState[it.id] > 0);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">{content.intro}</p>
      {content.items.map((it, i) => {
        const judged = evaluation?.per_item?.find((p) => p.id === it.id);
        const show = readOnly || revealed[it.id];
        return (
          <section key={it.id} className="rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{i + 1}</Badge>
              <Badge variant="outline">{it.item_type === "vocabulary" ? "vocabulary" : "weak spot"}</Badge>
            </div>
            <p className="mt-2 text-sm">{it.prompt}</p>
            <Textarea
              className="mt-3 min-h-16"
              value={answers[it.id]}
              readOnly={readOnly}
              onChange={(e) => setAnswers((a) => ({ ...a, [it.id]: e.target.value }))}
              aria-label={`Answer ${i + 1}`}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!show ? (
                <Button type="button" size="sm" variant="outline" disabled={answers[it.id].trim().length === 0} onClick={() => setRevealed((r) => ({ ...r, [it.id]: true }))}>
                  <EyeIcon /> Reveal answer
                </Button>
              ) : (
                <p className="w-full rounded-lg bg-muted/60 p-3 text-sm"><span className="font-medium">Expected:</span> {it.expected}</p>
              )}
            </div>
            {show && !readOnly && (
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground">How well did you remember it?</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {ratings.map((r) => (
                    <button
                      key={r.v}
                      type="button"
                      onClick={() => setRatings((s) => ({ ...s, [it.id]: r.v }))}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs",
                        ratingsState[it.id] === r.v ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {judged && (
              <p className={`mt-2 text-sm ${judged.correct === false ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>{judged.feedback}</p>
            )}
          </section>
        );
      })}
      {!readOnly && (
        <div className="flex justify-end">
          <Button
            onClick={() => onSubmit({ answers: content.items.map((it) => ({ id: it.id, answer: answers[it.id].trim(), self_rating: ratingsState[it.id] })) })}
            disabled={!ready || submitting}
          >
            {submitting && <Loader2Icon className="animate-spin" />} Submit review
          </Button>
        </div>
      )}
    </div>
  );
}
