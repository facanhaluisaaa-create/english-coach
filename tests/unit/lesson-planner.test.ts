import { describe, expect, it } from "vitest";
import { ClarifyTurn, CoachTurn, LessonBrief, LessonPlan, emptyPlan } from "@/lib/ai/lesson-schemas";
import { planToMarkdown, stageTotal } from "@/lib/learning/lesson-markdown";

const brief = {
  class_name: "Teens B1",
  student_ages: "13–14",
  level: "B1",
  class_size: "18",
  duration_minutes: "50",
  aim: "Students can describe past experiences with the present perfect.",
  language_focus: "",
  previous_lesson: "",
  materials_available: "",
  constraints: "",
  teacher_ideas: "",
};

describe("lesson planner contracts", () => {
  it("requires the teacher's information before anything can be planned", () => {
    expect(LessonBrief.safeParse(brief).success).toBe(true);
    expect(LessonBrief.safeParse({ ...brief, aim: "" }).success).toBe(false);
    expect(LessonBrief.safeParse({ ...brief, student_ages: "" }).success).toBe(false);
    expect(LessonBrief.safeParse({ ...brief, duration_minutes: "5" }).success).toBe(false);
  });

  it("restricts the first coach turn to questions only (no plan field exists)", () => {
    const withProposal = ClarifyTurn.safeParse({ message: "Hi", questions: ["Q1"], proposal: { summary: "x", plan: emptyPlan("t") } });
    // Unknown keys are stripped by Zod objects, so a proposal can never survive the first turn.
    expect(withProposal.success).toBe(true);
    expect(withProposal.success && "proposal" in withProposal.data).toBe(false);
  });

  it("validates a coach turn with or without a proposal", () => {
    const plan = { ...emptyPlan("t"), stages: [{ id: "s1", name: "Lead-in", minutes: 5, aim: "", procedure: "", interaction: "T–Ss", materials: "", checks: "" }] };
    expect(CoachTurn.safeParse({ message: "m", questions: [], proposal: null }).success).toBe(true);
    expect(CoachTurn.safeParse({ message: "m", questions: ["q"], proposal: { summary: "s", plan } }).success).toBe(true);
    expect(LessonPlan.safeParse({ ...plan, stages: [{ id: "s1" }] }).success).toBe(false);
  });

  it("exports Markdown with stages, timings and totals", () => {
    const plan: LessonPlan = {
      ...emptyPlan("Have you ever…?"),
      objectives: ["Ask about experiences"],
      stages: [
        { id: "s1", name: "Lead-in", minutes: 5, aim: "Context", procedure: "Show photos.", interaction: "T–Ss", materials: "Photos", checks: "CCQ: do we know when?" },
        { id: "s2", name: "Mingle", minutes: 10, aim: "Fluency", procedure: "Find someone who…", interaction: "mingle", materials: "Handout", checks: "ICQ" },
      ],
      homework: "p. 42",
    };
    const md = planToMarkdown(plan, LessonBrief.parse(brief));
    expect(md).toContain("# Have you ever…?");
    expect(md).toContain("**Class:** Teens B1 · 13–14 · CEFR B1 · 18 students · 50 min");
    expect(md).toContain("### 1. Lead-in (5 min)");
    expect(md).toContain("### 2. Mingle (10 min)");
    expect(md).toContain("_Total: 15 min_");
    expect(md).toContain("## Homework\np. 42");
    expect(stageTotal(plan)).toBe(15);
  });
});
