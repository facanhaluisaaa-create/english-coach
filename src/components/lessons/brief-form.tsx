"use client";

import { useActionState } from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createLessonAction, type LessonFormState } from "@/app/(app)/lessons/actions";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function BriefForm({ teachingContexts }: { teachingContexts: string | null }) {
  const [state, action, pending] = useActionState<LessonFormState, FormData>(createLessonAction, null);
  const err = (k: string) => state?.fieldErrors?.[k];

  return (
    <form action={action} className="space-y-6">
      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="font-medium">The class</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Class name" error={err("class_name")}>
            <Input name="class_name" required maxLength={80} placeholder="e.g. Tuesday teens B1 · 9th grade group 2" />
          </Field>
          <Field label="Student ages" error={err("student_ages")}>
            <Input name="student_ages" required maxLength={60} placeholder="e.g. 13–14 · adults 25–40" />
          </Field>
          <Field label="CEFR level" error={err("level")}>
            <select name="level" className={selectClass} defaultValue="B1" required>
              {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Students" error={err("class_size")}>
              <Input name="class_size" type="number" min={1} max={60} defaultValue={15} required />
            </Field>
            <Field label="Minutes" error={err("duration_minutes")}>
              <Input name="duration_minutes" type="number" min={15} max={240} defaultValue={50} required />
            </Field>
          </div>
        </div>
        {teachingContexts && <p className="text-xs text-muted-foreground">From your profile: {teachingContexts}</p>}
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="font-medium">What you want from this class</h2>
        <Field label="Aim, in your own words" error={err("aim")} hint="What should students be able to do by the end? Why now?">
          <Textarea name="aim" required minLength={10} maxLength={1000} className="min-h-24" placeholder="e.g. Students can describe past experiences with the present perfect and ask follow-up questions; they keep confusing it with past simple." />
        </Field>
        <Field label="Language focus (optional)" error={err("language_focus")}>
          <Input name="language_focus" maxLength={400} placeholder="grammar, vocabulary, a skill, a function…" />
        </Field>
        <Field label="What happened last lesson (optional)" error={err("previous_lesson")} hint="What they did, what worked, what they struggled with.">
          <Textarea name="previous_lesson" maxLength={1000} className="min-h-20" />
        </Field>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="font-medium">Your ideas and your constraints</h2>
        <Field label="Your own ideas (optional, but the coach will build on them first)" error={err("teacher_ideas")}>
          <Textarea name="teacher_ideas" maxLength={1500} className="min-h-24" placeholder="e.g. I'd like to start with a 'Find someone who…' mingle, and I have a short video about travel." />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Materials available (optional)" error={err("materials_available")}>
            <Input name="materials_available" maxLength={400} placeholder="projector, coursebook unit 4, handouts, phones…" />
          </Field>
          <Field label="Constraints (optional)" error={err("constraints")}>
            <Input name="constraints" maxLength={800} placeholder="no internet, mixed levels, exam next week, a very quiet group…" />
          </Field>
        </div>
      </section>

      {state?.error && <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          {pending ? "Reading your brief…" : "Continue to planning"}
        </Button>
        <p className="text-xs text-muted-foreground">Next, the coach will ask you a few questions before proposing anything.</p>
      </div>
    </form>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
