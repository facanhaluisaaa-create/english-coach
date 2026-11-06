"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/db/json";
import { AiNotConfiguredError, AiRefusalError } from "@/lib/ai/client";
import { LessonBrief, LessonPlan, emptyPlan, type CoachTurn } from "@/lib/ai/lesson-schemas";
import { clarifyTurn, coachTurn } from "@/lib/ai/lesson-planner";
import { loadLearnerMemory } from "@/lib/learning/memory";
import type { ActionResult } from "@/app/(app)/session/actions";

export type LessonFormState = { error?: string; fieldErrors?: Record<string, string> } | null;

function errorMessage(e: unknown) {
  if (e instanceof AiNotConfiguredError) return e.message;
  if (e instanceof AiRefusalError) return "The coach declined this request. Try rephrasing.";
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}

async function teacherProfileText(userId: string) {
  const { profile } = await requireProfile();
  const db = await createClient();
  const memory = await loadLearnerMemory(db, userId, profile);
  const teachingWeak = memory.weaknesses.filter((w) => w.category === "teaching").map((w) => w.name);
  return [
    `Teacher: ${profile.display_name ?? "the teacher"}.`,
    profile.teaching_contexts ? `Usually teaches: ${profile.teaching_contexts}.` : null,
    teachingWeak.length ? `Mentoring notes — areas the teacher is working on: ${teachingWeak.join(", ")}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Step 1: the teacher's brief. Nothing is generated until this exists. */
export async function createLessonAction(_prev: LessonFormState, formData: FormData): Promise<LessonFormState> {
  const parsed = LessonBrief.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please complete the highlighted fields.", fieldErrors };
  }
  const { user } = await requireProfile();
  const db = await createClient();
  const brief = parsed.data;
  const { data: lesson, error } = await db
    .from("lesson_plans")
    .insert({ user_id: user.id, title: brief.class_name, brief: brief as unknown as Json, plan: emptyPlan(brief.aim.slice(0, 80)) as unknown as Json })
    .select("id")
    .single();
  if (error || !lesson) return { error: error?.message ?? "Could not save the brief." };

  // First coach turn: questions only — it is schema-restricted so no plan can be proposed here.
  try {
    const turn = await clarifyTurn({ brief, plan: null, teacherProfile: await teacherProfileText(user.id), history: [] });
    await db.from("lesson_messages").insert({
      lesson_id: lesson.id,
      user_id: user.id,
      role: "assistant",
      content: turn.message,
      questions: turn.questions as unknown as Json,
    });
  } catch (e) {
    // The lesson exists; the teacher can still start the conversation manually.
    console.error("clarifyTurn failed", e);
  }
  redirect(`/lessons/${lesson.id}`);
}

const MessageSchema = z.string().trim().min(1).max(6000);

export async function sendLessonMessageAction(
  lessonId: string,
  text: string,
): Promise<ActionResult<{ id: string; content: string; questions: string[]; proposal: CoachTurn["proposal"] }>> {
  const parsedText = MessageSchema.safeParse(text);
  if (!parsedText.success) return { ok: false, error: "Write a message first." };
  try {
    const { user } = await requireProfile();
    const db = await createClient();
    const { data: lesson } = await db.from("lesson_plans").select("*").eq("id", lessonId).eq("user_id", user.id).single();
    if (!lesson) return { ok: false, error: "Lesson not found." };
    const brief = LessonBrief.parse(lesson.brief);
    const plan = lesson.plan ? LessonPlan.safeParse(lesson.plan).data ?? null : null;
    const { data: history } = await db.from("lesson_messages").select("role, content").eq("lesson_id", lessonId).order("created_at").limit(40);

    await db.from("lesson_messages").insert({ lesson_id: lessonId, user_id: user.id, role: "user", content: parsedText.data });

    const turn = await coachTurn(
      { brief, plan, teacherProfile: await teacherProfileText(user.id), history: (history ?? []).map((m) => ({ role: m.role, content: m.content })) },
      parsedText.data,
    );

    const { data: saved, error } = await db
      .from("lesson_messages")
      .insert({
        lesson_id: lessonId,
        user_id: user.id,
        role: "assistant",
        content: turn.message,
        questions: turn.questions as unknown as Json,
        proposal: turn.proposal ? (turn.proposal as unknown as Json) : null,
        proposal_status: turn.proposal ? "pending" : null,
      })
      .select("id")
      .single();
    if (error || !saved) return { ok: false, error: error?.message ?? "Could not save the reply." };
    return { ok: true, data: { id: saved.id, content: turn.message, questions: turn.questions, proposal: turn.proposal } };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

/** The teacher accepts a proposal (possibly after editing it client-side). Only this writes the plan from a proposal. */
export async function applyProposalAction(messageId: string, editedPlan?: unknown): Promise<ActionResult<{ plan: LessonPlan }>> {
  try {
    const { user } = await requireProfile();
    const db = await createClient();
    const { data: msg } = await db.from("lesson_messages").select("*").eq("id", messageId).eq("user_id", user.id).single();
    if (!msg?.proposal) return { ok: false, error: "No proposal to apply." };
    const source = editedPlan ?? (msg.proposal as { plan: unknown }).plan;
    const plan = LessonPlan.safeParse(source);
    if (!plan.success) return { ok: false, error: "The proposal is not a valid plan." };
    await db.from("lesson_plans").update({ plan: plan.data as unknown as Json, title: plan.data.title }).eq("id", msg.lesson_id).eq("user_id", user.id);
    await db.from("lesson_messages").update({ proposal_status: "applied" }).eq("id", messageId);
    revalidatePath(`/lessons/${msg.lesson_id}`);
    revalidatePath("/lessons");
    return { ok: true, data: { plan: plan.data } };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function discardProposalAction(messageId: string): Promise<ActionResult<null>> {
  try {
    const { user } = await requireProfile();
    const db = await createClient();
    await db.from("lesson_messages").update({ proposal_status: "discarded" }).eq("id", messageId).eq("user_id", user.id);
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

/** Direct edits by the teacher. */
export async function updatePlanAction(lessonId: string, plan: unknown): Promise<ActionResult<{ plan: LessonPlan }>> {
  const parsed = LessonPlan.safeParse(plan);
  if (!parsed.success) return { ok: false, error: "Invalid plan." };
  try {
    const { user } = await requireProfile();
    const db = await createClient();
    const { error } = await db
      .from("lesson_plans")
      .update({ plan: parsed.data as unknown as Json, title: parsed.data.title })
      .eq("id", lessonId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/lessons/${lessonId}`);
    revalidatePath("/lessons");
    return { ok: true, data: { plan: parsed.data } };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function updateBriefAction(lessonId: string, brief: unknown): Promise<ActionResult<null>> {
  const parsed = LessonBrief.safeParse(brief);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid brief." };
  try {
    const { user } = await requireProfile();
    const db = await createClient();
    const { error } = await db.from("lesson_plans").update({ brief: parsed.data as unknown as Json }).eq("id", lessonId).eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/lessons/${lessonId}`);
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

const StatusSchema = z.enum(["drafting", "ready", "taught", "archived"]);

export async function setLessonStatusAction(lessonId: string, status: string, taughtOn?: string): Promise<ActionResult<null>> {
  const parsed = StatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Invalid status." };
  try {
    const { user } = await requireProfile();
    const db = await createClient();
    const { error } = await db
      .from("lesson_plans")
      .update({ status: parsed.data, taught_on: parsed.data === "taught" ? taughtOn ?? new Date().toISOString().slice(0, 10) : undefined })
      .eq("id", lessonId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/lessons/${lessonId}`);
    revalidatePath("/lessons");
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

/** Saves the post-lesson reflection and lets the coach respond to it in the thread. */
export async function saveReflectionAction(lessonId: string, reflection: string): Promise<ActionResult<{ reply: string | null }>> {
  const text = reflection.trim();
  if (text.length < 10) return { ok: false, error: "Write a few sentences about how the class went." };
  try {
    const { user } = await requireProfile();
    const db = await createClient();
    const { error } = await db.from("lesson_plans").update({ reflection: text, status: "taught" }).eq("id", lessonId).eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    const reply = await sendLessonMessageAction(lessonId, `Reflection after teaching this class: ${text}\n\nPlease respond briefly: what to keep, what to change next time, and one thing to try. Do not propose a plan.`);
    revalidatePath(`/lessons/${lessonId}`);
    return { ok: true, data: { reply: reply.ok ? reply.data.content : null } };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteLessonAction(lessonId: string): Promise<ActionResult<null>> {
  try {
    const { user } = await requireProfile();
    const db = await createClient();
    const { error } = await db.from("lesson_plans").delete().eq("id", lessonId).eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/lessons");
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
