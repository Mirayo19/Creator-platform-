"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3, CalendarDays, Dna, FlaskConical, LayoutDashboard, Library, Lightbulb, LineChart,
  LogOut, Menu, Moon, PenLine, Settings, Sun, Users, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/actions";

const NAV = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/library", label: "Content Library", icon: Library },
  { href: "/analysis", label: "Content Analysis", icon: BarChart3 },
  { href: "/dna", label: "My Writing DNA", icon: Dna },
  { href: "/studio", label: "Draft Studio", icon: PenLine },
  { href: "/ideas", label: "Idea Lab", icon: Lightbulb },
  { href: "/audience", label: "Audience Intelligence", icon: Users },
  { href: "/experiments", label: "Experiments", icon: FlaskConical, soon: true },
  { href: "/calendar", label: "Content Calendar", icon: CalendarDays, soon: true },
  { href: "/reports", label: "Growth Reports", icon: LineChart, soon: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

function toggleTheme() {
  const el = document.documentElement;
  const dark = el.dataset.theme === "dark" || (!el.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  const next = dark ? "light" : "dark";
  el.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch { /* storage unavailable */ }
}

export function Sidebar({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex h-full flex-col" aria-label="Main">
      <div className="flex items-center gap-2.5 px-3 py-4">
        <div className="grid size-8 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-text">S</div>
        <span className="font-semibold tracking-tight">Strategist</span>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {NAV.map(({ href, label, icon: Icon, soon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
                className={cn("flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition",
                  active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-surface2 hover:text-text")}>
                <Icon className="size-4 shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {soon && <span className="rounded bg-surface2 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">Soon</span>}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-border p-3">
        <div className="mb-2 px-1">
          <div className="truncate text-sm font-medium">{name}</div>
          <div className="truncate text-xs text-muted">{email}</div>
        </div>
        <div className="flex gap-1">
          <button onClick={toggleTheme} className="flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-surface2 hover:text-text" aria-label="Toggle light/dark theme">
            <Sun className="hidden size-4 dark:block" /><Moon className="size-4 dark:hidden" />Theme
          </button>
          <form action={signOut} className="flex-1">
            <button className="flex w-full items-center justify-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-surface2 hover:text-text">
              <LogOut className="size-4" />Sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2"><div className="grid size-7 place-items-center rounded-md bg-accent text-xs font-bold text-accent-text">S</div><span className="font-semibold">Strategist</span></div>
        <button onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} className="rounded-lg p-2 hover:bg-surface2">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>
      {open && <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-30 w-64 border-r border-border bg-surface transition-transform lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full")}>
        {nav}
      </aside>
    </>
  );
}
