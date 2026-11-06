"use client";

import { TimerIcon } from "lucide-react";
import { formatSeconds } from "@/lib/speech/use-speech";
import { cn } from "@/lib/utils";

export function TimerBadge({ remaining, elapsed, limit }: { remaining: number | null; elapsed: number; limit: number | null }) {
  const low = remaining != null && limit != null && remaining <= Math.min(30, limit * 0.15);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-xs tabular-nums",
        low ? "border-destructive/40 text-destructive" : "text-muted-foreground",
      )}
      aria-live="polite"
    >
      <TimerIcon className="size-3.5" />
      {remaining != null ? formatSeconds(remaining) : formatSeconds(elapsed)}
      {limit != null && remaining === 0 && <span className="ml-1 font-sans">time&apos;s up — submit when ready</span>}
    </span>
  );
}
