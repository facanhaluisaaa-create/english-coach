import { CheckCircle2Icon, LightbulbIcon, TriangleAlertIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Evaluation } from "@/lib/ai/schemas";
import { TOEFL_DISCLAIMER } from "@/lib/learning/toefl-spec";

const typeLabel = { error: "error", stylistic: "style", register: "register", naturalness: "naturalness" } as const;

export function EvaluationCard({ evaluation, compact = false }: { evaluation: Evaluation; compact?: boolean }) {
  const score = Math.round(evaluation.score);
  const tone = score >= 85 ? "text-emerald-600 dark:text-emerald-400" : score >= 65 ? "text-amber-600 dark:text-amber-400" : "text-destructive";
  return (
    <div className="space-y-5 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Coach feedback</p>
          <p className="mt-1 text-sm leading-relaxed">{evaluation.summary}</p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-semibold tabular-nums ${tone}`}>{score}<span className="text-base text-muted-foreground">/100</span></div>
          {evaluation.toefl && (
            <div className="mt-1 text-sm">
              Band estimate <span className="font-semibold">{evaluation.toefl.band_estimate.toFixed(1)}</span> / 6
            </div>
          )}
        </div>
      </div>

      {(evaluation.strengths.length > 0 || evaluation.improvements.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {evaluation.strengths.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium"><CheckCircle2Icon className="size-4 text-emerald-600" /> What worked</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">{evaluation.strengths.map((s, i) => <li key={i}>• {s}</li>)}</ul>
            </div>
          )}
          {evaluation.improvements.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium"><TriangleAlertIcon className="size-4 text-amber-600" /> To improve</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">{evaluation.improvements.map((s, i) => <li key={i}>• {s}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      {evaluation.corrections.length > 0 && (
        <div>
          <p className="text-sm font-medium">Corrections</p>
          <ul className="mt-2 divide-y rounded-xl border text-sm">
            {evaluation.corrections.map((c, i) => (
              <li key={i} className="space-y-1 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={c.type === "error" ? "destructive" : "outline"}>{typeLabel[c.type]}</Badge>
                  {c.concept && <span className="text-xs text-muted-foreground">{c.concept.name}</span>}
                </div>
                <p className="text-muted-foreground line-through decoration-destructive/60">{c.original}</p>
                <p className="font-medium">{c.corrected}</p>
                <p className="text-muted-foreground">{c.explanation}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {evaluation.toefl && (
        <div>
          <p className="text-sm font-medium">Rubric</p>
          <ul className="mt-2 space-y-2 text-sm">
            {evaluation.toefl.rubric.map((r, i) => (
              <li key={i} className="rounded-lg bg-muted/40 p-3">
                <div className="flex items-center justify-between"><span className="font-medium">{r.criterion}</span><span className="tabular-nums">{r.score}/{r.max}</span></div>
                <p className="mt-1 text-muted-foreground">{r.comment}</p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm"><span className="font-medium">Exam strategy:</span> {evaluation.toefl.exam_strategy}</p>
          <p className="mt-2 text-xs text-muted-foreground">{TOEFL_DISCLAIMER}</p>
        </div>
      )}

      {evaluation.teaching && (
        <div>
          <p className="text-sm font-medium">Teaching assessment</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(["accuracy", "clarity", "age_appropriateness", "pedagogy"] as const).map((k) => (
              <div key={k} className="rounded-lg bg-muted/40 p-3 text-sm">
                <div className="flex items-center justify-between"><span className="font-medium capitalize">{k.replace("_", " ")}</span><span className="tabular-nums">{evaluation.teaching![k].score}/10</span></div>
                <p className="mt-1 text-muted-foreground">{evaluation.teaching![k].comment}</p>
              </div>
            ))}
          </div>
          <details className="mt-3 rounded-lg border p-3 text-sm">
            <summary className="cursor-pointer font-medium">A model version to compare against</summary>
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{evaluation.teaching.model_version}</p>
          </details>
        </div>
      )}

      {!compact && evaluation.weaknesses_detected.length > 0 && (
        <div>
          <p className="text-sm font-medium">Added to your memory</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {evaluation.weaknesses_detected.map((w, i) => (
              <Badge key={i} variant="secondary" title={w.evidence}>{w.name}</Badge>
            ))}
            {evaluation.vocabulary_to_remember.map((v, i) => (
              <Badge key={`v${i}`} variant="outline" title={v.definition}>+ {v.term}</Badge>
            ))}
          </div>
        </div>
      )}

      <p className="flex items-start gap-2 rounded-lg bg-primary/5 p-3 text-sm">
        <LightbulbIcon className="mt-0.5 size-4 shrink-0 text-primary" />
        <span><span className="font-medium">Next step:</span> {evaluation.next_step}</span>
      </p>
    </div>
  );
}
