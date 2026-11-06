"use client";

import { useState } from "react";
import { z } from "zod";
import { HeadphonesIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChoiceList } from "@/components/shared/choice-list";
import { TimerBadge } from "@/components/shared/timer-badge";
import { useCountdown, useTextToSpeech } from "@/lib/speech/use-speech";
import type { ToeflChooseResponseContent, ToeflResponse } from "@/lib/ai/schemas";
import type { ExerciseProps } from "./types";

type C = z.infer<typeof ToeflChooseResponseContent>;
type R = z.infer<typeof ToeflResponse>;

export function ToeflChooseResponseExercise({ content, onSubmit, submitting, evaluation, savedResponse }: ExerciseProps<C, R>) {
  const readOnly = Boolean(evaluation);
  const tts = useTextToSpeech();
  const [answers, setAnswers] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(content.items.map((it) => {
      const saved = savedResponse?.answers.find((a) => a.id === it.id)?.value;
      return [it.id, saved != null && saved !== "" ? Number(saved) : null];
    })),
  );
  const [played, setPlayed] = useState<Record<string, number>>({});
  const { remaining, elapsed } = useCountdown(content.time_limit_seconds, !readOnly);
  const ready = content.items.every((it) => answers[it.id] != null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2"><Badge variant="secondary">Listening</Badge><h3 className="font-semibold">Listen and Choose a Response</h3></div>
        <TimerBadge remaining={remaining} elapsed={elapsed} limit={content.time_limit_seconds} />
      </div>
      <p className="text-sm text-muted-foreground">
        {tts.supported ? "Play each line once, then choose the most appropriate response." : "Your browser has no speech synthesis; the line is shown as text."}
      </p>
      {content.items.map((it, i) => {
        const count = played[it.id] ?? 0;
        const unlocked = readOnly || !tts.supported || count > 0;
        const judged = evaluation?.per_item?.find((p) => p.id === it.id);
        return (
          <section key={it.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium">{i + 1}.</span>
              {tts.supported ? (
                <Button
                  type="button"
                  size="sm"
                  variant={count === 0 ? "default" : "outline"}
                  disabled={tts.speaking || (count >= 1 && !readOnly)}
                  onClick={async () => {
                    setPlayed((p) => ({ ...p, [it.id]: (p[it.id] ?? 0) + 1 }));
                    await tts.speak(it.speaker_line);
                  }}
                >
                  <HeadphonesIcon /> {count === 0 ? "Play" : "Played"}
                </Button>
              ) : (
                <span className="text-sm italic">“{it.speaker_line}”</span>
              )}
              {readOnly && tts.supported && <span className="text-sm italic text-muted-foreground">“{it.speaker_line}”</span>}
            </div>
            <div className={`mt-3 ${!unlocked ? "pointer-events-none opacity-40" : ""}`}>
              <ChoiceList
                name={`Item ${i + 1}`}
                options={it.options}
                value={answers[it.id]}
                onChange={(idx) => setAnswers((a) => ({ ...a, [it.id]: idx }))}
                disabled={readOnly || !unlocked}
                correctIndex={readOnly ? it.answer_index : undefined}
              />
            </div>
            {readOnly && <p className="mt-2 text-sm text-muted-foreground">{judged?.feedback ?? it.explanation}</p>}
          </section>
        );
      })}
      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Strategy:</span> {content.strategy_tip}</p>
      {!readOnly && (
        <div className="flex justify-end">
          <Button
            disabled={!ready || submitting}
            onClick={() => onSubmit({ answers: content.items.map((it) => ({ id: it.id, value: String(answers[it.id] ?? "") })), text: null, seconds_used: elapsed, input_mode: null })}
          >
            {submitting && <Loader2Icon className="animate-spin" />} Submit answers
          </Button>
        </div>
      )}
    </div>
  );
}
