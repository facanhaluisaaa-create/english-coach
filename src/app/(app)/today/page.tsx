import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, BrainIcon, CalendarDaysIcon, FlameIcon, LibraryIcon, TargetIcon } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTodaySession } from "@/lib/learning/session-service";
import { localDateString } from "@/lib/learning/dates";
import { isAiConfigured } from "@/lib/ai/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { StartSessionButton } from "@/components/session/start-session-button";
import { SessionPlan, SessionSummary } from "@/lib/ai/schemas";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Today" };
export const maxDuration = 300;

export default async function TodayPage() {
  const { user, profile } = await requireProfile();
  const db = await createClient();
  const today = localDateString(new Date(), profile.timezone);
  const nowIso = new Date().toISOString();

  const [session, dueVocab, dueConcepts, vocabCount, weakCount, completedCount, recent] = await Promise.all([
    getTodaySession(db, user.id, profile.timezone),
    db.from("vocabulary_items").select("id", { count: "exact", head: true }).eq("user_id", user.id).lte("due_at", nowIso).neq("mastery", "mastered"),
    db.from("concepts").select("id", { count: "exact", head: true }).eq("user_id", user.id).lte("due_at", nowIso).neq("status", "mastered"),
    db.from("vocabulary_items").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    db.from("concepts").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "active"),
    db.from("learning_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed").eq("kind", "daily"),
    db
      .from("learning_sessions")
      .select("id, session_date, status, total_score, max_score, plan, summary, kind")
      .eq("user_id", user.id)
      .eq("kind", "daily")
      .order("session_date", { ascending: false })
      .limit(6),
  ]);

  const exercises = session
    ? (await db.from("exercises").select("id, position, title, skill, status, score, estimated_minutes").eq("session_id", session.id).order("position")).data ?? []
    : [];
  const done = exercises.filter((e) => e.status === "evaluated" || e.status === "skipped").length;
  const due = (dueVocab.count ?? 0) + (dueConcepts.count ?? 0);
  const plan = session ? SessionPlan.safeParse(session.plan).data : undefined;
  const summary = session?.summary ? SessionSummary.safeParse(session.summary).data : undefined;
  const firstName = (profile.display_name ?? "there").split(" ")[0];
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: profile.timezone }).format(new Date()));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{new Date(today + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting}, {firstName}.</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FlameIcon className={profile.current_streak > 0 ? "size-4 text-orange-500" : "size-4"} />
          {profile.current_streak}-day streak · best {profile.longest_streak}
        </div>
      </div>

      {!isAiConfigured() && (
        <Alert variant="destructive">
          <AlertTitle>AI coach is not configured</AlertTitle>
          <AlertDescription>Set ANTHROPIC_API_KEY on the server to generate sessions and feedback.</AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Today&apos;s session</CardTitle>
              <CardDescription>
                {session && plan ? `${plan.title} · ${plan.theme} · ~${plan.total_minutes} min` : `About ${profile.daily_goal_minutes} minutes, composed from your memory and goals.`}
              </CardDescription>
            </div>
            {session && (
              <Badge variant={session.status === "completed" ? "default" : "secondary"}>
                {session.status === "completed" ? "Completed" : `${done}/${exercises.length} blocks`}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!session ? (
            <div className="space-y-4">
              <ul className="grid gap-2 text-sm sm:grid-cols-2">
                <li className="rounded-lg border p-3"><span className="font-medium">5 min</span> · Advanced vocabulary</li>
                <li className="rounded-lg border p-3"><span className="font-medium">5 min</span> · Grammar and precision</li>
                <li className="rounded-lg border p-3"><span className="font-medium">5 min</span> · TOEFL practice (rotating section)</li>
                <li className="rounded-lg border p-3"><span className="font-medium">5 min</span> · Teaching challenge</li>
                {due >= 3 && <li className="rounded-lg border p-3 sm:col-span-2"><span className="font-medium">3 min</span> · Active recall of {due} due items</li>}
              </ul>
              <StartSessionButton />
            </div>
          ) : (
            <div className="space-y-4">
              {plan && <p className="text-sm text-muted-foreground">{plan.rationale}</p>}
              <ol className="space-y-2">
                {exercises.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                    <div className="flex items-center gap-3">
                      <span className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${e.status === "evaluated" ? "bg-primary text-primary-foreground" : e.status === "skipped" ? "bg-muted text-muted-foreground line-through" : "border"}`}>
                        {e.position + 1}
                      </span>
                      <span className="font-medium">{e.title}</span>
                    </div>
                    <span className="shrink-0 text-muted-foreground">
                      {e.status === "evaluated" && e.score != null ? `${Math.round(Number(e.score))}%` : `${e.estimated_minutes} min`}
                    </span>
                  </li>
                ))}
              </ol>
              {session.status === "completed" && summary ? (
                <div className="rounded-xl bg-muted/50 p-4 text-sm">
                  <p className="font-medium">{summary.headline}</p>
                  {summary.focus_next.length > 0 && (
                    <p className="mt-2 text-muted-foreground">Next: {summary.focus_next.join(" · ")}</p>
                  )}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <LinkButton href={`/session/${session.id}`}>
                  {session.status === "completed" ? "Review session" : done === 0 ? "Start" : "Continue"} <ArrowRightIcon />
                </LinkButton>
                {session.status === "completed" && (
                  <LinkButton variant="outline" href="/toefl">Extra TOEFL practice</LinkButton>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={CalendarDaysIcon} label="Sessions completed" value={String(completedCount.count ?? 0)} href="/progress" />
        <Stat icon={BrainIcon} label="Due for review" value={String(due)} href="/memory" />
        <Stat icon={LibraryIcon} label="Vocabulary in deck" value={String(vocabCount.count ?? 0)} href="/memory?tab=vocabulary" />
        <Stat icon={TargetIcon} label="Active weak spots" value={String(weakCount.count ?? 0)} href="/memory?tab=weaknesses" />
      </div>

      {recent.data && recent.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {recent.data.map((s) => {
                const p = SessionPlan.safeParse(s.plan).data;
                const pct = s.total_score != null && s.max_score ? Math.round((Number(s.total_score) / Number(s.max_score)) * 100) : null;
                return (
                  <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/session/${s.id}`} className="hover:underline">
                      <span className="font-medium">{s.session_date}</span>
                      <span className="text-muted-foreground"> · {p?.theme ?? "Session"}</span>
                    </Link>
                    <span className="text-muted-foreground">{s.status === "completed" ? (pct != null ? `${pct}%` : "done") : s.status.replace("_", " ")}</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, href }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; href: string }) {
  return (
    <Link href={href} className="rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-3.5" /> {label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </Link>
  );
}
