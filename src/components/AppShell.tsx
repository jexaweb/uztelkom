"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cx } from "@/lib/format";
import { GlobalSearch } from "./GlobalSearch";

export const navItems = [
  { href: "/", label: "Bosh sahifa", icon: "💾" },
  { href: "/main-table", label: "SMS", icon: "💳" },
  { href: "/insurance", label: "Sug'urta", icon: "🛡️" },
  { href: "/telegram", label: "Telegram xabarlar", icon: "📩" },
  { href: "/sms", label: "SMS xabarlar", icon: "💬" },
  { href: "/under18", label: "18 yoshgacha / Hujjatsiz", icon: "📄" },
  { href: "/dealers", label: "Dilerlar", icon: "👥" },
  { href: "/reports", label: "Hisobotlar", icon: "📈" },
  { href: "/settings", label: "Sozlamalar", icon: "⚙️" },
] as const;

function titleFor(pathname: string): string {
  if (pathname === "/") return "Bosh sahifa";

  return (
    navItems.find((n) => n.href === pathname)?.label ??
    "Bosh sahifa"
  );
}

type CurrentUser = {
  id: number;
  fullName: string;
  login: string;
  role: "admin" | "operator";
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    // Login sahifasida authentication tekshirmaymiz
    if (pathname === "/login") {
      setCheckingAuth(false);
      return;
    }

    let cancelled = false;

    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (!cancelled) {
            router.replace("/login");
          }

          return;
        }

        const data = await response.json();

        if (!data.success || !data.user) {
          if (!cancelled) {
            router.replace("/login");
          }

          return;
        }

        if (!cancelled) {
          setUser(data.user);
          setCheckingAuth(false);
        }
      } catch (error) {
        console.error("AUTH CHECK ERROR:", error);

        if (!cancelled) {
          router.replace("/login");
        }
      }
    }

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  // LOGIN sahifasida sidebar/header umuman chiqmaydi
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Authentication tekshirilayotgan paytda dashboardni ko'rsatmaymiz
  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />

          <p className="mt-4 text-sm text-slate-400">
            Tizim tekshirilmoqda...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-30 flex w-64 transform flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-100 px-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-sm font-bold text-white">
            UZ
          </div>

          <div>
            <p className="text-sm leading-tight font-bold text-slate-900">
              UZTELECOM
            </p>

            <p className="text-xs text-slate-500">
              Diler nazorati
            </p>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex flex-col gap-0.5 p-3">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100",
                )}
              >
                <span className="text-base">
                  {item.icon}
                </span>

                <span className="truncate">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="mt-auto border-t border-slate-100 p-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">
              Tizim holati
            </p>

            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Faol · v1.0
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div
          className="animate-fade-in fixed inset-0 z-20 bg-slate-900/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8">
          <button
            onClick={() => setOpen(true)}
            aria-label="Menyu"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            ☰
          </button>

          <h1 className="hidden text-base font-semibold text-slate-800 sm:block">
            {titleFor(pathname)}
          </h1>

          <div className="ml-auto w-full max-w-xl">
            <GlobalSearch />
          </div>

          {/* User */}
          <div className="hidden items-center gap-2 md:flex">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-sm font-semibold uppercase text-slate-600">
              {user?.fullName?.charAt(0) ||
                user?.login?.charAt(0) ||
                "U"}
            </div>

            <div className="text-xs leading-tight">
              <p className="font-semibold text-slate-700">
                {user?.fullName || user?.login || "Foydalanuvchi"}
              </p>

              <p className="text-slate-400">
                {user?.role === "admin"
                  ? "Administrator"
                  : "Operator"}
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-4 py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}