import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConceptRow, Database, ProfileRow, VocabularyItemRow } from "@/lib/db/types";
import { reviewPriority } from "./srs";
import type { ToeflSection } from "./toefl-spec";

export type Db = SupabaseClient<Database>;

export interface LearnerMemory {
  profile: ProfileRow;
  completedSessions: number;
  weaknesses: ConceptRow[];
  dueVocabulary: VocabularyItemRow[];
  dueConcepts: ConceptRow[];
  recentCorrections: { original: string; corrected: string; explanation: string; created_at: string }[];
  recentTopics: { title: string; exercise_type: string; created_at: string }[];
  skillAverages: Record<string, { avg: number; n: number; trend: number }>;
  recentVocabulary: string[];
  weakestToeflSections: ToeflSection[];
}

export async function loadLearnerMemory(db: Db, userId: string, profile: ProfileRow): Promise<LearnerMemory> {
  const nowIso = new Date().toISOString();
  const [sessions, concepts, dueVocab, recentErrors, recentExercises, scores, recentVocab] = await Promise.all([
    db.from("learning_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("kind", "daily").eq("status", "completed"),
    db.from("concepts").select("*").eq("user_id", userId).neq("status", "mastered").order("last_seen_at", { ascending: false }).limit(60),
    db.from("vocabulary_items").select("*").eq("user_id", userId).lte("due_at", nowIso).neq("mastery", "mastered").order("due_at").limit(40),
    db.from("error_log").select("original, corrected, explanation, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(8),
    db.from("exercises").select("title, exercise_type, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
    db.from("skill_scores").select("skill, score, max_score, recorded_at").eq("user_id", userId).order("recorded_at", { ascending: false }).limit(200),
    db.from("vocabulary_items").select("term").eq("user_id", userId).order("created_at", { ascending: false }).limit(60),
  ]);

  const weaknesses = (concepts.data ?? [])
    .slice()
    .sort((a, b) => reviewPriority(b) - reviewPriority(a))
    .slice(0, 15);
  const dueConcepts = (concepts.data ?? []).filter((c) => c.due_at <= nowIso).sort((a, b) => reviewPriority(b) - reviewPriority(a));

  const bySkill: Record<string, number[]> = {};
  for (const s of scores.data ?? []) {
    (bySkill[s.skill] ??= []).push((Number(s.score) / Number(s.max_score || 100)) * 100);
  }
  const skillAverages: LearnerMemory["skillAverages"] = {};
  for (const [skill, arr] of Object.entries(bySkill)) {
    const recent = arr.slice(0, 5);
    const older = arr.slice(5, 10);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const prev = older.length ? older.reduce((a, b) => a + b, 0) / older.length : avg;
    skillAverages[skill] = { avg: Math.round(avg), n: arr.length, trend: Math.round(avg - prev) };
  }
  const toeflSections: ToeflSection[] = ["reading", "listening", "speaking", "writing"];
  const weakestToeflSections = toeflSections
    .filter((s) => skillAverages[`toefl_${s}`])
    .sort((a, b) => skillAverages[`toefl_${a}`].avg - skillAverages[`toefl_${b}`].avg);

  return {
    profile,
    completedSessions: sessions.count ?? 0,
    weaknesses,
    dueVocabulary: dueVocab.data ?? [],
    dueConcepts,
    recentCorrections: recentErrors.data ?? [],
    recentTopics: recentExercises.data ?? [],
    skillAverages,
    recentVocabulary: (recentVocab.data ?? []).map((v) => v.term),
    weakestToeflSections,
  };
}

/** Compact, model-readable memory digest placed in the user turn. */
export function memoryDigest(m: LearnerMemory): string {
  const lines: string[] = [];
  lines.push(`Learner: ${m.profile.display_name ?? "the learner"}. Daily goal: ${m.profile.daily_goal_minutes} min. TOEFL target band: ${m.profile.toefl_target_band}. Completed daily sessions: ${m.completedSessions}. Streak: ${m.profile.current_streak} days.`);
  if (m.profile.teaching_contexts) lines.push(`Teaching contexts: ${m.profile.teaching_contexts}`);
  if (m.profile.focus_notes) lines.push(`Learner's own focus notes: ${m.profile.focus_notes}`);

  const perf = Object.entries(m.skillAverages)
    .map(([k, v]) => `${k} ${v.avg}% (${v.trend >= 0 ? "+" : ""}${v.trend}, n=${v.n})`)
    .join("; ");
  lines.push(`Recent performance: ${perf || "no data yet (first sessions — calibrate difficulty at solid C1 and probe upward)"}`);

  if (m.weaknesses.length) {
    lines.push(
      "Active weaknesses (priority order): " +
        m.weaknesses
          .map((c) => `${c.name} [${c.category}, sev ${c.severity}, seen ${c.occurrences}x, ${c.status}]`)
          .join("; "),
    );
  } else lines.push("Active weaknesses: none recorded yet.");

  if (m.dueVocabulary.length) {
    lines.push("Vocabulary due for review: " + m.dueVocabulary.slice(0, 12).map((v) => v.term).join(", "));
  }
  if (m.recentVocabulary.length) {
    lines.push("Vocabulary already in the deck (do NOT re-teach): " + m.recentVocabulary.slice(0, 40).join(", "));
  }
  if (m.recentCorrections.length) {
    lines.push(
      "Recent corrections: " +
        m.recentCorrections.slice(0, 5).map((e) => `"${e.original}" → "${e.corrected}"`).join(" | "),
    );
  }
  if (m.recentTopics.length) {
    lines.push("Recently covered (avoid repeating): " + m.recentTopics.slice(0, 15).map((t) => t.title).join("; "));
  }
  return lines.join("\n");
}
