"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { HeadphonesIcon, Loader2Icon, MicIcon, SquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TimerBadge } from "@/components/shared/timer-badge";
import { useCountdown, useSpeechRecognition, useTextToSpeech } from "@/lib/speech/use-speech";
import type { ToeflSpeakingContent, ToeflResponse } from "@/lib/ai/schemas";
import type { ExerciseProps } from "./types";

type C = z.infer<typeof ToeflSpeakingContent>;
type R = z.infer<typeof ToeflResponse>;

export function ToeflSpeakingExercise({ content, onSubmit, submitting, evaluation, savedResponse }: ExerciseProps<C, R>) {
  const readOnly = Boolean(evaluation);
  const repeat = content.task_type === "speaking_listen_and_repeat";
  const tts = useTextToSpeech();
  const stt = useSpeechRecognition();
  const [current, setCurrent] = useState(0);
  const [transcripts, setTranscripts] = useState<Record<string, string>>(() =>
    Object.fromEntries(content.items.map((it) => [it.id, savedResponse?.answers.find((a) => a.id === it.id)?.value ?? ""])),
  );
  const [played, setPlayed] = useState<Record<string, boolean>>({});
  const [typedMode, setTypedMode] = useState(false);
  const { remaining, elapsed } = useCountdown(content.time_limit_seconds, !readOnly);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeRef = useRef<string | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Push recognised speech into the active item.
  useEffect(() => {
    if (!activeRef.current) return;
    const id = activeRef.current;
    const text = [stt.transcript, stt.interim].filter(Boolean).join(" ").trim();
    if (text) setTranscripts((t) => ({ ...t, [id]: text }));
  }, [stt.transcript, stt.interim]);

  useEffect(() => () => { if (autoStopRef.current) clearTimeout(autoStopRef.current); }, []);

  const useSpeech = stt.supported && !typedMode;
  const ready = content.items.every((it) => transcripts[it.id].trim().length > 0);
  const item = content.items[current];

  function startRecording(id: string, seconds: number) {
    activeRef.current = id;
    setActiveId(id);
    stt.reset();
    stt.start();
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    autoStopRef.current = setTimeout(() => stt.stop(), seconds * 1000);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2"><Badge variant="secondary">Speaking</Badge><h3 className="font-semibold">{content.title}</h3></div>
        <TimerBadge remaining={remaining} elapsed={elapsed} limit={content.time_limit_seconds} />
      </div>
      <p className="text-sm text-muted-foreground">{content.context}</p>

      {!stt.supported && !readOnly && (
        <Alert>
          <AlertDescription>
            Speech recognition isn&apos;t available in this browser (try Chrome or Safari). Say your answer aloud, then type what you said so the coach can assess language and content. Pronunciation can&apos;t be rated without audio.
          </AlertDescription>
        </Alert>
      )}
      {stt.error && <Alert variant="destructive"><AlertDescription>{stt.error}</AlertDescription></Alert>}

      {readOnly ? (
        <div className="space-y-3">
          {content.items.map((it, i) => {
            const judged = evaluation?.per_item?.find((p) => p.id === it.id);
            return (
              <section key={it.id} className="rounded-xl border p-4 text-sm">
                <p className="font-medium">{i + 1}. {it.text}</p>
                <p className="mt-1 text-muted-foreground">You said: “{transcripts[it.id] || "—"}”</p>
                {judged && <p className={`mt-1 ${judged.correct === false ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>{judged.feedback}</p>}
              </section>
            );
          })}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1">
            {content.items.map((it, i) => (
              <button
                key={it.id}
                type="button"
                onClick={() => setCurrent(i)}
                className={`size-7 rounded-full border text-xs ${i === current ? "bg-primary text-primary-foreground" : transcripts[it.id] ? "bg-muted" : ""}`}
                aria-label={`Item ${i + 1}`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <section className="rounded-xl border p-4">
            {repeat ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Listen once, then repeat the sentence exactly.</p>
                {tts.supported ? (
                  <Button
                    type="button"
                    disabled={tts.speaking || played[item.id]}
                    onClick={async () => {
                      setPlayed((p) => ({ ...p, [item.id]: true }));
                      await tts.speak(item.text, { rate: 0.95 });
                      if (useSpeech) startRecording(item.id, item.response_seconds);
                    }}
                  >
                    <HeadphonesIcon /> {played[item.id] ? "Played" : "Play sentence"}
                  </Button>
                ) : (
                  <p className="text-sm italic">“{item.text}”</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium">Question {current + 1}: {item.text}</p>
                <div className="flex flex-wrap gap-2">
                  {tts.supported && (
                    <Button type="button" variant="outline" size="sm" disabled={tts.speaking} onClick={() => tts.speak(item.text)}>
                      <HeadphonesIcon /> Hear the question
                    </Button>
                  )}
                  <span className="self-center text-xs text-muted-foreground">Prep {item.prep_seconds}s · Speak up to {item.response_seconds}s</span>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {useSpeech && (
                stt.listening && activeId === item.id ? (
                  <Button type="button" variant="destructive" onClick={() => stt.stop()}>
                    <SquareIcon /> Stop recording
                  </Button>
                ) : (
                  <Button type="button" onClick={() => startRecording(item.id, item.response_seconds)} disabled={tts.speaking}>
                    <MicIcon /> {transcripts[item.id] ? "Record again" : "Record answer"}
                  </Button>
                )
              )}
              {stt.supported && (
                <button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:underline" onClick={() => setTypedMode((m) => !m)}>
                  {typedMode ? "Use the microphone" : "Type instead"}
                </button>
              )}
            </div>

            {stt.listening && activeId === item.id && (
              <p className="mt-2 flex items-center gap-2 text-xs text-destructive" aria-live="polite">
                <span className="size-2 animate-pulse rounded-full bg-destructive" /> Listening…
              </p>
            )}

            <Textarea
              className="mt-3 min-h-24"
              value={transcripts[item.id]}
              readOnly={useSpeech}
              placeholder={useSpeech ? "Your words appear here as you speak." : "Type what you said."}
              onChange={(e) => setTranscripts((t) => ({ ...t, [item.id]: e.target.value }))}
              aria-label="Transcript"
            />
            <div className="mt-3 flex justify-between">
              <Button type="button" variant="ghost" size="sm" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>Previous</Button>
              <Button type="button" variant="outline" size="sm" disabled={current === content.items.length - 1} onClick={() => setCurrent((c) => c + 1)}>Next item</Button>
            </div>
          </section>
        </>
      )}

      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Strategy:</span> {content.strategy_tip}</p>

      {!readOnly && (
        <div className="flex justify-end">
          <Button
            disabled={!ready || submitting}
            onClick={() => {
              stt.stop();
              onSubmit({
                answers: content.items.map((it) => ({ id: it.id, value: transcripts[it.id].trim() })),
                text: null,
                seconds_used: elapsed,
                input_mode: useSpeech ? "speech" : "typed",
              });
            }}
          >
            {submitting && <Loader2Icon className="animate-spin" />} Submit for rating
          </Button>
        </div>
      )}
    </div>
  );
}
