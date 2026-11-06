/** True when the request carries a Supabase auth cookie (sb-<ref>-auth-token, possibly chunked). */
export function hasSupabaseSessionCookie(cookies: { name: string }[]) {
  return cookies.some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
}
