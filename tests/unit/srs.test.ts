import { describe, expect, it } from "vitest";
import { MASTERY_MIN_INTERVAL_DAYS, MASTERY_MIN_REPETITIONS, conceptStatusFor, masteryFor, review, reviewPriority, scoreToRating, type SrsState } from "@/lib/learning/srs";

const fresh: SrsState = { repetitions: 0, interval_days: 0, ease: 2.5, times_correct: 0, times_incorrect: 0 };
const now = new Date("2026-11-06T10:00:00Z");

describe("spaced repetition", () => {
  it("schedules the first successful review one day out", () => {
    const r = review(fresh, 4, now);
    expect(r.repetitions).toBe(1);
    expect(r.interval_days).toBe(1);
    expect(r.due_at.toISOString()).toBe("2026-11-07T10:00:00.000Z");
    expect(r.mastery).toBe("learning");
  });

  it("never marks an item mastered after a single correct answer", () => {
    const r = review(fresh, 5, now);
    expect(r.mastery).not.toBe("mastered");
    expect(masteryFor({ ...fresh, repetitions: 1, interval_days: 1, times_correct: 1 })).toBe("learning");
  });

  it("grows intervals with repeated success and reaches mastery only after sustained success", () => {
    let state: SrsState = fresh;
    let mastered = false;
    for (let i = 0; i < 8; i++) {
      const r = review(state, 5, now);
      state = r;
      if (r.mastery === "mastered") {
        mastered = true;
        expect(r.repetitions).toBeGreaterThanOrEqual(MASTERY_MIN_REPETITIONS);
        expect(r.interval_days).toBeGreaterThanOrEqual(MASTERY_MIN_INTERVAL_DAYS);
        break;
      }
    }
    expect(mastered).toBe(true);
  });

  it("resets progress and brings the item back quickly after a failure", () => {
    const strong: SrsState = { repetitions: 4, interval_days: 14, ease: 2.5, times_correct: 4, times_incorrect: 0 };
    const r = review(strong, 1, now);
    expect(r.repetitions).toBe(0);
    expect(r.interval_days).toBeLessThanOrEqual(1);
    expect(r.times_incorrect).toBe(1);
    expect(r.ease).toBeLessThan(2.5);
    expect(conceptStatusFor(r)).toBe("active");
  });

  it("keeps ease within bounds", () => {
    let state: SrsState = fresh;
    for (let i = 0; i < 20; i++) state = review(state, 0, now);
    expect(state.ease).toBeGreaterThanOrEqual(1.3);
    for (let i = 0; i < 20; i++) state = review(state, 5, now);
    expect(state.ease).toBeLessThanOrEqual(2.8);
  });

  it("denies mastery when the track record is poor even with long intervals", () => {
    expect(masteryFor({ repetitions: 6, interval_days: 30, ease: 2.5, times_correct: 6, times_incorrect: 6 })).not.toBe("mastered");
    expect(masteryFor({ repetitions: 6, interval_days: 30, ease: 2.5, times_correct: 9, times_incorrect: 1 })).toBe("mastered");
  });

  it("maps scores to ratings", () => {
    expect(scoreToRating(100)).toBe(5);
    expect(scoreToRating(88)).toBe(4);
    expect(scoreToRating(72)).toBe(3);
    expect(scoreToRating(55)).toBe(2);
    expect(scoreToRating(30)).toBe(1);
    expect(scoreToRating(0)).toBe(0);
  });

  it("prioritises overdue, frequently failed, severe items", () => {
    const overdueWeak = { ...fresh, times_incorrect: 3, due_at: "2026-11-01T00:00:00Z", severity: 5 };
    const futureStrong = { ...fresh, repetitions: 4, times_correct: 4, due_at: "2026-11-20T00:00:00Z", severity: 1 };
    expect(reviewPriority(overdueWeak, now)).toBeGreaterThan(reviewPriority(futureStrong, now));
  });
});
