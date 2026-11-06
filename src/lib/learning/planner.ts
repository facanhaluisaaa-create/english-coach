/**
 * Deterministic daily planner. Decides WHICH blocks today's session contains;
 * the AI generates the content of each block.
 */
import type { PlanBlock } from "./plan-types";
import { TOEFL_SECTIONS, TOEFL_SECTION_ROTATION, TOEFL_TASKS, type ToeflSection, type ToeflTaskType } from "./toefl-spec";

export interface PlannerInput {
  /** Number of daily sessions completed so far (drives rotations). */
  completedSessions: number;
  /** Number of vocabulary items + concepts due for review today. */
  dueReviewCount: number;
  /** Learner-chosen daily minutes (default 20). */
  goalMinutes: number;
  /** TOEFL sections with the weakest recent practice scores first (optional bias). */
  weakestToeflSections?: ToeflSection[];
  /** A section the learner explicitly asked to focus on (from settings), optional. */
  preferredToeflSection?: ToeflSection | null;
}

export function pickToeflTask(completedSessions: number, input?: Pick<PlannerInput, "weakestToeflSections" | "preferredToeflSection">): ToeflTaskType {
  let section: ToeflSection = TOEFL_SECTION_ROTATION[completedSessions % TOEFL_SECTION_ROTATION.length];
  // Every 4th session, bias toward the weakest section instead of strict rotation.
  if (input?.preferredToeflSection) section = input.preferredToeflSection;
  else if (completedSessions % 4 === 3 && input?.weakestToeflSections?.[0]) section = input.weakestToeflSections[0];
  const tasks = TOEFL_SECTIONS[section].tasks;
  const cycle = Math.floor(completedSessions / TOEFL_SECTION_ROTATION.length);
  return tasks[cycle % tasks.length];
}

export function planDailyBlocks(input: PlannerInput): PlanBlock[] {
  const scale = Math.max(0.5, Math.min(3, input.goalMinutes / 20));
  const m = (n: number) => Math.max(2, Math.round(n * scale));
  const includeReview = input.dueReviewCount >= 3;
  const toeflTask = pickToeflTask(input.completedSessions, input);
  const toeflSpec = TOEFL_TASKS[toeflTask];

  const blocks: PlanBlock[] = [];
  if (includeReview) {
    blocks.push({
      skill: "review",
      exercise_type: "review_set",
      title: "Active recall: due vocabulary and weak spots",
      estimated_minutes: m(3),
      focus: "Spaced repetition of items due today",
    });
  }
  blocks.push(
    {
      skill: "vocabulary",
      exercise_type: "vocabulary_set",
      title: "Advanced vocabulary",
      estimated_minutes: m(includeReview ? 4 : 5),
      focus: "C1–C2 vocabulary, collocations or idiomatic language with original sentences",
    },
    {
      skill: "grammar",
      exercise_type: "grammar_focus",
      title: "Grammar and precision",
      estimated_minutes: m(includeReview ? 4 : 5),
      focus: "An advanced structure or a recurring weakness: meaning, form, use, register",
    },
    {
      skill: "toefl",
      exercise_type: toeflTask,
      title: `TOEFL practice: ${toeflSpec.officialName}`,
      estimated_minutes: m(Math.min(5, toeflSpec.practiceMinutes)),
      focus: `${TOEFL_SECTIONS[toeflSpec.section].name} section — ${toeflSpec.officialName}`,
    },
    {
      skill: "teaching",
      exercise_type: "teaching_challenge",
      title: "Teaching challenge",
      estimated_minutes: m(includeReview ? 4 : 5),
      focus: "Explain, correct or plan for a simulated student",
    },
  );
  return blocks;
}

export function totalMinutes(blocks: PlanBlock[]) {
  return blocks.reduce((a, b) => a + b.estimated_minutes, 0);
}
