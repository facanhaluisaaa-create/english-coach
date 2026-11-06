import { describe, expect, it } from "vitest";
import { Evaluation, ExerciseContent } from "@/lib/ai/schemas";

describe("schemas", () => {
  it("discriminates exercise content by kind", () => {
    const review = ExerciseContent.safeParse({ kind: "review_set", intro: "x", items: [] });
    expect(review.success).toBe(true);
    const bad = ExerciseContent.safeParse({ kind: "nope" });
    expect(bad.success).toBe(false);
  });

  it("validates a full evaluation payload", () => {
    const ev = Evaluation.safeParse({
      score: 82,
      summary: "Solid.",
      strengths: ["range"],
      improvements: ["articles"],
      corrections: [{ original: "a advice", corrected: "a piece of advice", explanation: "uncountable", type: "error", concept: { category: "grammar", name: "uncountable nouns" } }],
      weaknesses_detected: [{ category: "grammar", name: "uncountable nouns", description: "d", severity: 3, evidence: "e" }],
      concepts_demonstrated: [],
      vocabulary_to_remember: [],
      per_item: null,
      toefl: null,
      teaching: null,
      next_step: "Practice.",
    });
    expect(ev.success).toBe(true);
  });
});
