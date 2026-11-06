"use client";

import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { ConceptRow, ErrorLogRow, VocabularyItemRow } from "@/lib/db/types";
import { cn } from "@/lib/utils";

function relativeDue(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 86_400_000;
  if (diff <= 0) return "due now";
  if (diff < 1) return "due today";
  if (diff < 2) return "due tomorrow";
  return `due in ${Math.round(diff)} days`;
}

const masteryTone: Record<string, string> = {
  new: "bg-muted text-muted-foreground",
  learning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  reviewing: "bg-primary/10 text-primary",
  mastered: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

export function MemoryTabs({
  initialTab,
  vocabulary,
  concepts,
  errors,
}: {
  initialTab: string;
  vocabulary: VocabularyItemRow[];
  concepts: ConceptRow[];
  errors: ErrorLogRow[];
}) {
  const [tab, setTab] = useState(["overview", "vocabulary", "weaknesses", "errors"].includes(initialTab) ? initialTab : "overview");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const vocabFiltered = useMemo(
    () => vocabulary.filter((v) => !q || v.term.toLowerCase().includes(q) || v.definition.toLowerCase().includes(q)),
    [vocabulary, q],
  );
  const conceptsFiltered = useMemo(
    () => concepts.filter((c) => !q || c.name.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q)),
    [concepts, q],
  );
  const errorsFiltered = useMemo(
    () => errors.filter((e) => !q || e.original.toLowerCase().includes(q) || e.corrected.toLowerCase().includes(q)),
    [errors, q],
  );

  const due = vocabulary.filter((v) => new Date(v.due_at) <= new Date() && v.mastery !== "mastered").length;
  const mastered = vocabulary.filter((v) => v.mastery === "mastered").length;
  const active = concepts.filter((c) => c.status === "active");
  const improving = concepts.filter((c) => c.status === "improving");
  const masteredConcepts = concepts.filter((c) => c.status === "mastered");

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vocabulary">Vocabulary ({vocabulary.length})</TabsTrigger>
          <TabsTrigger value="weaknesses">Weak spots ({active.length})</TabsTrigger>
          <TabsTrigger value="errors">Corrections ({errors.length})</TabsTrigger>
        </TabsList>
        <div className="relative w-full sm:w-64">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search memory" />
        </div>
      </div>

      <TabsContent value="overview" className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Tile label="Vocabulary due" value={due} hint={`${mastered} mastered of ${vocabulary.length}`} />
          <Tile label="Active weak spots" value={active.length} hint={`${improving.length} improving · ${masteredConcepts.length} mastered`} />
          <Tile label="Corrections logged" value={errors.length} hint="genuine errors and stylistic notes" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border p-4">
            <h2 className="font-medium">Top weak spots</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {active.slice(0, 6).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span>{c.name}</span>
                  <Badge variant="secondary">sev {c.severity} · {c.occurrences}×</Badge>
                </li>
              ))}
              {active.length === 0 && <li className="text-muted-foreground">No active weaknesses recorded yet. Complete a session to populate this.</li>}
            </ul>
          </section>
          <section className="rounded-xl border p-4">
            <h2 className="font-medium">Due next</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {vocabulary.filter((v) => v.mastery !== "mastered").slice(0, 6).map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2">
                  <span className="font-medium">{v.term}</span>
                  <span className="text-xs text-muted-foreground">{relativeDue(v.due_at)}</span>
                </li>
              ))}
              {vocabulary.length === 0 && <li className="text-muted-foreground">Your deck is empty. Vocabulary from sessions lands here automatically.</li>}
            </ul>
          </section>
        </div>
      </TabsContent>

      <TabsContent value="vocabulary" className="mt-4">
        <ul className="grid gap-3 md:grid-cols-2">
          {vocabFiltered.map((v) => (
            <li key={v.id} className="rounded-xl border p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold">{v.term}</span>
                {v.part_of_speech && <span className="italic text-muted-foreground">{v.part_of_speech}</span>}
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", masteryTone[v.mastery])}>{v.mastery}</span>
                {v.cefr_level && <Badge variant="outline">{v.cefr_level}</Badge>}
              </div>
              <p className="mt-1">{v.definition}</p>
              {v.example && <p className="mt-1 text-muted-foreground">“{v.example}”</p>}
              {v.collocations.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{v.collocations.join(" · ")}</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                {relativeDue(v.due_at)} · {v.times_correct}✓ {v.times_incorrect}✗ · interval {Number(v.interval_days).toFixed(1)}d
              </p>
            </li>
          ))}
          {vocabFiltered.length === 0 && <li className="text-sm text-muted-foreground">Nothing here yet.</li>}
        </ul>
      </TabsContent>

      <TabsContent value="weaknesses" className="mt-4">
        <ul className="space-y-3">
          {conceptsFiltered.map((c) => (
            <li key={c.id} className="rounded-xl border p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{c.name}</span>
                <Badge variant="outline">{c.category}</Badge>
                <Badge variant={c.status === "active" ? "destructive" : c.status === "improving" ? "secondary" : "default"}>{c.status}</Badge>
                <span className="text-xs text-muted-foreground">severity {c.severity} · seen {c.occurrences}× · {relativeDue(c.due_at)}</span>
              </div>
              {c.description && <p className="mt-1 text-muted-foreground">{c.description}</p>}
            </li>
          ))}
          {conceptsFiltered.length === 0 && <li className="text-sm text-muted-foreground">No weaknesses recorded.</li>}
        </ul>
      </TabsContent>

      <TabsContent value="errors" className="mt-4">
        <ul className="divide-y rounded-xl border">
          {errorsFiltered.map((e) => (
            <li key={e.id} className="space-y-1 p-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={e.error_type === "error" ? "destructive" : "outline"}>{e.error_type}</Badge>
                <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-muted-foreground line-through">{e.original}</p>
              <p className="font-medium">{e.corrected}</p>
              <p className="text-muted-foreground">{e.explanation}</p>
            </li>
          ))}
          {errorsFiltered.length === 0 && <li className="p-3 text-sm text-muted-foreground">No corrections yet.</li>}
        </ul>
      </TabsContent>
    </Tabs>
  );
}

function Tile({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
