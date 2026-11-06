"use client";

import { useState } from "react";
import { z } from "zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { TimerBadge } from "@/components/shared/timer-badge";
import { useCountdown } from "@/lib/speech/use-speech";
import type { ToeflWritingContent, ToeflResponse } from "@/lib/ai/schemas";
import type { ExerciseProps } from "./types";

type C = z.infer<typeof ToeflWritingContent>;
type R = z.infer<typeof ToeflResponse>;

export function ToeflWritingExercise({ content, onSubmit, submitting, evaluation, savedResponse }: ExerciseProps<C, R>) {
  const readOnly = Boolean(evaluation);
  const [text, setText] = useState(savedResponse?.text ?? "");
  const { remaining, elapsed } = useCountdown(content.time_limit_seconds, !readOnly);
  const words = text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Writing</Badge>
          <h3 className="font-semibold">{content.task_type === "writing_email" ? "Write an Email" : "Write for an Academic Discussion"}</h3>
        </div>
        <TimerBadge remaining={remaining} elapsed={elapsed} limit={content.time_limit_seconds} />
      </div>
      <div className="rounded-xl border p-4 text-sm">
        <p className="font-medium">{content.title}</p>
        <p className="mt-1 text-muted-foreground">{content.situation}</p>
        {content.discussion && (
          <div className="mt-3 space-y-2">
            <div className="rounded-lg bg-muted/50 p-3"><span className="font-medium">Professor:</span> {content.discussion.professor_prompt}</div>
            {content.discussion.student_posts.map((p) => (
              <div key={p.name} className="rounded-lg bg-muted/30 p-3"><span className="font-medium">{p.name}:</span> {p.post}</div>
            ))}
          </div>
        )}
        <p className="mt-3">{content.instructions}</p>
        <ul className="mt-2 list-disc pl-5 text-muted-foreground">
          {content.required_points.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">Minimum {content.min_words} words.</p>
      </div>
      <div>
        <Textarea
          className="min-h-56 text-[15px] leading-relaxed"
          value={text}
          readOnly={readOnly}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your response here…"
          aria-label="Your response"
          spellCheck={false}
        />
        <p className="mt-1 text-xs text-muted-foreground">{words} words {words < content.min_words && !readOnly ? `· ${content.min_words - words} to go` : ""}</p>
      </div>
      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Strategy:</span> {content.strategy_tip}</p>
      {!readOnly && (
        <div className="flex justify-end">
          <Button disabled={words < Math.min(40, content.min_words) || submitting} onClick={() => onSubmit({ answers: [], text: text.trim(), seconds_used: elapsed, input_mode: "typed" })}>
            {submitting && <Loader2Icon className="animate-spin" />} Submit for rating
          </Button>
        </div>
      )}
    </div>
  );
}
