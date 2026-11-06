import "server-only";
import type { Json } from "@/lib/db/json";
import type { ExerciseRow, LearningSessionRow, ProfileRow } from "@/lib/db/types";
import { Evaluation, ExerciseContent, type SessionPlan } from "@/lib/ai/schemas";
import { generateBlock, generateTeaching, generateToefl, type TeachingOptions } from "@/lib/ai/generate";
import { evaluateExercise, summariseSession } from "@/lib/ai/evaluate";
import { applyEvaluationToMemory } from "./memory-writer";
import { loadLearnerMemory, type Db, type LearnerMemory } from "./memory";
import { planDailyBlocks, totalMinutes } from "./planner";
import type { PlanBlock } from "./plan-types";
import { TOEFL_TASKS, type ToeflTaskType } from "./toefl-spec";
import { localDateString } from "./dates";

export class SessionError extends Error {}

export async function getTodaySession(db: Db, userId: string, timezone: string) {
  const today = localDateString(new Date(), timezone);
  const { data } = await db
    .from("learning_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("kind", "daily")
    .eq("session_date", today)
    .maybeSingle();
  return data;
}

/** Creates (or returns) today's daily session with all blocks generated in parallel. */
export async function ensureDailySession(db: Db, userId: string, profile: ProfileRow): Promise<LearningSessionRow> {
  const existing = await getTodaySession(db, userId, profile.timezone);
  if (existing) return existing;

  const memory = await loadLearnerMemory(db, userId, profile);
  const blocks = planDailyBlocks({
    completedSessions: memory.completedSessions,
    dueReviewCount: memory.dueVocabulary.length + memory.dueConcepts.length,
    goalMinutes: profile.daily_goal_minutes,
    weakestToeflSections: memory.weakestToeflSections,
  });

  const contents = await Promise.all(blocks.map((b) => generateBlock(memory, b)));
  const plan: SessionPlan = {
    title: `Day ${memory.completedSessions + 1}`,
    theme: contents.find((c) => c.kind === "vocabulary_set")?.theme ?? "Daily practice",
    rationale: buildRationale(memory, blocks),
    blocks,
    total_minutes: totalMinutes(blocks),
  };

  const today = localDateString(new Date(), profile.timezone);
  const { data: session, error } = await db
    .from("learning_sessions")
    .insert({ user_id: userId, kind: "daily", session_date: today, status: "planned", plan: plan as unknown as Json, max_score: blocks.length * 100 })
    .select("*")
    .single();
  if (error || !session) {
    // Race: another request created it meanwhile.
    const again = await getTodaySession(db, userId, profile.timezone);
    if (again) return again;
    throw new SessionError(error?.message ?? "Could not create session.");
  }

  await insertExercises(db, userId, session.id, blocks, contents);
  return session;
}

async function insertExercises(db: Db, userId: string, sessionId: string, blocks: PlanBlock[], contents: ExerciseContent[]) {
  const rows = blocks
    .map((b, i) => ({ b, c: contents[i] }))
    // Drop an empty review block (nothing due after all)
    .filter(({ c }) => !(c.kind === "review_set" && c.items.length === 0))
    .map(({ b, c }, position) => ({
      session_id: sessionId,
      user_id: userId,
      position,
      skill: b.skill,
      exercise_type: b.exercise_type,
      title: c.kind === "vocabulary_set" ? `Vocabulary: ${c.theme}` : c.kind === "grammar_focus" ? `Grammar: ${c.topic}` : b.title,
      estimated_minutes: b.estimated_minutes,
      content: c as unknown as Json,
      max_score: 100,
    }));
  const { error } = await db.from("exercises").insert(rows);
  if (error) throw new SessionError(error.message);
}

function buildRationale(memory: LearnerMemory, blocks: PlanBlock[]) {
  const parts: string[] = [];
  if (memory.weaknesses.length) parts.push(`Revisits "${memory.weaknesses[0].name}" and other recurring weak spots.`);
  if (memory.dueVocabulary.length) parts.push(`${memory.dueVocabulary.length} vocabulary item(s) are due for review.`);
  const toefl = blocks.find((b) => b.skill === "toefl");
  if (toefl) parts.push(`TOEFL rotation lands on ${toefl.focus}.`);
  if (!parts.length) parts.push("A balanced first session to calibrate your level across vocabulary, grammar, TOEFL and teaching.");
  return parts.join(" ");
}

/** On-demand single-exercise practice session (TOEFL hub / Teaching hub). */
export async function createPracticeSession(
  db: Db,
  userId: string,
  profile: ProfileRow,
  request: { kind: "toefl"; taskType: ToeflTaskType } | { kind: "teaching"; options: TeachingOptions },
): Promise<{ session: LearningSessionRow; exercise: ExerciseRow }> {
  const memory = await loadLearnerMemory(db, userId, profile);
  let block: PlanBlock;
  let content: ExerciseContent;
  if (request.kind === "toefl") {
    const spec = TOEFL_TASKS[request.taskType];
    block = {
      skill: "toefl",
      exercise_type: request.taskType,
      title: `TOEFL practice: ${spec.officialName}`,
      estimated_minutes: spec.practiceMinutes,
      focus: `${spec.section} — ${spec.officialName}`,
    };
    content = await generateToefl(memory, block, request.taskType);
  } else {
    block = {
      skill: "teaching",
      exercise_type: "teaching_challenge",
      title: "Teaching simulation",
      estimated_minutes: 6,
      focus: request.options.concept ?? "Teaching challenge",
    };
    content = await generateTeaching(memory, block, request.options);
  }
  const plan: SessionPlan = { title: block.title, theme: block.focus, rationale: "On-demand practice.", blocks: [block], total_minutes: block.estimated_minutes };
  const { data: session, error } = await db
    .from("learning_sessions")
    .insert({
      user_id: userId,
      kind: "practice",
      session_date: localDateString(new Date(), profile.timezone),
      status: "in_progress",
      plan: plan as unknown as Json,
      max_score: 100,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error || !session) throw new SessionError(error?.message ?? "Could not create practice session.");
  await insertExercises(db, userId, session.id, [block], [content]);
  const { data: exercise } = await db.from("exercises").select("*").eq("session_id", session.id).order("position").limit(1).single();
  if (!exercise) throw new SessionError("Exercise missing.");
  return { session, exercise };
}

export async function submitExercise(db: Db, userId: string, profile: ProfileRow, exerciseId: string, response: unknown, elapsedSeconds?: number | null) {
  const { data: exercise } = await db.from("exercises").select("*").eq("id", exerciseId).eq("user_id", userId).single();
  if (!exercise) throw new SessionError("Exercise not found.");
  if (exercise.status === "evaluated" && exercise.evaluation) {
    return { exercise, evaluation: Evaluation.parse(exercise.evaluation) };
  }
  const content = ExerciseContent.parse(exercise.content);

  await db
    .from("exercises")
    .update({ response: response as Json, status: "submitted", submitted_at: new Date().toISOString(), started_at: exercise.started_at ?? new Date().toISOString() })
    .eq("id", exerciseId);
  await db
    .from("learning_sessions")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", exercise.session_id)
    .eq("status", "planned");

  const memory = await loadLearnerMemory(db, userId, profile);
  const { evaluation } = await evaluateExercise({ content, response, memory, elapsedSeconds });

  const { data: updated } = await db
    .from("exercises")
    .update({ evaluation: evaluation as unknown as Json, score: evaluation.score, status: "evaluated" })
    .eq("id", exerciseId)
    .select("*")
    .single();

  await applyEvaluationToMemory({ db, userId, exerciseId, content, response, evaluation });
  return { exercise: updated ?? exercise, evaluation };
}

export async function skipExercise(db: Db, userId: string, exerciseId: string) {
  await db.from("exercises").update({ status: "skipped" }).eq("id", exerciseId).eq("user_id", userId).neq("status", "evaluated");
}

/** Marks a session complete, writes the summary and updates the streak. */
export async function completeSession(db: Db, userId: string, profile: ProfileRow, sessionId: string) {
  const { data: session } = await db.from("learning_sessions").select("*").eq("id", sessionId).eq("user_id", userId).single();
  if (!session) throw new SessionError("Session not found.");
  if (session.status === "completed" && session.summary) return session;

  const { data: exercises } = await db.from("exercises").select("*").eq("session_id", sessionId).order("position");
  const list = exercises ?? [];
  const evaluated = list.filter((e) => e.status === "evaluated");
  const total = evaluated.reduce((a, e) => a + Number(e.score ?? 0), 0);
  const maxScore = evaluated.length * 100;

  let summary: Json | null = null;
  if (evaluated.length) {
    const memory = await loadLearnerMemory(db, userId, profile);
    try {
      summary = (await summariseSession(
        memory,
        list.map((e) => ({
          title: e.title,
          skill: e.skill,
          score: e.score == null ? null : Number(e.score),
          evaluation: e.evaluation ? Evaluation.parse(e.evaluation) : null,
        })),
      )) as unknown as Json;
    } catch {
      summary = null;
    }
  }

  const { data: updated } = await db
    .from("learning_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString(), total_score: total, max_score: maxScore || session.max_score, summary })
    .eq("id", sessionId)
    .select("*")
    .single();

  if (session.kind === "daily") await updateStreak(db, profile, session.session_date);
  return updated ?? session;
}

export function nextStreak(profile: Pick<ProfileRow, "current_streak" | "longest_streak" | "last_session_date">, sessionDate: string) {
  if (profile.last_session_date === sessionDate) return { current: profile.current_streak, longest: profile.longest_streak };
  const prev = profile.last_session_date ? new Date(profile.last_session_date + "T00:00:00Z") : null;
  const cur = new Date(sessionDate + "T00:00:00Z");
  const diffDays = prev ? Math.round((cur.getTime() - prev.getTime()) / 86_400_000) : Infinity;
  const current = diffDays === 1 ? profile.current_streak + 1 : 1;
  return { current, longest: Math.max(profile.longest_streak, current) };
}

async function updateStreak(db: Db, profile: ProfileRow, sessionDate: string) {
  const { current, longest } = nextStreak(profile, sessionDate);
  await db
    .from("profiles")
    .update({ current_streak: current, longest_streak: longest, last_session_date: sessionDate })
    .eq("id", profile.id);
}
