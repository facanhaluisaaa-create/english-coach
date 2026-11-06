import type { LessonPlan } from "@/lib/ai/lesson-schemas";

/** A compact, human-readable comparison of the current plan and a proposed one. */
export function ProposalDiff({ current, proposed }: { current: LessonPlan; proposed: LessonPlan }) {
  const rows: { label: string; from: string; to: string }[] = [];
  const add = (label: string, from: string, to: string) => {
    if (from.trim() !== to.trim()) rows.push({ label, from, to });
  };
  add("Title", current.title, proposed.title);
  add("Objectives", current.objectives.join("\n"), proposed.objectives.join("\n"));
  add("Target language", current.target_language, proposed.target_language);
  add("Assumed knowledge", current.assumed_knowledge, proposed.assumed_knowledge);
  add(
    "Stages",
    current.stages.map((s) => `${s.name} (${s.minutes} min)`).join("\n"),
    proposed.stages.map((s) => `${s.name} (${s.minutes} min)`).join("\n"),
  );
  add("Materials", current.materials_list.join("\n"), proposed.materials_list.join("\n"));
  add("Anticipated problems", current.anticipated_problems.map((p) => p.problem).join("\n"), proposed.anticipated_problems.map((p) => p.problem).join("\n"));
  add("Differentiation", current.differentiation, proposed.differentiation);
  add("Assessment", current.assessment, proposed.assessment);
  add("Homework", current.homework ?? "", proposed.homework ?? "");

  const stageDetailChanged = proposed.stages.some((s) => {
    const c = current.stages.find((x) => x.id === s.id);
    return c && (c.procedure !== s.procedure || c.checks !== s.checks || c.materials !== s.materials);
  });

  if (rows.length === 0 && !stageDetailChanged) return <p className="text-xs text-muted-foreground">No changes compared with your current plan.</p>;

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="rounded-lg border p-2 text-xs">
          <p className="font-medium">{r.label}</p>
          {r.from && <p className="mt-1 whitespace-pre-wrap text-muted-foreground line-through decoration-muted-foreground/60">{r.from}</p>}
          <p className="mt-1 whitespace-pre-wrap">{r.to || <span className="text-muted-foreground">(removed)</span>}</p>
        </div>
      ))}
      {stageDetailChanged && <p className="text-xs text-muted-foreground">Stage procedures, checks or materials were also revised — open the plan after applying to read them.</p>}
    </div>
  );
}
