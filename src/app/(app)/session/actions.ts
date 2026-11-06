"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AiNotConfiguredError, AiRefusalError } from "@/lib/ai/client";
import { Evaluation, type SessionSummary } from "@/lib/ai/schemas";
import {
  completeSession,
  createPracticeSession,
  ensureDailySession,
  skipExercise,
  submitExercise,
} from "@/lib/learning/session-service";
import { TOEFL_TASK_TYPES, type ToeflTaskType } from "@/lib/learning/toefl-spec";
import type { TeachingOptions } from "@/lib/ai/generate";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function errorMessage(e: unknown) {
  if (e instanceof AiNotConfiguredError) return e.message;
  if (e instanceof AiRefusalError) return "The coach declined to generate this content. Please try again with a different request.";
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}

export async function startDailySessionAction(): Promise<ActionResult<{ sessionId: string }>> {
  try {
    const { user, profile } = await requireProfile();
    const db = await createClient();
    const session = await ensureDailySession(db, user.id, profile);
    revalidatePath("/today");
    return { ok: true, data: { sessionId: session.id } };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function submitExerciseAction(
  exerciseId: string,
  response: unknown,
  elapsedSeconds?: number | null,
): Promise<ActionResult<{ evaluation: Evaluation }>> {
  try {
    const { user, profile } = await requireProfile();
    const db = await createClient();
    const { evaluation } = await submitExercise(db, user.id, profile, exerciseId, response, elapsedSeconds);
    return { ok: true, data: { evaluation } };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function skipExerciseAction(exerciseId: string): Promise<ActionResult<null>> {
  try {
    const { user } = await requireProfile();
    const db = await createClient();
    await skipExercise(db, user.id, exerciseId);
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function completeSessionAction(
  sessionId: string,
): Promise<ActionResult<{ summary: SessionSummary | null; totalScore: number | null; maxScore: number | null; streak: number }>> {
  try {
    const { user, profile } = await requireProfile();
    const db = await createClient();
    const session = await completeSession(db, user.id, profile, sessionId);
    const { data: fresh } = await db.from("profiles").select("current_streak").eq("id", user.id).single();
    revalidatePath("/today");
    revalidatePath("/progress");
    return {
      ok: true,
      data: {
        summary: (session.summary as SessionSummary | null) ?? null,
        totalScore: session.total_score == null ? null : Number(session.total_score),
        maxScore: session.max_score == null ? null : Number(session.max_score),
        streak: fresh?.current_streak ?? profile.current_streak,
      },
    };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

const toeflSchema = z.enum(TOEFL_TASK_TYPES as [string, ...string[]]);

export async function startToeflPracticeAction(taskType: string): Promise<ActionResult<{ sessionId: string }>> {
  const parsed = toeflSchema.safeParse(taskType);
  if (!parsed.success) return { ok: false, error: "Unknown TOEFL task." };
  try {
    const { user, profile } = await requireProfile();
    const db = await createClient();
    const { session } = await createPracticeSession(db, user.id, profile, { kind: "toefl", taskType: parsed.data as ToeflTaskType });
    return { ok: true, data: { sessionId: session.id } };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

const teachingSchema = z.object({
  studentAge: z.number().int().min(5).max(80).optional(),
  studentLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
  concept: z.string().trim().max(200).optional(),
  challengeType: z
    .enum(["explain_concept", "correct_student_error", "plan_activity", "answer_student_question", "give_feedback"])
    .optional(),
});

export async function startTeachingPracticeAction(options: TeachingOptions): Promise<ActionResult<{ sessionId: string }>> {
  const parsed = teachingSchema.safeParse(options);
  if (!parsed.success) return { ok: false, error: "Invalid options." };
  try {
    const { user, profile } = await requireProfile();
    const db = await createClient();
    const opts = { ...parsed.data, concept: parsed.data.concept || undefined };
    const { session } = await createPracticeSession(db, user.id, profile, { kind: "teaching", options: opts });
    return { ok: true, data: { sessionId: session.id } };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function goToSession(sessionId: string) {
  redirect(`/session/${sessionId}`);
}
