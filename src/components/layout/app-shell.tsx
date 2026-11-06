import Link from "next/link";
import { BookOpenTextIcon } from "lucide-react";
import { AppNav, MobileNav } from "./app-nav";
import { UserMenu } from "./user-menu";

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { email: string; name: string; streak: number };
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4">
          <Link href="/today" className="flex items-center gap-2 font-semibold">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BookOpenTextIcon className="size-4" />
            </span>
            <span className="hidden sm:inline">English Mastery</span>
          </Link>
          <AppNav className="hidden md:flex" />
          <div className="ml-auto flex items-center gap-2">
            <UserMenu user={user} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 md:pb-10">{children}</main>
      <MobileNav />
    </div>
  );
}
