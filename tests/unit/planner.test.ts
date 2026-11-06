import { describe, expect, it } from "vitest";
import { pickToeflTask, planDailyBlocks, totalMinutes } from "@/lib/learning/planner";
import { TOEFL_TASKS } from "@/lib/learning/toefl-spec";

describe("daily planner", () => {
  it("builds the default four-block, ~20-minute session", () => {
    const blocks = planDailyBlocks({ completedSessions: 0, dueReviewCount: 0, goalMinutes: 20 });
    expect(blocks.map((b) => b.skill)).toEqual(["vocabulary", "grammar", "toefl", "teaching"]);
    expect(totalMinutes(blocks)).toBeGreaterThanOrEqual(18);
    expect(totalMinutes(blocks)).toBeLessThanOrEqual(22);
  });

  it("adds a review block when enough items are due, keeping the time budget", () => {
    const blocks = planDailyBlocks({ completedSessions: 3, dueReviewCount: 5, goalMinutes: 20 });
    expect(blocks[0].skill).toBe("review");
    expect(blocks).toHaveLength(5);
    expect(totalMinutes(blocks)).toBeLessThanOrEqual(22);
  });

  it("rotates TOEFL sections reading → listening → speaking → writing", () => {
    const sections = [0, 1, 2, 3].map((n) => TOEFL_TASKS[pickToeflTask(n)].section);
    expect(sections).toEqual(["reading", "listening", "speaking", "writing"]);
    // and cycles through task types within a section on later rounds
    expect(pickToeflTask(0)).not.toBe(pickToeflTask(4));
  });

  it("biases toward the weakest section every fourth session", () => {
    expect(TOEFL_TASKS[pickToeflTask(3, { weakestToeflSections: ["listening"] })].section).toBe("listening");
    expect(TOEFL_TASKS[pickToeflTask(2, { weakestToeflSections: ["listening"] })].section).toBe("speaking");
  });

  it("scales block length with the learner's goal", () => {
    const short = planDailyBlocks({ completedSessions: 0, dueReviewCount: 0, goalMinutes: 10 });
    const long = planDailyBlocks({ completedSessions: 0, dueReviewCount: 0, goalMinutes: 40 });
    expect(totalMinutes(short)).toBeLessThan(totalMinutes(long));
  });
});
