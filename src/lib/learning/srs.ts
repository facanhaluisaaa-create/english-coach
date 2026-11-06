/**
 * Spaced repetition (SM-2 variant) with a mastery policy that never promotes an item
 * to "mastered" on the basis of a single correct answer.
 */

export interface SrsState {
  repetitions: number;
  interval_days: number;
  ease: number;
  times_correct: number;
  times_incorrect: number;
}

export interface SrsResult extends SrsState {
  due_at: Date;
  mastery: "new" | "learning" | "reviewing" | "mastered";
}

export type Rating = 0 | 1 | 2 | 3 | 4 | 5;

export const MIN_EASE = 1.3;
export const MAX_EASE = 2.8;

/** Reviews must be spread over at least this many separate successful sessions before mastery. */
export const MASTERY_MIN_REPETITIONS = 5;
export const MASTERY_MIN_INTERVAL_DAYS = 21;

export function scoreToRating(percent: number): Rating {
  if (percent >= 95) return 5;
  if (percent >= 85) return 4;
  if (percent >= 70) return 3;
  if (percent >= 50) return 2;
  if (percent >= 25) return 1;
  return 0;
}

export function review(state: SrsState, rating: Rating, now: Date = new Date()): SrsResult {
  const correct = rating >= 3;
  let { repetitions, interval_days, ease } = state;

  if (correct) {
    if (repetitions === 0) interval_days = 1;
    else if (repetitions === 1) interval_days = 3;
    else interval_days = Math.round(interval_days * ease * 10) / 10;
    repetitions += 1;
  } else {
    repetitions = 0;
    interval_days = rating === 2 ? 1 : 0.5; // "almost" gets a day; hard failure returns within 12 hours
  }

  ease = ease + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
  ease = Math.max(MIN_EASE, Math.min(MAX_EASE, Math.round(ease * 100) / 100));

  const times_correct = state.times_correct + (correct ? 1 : 0);
  const times_incorrect = state.times_incorrect + (correct ? 0 : 1);

  const due_at = new Date(now.getTime() + interval_days * 24 * 60 * 60 * 1000);

  return {
    repetitions,
    interval_days,
    ease,
    times_correct,
    times_incorrect,
    due_at,
    mastery: masteryFor({ repetitions, interval_days, ease, times_correct, times_incorrect }),
  };
}

export function masteryFor(state: SrsState): SrsResult["mastery"] {
  if (state.repetitions === 0 && state.times_correct === 0 && state.times_incorrect === 0) return "new";
  if (state.repetitions >= MASTERY_MIN_REPETITIONS && state.interval_days >= MASTERY_MIN_INTERVAL_DAYS) {
    // Require a convincing track record, not a streak after many failures.
    const total = state.times_correct + state.times_incorrect;
    if (total > 0 && state.times_correct / total >= 0.8) return "mastered";
  }
  if (state.repetitions >= 2) return "reviewing";
  return "learning";
}

/** Concept status for weaknesses: active → improving → mastered. */
export function conceptStatusFor(state: SrsState): "active" | "improving" | "mastered" {
  const m = masteryFor(state);
  if (m === "mastered") return "mastered";
  if (m === "reviewing") return "improving";
  return "active";
}

/**
 * Priority for choosing what to review next: overdue and weak items first,
 * but never starve new material (callers mix in new items separately).
 */
export function reviewPriority(item: SrsState & { due_at: string | Date; severity?: number }, now = new Date()) {
  const due = new Date(item.due_at).getTime();
  const overdueDays = (now.getTime() - due) / 86_400_000;
  const failRate = item.times_incorrect / Math.max(1, item.times_correct + item.times_incorrect);
  return overdueDays + failRate * 3 + (item.severity ?? 3) * 0.5 - item.repetitions * 0.2;
}
