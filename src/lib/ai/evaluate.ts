import "server-only";
import { Evaluation, SessionSummary, type ExerciseContent } from "./schemas";
import { generateStructured } from "./client";
import { EVALUATION_SYSTEM, SUMMARY_SYSTEM } from "./prompts";
import { memoryDigest, type LearnerMemory } from "@/lib/learning/memory";
import { autoScore, answersToRecord, type AutoScore } from "@/lib/learning/scoring";
import { TOEFL_TASKS, type ToeflTaskType } from "@/lib/learning/toefl-spec";

function describeContent(content: ExerciseContent): string {
  // Strip answer keys where the learner should not see them; the evaluator may.
  return JSON.stringify(content, null, 1);
}

export interface EvaluateInput {
  content: ExerciseContent;
  response: unknown;
  memory: LearnerMemory;
  elapsedSeconds?: number | null;
}

export interface EvaluateOutput {
  evaluation: Evaluation;
  auto: AutoScore | null;
}

export async function evaluateExercise({ content, response, memory, elapsedSeconds }: EvaluateInput): Promise<EvaluateOutput> {
  let auto: AutoScore | null = null;
  const resp = response as { answers?: { id: string; value: string }[] } | null;
  if (content.kind.startsWith("toefl") && resp?.answers && Array.isArray(resp.answers) && typeof resp.answers[0]?.value !== "undefined") {
    auto = autoScore(content, answersToRecord(resp.answers));
  }

  const taskNote =
    "task_type" in content
      ? `TOEFL task: ${TOEFL_TASKS[content.task_type as ToeflTaskType].officialName}. Rubric-score per ETS-style criteria and give a band estimate.`
      : content.kind === "teaching_challenge"
        ? `Teaching challenge for a ${content.student.age}-year-old ${content.student.level} student (${content.student.group}). Fill "teaching".`
        : content.kind === "review_set"
          ? "Review set: judge each answer against 'expected' (meaning counts, not exact wording). Set per_item.correct; weigh the learner's self_rating only as a tie-breaker. Score = % correct."
          : content.kind === "vocabulary_set"
            ? "Vocabulary set: judge whether each original sentence demonstrates the meaning, collocation and register correctly. Set per_item with id = term."
            : "Grammar focus: judge each task answer against the model answer, accepting valid alternatives. Set per_item with id = task id.";

  const user = `LEARNER MEMORY
${memoryDigest(memory)}

EXERCISE (includes answer keys where applicable)
${describeContent(content)}

LEARNER RESPONSE
${JSON.stringify(response, null, 1)}

${auto ? `AUTO-SCORE (objective items): ${auto.percent}% — per item: ${JSON.stringify(auto.items)}\nThe "score" field MUST be ${auto.percent}.` : "No auto-score: this is a rubric-scored task."}
${elapsedSeconds != null ? `Time used: ${Math.round(elapsedSeconds)} seconds.` : ""}
${taskNote}

Evaluate now.`;

  const evaluation = await generateStructured({
    system: EVALUATION_SYSTEM,
    schema: Evaluation,
    user,
    effort: (process.env.ANTHROPIC_EFFORT as "low" | "medium" | "high" | undefined) ?? "medium",
    maxTokens: 12000,
  });

  if (auto) evaluation.score = auto.percent; // never let the model drift from the objective score
  evaluation.score = Math.max(0, Math.min(100, Math.round(evaluation.score)));
  return { evaluation, auto };
}

export async function summariseSession(
  memory: LearnerMemory,
  exercises: { title: string; skill: string; score: number | null; evaluation: Evaluation | null }[],
) {
  const user = `LEARNER MEMORY
${memoryDigest(memory)}

TODAY'S RESULTS
${exercises
  .map(
    (e) =>
      `- ${e.title} [${e.skill}] score ${e.score ?? "n/a"}: ${e.evaluation?.summary ?? "skipped"}${
        e.evaluation?.weaknesses_detected.length ? ` Weaknesses: ${e.evaluation.weaknesses_detected.map((w) => w.name).join(", ")}` : ""
      }`,
  )
  .join("\n")}

Write the session summary.`;
  return generateStructured({ system: SUMMARY_SYSTEM, schema: SessionSummary, user, effort: "low", maxTokens: 2000 });
}
