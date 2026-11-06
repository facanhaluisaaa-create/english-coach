"use client";

import { cn } from "@/lib/utils";

/** Accessible single-choice list for multiple-choice questions. */
export function ChoiceList({
  name,
  options,
  value,
  onChange,
  disabled,
  correctIndex,
}: {
  name: string;
  options: string[];
  value: number | null;
  onChange: (index: number) => void;
  disabled?: boolean;
  /** When provided (after evaluation), shows correct/incorrect styling. */
  correctIndex?: number | null;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="grid gap-2">
      {options.map((opt, i) => {
        const selected = value === i;
        const reveal = correctIndex != null;
        const isCorrect = reveal && i === correctIndex;
        const isWrong = reveal && selected && i !== correctIndex;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(i)}
            className={cn(
              "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
              selected && !reveal && "border-primary bg-primary/5",
              !selected && !disabled && "hover:bg-muted/60",
              isCorrect && "border-emerald-500/60 bg-emerald-500/10",
              isWrong && "border-destructive/60 bg-destructive/10",
              disabled && "cursor-default",
            )}
          >
            <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold", selected && "border-primary bg-primary text-primary-foreground")}>
              {String.fromCharCode(65 + i)}
            </span>
            <span>{opt}</span>
          </button>
        );
      })}
    </div>
  );
}
