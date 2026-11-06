"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startDailySessionAction } from "@/app/(app)/session/actions";

const steps = [
  "Reading your memory: weak spots, due vocabulary, recent scores…",
  "Composing vocabulary and grammar blocks…",
  "Writing original TOEFL practice material…",
  "Designing today's teaching challenge…",
  "Almost there — checking everything fits in your time budget…",
];

export function StartSessionButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState(0);

  function onClick() {
    setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(steps.length - 1, s + 1)), 9000);
    start(async () => {
      const result = await startDailySessionAction();
      clearInterval(timer);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push(`/session/${result.data.sessionId}`);
    });
  }

  return (
    <div className="space-y-2">
      <Button size="lg" onClick={onClick} disabled={pending} className="w-full sm:w-auto">
        {pending ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
        {pending ? "Composing your session" : "Generate today's session"}
      </Button>
      {pending && <p className="text-sm text-muted-foreground" aria-live="polite">{steps[step]} This usually takes under a minute.</p>}
    </div>
  );
}
