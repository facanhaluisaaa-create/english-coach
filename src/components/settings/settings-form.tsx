"use client";

import { useActionState, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateProfile, type SettingsState } from "@/app/(app)/settings/actions";
import type { ProfileRow } from "@/lib/db/types";

export function SettingsForm({ profile }: { profile: ProfileRow }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateProfile, null);
  const [tz, setTz] = useState(profile.timezone);
  const [browserTz, setBrowserTz] = useState("UTC");

  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="display_name">Name</Label>
        <Input id="display_name" name="display_name" defaultValue={profile.display_name ?? ""} required maxLength={60} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="timezone">Timezone</Label>
        <Input id="timezone" name="timezone" value={tz} onChange={(e) => setTz(e.target.value)} required />
        <p className="text-xs text-muted-foreground">
          Used for daily sessions and streaks.{" "}
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => {
              const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
              setBrowserTz(detected);
              setTz(detected);
            }}
          >
            Use my browser&apos;s timezone{browserTz !== "UTC" ? ` (${browserTz})` : ""}
          </button>
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="daily_goal_minutes">Daily goal (minutes)</Label>
        <Input id="daily_goal_minutes" name="daily_goal_minutes" type="number" min={5} max={120} defaultValue={profile.daily_goal_minutes} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="toefl_target_band">TOEFL target band (1–6)</Label>
        <Input id="toefl_target_band" name="toefl_target_band" type="number" min={1} max={6} step={0.5} defaultValue={Number(profile.toefl_target_band)} required />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="teaching_contexts">Who you teach</Label>
        <Textarea
          id="teaching_contexts"
          name="teaching_contexts"
          defaultValue={profile.teaching_contexts ?? ""}
          placeholder="e.g. teenagers 12–15 (A2–B1), adult professionals (B2–C1), one-to-one exam prep"
          maxLength={500}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="focus_notes">Anything the coach should know</Label>
        <Textarea
          id="focus_notes"
          name="focus_notes"
          defaultValue={profile.focus_notes ?? ""}
          placeholder="e.g. I want more academic writing; my TOEFL date is in March; I struggle with articles and intonation."
          maxLength={1000}
        />
      </div>
      {state?.error && <Alert variant="destructive" className="sm:col-span-2"><AlertDescription>{state.error}</AlertDescription></Alert>}
      {state?.message && <Alert className="sm:col-span-2"><AlertDescription>{state.message}</AlertDescription></Alert>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending && <Loader2Icon className="animate-spin" />} Save</Button>
      </div>
    </form>
  );
}
