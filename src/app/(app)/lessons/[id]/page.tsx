import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { LessonBrief, LessonPlan, emptyPlan } from "@/lib/ai/lesson-schemas";
import { LessonWorkspace, type WorkspaceMessage } from "@/components/lessons/lesson-workspace";

export const metadata: Metadata = { title: "Plan a class" };
export const maxDuration = 300;

export default async function LessonPage(props: PageProps<"/lessons/[id]">) {
  const { id } = await props.params;
  const { user } = await requireProfile();
  const db = await createClient();
  const { data: lesson } = await db.from("lesson_plans").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!lesson) notFound();
  const brief = LessonBrief.safeParse(lesson.brief).data;
  if (!brief) notFound();
  const plan = (lesson.plan && LessonPlan.safeParse(lesson.plan).data) || emptyPlan(lesson.title);
  const { data: rows } = await db.from("lesson_messages").select("*").eq("lesson_id", id).order("created_at");

  const messages: WorkspaceMessage[] = (rows ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    questions: Array.isArray(m.questions) ? (m.questions as string[]) : [],
    proposal: m.proposal ? (m.proposal as { summary: string; plan: LessonPlan }) : null,
    proposal_status: m.proposal_status,
  }));

  return (
    <LessonWorkspace
      lesson={{ id: lesson.id, title: lesson.title, status: lesson.status, reflection: lesson.reflection, taught_on: lesson.taught_on }}
      brief={brief}
      plan={plan}
      messages={messages}
    />
  );
}
