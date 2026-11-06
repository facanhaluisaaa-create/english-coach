"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function clearCoachHistory() {
  const { user } = await requireProfile();
  const db = await createClient();
  await db.from("coach_messages").delete().eq("user_id", user.id);
  revalidatePath("/coach");
}
