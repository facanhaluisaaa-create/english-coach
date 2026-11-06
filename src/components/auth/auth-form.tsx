"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signIn, signUp, sendMagicLink, type AuthState } from "@/lib/auth/actions";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? signIn : signUp, null);
  const [magicState, magicAction, magicPending] = useActionState<AuthState, FormData>(sendMagicLink, null);
  const [useMagic, setUseMagic] = useState(false);

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <SparklesIcon className="size-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "login" ? "Welcome back" : "Create your coach"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === "login"
            ? "Sign in to continue your daily practice."
            : "Twenty minutes a day toward C2, TOEFL excellence and better teaching."}
        </p>
      </div>

      {useMagic ? (
        <form action={magicAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
          </div>
          {magicState?.error && (
            <Alert variant="destructive"><AlertDescription>{magicState.error}</AlertDescription></Alert>
          )}
          {magicState?.message && (
            <Alert><AlertDescription>{magicState.message}</AlertDescription></Alert>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={magicPending}>
            {magicPending && <Loader2Icon className="animate-spin" />} Send magic link
          </Button>
          <button type="button" className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={() => setUseMagic(false)}>
            Use a password instead
          </button>
        </form>
      ) : (
        <form action={action} className="space-y-4">
          {next && <input type="hidden" name="next" value={next} />}
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="display_name">What should the coach call you?</Label>
              <Input id="display_name" name="display_name" autoComplete="given-name" required maxLength={60} placeholder="Luísa" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
          </div>
          {state?.error && (
            <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>
          )}
          {state?.message && (
            <Alert><AlertDescription>{state.message}</AlertDescription></Alert>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending && <Loader2Icon className="animate-spin" />}
            {mode === "login" ? "Sign in" : "Create account"}
          </Button>
          {mode === "login" && (
            <button type="button" className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={() => setUseMagic(true)}>
              Email me a magic link instead
            </button>
          )}
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>No account yet? <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">Sign up</Link></>
        ) : (
          <>Already have an account? <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">Sign in</Link></>
        )}
      </p>
    </div>
  );
}
