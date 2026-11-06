import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Setup" };

export default function SetupPage() {
  const supabaseOk = isSupabaseConfigured();
  const anthropicOk = Boolean(process.env.ANTHROPIC_API_KEY);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">English Mastery needs configuration</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Copy <code>.env.example</code> to <code>.env.local</code>, fill in the values below, and restart the server.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Environment status</CardTitle>
          <CardDescription>Values are read on the server only; secrets are never sent to the browser.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between rounded-lg border p-3">
              <span><code>NEXT_PUBLIC_SUPABASE_URL</code> + <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></span>
              <span className={supabaseOk ? "text-emerald-600" : "text-destructive"}>{supabaseOk ? "configured" : "missing"}</span>
            </li>
            <li className="flex items-center justify-between rounded-lg border p-3">
              <span><code>ANTHROPIC_API_KEY</code></span>
              <span className={anthropicOk ? "text-emerald-600" : "text-destructive"}>{anthropicOk ? "configured" : "missing"}</span>
            </li>
          </ul>
          <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Create a Supabase project and run <code>supabase/migrations/0001_init.sql</code> in the SQL editor.</li>
            <li>In Supabase → Authentication → URL configuration, add <code>{"{SITE_URL}"}/auth/confirm</code> to the redirect allow-list.</li>
            <li>Create an Anthropic API key and set <code>ANTHROPIC_API_KEY</code>.</li>
          </ol>
        </CardContent>
      </Card>
    </main>
  );
}
