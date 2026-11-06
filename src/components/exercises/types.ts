import type { Evaluation } from "@/lib/ai/schemas";

export interface ExerciseProps<C, R> {
  content: C;
  onSubmit: (response: R) => void;
  submitting: boolean;
  /** Present after evaluation: components render read-only with answer reveal. */
  evaluation?: Evaluation | null;
  /** Previously saved response (read-only mode). */
  savedResponse?: R | null;
  /** Called by components whenever the elapsed time should be reported (optional). */
  onElapsed?: (seconds: number) => void;
}
