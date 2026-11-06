"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2Icon, PlayIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TOEFL_SECTIONS, TOEFL_TASKS, type ToeflSection, type ToeflTaskType } from "@/lib/learning/toefl-spec";
import { startToeflPracticeAction } from "@/app/(app)/session/actions";

const interfaceLabel = { text: "On-screen", "tts-listening": "Browser audio", speech: "Microphone" } as const;

export function ToeflTaskGrid() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [active, setActive] = useState<ToeflTaskType | null>(null);

  function launch(task: ToeflTaskType) {
    setActive(task);
    start(async () => {
      const result = await startToeflPracticeAction(task);
      if (!result.ok) {
        toast.error(result.error);
        setActive(null);
        return;
      }
      router.push(`/session/${result.data.sessionId}`);
    });
  }

  return (
    <div className="space-y-6">
      {(Object.keys(TOEFL_SECTIONS) as ToeflSection[]).map((s) => (
        <section key={s}>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{TOEFL_SECTIONS[s].name}</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TOEFL_SECTIONS[s].tasks.map((t) => {
              const spec = TOEFL_TASKS[t];
              const busy = pending && active === t;
              return (
                <div key={t} className="flex flex-col rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{spec.officialName}</p>
                    <Badge variant="outline">{interfaceLabel[spec.interface]}</Badge>
                  </div>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">{spec.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">~{spec.practiceMinutes} min · {spec.scoring === "objective" ? "auto-scored" : "rubric-rated"}</span>
                    <Button size="sm" onClick={() => launch(t)} disabled={pending}>
                      {busy ? <Loader2Icon className="animate-spin" /> : <PlayIcon />} {busy ? "Preparing" : "Start"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
