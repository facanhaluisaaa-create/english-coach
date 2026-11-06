import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Evaluation, ExerciseContent, SessionPlan, SessionSummary } from "@/lib/ai/schemas";
import { SessionRunner, type RunnerExercise } from "@/components/session/session-runner";

export const metadata: Metadata = { title: "Session" };
export const maxDuration = 300;

export default async function SessionPage(props: PageProps<"/session/[id]">) {
  const { id } = await props.params;
  const { user, profile } = await requireProfile();
  const db = await createClient();
  const { data: session } = await db.from("learning_sessions").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!session) notFound();
  const { data: rows } = await db.from("exercises").select("*").eq("session_id", session.id).order("position");

  const exercises: RunnerExercise[] = [];
  for (const row of rows ?? []) {
    const content = ExerciseContent.safeParse(row.content);
    if (!content.success) continue;
    const evaluation = row.evaluation ? Evaluation.safeParse(row.evaluation).data ?? null : null;
    exercises.push({
      id: row.id,
      position: row.position,
      title: row.title,
      skill: row.skill,
      estimated_minutes: row.estimated_minutes,
      status: row.status,
      content: content.data,
      response: row.response,
      evaluation,
    });
  }
  const plan = SessionPlan.safeParse(session.plan).data ?? { title: "Session", theme: "", rationale: "", blocks: [], total_minutes: 0 };
  const summary = session.summary ? SessionSummary.safeParse(session.summary).data ?? null : null;

  return (
    <SessionRunner
      session={{
        id: session.id,
        kind: session.kind,
        status: session.status,
        plan,
        summary,
        total_score: session.total_score == null ? null : Number(session.total_score),
        max_score: session.max_score == null ? null : Number(session.max_score),
      }}
      exercises={exercises}
      streak={profile.current_streak}
    />
  );
}
