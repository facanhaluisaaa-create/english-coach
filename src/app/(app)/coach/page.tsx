import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CoachChat } from "@/components/coach/coach-chat";
import { clearCoachHistory } from "./actions";

export const metadata: Metadata = { title: "Coach" };

export default async function CoachPage() {
  const { user, profile } = await requireProfile();
  const db = await createClient();
  const { data: history } = await db
    .from("coach_messages")
    .select("id, role, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60);

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col md:h-[calc(100dvh-6rem)]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Coach</h1>
          <p className="text-sm text-muted-foreground">Ask anything — a grammar doubt, TOEFL strategy, how to teach a point. The coach knows your memory.</p>
        </div>
      </div>
      <CoachChat initial={(history ?? []).reverse()} name={profile.display_name ?? "you"} onClear={clearCoachHistory} />
    </div>
  );
}
