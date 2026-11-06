import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkline, TrendChart } from "@/components/progress/trend-chart";
import { SessionPlan } from "@/lib/ai/schemas";
import { TOEFL_DISCLAIMER } from "@/lib/learning/toefl-spec";

export const metadata: Metadata = { title: "Progress" };

const skillMeta: Record<string, { label: string; group: "core" | "toefl" }> = {
  vocabulary: { label: "Vocabulary", group: "core" },
  grammar: { label: "Grammar", group: "core" },
  teaching: { label: "Teaching", group: "core" },
  review: { label: "Review recall", group: "core" },
  toefl_reading: { label: "TOEFL Reading", group: "toefl" },
  toefl_listening: { label: "TOEFL Listening", group: "toefl" },
  toefl_speaking: { label: "TOEFL Speaking", group: "toefl" },
  toefl_writing: { label: "TOEFL Writing", group: "toefl" },
};

export default async function ProgressPage() {
  const { user, profile } = await requireProfile();
  const db = await createClient();
  const [sessions, scores, reviews, concepts] = await Promise.all([
    db
      .from("learning_sessions")
      .select("id, session_date, status, total_score, max_score, plan, kind")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("session_date", { ascending: true })
      .limit(120),
    db.from("skill_scores").select("skill, score, max_score, band, recorded_at").eq("user_id", user.id).order("recorded_at", { ascending: true }).limit(1000),
    db.from("review_log").select("correct, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(300),
    db.from("concepts").select("status").eq("user_id", user.id),
  ]);

  const daily = (sessions.data ?? []).filter((s) => s.kind === "daily");
  const sessionPoints = daily
    .filter((s) => s.total_score != null && s.max_score)
    .map((s) => ({
      date: s.session_date,
      value: (Number(s.total_score) / Number(s.max_score)) * 100,
      label: SessionPlan.safeParse(s.plan).data?.theme ?? s.session_date,
    }));

  const bySkill: Record<string, { date: string; value: number; label?: string }[]> = {};
  for (const r of scores.data ?? []) {
    (bySkill[r.skill] ??= []).push({
      date: r.recorded_at.slice(0, 10),
      value: (Number(r.score) / Number(r.max_score || 100)) * 100,
      label: r.band != null ? `band ${Number(r.band).toFixed(1)}` : undefined,
    });
  }

  const recallRecent = (reviews.data ?? []).slice(0, 50);
  const recallRate = recallRecent.length ? Math.round((recallRecent.filter((r) => r.correct).length / recallRecent.length) * 100) : null;
  const totalMinutes = daily.reduce((a, s) => a + (SessionPlan.safeParse(s.plan).data?.total_minutes ?? 20), 0);
  const conceptCounts = { active: 0, improving: 0, mastered: 0 };
  for (const c of concepts.data ?? []) conceptCounts[c.status as keyof typeof conceptCounts]++;
  const overallAvg = sessionPoints.length ? Math.round(sessionPoints.slice(-10).reduce((a, p) => a + p.value, 0) / Math.min(10, sessionPoints.length)) : null;

  const groups = (["core", "toefl"] as const).map((g) => ({
    group: g,
    skills: Object.entries(skillMeta).filter(([, m]) => m.group === g),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Progress</h1>
        <p className="mt-1 text-sm text-muted-foreground">Trends across sessions and skills. Scores are the coach&apos;s assessments on a 0–100 scale.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Daily sessions" value={String(daily.length)} hint={`${Math.round(totalMinutes / 60)}h ${totalMinutes % 60}m of practice`} />
        <Tile label="Average score, last 10" value={overallAvg != null ? `${overallAvg}%` : "—"} hint="across all blocks" trend={sessionPoints.slice(-12).map((p) => p.value)} />
        <Tile label="Recall accuracy" value={recallRate != null ? `${recallRate}%` : "—"} hint={`last ${recallRecent.length} reviews`} />
        <Tile label="Weak spots" value={String(conceptCounts.active)} hint={`${conceptCounts.improving} improving · ${conceptCounts.mastered} mastered`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session scores</CardTitle>
          <CardDescription>Average across all blocks of each daily session. Streak: {profile.current_streak} days (best {profile.longest_streak}).</CardDescription>
        </CardHeader>
        <CardContent>
          <TrendChart points={sessionPoints} height={180} />
        </CardContent>
      </Card>

      {groups.map(({ group, skills }) => (
        <section key={group} className="space-y-3">
          <h2 className="text-lg font-semibold">{group === "core" ? "Skills" : "TOEFL sections"}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {skills.map(([key, meta]) => {
              const pts = bySkill[key] ?? [];
              const last5 = pts.slice(-5);
              const avg = last5.length ? Math.round(last5.reduce((a, p) => a + p.value, 0) / last5.length) : null;
              return (
                <Card key={key}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{meta.label}</CardTitle>
                      <span className="text-sm tabular-nums text-muted-foreground">{avg != null ? `${avg}% recent` : "no data"}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <TrendChart points={pts} height={120} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {group === "toefl" && <p className="text-xs text-muted-foreground">{TOEFL_DISCLAIMER}</p>}
        </section>
      ))}

      {sessionPoints.length > 0 && (
        <details className="rounded-xl border p-4">
          <summary className="cursor-pointer text-sm font-medium">Table view</summary>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1 font-medium">Date</th><th className="py-1 font-medium">Theme</th><th className="py-1 text-right font-medium">Score</th></tr></thead>
            <tbody className="divide-y">
              {sessionPoints.slice().reverse().map((p) => (
                <tr key={p.date}><td className="py-1">{p.date}</td><td className="py-1 text-muted-foreground">{p.label}</td><td className="py-1 text-right tabular-nums">{Math.round(p.value)}%</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}

function Tile({ label, value, hint, trend }: { label: string; value: string; hint: string; trend?: number[] }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        {trend && <Sparkline values={trend} />}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
