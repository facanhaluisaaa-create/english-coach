import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { LessonBrief, LessonPlan } from "@/lib/ai/lesson-schemas";
import { stageTotal } from "@/lib/learning/lesson-markdown";
import { PrintButton } from "@/components/lessons/print-button";

export default async function LessonPrintPage(props: PageProps<"/lessons/[id]/print">) {
  const { id } = await props.params;
  const { user } = await requireProfile();
  const db = await createClient();
  const { data: lesson } = await db.from("lesson_plans").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!lesson) notFound();
  const brief = LessonBrief.safeParse(lesson.brief).data;
  const plan = lesson.plan ? LessonPlan.safeParse(lesson.plan).data : null;
  if (!brief || !plan) notFound();

  return (
    <article className="mx-auto max-w-3xl space-y-6 print:max-w-none">
      <div className="flex items-start justify-between gap-3 print:hidden">
        <p className="text-sm text-muted-foreground">Print view</p>
        <PrintButton />
      </div>
      <header>
        <h1 className="text-2xl font-semibold">{plan.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {brief.class_name} · {brief.student_ages} · CEFR {brief.level} · {brief.class_size} students · {brief.duration_minutes} min
        </p>
      </header>
      {plan.objectives.length > 0 && (
        <section><h2 className="font-semibold">Objectives</h2><ul className="mt-1 list-disc pl-5 text-sm">{plan.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul></section>
      )}
      {plan.target_language && <section><h2 className="font-semibold">Target language</h2><p className="mt-1 whitespace-pre-wrap text-sm">{plan.target_language}</p></section>}
      {plan.assumed_knowledge && <section><h2 className="font-semibold">Assumed knowledge</h2><p className="mt-1 whitespace-pre-wrap text-sm">{plan.assumed_knowledge}</p></section>}
      {plan.stages.length > 0 && (
        <section>
          <h2 className="font-semibold">Stages ({stageTotal(plan)} min)</h2>
          <table className="mt-2 w-full border-collapse text-sm">
            <thead><tr className="border-b text-left"><th className="py-1 pr-2">#</th><th className="py-1 pr-2">Stage</th><th className="py-1 pr-2">Min</th><th className="py-1 pr-2">Procedure</th><th className="py-1">Checks</th></tr></thead>
            <tbody>
              {plan.stages.map((s, i) => (
                <tr key={s.id} className="border-b align-top">
                  <td className="py-2 pr-2">{i + 1}</td>
                  <td className="py-2 pr-2"><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground">{s.interaction}</div>{s.aim && <div className="text-xs">{s.aim}</div>}</td>
                  <td className="py-2 pr-2 tabular-nums">{s.minutes}</td>
                  <td className="py-2 pr-2 whitespace-pre-wrap">{s.procedure}{s.materials && <div className="mt-1 text-xs text-muted-foreground">Materials: {s.materials}</div>}</td>
                  <td className="py-2 whitespace-pre-wrap">{s.checks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {plan.materials_list.length > 0 && <section><h2 className="font-semibold">Materials</h2><ul className="mt-1 list-disc pl-5 text-sm">{plan.materials_list.map((m, i) => <li key={i}>{m}</li>)}</ul></section>}
      {plan.anticipated_problems.length > 0 && (
        <section><h2 className="font-semibold">Anticipated problems</h2><ul className="mt-1 list-disc pl-5 text-sm">{plan.anticipated_problems.map((p, i) => <li key={i}><span className="font-medium">{p.problem}</span> — {p.solution}</li>)}</ul></section>
      )}
      {plan.differentiation && <section><h2 className="font-semibold">Differentiation</h2><p className="mt-1 whitespace-pre-wrap text-sm">{plan.differentiation}</p></section>}
      {plan.assessment && <section><h2 className="font-semibold">Assessment</h2><p className="mt-1 whitespace-pre-wrap text-sm">{plan.assessment}</p></section>}
      {plan.homework && <section><h2 className="font-semibold">Homework</h2><p className="mt-1 whitespace-pre-wrap text-sm">{plan.homework}</p></section>}
    </article>
  );
}
