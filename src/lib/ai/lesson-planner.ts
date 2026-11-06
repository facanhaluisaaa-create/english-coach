import "server-only";
import { generateStructured } from "./client";
import { COACH_IDENTITY, SKILL_TEACHING } from "./prompts";
import { ClarifyTurn, CoachTurn, type LessonBrief, type LessonPlan } from "./lesson-schemas";

export const LESSON_PLANNER_SYSTEM = `${COACH_IDENTITY}

${SKILL_TEACHING}

You are now the teacher's CO-PLANNER for a real class. Non-negotiable rules:
1. You never prepare a class on your own. Everything is built with the teacher, from the teacher's information. If something you need is missing (what the students can already do, what happened last lesson, the room, the materials, the teacher's preferences), ASK — do not assume and do not fill gaps with invented facts about this class.
2. You propose; the teacher decides. A proposal is a suggestion the teacher will apply, edit or discard. Build on the teacher's own ideas first; say explicitly where you changed or kept them.
3. Work incrementally. Early in the conversation propose objectives and a stage outline, not a finished document; add detail (procedures, CCQs, materials) when the teacher confirms the direction or asks for it. One or two focused questions beat a questionnaire.
4. Plans must be realistic: timings sum to the lesson duration, instructions are concrete, interaction patterns vary, and every stage has a check (CCQs, instruction check, monitoring focus). Match the students' age and CEFR level in language, topics and task demands.
5. Draw on sound methodology (communicative language teaching, task-based learning, guided discovery, scaffolding, formative assessment, differentiation) and name it only when useful to the teacher.
6. Keep your messages short and warm. The teacher is a colleague, not a student.`;

function briefText(brief: LessonBrief) {
  return [
    `Class: ${brief.class_name}`,
    `Students: ${brief.student_ages}, CEFR ${brief.level}, ${brief.class_size} student(s)`,
    `Lesson duration: ${brief.duration_minutes} minutes`,
    `Aim (teacher's words): ${brief.aim}`,
    brief.language_focus && `Language focus: ${brief.language_focus}`,
    brief.previous_lesson && `Previous lesson: ${brief.previous_lesson}`,
    brief.materials_available && `Materials available: ${brief.materials_available}`,
    brief.constraints && `Constraints: ${brief.constraints}`,
    brief.teacher_ideas && `Teacher's own ideas: ${brief.teacher_ideas}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export interface PlannerContext {
  brief: LessonBrief;
  plan: LessonPlan | null;
  teacherProfile: string;
  history: { role: "user" | "assistant"; content: string }[];
}

/** First turn: read the brief and ask what you need. No plan can be proposed. */
export async function clarifyTurn(ctx: PlannerContext) {
  return generateStructured({
    system: LESSON_PLANNER_SYSTEM,
    schema: ClarifyTurn,
    effort: "low",
    maxTokens: 2000,
    user: `TEACHER PROFILE\n${ctx.teacherProfile}\n\nCLASS BRIEF (from the teacher)\n${briefText(ctx.brief)}\n\nThis is the start of planning. Acknowledge the brief in one or two sentences and ask the 2–4 questions whose answers matter most for this specific class. Do not propose any plan yet.`,
  });
}

/** Every later turn: discuss, ask, or propose a plan state for the teacher to apply. */
export async function coachTurn(ctx: PlannerContext, teacherMessage: string) {
  const transcript = ctx.history
    .slice(-24)
    .map((m) => `${m.role === "user" ? "TEACHER" : "COACH"}: ${m.content}`)
    .join("\n\n");
  return generateStructured({
    system: LESSON_PLANNER_SYSTEM,
    schema: CoachTurn,
    effort: "medium",
    maxTokens: 12000,
    user: `TEACHER PROFILE\n${ctx.teacherProfile}\n\nCLASS BRIEF (from the teacher)\n${briefText(ctx.brief)}\n\nCURRENT PLAN (the teacher's document; only they can change it)\n${ctx.plan ? JSON.stringify(ctx.plan, null, 1) : "(empty — nothing agreed yet)"}\n\nCONVERSATION SO FAR\n${transcript || "(none)"}\n\nTEACHER'S NEW MESSAGE\n${teacherMessage}\n\nRespond as the co-planner. If you propose, return the COMPLETE plan state (all fields, including unchanged ones) with stage ids "s1", "s2"… and timings that sum to ${ctx.brief.duration_minutes} minutes. If the teacher's information is still insufficient for what they ask, ask instead of guessing.`,
  });
}
