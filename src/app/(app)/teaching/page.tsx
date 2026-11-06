import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { TeachingLauncher } from "@/components/teaching/teaching-launcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Evaluation } from "@/lib/ai/schemas";

export const metadata: Metadata = { title: "Teaching" };
export const maxDuration = 300;

const topics = [
  "Communicative language teaching (CLT)",
  "Task-based learning",
  "Scaffolding and guided discovery",
  "Concept-checking questions (CCQs)",
  "Formative assessment",
  "Error correction techniques",
  "Differentiated instruction",
  "Classroom management",
  "Teaching vocabulary (lexical approach)",
  "Teaching pronunciation and connected speech",
  "Student motivation",
  "Lesson planning (PPP, TTT, TBL)",
];

export default async function TeachingPage() {
  const { user, profile } = await requireProfile();
  const db = await createClient();
  const { data: recent } = await db
    .from("exercises")
    .select("id, title, score, evaluation, created_at, session_id")
    .eq("user_id", user.id)
    .eq("skill", "teaching")
    .eq("status", "evaluated")
    .order("created_at", { ascending: false })
    .limit(10);

  const dims = { accuracy: [] as number[], clarity: [] as number[], age_appropriateness: [] as number[], pedagogy: [] as number[] };
  for (const r of recent ?? []) {
    const ev = Evaluation.safeParse(r.evaluation).data;
    if (!ev?.teaching) continue;
    (Object.keys(dims) as (keyof typeof dims)[]).forEach((k) => dims[k].push(ev.teaching![k].score));
  }
  const avg = (arr: number[]) => (arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : "—");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Teaching Mentor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Simulate a student, explain, correct or plan — and get mentored on accuracy, clarity, age-appropriateness and pedagogy.
          {profile.teaching_contexts ? ` Your contexts: ${profile.teaching_contexts}.` : ""}
        </p>
        <p className="mt-2 text-sm">
          Planning a real class? Use <Link href="/lessons" className="font-medium underline underline-offset-4">Classes</Link> to build the plan together with the coach.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Start a simulation</CardTitle>
            <CardDescription>Pick the student and the concept, or leave fields blank and let the mentor choose.</CardDescription>
          </CardHeader>
          <CardContent>
            <TeachingLauncher />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Your mentoring profile</CardTitle>
            <CardDescription>Average of your last {recent?.length ?? 0} challenges (0–10).</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {(Object.keys(dims) as (keyof typeof dims)[]).map((k) => (
                <div key={k} className="rounded-lg border p-3">
                  <dt className="text-xs capitalize text-muted-foreground">{k.replace("_", " ")}</dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums">{avg(dims[k])}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground">Methodology areas the mentor draws on</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {topics.map((t) => <li key={t} className="rounded-full border px-2 py-0.5 text-xs">{t}</li>)}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {recent && recent.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent challenges</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <a href={`/session/${r.session_id}`} className="hover:underline">{r.title}</a>
                  <span className="tabular-nums text-muted-foreground">{r.score != null ? `${Math.round(Number(r.score))}/100` : "—"}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
