/**
 * Lesson planning contracts. The plan is the teacher's document: the model only
 * ever returns a *proposal*, which the teacher applies, edits or discards.
 */
import { z } from "zod";
import { CEFR } from "./schemas";

export const LessonBrief = z.object({
  class_name: z.string().min(1, "Give the class a name so you can find it later."),
  student_ages: z.string().min(1, "Tell the coach how old your students are."),
  level: CEFR,
  class_size: z.coerce.number().int().min(1).max(60),
  duration_minutes: z.coerce.number().int().min(15).max(240),
  aim: z.string().min(10, "Describe what you want this class to achieve (at least a sentence)."),
  language_focus: z.string().max(400),
  previous_lesson: z.string().max(1000),
  materials_available: z.string().max(400),
  constraints: z.string().max(800),
  teacher_ideas: z.string().max(1500),
});
export type LessonBrief = z.infer<typeof LessonBrief>;

export const LessonStage = z.object({
  id: z.string(),
  name: z.string(),
  minutes: z.number().int(),
  aim: z.string(),
  procedure: z.string().describe("What the teacher does and what the students do, step by step"),
  interaction: z.string().describe("e.g. T–Ss, pairs, small groups, individual"),
  materials: z.string(),
  checks: z.string().describe("Concept-checking questions, instruction checks, or monitoring focus"),
});

export const LessonPlan = z.object({
  title: z.string(),
  objectives: z.array(z.string()).describe("'By the end of the lesson, students will be able to…'"),
  target_language: z.string(),
  assumed_knowledge: z.string(),
  stages: z.array(LessonStage),
  materials_list: z.array(z.string()),
  anticipated_problems: z.array(z.object({ problem: z.string(), solution: z.string() })),
  differentiation: z.string(),
  assessment: z.string(),
  homework: z.string().nullable(),
});
export type LessonPlan = z.infer<typeof LessonPlan>;

/** First turn after the brief: questions only — no plan can exist yet. */
export const ClarifyTurn = z.object({
  message: z.string().describe("A short reply to the teacher: what you understood and why you are asking"),
  questions: z.array(z.string()).describe("2–4 specific questions whose answers change the plan"),
});
export type ClarifyTurn = z.infer<typeof ClarifyTurn>;

export const CoachTurn = z.object({
  message: z.string().describe("Conversational reply; explain the reasoning behind any proposal briefly"),
  questions: z.array(z.string()).describe("Open questions for the teacher (0–4); empty if none"),
  proposal: z
    .object({
      summary: z.string().describe("One line: what this proposal changes compared with the current plan"),
      plan: LessonPlan,
    })
    .nullable()
    .describe("A complete proposed plan state, or null when you are only discussing or asking"),
});
export type CoachTurn = z.infer<typeof CoachTurn>;

export const emptyPlan = (title: string): LessonPlan => ({
  title,
  objectives: [],
  target_language: "",
  assumed_knowledge: "",
  stages: [],
  materials_list: [],
  anticipated_problems: [],
  differentiation: "",
  assessment: "",
  homework: null,
});
