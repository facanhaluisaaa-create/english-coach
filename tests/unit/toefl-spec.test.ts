import { describe, expect, it } from "vitest";
import { TOEFL_SECTIONS, TOEFL_TASKS, TOEFL_TASK_TYPES, overallBand, percentToBand, roundToHalfBand, sectionOf } from "@/lib/learning/toefl-spec";

describe("TOEFL iBT 2026 specification", () => {
  it("matches the official ETS section table (verified 2026-11-06)", () => {
    expect(TOEFL_SECTIONS.reading).toMatchObject({ items: 50, baseMinutes: 30, adaptive: true });
    expect(TOEFL_SECTIONS.listening).toMatchObject({ items: 47, baseMinutes: 29, adaptive: true });
    expect(TOEFL_SECTIONS.writing).toMatchObject({ items: 12, baseMinutes: 23, adaptive: false });
    expect(TOEFL_SECTIONS.speaking).toMatchObject({ items: 11, baseMinutes: 8, adaptive: false });
  });

  it("defines the twelve official task types with consistent sections", () => {
    expect(TOEFL_TASK_TYPES).toHaveLength(12);
    const names = TOEFL_TASK_TYPES.map((t) => TOEFL_TASKS[t].officialName);
    expect(names).toEqual(
      expect.arrayContaining([
        "Complete the Words",
        "Read in Daily Life",
        "Read an Academic Passage",
        "Listen and Choose a Response",
        "Listen to a Conversation",
        "Listen to an Announcement",
        "Listen to an Academic Talk",
        "Build a Sentence",
        "Write an Email",
        "Write for an Academic Discussion",
        "Listen and Repeat",
        "Take an Interview",
      ]),
    );
    for (const section of Object.keys(TOEFL_SECTIONS) as (keyof typeof TOEFL_SECTIONS)[]) {
      for (const task of TOEFL_SECTIONS[section].tasks) expect(sectionOf(task)).toBe(section);
    }
  });

  it("computes the overall band as the rounded mean (ETS example: 5.125 → 5)", () => {
    expect(overallBand({ reading: 5.5, listening: 5, speaking: 5, writing: 5 })).toBe(5);
    expect(overallBand({ reading: 6, listening: 6, speaking: 5.5, writing: 5.5 })).toBe(6);
    expect(roundToHalfBand(5.25)).toBe(5.5);
    expect(roundToHalfBand(7)).toBe(6);
    expect(roundToHalfBand(0)).toBe(1);
  });

  it("maps practice percentages into the 1–6 band range", () => {
    expect(percentToBand(0)).toBe(1);
    expect(percentToBand(100)).toBe(6);
    expect(percentToBand(50)).toBe(3.5);
  });
});
