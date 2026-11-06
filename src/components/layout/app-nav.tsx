"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainIcon, CalendarCheckIcon, GraduationCapIcon, LineChartIcon, MessageCircleIcon, NotebookPenIcon, TargetIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/today", label: "Today", icon: CalendarCheckIcon },
  { href: "/progress", label: "Progress", icon: LineChartIcon },
  { href: "/memory", label: "Memory", icon: BrainIcon },
  { href: "/toefl", label: "TOEFL", icon: TargetIcon },
  { href: "/teaching", label: "Teaching", icon: GraduationCapIcon },
  { href: "/lessons", label: "Classes", icon: NotebookPenIcon },
  { href: "/coach", label: "Coach", icon: MessageCircleIcon },
] as const;

export function AppNav({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav className={cn("items-center gap-1", className)}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-7">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
