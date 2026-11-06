"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  display_name: z.string().trim().min(1).max(60),
  timezone: z.string().trim().min(1).max(64),
  daily_goal_minutes: z.coerce.number().int().min(5).max(120),
  toefl_target_band: z.coerce.number().min(1).max(6),
  teaching_contexts: z.string().trim().max(500),
  focus_notes: z.string().trim().max(1000),
});

export type SettingsState = { error?: string; message?: string } | null;

export async function updateProfile(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    Intl.DateTimeFormat(undefined, { timeZone: parsed.data.timezone });
  } catch {
    return { error: "Unknown timezone." };
  }
  const { user } = await requireProfile();
  const db = await createClient();
  const { error } = await db
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
      timezone: parsed.data.timezone,
      daily_goal_minutes: parsed.data.daily_goal_minutes,
      toefl_target_band: Math.round(parsed.data.toefl_target_band * 2) / 2,
      teaching_contexts: parsed.data.teaching_contexts || null,
      focus_notes: parsed.data.focus_notes || null,
    })
    .eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { message: "Saved." };
}
