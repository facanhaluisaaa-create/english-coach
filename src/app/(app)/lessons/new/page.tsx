import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { BriefForm } from "@/components/lessons/brief-form";

export const metadata: Metadata = { title: "Plan a class" };
export const maxDuration = 120;

export default async function NewLessonPage() {
  const { profile } = await requireProfile();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plan a class</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Step 1 of 2: the brief. This is your information about the class; the coach cannot plan without it. Step 2 is a conversation
          where you build the plan together.
        </p>
      </div>
      <BriefForm teachingContexts={profile.teaching_contexts} />
    </div>
  );
}
