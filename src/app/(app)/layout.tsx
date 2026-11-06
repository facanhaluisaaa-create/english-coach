import { AppShell } from "@/components/layout/app-shell";
import { requireProfile } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireProfile();
  return (
    <AppShell
      user={{
        email: user.email ?? "",
        name: profile.display_name ?? user.email?.split("@")[0] ?? "Learner",
        streak: profile.current_streak,
      }}
    >
      {children}
    </AppShell>
  );
}
