"use client";

import { useState } from "react";
import { z } from "zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TimerBadge } from "@/components/shared/timer-badge";
import { useCountdown } from "@/lib/speech/use-speech";
import type { ToeflCompleteWordsContent, ToeflResponse } from "@/lib/ai/schemas";
import type { ExerciseProps } from "./types";
import { cn } from "@/lib/utils";

type C = z.infer<typeof ToeflCompleteWordsContent>;
type R = z.infer<typeof ToeflResponse>;

export function ToeflCompleteWordsExercise({ content, onSubmit, submitting, evaluation, savedResponse }: ExerciseProps<C, R>) {
  const readOnly = Boolean(evaluation);
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(content.gaps.map((g) => {
      const saved = savedResponse?.answers.find((a) => a.id === g.id)?.value ?? "";
      return [g.id, saved.toLowerCase().startsWith(g.shown.toLowerCase()) ? saved.slice(g.shown.length) : saved];
    })),
  );
  const { remaining, elapsed } = useCountdown(content.time_limit_seconds, !readOnly);
  const parts = content.passage.split(/(\{\{\w+\}\})/g);
  const ready = content.gaps.every((g) => answers[g.id].trim().length > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2"><Badge variant="secondary">Reading</Badge><h3 className="font-semibold">{content.title}</h3></div>
        <TimerBadge remaining={remaining} elapsed={elapsed} limit={content.time_limit_seconds} />
      </div>
      <p className="text-sm text-muted-foreground">Complete each word. The first letters are given; type the missing letters.</p>
      <article className="rounded-xl border p-4 text-[15px] leading-9">
        {parts.map((part, i) => {
          const m = part.match(/^\{\{(\w+)\}\}$/);
          if (!m) return <span key={i}>{part}</span>;
          const gap = content.gaps.find((g) => g.id === m[1]);
          if (!gap) return <span key={i}>{part}</span>;
          const judged = evaluation?.per_item?.find((p) => p.id === gap.id);
          return (
            <span key={i} className="inline-flex items-baseline whitespace-nowrap">
              <span className="font-medium">{gap.shown}</span>
              <input
                aria-label={`Gap ${gap.id}`}
                className={cn(
                  "mx-0.5 inline-block w-[7ch] border-b-2 bg-transparent px-1 font-medium outline-none focus:border-primary",
                  readOnly && judged?.correct === true && "border-emerald-500 text-emerald-600",
                  readOnly && judged?.correct === false && "border-destructive text-destructive line-through",
                )}
                value={answers[gap.id]}
                readOnly={readOnly}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => setAnswers((a) => ({ ...a, [gap.id]: e.target.value.replace(/\s/g, "") }))}
              />
              {readOnly && judged?.correct === false && <span className="ml-1 text-sm text-emerald-600">({gap.answer})</span>}
            </span>
          );
        })}
      </article>
      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Strategy:</span> {content.strategy_tip}</p>
      {!readOnly && (
        <div className="flex justify-end">
          <Button
            disabled={!ready || submitting}
            onClick={() =>
              onSubmit({
                answers: content.gaps.map((g) => ({ id: g.id, value: g.shown + answers[g.id].trim() })),
                text: null,
                seconds_used: elapsed,
                input_mode: null,
              })
            }
          >
            {submitting && <Loader2Icon className="animate-spin" />} Submit answers
          </Button>
        </div>
      )}
    </div>
  );
}
