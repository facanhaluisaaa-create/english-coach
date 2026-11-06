"use client";

import { useState } from "react";
import { z } from "zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SpeakButton } from "@/components/shared/speak-button";
import type { VocabularyContent, VocabularyResponse } from "@/lib/ai/schemas";
import type { ExerciseProps } from "./types";

type R = z.infer<typeof VocabularyResponse>;

export function VocabularyExercise({ content, onSubmit, submitting, evaluation, savedResponse }: ExerciseProps<VocabularyContent, R>) {
  const [sentences, setSentences] = useState<Record<string, string>>(() =>
    Object.fromEntries(content.items.map((it) => [it.term, savedResponse?.sentences.find((s) => s.term === it.term)?.sentence ?? ""])),
  );
  const readOnly = Boolean(evaluation);
  const ready = content.items.every((it) => sentences[it.term].trim().length > 8);

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-muted-foreground">{content.intro}</p>
      <div className="space-y-5">
        {content.items.map((it, i) => {
          const judged = evaluation?.per_item?.find((p) => p.id.toLowerCase() === it.term.toLowerCase());
          return (
            <section key={it.term} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold">{it.term}</h3>
                <span className="text-sm italic text-muted-foreground">{it.part_of_speech}</span>
                <Badge variant="secondary">{it.cefr_level}</Badge>
                <Badge variant="outline">{it.register}</Badge>
                <SpeakButton text={it.term} label="Hear it" size="sm" variant="ghost" />
              </div>
              <p className="mt-2 text-sm">{it.definition}</p>
              <p className="mt-1 text-sm text-muted-foreground">“{it.example}”</p>
              {it.collocations.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Collocations:</span> {it.collocations.join(" · ")}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground"><span className="font-medium text-foreground">Nuance:</span> {it.nuance}</p>
              <p className="mt-1 text-xs text-muted-foreground"><span className="font-medium text-foreground">Usage:</span> {it.usage_note}</p>
              <div className="mt-3">
                <label htmlFor={`sentence-${i}`} className="text-sm font-medium">Your original sentence</label>
                <Textarea
                  id={`sentence-${i}`}
                  className="mt-1 min-h-20"
                  value={sentences[it.term]}
                  readOnly={readOnly}
                  placeholder={`Use “${it.term}” in a sentence that makes its meaning clear from context.`}
                  onChange={(e) => setSentences((s) => ({ ...s, [it.term]: e.target.value }))}
                />
              </div>
              {judged && (
                <p className={`mt-2 text-sm ${judged.correct === false ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>{judged.feedback}</p>
              )}
            </section>
          );
        })}
      </div>
      {!readOnly && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{content.task}</p>
          <Button
            onClick={() => onSubmit({ sentences: content.items.map((it) => ({ term: it.term, sentence: sentences[it.term].trim() })) })}
            disabled={!ready || submitting}
          >
            {submitting && <Loader2Icon className="animate-spin" />} Submit for feedback
          </Button>
        </div>
      )}
    </div>
  );
}
