"use client";

import { useState } from "react";
import { z } from "zod";
import { Loader2Icon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TimerBadge } from "@/components/shared/timer-badge";
import { useCountdown } from "@/lib/speech/use-speech";
import type { ToeflBuildSentenceContent, ToeflResponse } from "@/lib/ai/schemas";
import type { ExerciseProps } from "./types";
import { cn } from "@/lib/utils";

type C = z.infer<typeof ToeflBuildSentenceContent>;
type R = z.infer<typeof ToeflResponse>;

export function ToeflBuildSentenceExercise({ content, onSubmit, submitting, evaluation, savedResponse }: ExerciseProps<C, R>) {
  const readOnly = Boolean(evaluation);
  // Each item: ordered list of chunk indexes chosen so far.
  const [chosen, setChosen] = useState<Record<string, number[]>>(() => Object.fromEntries(content.items.map((it) => [it.id, []])));
  const { remaining, elapsed } = useCountdown(content.time_limit_seconds, !readOnly);
  const ready = content.items.every((it) => chosen[it.id].length === it.chunks.length);

  const sentenceOf = (id: string, chunks: string[]) => chosen[id].map((i) => chunks[i]).join(" ").replace(/\s+([,.!?;:])/g, "$1");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2"><Badge variant="secondary">Writing</Badge><h3 className="font-semibold">Build a Sentence</h3></div>
        <TimerBadge remaining={remaining} elapsed={elapsed} limit={content.time_limit_seconds} />
      </div>
      <p className="text-sm text-muted-foreground">Tap the chunks in order to build a correct sentence. Tap a chunk in your sentence to remove it.</p>
      {content.items.map((it, i) => {
        const judged = evaluation?.per_item?.find((p) => p.id === it.id);
        const saved = savedResponse?.answers.find((a) => a.id === it.id)?.value;
        return (
          <section key={it.id} className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">{i + 1}. {it.context}</p>
            {readOnly ? (
              <div className="mt-2 space-y-1 text-sm">
                <p className={judged?.correct === false ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}>Your answer: {saved || "—"}</p>
                {judged?.correct === false && <p>Correct: {it.answer}</p>}
                {judged?.feedback && <p className="text-muted-foreground">{judged.feedback}</p>}
              </div>
            ) : (
              <>
                <div className="mt-2 flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-dashed bg-muted/30 p-2">
                  {chosen[it.id].length === 0 && <span className="px-1 text-xs text-muted-foreground">Your sentence appears here</span>}
                  {chosen[it.id].map((ci, pos) => (
                    <button
                      key={pos}
                      type="button"
                      className="rounded-md bg-primary px-2 py-1 text-sm text-primary-foreground"
                      onClick={() => setChosen((c) => ({ ...c, [it.id]: c[it.id].filter((_, p) => p !== pos) }))}
                    >
                      {it.chunks[ci]}
                    </button>
                  ))}
                  {chosen[it.id].length > 0 && (
                    <Button type="button" size="icon-xs" variant="ghost" aria-label="Reset" onClick={() => setChosen((c) => ({ ...c, [it.id]: [] }))}>
                      <RotateCcwIcon />
                    </Button>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {it.chunks.map((chunk, ci) => {
                    const used = chosen[it.id].includes(ci);
                    return (
                      <button
                        key={ci}
                        type="button"
                        disabled={used}
                        onClick={() => setChosen((c) => ({ ...c, [it.id]: [...c[it.id], ci] }))}
                        className={cn("rounded-md border px-2 py-1 text-sm transition-colors hover:bg-muted", used && "opacity-30")}
                      >
                        {chunk}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        );
      })}
      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Strategy:</span> {content.strategy_tip}</p>
      {!readOnly && (
        <div className="flex justify-end">
          <Button
            disabled={!ready || submitting}
            onClick={() => onSubmit({ answers: content.items.map((it) => ({ id: it.id, value: sentenceOf(it.id, it.chunks) })), text: null, seconds_used: elapsed, input_mode: null })}
          >
            {submitting && <Loader2Icon className="animate-spin" />} Submit sentences
          </Button>
        </div>
      )}
    </div>
  );
}
