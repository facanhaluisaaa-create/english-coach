/**
 * Zod schemas shared by the AI layer (structured outputs), the database (jsonb
 * columns) and the UI. Keep them JSON-schema friendly: objects, arrays, strings,
 * numbers, enums, nullable — no defaults/transforms (required by structured outputs).
 */
import { z } from "zod";
import { TOEFL_TASK_TYPES } from "@/lib/learning/toefl-spec";

export const CEFR = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);
export const ConceptCategory = z.enum([
  "grammar",
  "vocabulary",
  "pronunciation",
  "writing",
  "speaking",
  "reading",
  "listening",
  "teaching",
  "register",
  "discourse",
]);

// ---------------------------------------------------------------------------
// Vocabulary block
// ---------------------------------------------------------------------------
export const VocabularyItem = z.object({
  term: z.string(),
  part_of_speech: z.string(),
  definition: z.string(),
  example: z.string(),
  collocations: z.array(z.string()),
  register: z.string().describe("e.g. neutral, formal/academic, informal, literary"),
  cefr_level: CEFR,
  nuance: z.string().describe("How it differs from a near-synonym a C1 learner would reach for"),
  usage_note: z.string(),
});

export const VocabularyContent = z.object({
  kind: z.literal("vocabulary_set"),
  theme: z.string(),
  intro: z.string(),
  items: z.array(VocabularyItem),
  task: z.string().describe("Instruction asking for one original sentence per item"),
});
export const VocabularyResponse = z.object({
  sentences: z.array(z.object({ term: z.string(), sentence: z.string() })),
});

// ---------------------------------------------------------------------------
// Grammar block
// ---------------------------------------------------------------------------
export const GrammarTask = z.object({
  id: z.string(),
  type: z.enum(["transform", "complete", "correct", "produce"]),
  instruction: z.string(),
  prompt: z.string(),
  model_answer: z.string().describe("A reference answer; alternatives may be acceptable"),
});

export const GrammarContent = z.object({
  kind: z.literal("grammar_focus"),
  topic: z.string(),
  why_this: z.string().describe("One sentence linking the topic to the learner's history or C2 goals"),
  explanation: z.object({
    meaning: z.string(),
    form: z.string(),
    use: z.string(),
    register: z.string(),
    pitfalls: z.array(z.string()),
  }),
  examples: z.array(z.object({ sentence: z.string(), note: z.string() })),
  tasks: z.array(GrammarTask),
});
export const GrammarResponse = z.object({
  answers: z.array(z.object({ id: z.string(), answer: z.string() })),
});

// ---------------------------------------------------------------------------
// TOEFL blocks (one schema per interface family)
// ---------------------------------------------------------------------------
export const ToeflTaskType = z.enum(TOEFL_TASK_TYPES as [string, ...string[]]);

export const McQuestion = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()),
  answer_index: z.number().int(),
  explanation: z.string(),
});

/** Reading (daily life / academic) and Listening (conversation / announcement / talk). */
export const ToeflPassageContent = z.object({
  kind: z.literal("toefl_passage"),
  task_type: ToeflTaskType,
  title: z.string(),
  /** For listening tasks this is the script read aloud; for reading it is the text shown. */
  passage: z.string(),
  speakers: z.array(z.object({ name: z.string(), role: z.string() })),
  questions: z.array(McQuestion),
  strategy_tip: z.string(),
  time_limit_seconds: z.number().int(),
});

export const ToeflCompleteWordsContent = z.object({
  kind: z.literal("toefl_complete_words"),
  task_type: z.literal("reading_complete_the_words"),
  title: z.string(),
  passage: z.string().describe("Text where each gap is written as {{n}} with n = gap id"),
  gaps: z.array(
    z.object({
      id: z.string(),
      shown: z.string().describe("The first letters shown to the learner"),
      answer: z.string().describe("The full word"),
    }),
  ),
  strategy_tip: z.string(),
  time_limit_seconds: z.number().int(),
});

export const ToeflChooseResponseContent = z.object({
  kind: z.literal("toefl_choose_response"),
  task_type: z.literal("listening_choose_response"),
  items: z.array(
    z.object({
      id: z.string(),
      speaker_line: z.string().describe("What the learner hears"),
      options: z.array(z.string()),
      answer_index: z.number().int(),
      explanation: z.string(),
    }),
  ),
  strategy_tip: z.string(),
  time_limit_seconds: z.number().int(),
});

export const ToeflBuildSentenceContent = z.object({
  kind: z.literal("toefl_build_sentence"),
  task_type: z.literal("writing_build_a_sentence"),
  items: z.array(
    z.object({
      id: z.string(),
      context: z.string().describe("A short situation or the question the sentence answers"),
      chunks: z.array(z.string()).describe("Shuffled words/phrases to be arranged"),
      answer: z.string(),
    }),
  ),
  strategy_tip: z.string(),
  time_limit_seconds: z.number().int(),
});

export const ToeflWritingContent = z.object({
  kind: z.literal("toefl_writing"),
  task_type: z.enum(["writing_email", "writing_academic_discussion"]),
  title: z.string(),
  situation: z.string(),
  instructions: z.string(),
  required_points: z.array(z.string()),
  discussion: z
    .object({
      professor_prompt: z.string(),
      student_posts: z.array(z.object({ name: z.string(), post: z.string() })),
    })
    .nullable(),
  min_words: z.number().int(),
  strategy_tip: z.string(),
  time_limit_seconds: z.number().int(),
});

export const ToeflSpeakingContent = z.object({
  kind: z.literal("toefl_speaking"),
  task_type: z.enum(["speaking_listen_and_repeat", "speaking_interview"]),
  title: z.string(),
  context: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      /** Listen-and-repeat: the sentence; interview: the question. */
      text: z.string(),
      prep_seconds: z.number().int(),
      response_seconds: z.number().int(),
    }),
  ),
  strategy_tip: z.string(),
  time_limit_seconds: z.number().int(),
});

export const ToeflContent = z.discriminatedUnion("kind", [
  ToeflPassageContent,
  ToeflCompleteWordsContent,
  ToeflChooseResponseContent,
  ToeflBuildSentenceContent,
  ToeflWritingContent,
  ToeflSpeakingContent,
]);

export const ToeflResponse = z.object({
  /** MC answers: id → selected index; gaps/sentences/transcripts: id → text. */
  answers: z.array(z.object({ id: z.string(), value: z.string() })),
  text: z.string().nullable(),
  seconds_used: z.number().nullable(),
  input_mode: z.enum(["typed", "speech"]).nullable(),
});

// ---------------------------------------------------------------------------
// Teaching block
// ---------------------------------------------------------------------------
export const TeachingContent = z.object({
  kind: z.literal("teaching_challenge"),
  challenge_type: z.enum(["explain_concept", "correct_student_error", "plan_activity", "answer_student_question", "give_feedback"]),
  student: z.object({
    age: z.number().int(),
    level: CEFR,
    group: z.string().describe("e.g. one-to-one, small group of 6, class of 25"),
    context: z.string().describe("Who they are and why they are learning"),
  }),
  concept: z.string(),
  task: z.string().describe("The exact instruction to the teacher"),
  student_input: z.string().nullable().describe("A student utterance/error/question when relevant"),
  evaluation_focus: z.array(z.string()),
  methodology_hint: z.string(),
  time_limit_seconds: z.number().int(),
});
export const TeachingResponse = z.object({ text: z.string() });

// ---------------------------------------------------------------------------
// Review block (built from the learner's memory, not generated by the model)
// ---------------------------------------------------------------------------
export const ReviewItem = z.object({
  id: z.string(),
  item_type: z.enum(["vocabulary", "concept"]),
  item_id: z.string(),
  prompt: z.string(),
  expected: z.string(),
  hint: z.string().nullable(),
});
export const ReviewContent = z.object({
  kind: z.literal("review_set"),
  intro: z.string(),
  items: z.array(ReviewItem),
});
export const ReviewResponse = z.object({
  answers: z.array(z.object({ id: z.string(), answer: z.string(), self_rating: z.number().int() })),
});

export const ExerciseContent = z.discriminatedUnion("kind", [
  VocabularyContent,
  GrammarContent,
  ToeflPassageContent,
  ToeflCompleteWordsContent,
  ToeflChooseResponseContent,
  ToeflBuildSentenceContent,
  ToeflWritingContent,
  ToeflSpeakingContent,
  TeachingContent,
  ReviewContent,
]);
export type ExerciseContent = z.infer<typeof ExerciseContent>;
export type ExerciseKind = ExerciseContent["kind"];

export const ExerciseResponse = z.union([
  VocabularyResponse,
  GrammarResponse,
  ToeflResponse,
  TeachingResponse,
  ReviewResponse,
]);
export type ExerciseResponse = z.infer<typeof ExerciseResponse>;

// ---------------------------------------------------------------------------
// Evaluation (model output for every submitted exercise)
// ---------------------------------------------------------------------------
export const Correction = z.object({
  original: z.string(),
  corrected: z.string(),
  explanation: z.string(),
  type: z.enum(["error", "stylistic", "register", "naturalness"]),
  concept: z.object({ category: ConceptCategory, name: z.string() }).nullable(),
});

export const DetectedConcept = z.object({
  category: ConceptCategory,
  name: z.string().describe("Short canonical label, e.g. 'article use with abstract nouns'"),
  description: z.string(),
  severity: z.number().int().describe("1 (minor slip) to 5 (systematic, meaning-affecting)"),
  evidence: z.string(),
});

export const Evaluation = z.object({
  score: z.number().describe("0–100. For objectively scored items, must equal the auto-score provided."),
  summary: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  corrections: z.array(Correction),
  weaknesses_detected: z.array(DetectedConcept),
  concepts_demonstrated: z.array(z.string()).describe("Names of previously weak concepts the learner used correctly this time"),
  vocabulary_to_remember: z.array(
    z.object({
      term: z.string(),
      part_of_speech: z.string().nullable(),
      definition: z.string(),
      example: z.string(),
      collocations: z.array(z.string()),
    }),
  ),
  per_item: z
    .array(
      z.object({
        id: z.string(),
        correct: z.boolean().nullable(),
        score: z.number().nullable(),
        feedback: z.string(),
      }),
    )
    .nullable(),
  toefl: z
    .object({
      band_estimate: z.number().describe("1.0–6.0 in 0.5 steps; a practice estimate, not an ETS score"),
      rubric: z.array(z.object({ criterion: z.string(), score: z.number(), max: z.number(), comment: z.string() })),
      exam_strategy: z.string(),
    })
    .nullable(),
  teaching: z
    .object({
      accuracy: z.object({ score: z.number(), comment: z.string() }),
      clarity: z.object({ score: z.number(), comment: z.string() }),
      age_appropriateness: z.object({ score: z.number(), comment: z.string() }),
      pedagogy: z.object({ score: z.number(), comment: z.string() }),
      model_version: z.string().describe("A short model explanation or plan the teacher could compare against"),
    })
    .nullable(),
  next_step: z.string(),
});
export type Evaluation = z.infer<typeof Evaluation>;

// ---------------------------------------------------------------------------
// Session plan + summary
// ---------------------------------------------------------------------------
export const PlanBlock = z.object({
  skill: z.enum(["vocabulary", "grammar", "toefl", "teaching", "review"]),
  exercise_type: z.string(),
  title: z.string(),
  estimated_minutes: z.number().int(),
  focus: z.string(),
});
export const SessionPlan = z.object({
  title: z.string(),
  theme: z.string(),
  rationale: z.string(),
  blocks: z.array(PlanBlock),
  total_minutes: z.number().int(),
});
export type SessionPlan = z.infer<typeof SessionPlan>;

export const SessionSummary = z.object({
  headline: z.string(),
  wins: z.array(z.string()),
  focus_next: z.array(z.string()),
  encouragement: z.string(),
});
export type SessionSummary = z.infer<typeof SessionSummary>;

export type VocabularyContent = z.infer<typeof VocabularyContent>;
export type GrammarContent = z.infer<typeof GrammarContent>;
export type ToeflContent = z.infer<typeof ToeflContent>;
export type TeachingContent = z.infer<typeof TeachingContent>;
export type ReviewContent = z.infer<typeof ReviewContent>;
