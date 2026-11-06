import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const next = typeof searchParams.next === "string" ? searchParams.next : undefined;
  const error = typeof searchParams.error === "string" ? searchParams.error : undefined;
  return (
    <div className="w-full max-w-sm space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error === "confirm" ? "That confirmation link is invalid or expired. Request a new one below." : "Sign-in failed. Please try again."}
          </AlertDescription>
        </Alert>
      )}
      <AuthForm mode="login" next={next} />
    </div>
  );
}
