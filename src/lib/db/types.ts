/**
 * Hand-maintained row types mirroring supabase/migrations/0001_init.sql.
 * Keep these in sync when the schema changes.
 */
import type { Json } from "./json";

export type Skill = "vocabulary" | "grammar" | "toefl" | "teaching" | "review";
export type ExerciseStatus = "pending" | "submitted" | "evaluated" | "skipped";
export type SessionStatus = "planned" | "in_progress" | "completed";
export type Mastery = "new" | "learning" | "reviewing" | "mastered";
export type ConceptStatus = "active" | "improving" | "mastered";
export type ConceptCategory =
  | "grammar"
  | "vocabulary"
  | "pronunciation"
  | "writing"
  | "speaking"
  | "reading"
  | "listening"
  | "teaching"
  | "register"
  | "discourse";

export type ProfileRow = {
  id: string;
  display_name: string | null;
  timezone: string;
  daily_goal_minutes: number;
  toefl_target_band: number;
  teaching_contexts: string | null;
  focus_notes: string | null;
  current_streak: number;
  longest_streak: number;
  last_session_date: string | null;
  created_at: string;
  updated_at: string;
}

export type LearningSessionRow = {
  id: string;
  user_id: string;
  kind: "daily" | "practice";
  session_date: string;
  status: SessionStatus;
  plan: Json;
  summary: Json | null;
  total_score: number | null;
  max_score: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export type ExerciseRow = {
  id: string;
  session_id: string;
  user_id: string;
  position: number;
  skill: Skill;
  exercise_type: string;
  title: string;
  estimated_minutes: number;
  content: Json;
  response: Json | null;
  evaluation: Json | null;
  score: number | null;
  max_score: number;
  status: ExerciseStatus;
  started_at: string | null;
  submitted_at: string | null;
  created_at: string;
}

export type VocabularyItemRow = {
  id: string;
  user_id: string;
  term: string;
  part_of_speech: string | null;
  definition: string;
  example: string | null;
  collocations: string[];
  register: string | null;
  cefr_level: string | null;
  notes: string | null;
  source_exercise_id: string | null;
  repetitions: number;
  interval_days: number;
  ease: number;
  due_at: string;
  last_reviewed_at: string | null;
  times_correct: number;
  times_incorrect: number;
  mastery: Mastery;
  created_at: string;
}

export type ConceptRow = {
  id: string;
  user_id: string;
  category: ConceptCategory;
  name: string;
  description: string | null;
  severity: number;
  occurrences: number;
  status: ConceptStatus;
  repetitions: number;
  interval_days: number;
  ease: number;
  due_at: string;
  last_reviewed_at: string | null;
  times_correct: number;
  times_incorrect: number;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
}

export type ErrorLogRow = {
  id: string;
  user_id: string;
  exercise_id: string | null;
  concept_id: string | null;
  original: string;
  corrected: string;
  explanation: string;
  error_type: "error" | "stylistic" | "register" | "naturalness";
  created_at: string;
}

export type ReviewLogRow = {
  id: string;
  user_id: string;
  item_type: "vocabulary" | "concept";
  item_id: string;
  exercise_id: string | null;
  rating: number;
  correct: boolean;
  created_at: string;
}

export type SkillScoreRow = {
  id: string;
  user_id: string;
  exercise_id: string | null;
  skill: string;
  score: number;
  max_score: number;
  band: number | null;
  recorded_at: string;
}

export type CoachMessageRow = {
  id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

/** Generic table shape used by supabase-js generics. */
type Table<Row extends Record<string, unknown>, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id">;
      learning_sessions: Table<LearningSessionRow, "user_id" | "plan">;
      exercises: Table<
        ExerciseRow,
        "session_id" | "user_id" | "position" | "skill" | "exercise_type" | "title" | "content"
      >;
      vocabulary_items: Table<VocabularyItemRow, "user_id" | "term" | "definition">;
      concepts: Table<ConceptRow, "user_id" | "category" | "name">;
      error_log: Table<ErrorLogRow, "user_id" | "original" | "corrected" | "explanation">;
      review_log: Table<ReviewLogRow, "user_id" | "item_type" | "item_id" | "rating" | "correct">;
      skill_scores: Table<SkillScoreRow, "user_id" | "skill" | "score">;
      coach_messages: Table<CoachMessageRow, "user_id" | "role" | "content">;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
