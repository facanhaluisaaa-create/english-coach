import Link from "next/link";
import { ArrowRightIcon, BookOpenTextIcon, BrainIcon, GraduationCapIcon, SparklesIcon, TargetIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { redirect } from "next/navigation";

const pillars = [
  {
    icon: SparklesIcon,
    title: "C2 Language Coach",
    body: "Precision over complexity: collocations, register, pragmatics, connected speech and argumentation — with genuine errors separated from stylistic choices.",
  },
  {
    icon: TargetIcon,
    title: "TOEFL iBT Trainer",
    body: "Practice aligned with the 2026 ETS test: 12 task types across Reading, Listening, Speaking and Writing, timed, with rubric-based feedback on the 1–6 band scale.",
  },
  {
    icon: GraduationCapIcon,
    title: "Teaching Mentor",
    body: "Explain grammar to a simulated 13-year-old A2 learner or an adult C1 class. Get evaluated on accuracy, clarity, age-appropriateness and pedagogy.",
  },
  {
    icon: BrainIcon,
    title: "Memory & Review Coach",
    body: "Spaced repetition and active recall over your own vocabulary, recurring errors and weak concepts. Nothing is ‘mastered’ after one lucky answer.",
  },
];

export default async function LandingPage() {
  if (isSupabaseConfigured()) {
    const user = await getUser();
    if (user) redirect("/today");
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><BookOpenTextIcon className="size-4" /></span>
          English Mastery
        </div>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>Sign in</Button>
          <Button nativeButton={false} render={<Link href="/signup" />}>Get started</Button>
        </nav>
      </header>

      <section className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 sm:pt-20">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-emerald-500" /> About 20 minutes a day
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Your personal AI English coach, built for a teacher aiming at C2.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          A daily session that adapts to you: advanced vocabulary, grammar precision, TOEFL iBT practice and a teaching
          challenge — all remembered, reviewed, and tuned to your recurring weaknesses.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" nativeButton={false} render={<Link href="/signup" />}>Start today&apos;s session <ArrowRightIcon /></Button>
          <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/login" />}>I already have an account</Button>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-4 px-4 pb-20 sm:grid-cols-2">
        {pillars.map((p) => (
          <div key={p.title} className="rounded-2xl border bg-card p-6">
            <p.icon className="size-5 text-primary" />
            <h2 className="mt-3 font-semibold">{p.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </section>

      <footer className="mx-auto w-full max-w-5xl px-4 pb-10 text-xs text-muted-foreground">
        TOEFL® is a registered trademark of ETS. English Mastery is an independent practice tool; practice scores are
        estimates and are not official ETS results.
      </footer>
    </main>
  );
}
