import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, PlusIcon } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import { LessonBrief } from "@/lib/ai/lesson-schemas";

export const metadata: Metadata = { title: "Classes" };

const statusLabel = { drafting: "Planning", ready: "Ready to teach", taught: "Taught", archived: "Archived" } as const;

export default async function LessonsPage() {
  const { user } = await requireProfile();
  const db = await createClient();
  const { data: lessons } = await db
    .from("lesson_plans")
    .select("id, title, status, brief, taught_on, updated_at")
    .eq("user_id", user.id)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Classes</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Plan real classes together with the coach. You describe the class and what you want; the coach asks what it needs, then
            proposes objectives, stages and materials that you accept, edit or reject. It never plans without you.
          </p>
        </div>
        <LinkButton href="/lessons/new"><PlusIcon /> Plan a class</LinkButton>
      </div>

      {lessons && lessons.length > 0 ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {lessons.map((l) => {
            const brief = LessonBrief.safeParse(l.brief).data;
            return (
              <li key={l.id}>
                <Link href={`/lessons/${l.id}`} className="flex h-full flex-col rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{l.title}</p>
                    <Badge variant={l.status === "ready" ? "default" : "secondary"}>{statusLabel[l.status]}</Badge>
                  </div>
                  {brief && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {brief.class_name} · {brief.student_ages} · {brief.level} · {brief.duration_minutes} min
                    </p>
                  )}
                  {brief && <p className="mt-2 line-clamp-2 text-sm">{brief.aim}</p>}
                  <p className="mt-auto pt-3 text-xs text-muted-foreground">
                    {l.taught_on ? `Taught ${l.taught_on}` : `Updated ${new Date(l.updated_at).toLocaleDateString()}`}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed p-8 text-center">
          <p className="font-medium">No classes planned yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Start with the class brief: who the students are, what you want them to be able to do, and what you have in mind.</p>
          <LinkButton className="mt-4" href="/lessons/new">Plan your first class <ArrowRightIcon /></LinkButton>
        </div>
      )}
    </div>
  );
}
