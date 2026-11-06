import { describe, expect, it } from "vitest";
import { nextStreak } from "@/lib/learning/session-service";
import { localDateString } from "@/lib/learning/dates";

describe("streaks and dates", () => {
  it("starts a streak on the first session", () => {
    expect(nextStreak({ current_streak: 0, longest_streak: 0, last_session_date: null }, "2026-11-06")).toEqual({ current: 1, longest: 1 });
  });
  it("extends on consecutive days and resets after a gap", () => {
    expect(nextStreak({ current_streak: 3, longest_streak: 3, last_session_date: "2026-11-05" }, "2026-11-06")).toEqual({ current: 4, longest: 4 });
    expect(nextStreak({ current_streak: 3, longest_streak: 9, last_session_date: "2026-11-03" }, "2026-11-06")).toEqual({ current: 1, longest: 9 });
  });
  it("is idempotent for the same day", () => {
    expect(nextStreak({ current_streak: 3, longest_streak: 3, last_session_date: "2026-11-06" }, "2026-11-06")).toEqual({ current: 3, longest: 3 });
  });
  it("formats dates in the learner's timezone", () => {
    const instant = new Date("2026-11-06T02:30:00Z");
    expect(localDateString(instant, "America/Sao_Paulo")).toBe("2026-11-05");
    expect(localDateString(instant, "Asia/Tokyo")).toBe("2026-11-06");
    expect(localDateString(instant, "Not/AZone")).toBe("2026-11-06");
  });
});
