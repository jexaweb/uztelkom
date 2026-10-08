"use client";

import Link from "next/link";
import { cx, formatNumber } from "@/lib/format";

const tones: Record<string, string> = {
  blue: "from-blue-500 to-blue-600 shadow-blue-200",
  emerald: "from-emerald-500 to-emerald-600 shadow-emerald-200",
  orange: "from-orange-500 to-orange-600 shadow-orange-200",
  red: "from-rose-500 to-rose-600 shadow-rose-200",
};

export function StatCard({
  label,
  value,
  icon,
  tone,
  href,
  hint,
}: {
  label: string;
  value: number;
  icon: string;
  tone: "blue" | "emerald" | "orange" | "red";
  href: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{formatNumber(value)}</p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        <div
          className={cx(
            "grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-xl text-white shadow-sm",
            tones[tone],
          )}
        >
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold text-blue-600 group-hover:underline">
        Barchasini ko&lsquo;rish →
      </p>
    </Link>
  );
}
