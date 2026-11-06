import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { TOEFL_DISCLAIMER, TOEFL_SECTIONS, TOEFL_TASKS, overallBand, type ToeflSection } from "@/lib/learning/toefl-spec";
import { ToeflTaskGrid } from "@/components/toefl/toefl-task-grid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "TOEFL" };
export const maxDuration = 300;

export default async function ToeflPage() {
  const { user, profile } = await requireProfile();
  const db = await createClient();
  const { data: scores } = await db
    .from("skill_scores")
    .select("skill, score, band, recorded_at")
    .eq("user_id", user.id)
    .like("skill", "toefl_%")
    .order("recorded_at", { ascending: false })
    .limit(400);

  const sections = Object.keys(TOEFL_SECTIONS) as ToeflSection[];
  const perSection = Object.fromEntries(
    sections.map((s) => {
      const rows = (scores ?? []).filter((r) => r.skill === `toefl_${s}`);
      const recent = rows.slice(0, 5);
      const bands = recent.map((r) => (r.band != null ? Number(r.band) : null)).filter((b): b is number => b != null);
      const band = bands.length ? Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) / 2 : null;
      return [s, { n: rows.length, band }];
    }),
  ) as Record<ToeflSection, { n: number; band: number | null }>;
  const allHave = sections.every((s) => perSection[s].band != null);
  const overall = allHave ? overallBand({ reading: perSection.reading.band!, listening: perSection.listening.band!, speaking: perSection.speaking.band!, writing: perSection.writing.band! }) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">TOEFL iBT® Trainer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aligned with the test format launched by ETS on 21 January 2026: four sections, 12 task types, scores on the 1–6 band scale. Your target: band {Number(profile.toefl_target_band).toFixed(1)}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Practice standing (estimates)</CardTitle>
          <CardDescription>Average of your last five practice estimates per section. {overall != null ? `Overall estimate: ${overall.toFixed(1)} / 6.` : "Practice all four sections to see an overall estimate."}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            {sections.map((s) => {
              const v = perSection[s];
              const spec = TOEFL_SECTIONS[s];
              return (
                <div key={s} className="rounded-xl border p-4">
                  <p className="text-xs text-muted-foreground">{spec.name}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{v.band != null ? v.band.toFixed(1) : "—"}<span className="text-sm text-muted-foreground"> / 6</span></p>
                  <p className="text-xs text-muted-foreground">{v.n} practice task{v.n === 1 ? "" : "s"}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{TOEFL_DISCLAIMER}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test structure (official, 2026)</CardTitle>
          <CardDescription>Source: ETS test content pages, verified 6 November 2026. Reading and Listening are multistage adaptive. No breaks; about 85–90 minutes in total.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr><th className="py-2 pr-4 font-medium">Section</th><th className="py-2 pr-4 font-medium">Task types</th><th className="py-2 pr-4 font-medium">Items</th><th className="py-2 font-medium">Approx. time</th></tr>
              </thead>
              <tbody className="divide-y">
                {sections.map((s) => (
                  <tr key={s}>
                    <td className="py-2 pr-4 font-medium">{TOEFL_SECTIONS[s].name}</td>
                    <td className="py-2 pr-4">{TOEFL_SECTIONS[s].tasks.map((t) => TOEFL_TASKS[t].officialName).join(", ")}</td>
                    <td className="py-2 pr-4 tabular-nums">{TOEFL_SECTIONS[s].items}</td>
                    <td className="py-2 tabular-nums">{TOEFL_SECTIONS[s].baseMinutes} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Scoring: each section 1–6 in half-band steps; the overall score is the mean of the four sections rounded to the nearest half band. A comparable 0–120 score is also reported during a two-year transition.
          </p>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold">Practice a task</h2>
        <p className="mt-1 text-sm text-muted-foreground">Each task is generated fresh and timed; feedback uses rubric criteria and tracks your section scores.</p>
        <div className="mt-4">
          <ToeflTaskGrid />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">TOEFL® is a registered trademark of ETS. This app is not affiliated with or endorsed by ETS and does not provide official certification.</p>
    </div>
  );
}
