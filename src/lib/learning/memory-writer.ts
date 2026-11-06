import "server-only";
import type { Evaluation, ExerciseContent } from "@/lib/ai/schemas";
import type { ConceptRow, VocabularyItemRow } from "@/lib/db/types";
import type { Db } from "./memory";
import { conceptStatusFor, review, scoreToRating, type Rating } from "./srs";
import type { ToeflTaskType } from "./toefl-spec";
import { TOEFL_TASKS, percentToBand } from "./toefl-spec";

interface WriteInput {
  db: Db;
  userId: string;
  exerciseId: string;
  content: ExerciseContent;
  response: unknown;
  evaluation: Evaluation;
}

function skillKey(content: ExerciseContent) {
  if ("task_type" in content) return `toefl_${TOEFL_TASKS[content.task_type as ToeflTaskType].section}`;
  switch (content.kind) {
    case "vocabulary_set":
      return "vocabulary";
    case "grammar_focus":
      return "grammar";
    case "teaching_challenge":
      return "teaching";
    case "review_set":
      return "review";
  }
}

/**
 * Applies an evaluation to the learner's long-term memory:
 * concepts (weaknesses), error log, vocabulary deck, review log, skill scores.
 */
export async function applyEvaluationToMemory({ db, userId, exerciseId, content, response, evaluation }: WriteInput) {
  const now = new Date();

  // 1. Skill score time series
  const key = skillKey(content);
  await db.from("skill_scores").insert({
    user_id: userId,
    exercise_id: exerciseId,
    skill: key,
    score: evaluation.score,
    max_score: 100,
    band: evaluation.toefl?.band_estimate ?? (key.startsWith("toefl_") ? percentToBand(evaluation.score) : null),
  });

  // 2. Weaknesses detected → upsert concepts (reset SRS progress on failure)
  const conceptIds = new Map<string, string>();
  for (const w of evaluation.weaknesses_detected) {
    const name = w.name.trim();
    if (!name) continue;
    const { data: existing } = await db
      .from("concepts")
      .select("*")
      .eq("user_id", userId)
      .ilike("name", name)
      .maybeSingle();
    if (existing) {
      const srs = review(existing, 1 as Rating, now);
      const { data } = await db
        .from("concepts")
        .update({
          occurrences: existing.occurrences + 1,
          severity: Math.max(existing.severity, Math.min(5, Math.max(1, w.severity))),
          description: w.description || existing.description,
          status: conceptStatusFor(srs),
          repetitions: srs.repetitions,
          interval_days: srs.interval_days,
          ease: srs.ease,
          due_at: srs.due_at.toISOString(),
          last_reviewed_at: now.toISOString(),
          times_incorrect: srs.times_incorrect,
          last_seen_at: now.toISOString(),
        })
        .eq("id", existing.id)
        .select("id")
        .single();
      conceptIds.set(name.toLowerCase(), data?.id ?? existing.id);
    } else {
      const { data } = await db
        .from("concepts")
        .insert({
          user_id: userId,
          category: w.category,
          name,
          description: w.description,
          severity: Math.min(5, Math.max(1, w.severity)),
          occurrences: 1,
          status: "active",
          due_at: new Date(now.getTime() + 12 * 3600_000).toISOString(),
          times_incorrect: 1,
        })
        .select("id")
        .single();
      if (data) conceptIds.set(name.toLowerCase(), data.id);
    }
  }

  // 3. Concepts demonstrated correctly → credit the SRS of known weaknesses
  for (const demonstrated of evaluation.concepts_demonstrated) {
    const { data: existing } = await db
      .from("concepts")
      .select("*")
      .eq("user_id", userId)
      .ilike("name", demonstrated.trim())
      .maybeSingle();
    if (!existing) continue;
    if (conceptIds.has(existing.name.toLowerCase())) continue; // detected as weak in the same exercise: no credit
    await applySrsToConcept(db, existing, 4, exerciseId, now);
  }

  // 4. Error log
  if (evaluation.corrections.length) {
    await db.from("error_log").insert(
      evaluation.corrections.slice(0, 20).map((c) => ({
        user_id: userId,
        exercise_id: exerciseId,
        concept_id: c.concept ? conceptIds.get(c.concept.name.toLowerCase()) ?? null : null,
        original: c.original,
        corrected: c.corrected,
        explanation: c.explanation,
        error_type: c.type,
      })),
    );
  }

  // 5. Vocabulary: items taught in a vocabulary set enter the deck with a first review
  if (content.kind === "vocabulary_set") {
    const perItem = new Map((evaluation.per_item ?? []).map((p) => [p.id.toLowerCase(), p]));
    for (const item of content.items) {
      const judged = perItem.get(item.term.toLowerCase());
      const rating: Rating = judged ? (judged.correct === false ? 1 : judged.score != null ? scoreToRating(judged.score) : 4) : 3;
      await upsertVocabulary(db, userId, exerciseId, {
        term: item.term,
        part_of_speech: item.part_of_speech,
        definition: item.definition,
        example: item.example,
        collocations: item.collocations,
        register: item.register,
        cefr_level: item.cefr_level,
        notes: item.nuance,
      }, rating, now);
    }
  }

  // 6. New vocabulary surfaced by feedback (not yet reviewed → due tomorrow)
  for (const v of evaluation.vocabulary_to_remember.slice(0, 3)) {
    await upsertVocabulary(
      db,
      userId,
      exerciseId,
      {
        term: v.term,
        part_of_speech: v.part_of_speech,
        definition: v.definition,
        example: v.example,
        collocations: v.collocations,
        register: null,
        cefr_level: null,
        notes: null,
      },
      null,
      now,
    );
  }

  // 7. Review set: apply SRS to each reviewed item
  if (content.kind === "review_set") {
    const resp = response as { answers?: { id: string; answer: string; self_rating: number }[] } | null;
    const perItem = new Map((evaluation.per_item ?? []).map((p) => [p.id, p]));
    for (const item of content.items) {
      const judged = perItem.get(item.id);
      const self = resp?.answers?.find((a) => a.id === item.id)?.self_rating;
      let rating: Rating;
      if (judged?.correct === true) rating = (self != null && self >= 4 ? 5 : 4) as Rating;
      else if (judged?.correct === false) rating = (self != null && self >= 3 ? 2 : 1) as Rating;
      else rating = (self != null ? Math.max(0, Math.min(5, Math.round(self))) : 3) as Rating;

      if (item.item_type === "vocabulary") {
        const { data: v } = await db.from("vocabulary_items").select("*").eq("id", item.item_id).eq("user_id", userId).maybeSingle();
        if (v) await applySrsToVocabulary(db, v, rating, exerciseId, now);
      } else {
        const { data: c } = await db.from("concepts").select("*").eq("id", item.item_id).eq("user_id", userId).maybeSingle();
        if (c) await applySrsToConcept(db, c, rating, exerciseId, now);
      }
    }
  }
}

async function upsertVocabulary(
  db: Db,
  userId: string,
  exerciseId: string,
  item: {
    term: string;
    part_of_speech: string | null;
    definition: string;
    example: string | null;
    collocations: string[];
    register: string | null;
    cefr_level: string | null;
    notes: string | null;
  },
  rating: Rating | null,
  now: Date,
) {
  const term = item.term.trim();
  if (!term) return;
  const { data: existing } = await db.from("vocabulary_items").select("*").eq("user_id", userId).ilike("term", term).maybeSingle();
  if (existing) {
    if (rating != null) await applySrsToVocabulary(db, existing, rating, exerciseId, now);
    return;
  }
  const base = {
    user_id: userId,
    term,
    part_of_speech: item.part_of_speech,
    definition: item.definition,
    example: item.example,
    collocations: item.collocations ?? [],
    register: item.register,
    cefr_level: item.cefr_level,
    notes: item.notes,
    source_exercise_id: exerciseId,
  };
  if (rating == null) {
    await db.from("vocabulary_items").insert({ ...base, due_at: new Date(now.getTime() + 86_400_000).toISOString() });
    return;
  }
  const srs = review({ repetitions: 0, interval_days: 0, ease: 2.5, times_correct: 0, times_incorrect: 0 }, rating, now);
  const { data } = await db
    .from("vocabulary_items")
    .insert({
      ...base,
      repetitions: srs.repetitions,
      interval_days: srs.interval_days,
      ease: srs.ease,
      due_at: srs.due_at.toISOString(),
      last_reviewed_at: now.toISOString(),
      times_correct: srs.times_correct,
      times_incorrect: srs.times_incorrect,
      mastery: srs.mastery,
    })
    .select("id")
    .single();
  if (data) {
    await db.from("review_log").insert({ user_id: userId, item_type: "vocabulary", item_id: data.id, exercise_id: exerciseId, rating, correct: rating >= 3 });
  }
}

async function applySrsToVocabulary(db: Db, v: VocabularyItemRow, rating: Rating, exerciseId: string, now: Date) {
  const srs = review(v, rating, now);
  await db
    .from("vocabulary_items")
    .update({
      repetitions: srs.repetitions,
      interval_days: srs.interval_days,
      ease: srs.ease,
      due_at: srs.due_at.toISOString(),
      last_reviewed_at: now.toISOString(),
      times_correct: srs.times_correct,
      times_incorrect: srs.times_incorrect,
      mastery: srs.mastery,
    })
    .eq("id", v.id);
  await db.from("review_log").insert({ user_id: v.user_id, item_type: "vocabulary", item_id: v.id, exercise_id: exerciseId, rating, correct: rating >= 3 });
}

async function applySrsToConcept(db: Db, c: ConceptRow, rating: Rating, exerciseId: string, now: Date) {
  const srs = review(c, rating, now);
  await db
    .from("concepts")
    .update({
      repetitions: srs.repetitions,
      interval_days: srs.interval_days,
      ease: srs.ease,
      due_at: srs.due_at.toISOString(),
      last_reviewed_at: now.toISOString(),
      times_correct: srs.times_correct,
      times_incorrect: srs.times_incorrect,
      status: conceptStatusFor(srs),
      last_seen_at: now.toISOString(),
    })
    .eq("id", c.id);
  await db.from("review_log").insert({ user_id: c.user_id, item_type: "concept", item_id: c.id, exercise_id: exerciseId, rating, correct: rating >= 3 });
}
