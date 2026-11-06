import { describe, expect, it } from "vitest";
import { answersToRecord, autoScore, normalise, wordSimilarity } from "@/lib/learning/scoring";
import type { ExerciseContent } from "@/lib/ai/schemas";

describe("objective scoring", () => {
  it("normalises punctuation, case and quotes", () => {
    expect(normalise("  It’s   great, isn’t it?")).toBe("it's great isn't it");
  });

  it("measures word-level similarity", () => {
    expect(wordSimilarity("I would like a coffee", "I would like a coffee.")).toBe(1);
    expect(wordSimilarity("I would like a coffee", "I like coffee")).toBeGreaterThan(0.6);
    expect(wordSimilarity("hello", "")).toBe(0);
  });

  it("scores multiple-choice passages", () => {
    const content: ExerciseContent = {
      kind: "toefl_passage",
      task_type: "reading_daily_life",
      title: "Notice",
      passage: "The library closes early on Friday.",
      speakers: [],
      questions: [
        { id: "1", question: "When?", options: ["Monday", "Friday"], answer_index: 1, explanation: "" },
        { id: "2", question: "What?", options: ["Library", "Gym"], answer_index: 0, explanation: "" },
      ],
      strategy_tip: "",
      time_limit_seconds: 120,
    };
    const result = autoScore(content, answersToRecord([{ id: "1", value: "1" }, { id: "2", value: "1" }]));
    expect(result?.percent).toBe(50);
    expect(result?.items.map((i) => i.correct)).toEqual([true, false]);
  });

  it("scores complete-the-words with or without the shown prefix", () => {
    const content: ExerciseContent = {
      kind: "toefl_complete_words",
      task_type: "reading_complete_the_words",
      title: "t",
      passage: "The {{1}} was closed.",
      gaps: [{ id: "1", shown: "lib", answer: "library" }],
      strategy_tip: "",
      time_limit_seconds: 60,
    };
    expect(autoScore(content, { "1": "rary" })?.percent).toBe(100);
    expect(autoScore(content, { "1": "Library" })?.percent).toBe(100);
    expect(autoScore(content, { "1": "liberty" })?.percent).toBe(0);
  });

  it("scores build-a-sentence by normalised equality", () => {
    const content: ExerciseContent = {
      kind: "toefl_build_sentence",
      task_type: "writing_build_a_sentence",
      items: [{ id: "1", context: "", chunks: ["Could you", "send me", "the notes?"], answer: "Could you send me the notes?" }],
      strategy_tip: "",
      time_limit_seconds: 60,
    };
    expect(autoScore(content, { "1": "could you send me the notes" })?.percent).toBe(100);
    expect(autoScore(content, { "1": "send me could you the notes" })?.percent).toBe(0);
  });

  it("gives partial credit on listen-and-repeat and none for rubric tasks", () => {
    const repeat: ExerciseContent = {
      kind: "toefl_speaking",
      task_type: "speaking_listen_and_repeat",
      title: "",
      context: "",
      items: [{ id: "1", text: "The lecture starts at nine tomorrow morning", prep_seconds: 0, response_seconds: 10 }],
      strategy_tip: "",
      time_limit_seconds: 60,
    };
    const r = autoScore(repeat, { "1": "The lecture starts at nine tomorrow" });
    expect(r?.percent).toBeGreaterThan(80);
    expect(r?.percent).toBeLessThan(100);
    expect(autoScore({ ...repeat, task_type: "speaking_interview" }, { "1": "anything" })).toBeNull();
  });
});
