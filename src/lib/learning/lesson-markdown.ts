import type { LessonBrief, LessonPlan } from "@/lib/ai/lesson-schemas";

/** Markdown export of a lesson plan (for copying into a document or printing). */
export function planToMarkdown(plan: LessonPlan, brief?: LessonBrief): string {
  const lines: string[] = [`# ${plan.title}`, ""];
  if (brief) {
    lines.push(`**Class:** ${brief.class_name} · ${brief.student_ages} · CEFR ${brief.level} · ${brief.class_size} students · ${brief.duration_minutes} min`, "");
  }
  if (plan.objectives.length) {
    lines.push("## Objectives", ...plan.objectives.map((o) => `- ${o}`), "");
  }
  if (plan.target_language) lines.push("## Target language", plan.target_language, "");
  if (plan.assumed_knowledge) lines.push("## Assumed knowledge", plan.assumed_knowledge, "");
  if (plan.stages.length) {
    lines.push("## Stages", "");
    plan.stages.forEach((s, i) => {
      lines.push(`### ${i + 1}. ${s.name} (${s.minutes} min)`);
      if (s.aim) lines.push(`**Aim:** ${s.aim}`);
      if (s.interaction) lines.push(`**Interaction:** ${s.interaction}`);
      if (s.procedure) lines.push("", s.procedure);
      if (s.materials) lines.push("", `**Materials:** ${s.materials}`);
      if (s.checks) lines.push(`**Checks:** ${s.checks}`);
      lines.push("");
    });
    const total = plan.stages.reduce((a, s) => a + s.minutes, 0);
    lines.push(`_Total: ${total} min_`, "");
  }
  if (plan.materials_list.length) lines.push("## Materials", ...plan.materials_list.map((m) => `- ${m}`), "");
  if (plan.anticipated_problems.length) {
    lines.push("## Anticipated problems", ...plan.anticipated_problems.map((p) => `- **${p.problem}** — ${p.solution}`), "");
  }
  if (plan.differentiation) lines.push("## Differentiation", plan.differentiation, "");
  if (plan.assessment) lines.push("## Assessment", plan.assessment, "");
  if (plan.homework) lines.push("## Homework", plan.homework, "");
  return lines.join("\n").trim() + "\n";
}

export function stageTotal(plan: LessonPlan) {
  return plan.stages.reduce((a, s) => a + (Number(s.minutes) || 0), 0);
}
