import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { MemoryTabs } from "@/components/memory/memory-tabs";

export const metadata: Metadata = { title: "Memory" };

export default async function MemoryPage(props: PageProps<"/memory">) {
  const searchParams = await props.searchParams;
  const tab = typeof searchParams.tab === "string" ? searchParams.tab : "overview";
  const { user } = await requireProfile();
  const db = await createClient();
  const [vocab, concepts, errors] = await Promise.all([
    db.from("vocabulary_items").select("*").eq("user_id", user.id).order("due_at").limit(500),
    db.from("concepts").select("*").eq("user_id", user.id).order("severity", { ascending: false }).order("last_seen_at", { ascending: false }).limit(300),
    db.from("error_log").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(150),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Memory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything the coach remembers about you: vocabulary with its review schedule, recurring weaknesses, and every correction.
        </p>
      </div>
      <MemoryTabs initialTab={tab} vocabulary={vocab.data ?? []} concepts={concepts.data ?? []} errors={errors.data ?? []} />
    </div>
  );
}
