import { notFound } from "next/navigation";
import { SessionRunner } from "@/components/session/session-runner";
import { EvaluationCard } from "@/components/session/evaluation-card";
import { fixtureEvaluation, fixtureExercises, fixtureLesson } from "@/lib/dev/fixtures";
import { LessonWorkspace } from "@/components/lessons/lesson-workspace";

/**
 * Development-only preview of the session runner with fixture content.
 * Lets you inspect every exercise type without Supabase or an API key.
 * Submissions call real server actions and will fail without auth — by design.
 */
export default async function PreviewPage(props: PageProps<"/dev/preview">) {
  if (process.env.NODE_ENV === "production") notFound();
  const searchParams = await props.searchParams;
  const view = typeof searchParams.view === "string" ? searchParams.view : "runner";

  if (view === "evaluation") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <EvaluationCard evaluation={fixtureEvaluation} />
      </main>
    );
  }

  if (view === "lesson") {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <LessonWorkspace lesson={fixtureLesson.lesson} brief={fixtureLesson.brief} plan={fixtureLesson.plan} messages={fixtureLesson.messages} />
      </main>
    );
  }

  const only = typeof searchParams.only === "string" ? searchParams.only : null;
  const list = only ? fixtureExercises.filter((e) => e.id === only) : fixtureExercises;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p className="mb-4 rounded-lg border border-dashed p-2 text-xs text-muted-foreground">
        Development preview with fixture data. Try <code>?only=f-grammar</code> or <code>?view=evaluation</code>.
      </p>
      <SessionRunner
        session={{ id: "preview", kind: "daily", status: "planned", plan: { title: "Day 1", theme: "Preview", rationale: "Fixtures.", blocks: [], total_minutes: 20 }, summary: null, total_score: null, max_score: null }}
        exercises={list.map((e, i) => ({ id: e.id, position: i, title: e.title, skill: e.skill, estimated_minutes: 5, status: "pending", content: e.content, response: null, evaluation: null }))}
        streak={3}
      />
    </main>
  );
}
