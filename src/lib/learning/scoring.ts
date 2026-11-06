/** Objective scoring for TOEFL items that have a single correct answer. */
import type { ExerciseContent } from "@/lib/ai/schemas";

export interface ItemResult {
  id: string;
  correct: boolean;
  expected: string;
  given: string;
}
export interface AutoScore {
  percent: number;
  items: ItemResult[];
}

export function normalise(text: string) {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[.,!?;:"()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordSimilarity(a: string, b: string) {
  const x = normalise(a).split(" ").filter(Boolean);
  const y = normalise(b).split(" ").filter(Boolean);
  if (x.length === 0 && y.length === 0) return 1;
  if (x.length === 0 || y.length === 0) return 0;
  // Longest common subsequence ratio
  const dp: number[][] = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      dp[i][j] = x[i - 1] === y[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return (2 * dp[x.length][y.length]) / (x.length + y.length);
}

function pct(items: ItemResult[]) {
  if (items.length === 0) return 0;
  return Math.round((items.filter((i) => i.correct).length / items.length) * 100);
}

/** Returns null for rubric-scored content. */
export function autoScore(content: ExerciseContent, answers: Record<string, string>): AutoScore | null {
  switch (content.kind) {
    case "toefl_passage": {
      const items = content.questions.map((q) => {
        const given = answers[q.id] ?? "";
        return { id: q.id, expected: String(q.answer_index), given, correct: given !== "" && Number(given) === q.answer_index };
      });
      return { percent: pct(items), items };
    }
    case "toefl_choose_response": {
      const items = content.items.map((q) => {
        const given = answers[q.id] ?? "";
        return { id: q.id, expected: String(q.answer_index), given, correct: given !== "" && Number(given) === q.answer_index };
      });
      return { percent: pct(items), items };
    }
    case "toefl_complete_words": {
      const items = content.gaps.map((g) => {
        const given = (answers[g.id] ?? "").trim();
        const full = given.toLowerCase().startsWith(g.shown.toLowerCase()) ? given : g.shown + given;
        return { id: g.id, expected: g.answer, given: full, correct: normalise(full) === normalise(g.answer) };
      });
      return { percent: pct(items), items };
    }
    case "toefl_build_sentence": {
      const items = content.items.map((it) => {
        const given = answers[it.id] ?? "";
        return { id: it.id, expected: it.answer, given, correct: normalise(given) === normalise(it.answer) };
      });
      return { percent: pct(items), items };
    }
    case "toefl_speaking": {
      if (content.task_type !== "speaking_listen_and_repeat") return null;
      const items = content.items.map((it) => {
        const given = answers[it.id] ?? "";
        const sim = wordSimilarity(given, it.text);
        return { id: it.id, expected: it.text, given, correct: sim >= 0.85 };
      });
      // Partial credit for near misses
      const percent = Math.round(
        (content.items.reduce((acc, it) => acc + Math.max(0, wordSimilarity(answers[it.id] ?? "", it.text)), 0) /
          Math.max(1, content.items.length)) *
          100,
      );
      return { percent, items };
    }
    default:
      return null;
  }
}

export function answersToRecord(answers: { id: string; value: string }[] | undefined) {
  const rec: Record<string, string> = {};
  for (const a of answers ?? []) rec[a.id] = a.value;
  return rec;
}
