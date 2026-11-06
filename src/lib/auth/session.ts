import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseSessionCookie } from "@/lib/supabase/cookies";
import type { ProfileRow } from "@/lib/db/types";

/** Data Access Layer: the single place that reads the current user. */
export const getUser = cache(async () => {
  const cookieStore = await cookies();
  if (!hasSupabaseSessionCookie(cookieStore.getAll())) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export const getProfile = cache(async (): Promise<ProfileRow | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (data) return data;
  // The trigger normally creates the profile; create lazily as a fallback.
  const { data: created } = await supabase
    .from("profiles")
    .insert({ id: user.id, display_name: user.email?.split("@")[0] ?? null })
    .select("*")
    .single();
  return created ?? null;
});

export async function requireProfile() {
  const user = await requireUser();
  const profile = await getProfile();
  if (!profile) throw new Error("Profile could not be loaded.");
  return { user, profile };
}
