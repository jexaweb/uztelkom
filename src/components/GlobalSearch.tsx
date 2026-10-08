"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cx, truncate } from "@/lib/format";

type SearchHit = {
  id: number;
  type: string;
  title: string;
  subtitle: string;
  href: string;
};

type SearchGroup = { type: string; label: string; icon: string; items: SearchHit[] };

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setGroups([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as { groups: SearchGroup[] };
        setGroups(json.groups ?? []);
        setOpen(true);
      } catch {
        /* request aborted or failed — keep previous state */
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  const totalHits = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
          <img src="/search.svg" alt="Search" className="h-5 w-5" />
        </span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => {
            if (q.trim().length >= 2 && groups.length > 0) setOpen(true);
          }}
          placeholder="Telefon raqami, passport, diler, login, kompaniya yoki ID bo'yicha qidiring..."
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
        />
       {loading && (
  <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-2">
    <span className="text-xs font-medium text-slate-400">
      Qidirilmoqda...
    </span>

    <span className="block h-4 w-4 animate-spin rounded-full border-2 border-blue-100 border-t-blue-600" />
  </div>
)}
      </div>

      {open && (
        <div className="animate-fade-in absolute top-full right-0 left-0 z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
          {totalHits === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              🔎 Qidiruv bo&lsquo;yicha ma&rsquo;lumot topilmadi.
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.type} className="px-2 py-1">
                <p className="px-2 py-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  {group.icon} {group.label} ({group.items.length})
                </p>
                {group.items.map((hit) => (
                  <Link
                    key={`${group.type}-${hit.id}`}
                    href={hit.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-2 py-2 hover:bg-slate-50"
                  >
                    <p className="text-sm font-medium text-slate-800">{hit.title}</p>
                    <p className="text-xs text-slate-500">{truncate(hit.subtitle, 70)}</p>
                  </Link>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
