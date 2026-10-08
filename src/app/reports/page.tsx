"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, PageHeader } from "@/components/ui";
import { formatNumber } from "@/lib/format";

type SalesReport = {
  currentPeriod: { year: number; month: number };
  monthlySeries: { year: number; month: number; label: string; total: number }[];
  topDealers: { id: number; name: string; company: string; total: number }[];
  byRegion: { region: string; total: number }[];
};

type SmsReport = {
  totals: { total: number; sent: number; failed: number; pending: number };
  perDealer: { id: number; name: string; login: string; total: number; sent: number; failed: number; pending: number }[];
  perDay: { day: string; total: number }[];
};

type InsReport = {
  totals: { total: number; pending: number; active: number; completed: number; cancelled: number };
  perDealer: { id: number; name: string; login: string; total: number }[];
  perRegion: { region: string; total: number }[];
  perType: { type: string; total: number }[];
};

type DocsReport = {
  counts: {
    total: number;
    under18: number;
    missingPassport: number;
    missingFather: number;
    missingMother: number;
    missingConsent: number;
    missingSignature: number;
    complete: number;
  };
  perDealer: { id: number; name: string; login: string; customers: number; missing: number }[];
};

const TABS = [
  { key: "sales", label: "📊 Sotuvlar" },
  { key: "sms", label: "💬 SMS" },
  { key: "insurance", label: "🛡️ Sug'urta" },
  { key: "docs", label: "📄 Hujjatlar" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function BarList({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-36 shrink-0 truncate text-sm text-slate-600" title={it.label}>
            {it.label}
          </span>
          <div className="h-5 flex-1 overflow-hidden rounded-md bg-slate-100">
            <div
              className="h-full rounded-md bg-gradient-to-r from-blue-500 to-blue-600"
              style={{ width: `${(it.value / max) * 100}%` }}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-sm font-semibold text-slate-700">
            {formatNumber(it.value)}
          </span>
        </div>
      ))}
      {items.length === 0 && <p className="text-sm text-slate-400">Ma&rsquo;lumot topilmadi.</p>}
    </div>
  );
}

function StatBox({ label, value, tone = "blue" }: { label: string; value: number; tone?: string }) {
  const tones: Record<string, string> = {
    blue: "text-blue-700 bg-blue-50",
    green: "text-emerald-700 bg-emerald-50",
    red: "text-red-700 bg-red-50",
    orange: "text-orange-700 bg-orange-50",
    slate: "text-slate-700 bg-slate-50",
  };
  return (
    <div className={`rounded-xl p-4 ${tones[tone] ?? tones.blue}`}>
      <p className="text-xs font-semibold tracking-wide uppercase opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{formatNumber(value)}</p>
    </div>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState<TabKey>("sales");
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [sms, setSms] = useState<SmsReport | null>(null);
  const [ins, setIns] = useState<InsReport | null>(null);
  const [docs, setDocs] = useState<DocsReport | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, m, i, d] = await Promise.all([
        fetch("/api/reports/sales").then((r) => r.json()),
        fetch("/api/reports/sms").then((r) => r.json()),
        fetch("/api/reports/insurance").then((r) => r.json()),
        fetch("/api/reports/docs").then((r) => r.json()),
      ]);
      setSales(s);
      setSms(m);
      setIns(i);
      setDocs(d);
    } catch {
      /* ignore — sections show empty states */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="📈 Hisobotlar"
        description="Barcha statistika ma'lumotlar bazasidan olinadi."
        actions={
          <button
            onClick={load}
            className="rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            🔄 Yangilash
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? "rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                : "rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="py-12 text-center text-sm text-slate-500">⏳ Yuklanmoqda...</p>}

      {!loading && tab === "sales" && sales && (
        <div className="space-y-4">
          <Card title="Oylik sotuvlar (oxirgi 6 oy)">
            <BarList
              items={sales.monthlySeries.map((m) => ({ label: m.label, value: m.total }))}
            />
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Top dilerlar (joriy oy)">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs tracking-wide text-slate-500 uppercase">
                      <th className="py-2 text-left">#</th>
                      <th className="py-2 text-left">Diler</th>
                      <th className="py-2 text-left">Kompaniya</th>
                      <th className="py-2 text-right">Sotuv</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.topDealers.map((d, i) => (
                      <tr key={d.id} className="border-t border-slate-100">
                        <td className="py-2 text-slate-400">{i + 1}</td>
                        <td className="py-2 font-medium text-slate-800">{d.name}</td>
                        <td className="py-2 text-slate-500">{d.company}</td>
                        <td className="py-2 text-right font-semibold text-blue-700">{formatNumber(d.total)}</td>
                      </tr>
                    ))}
                    {sales.topDealers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">
                          Ma&rsquo;lumot topilmadi.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card title="Hududlar bo'yicha (joriy oy)">
              <BarList items={sales.byRegion.map((r) => ({ label: r.region, value: r.total }))} />
            </Card>
          </div>
        </div>
      )}

      {!loading && tab === "sms" && sms && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatBox label="Jami" value={sms.totals.total} />
            <StatBox label="Yuborildi" value={sms.totals.sent} tone="green" />
            <StatBox label="Xatolik" value={sms.totals.failed} tone="red" />
            <StatBox label="Kutilmoqda" value={sms.totals.pending} tone="orange" />
          </div>
          <Card title="So'nggi 14 kun">
            <BarList items={sms.perDay.map((d) => ({ label: d.day, value: d.total }))} />
          </Card>
          <Card title="Dilerlar bo'yicha" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                    <th className="px-4 py-2.5 text-left">#</th>
                    <th className="px-4 py-2.5 text-left">Diler</th>
                    <th className="px-4 py-2.5 text-left">Login</th>
                    <th className="px-4 py-2.5 text-right">Jami</th>
                    <th className="px-4 py-2.5 text-right">Yuborildi</th>
                    <th className="px-4 py-2.5 text-right">Xatolik</th>
                    <th className="px-4 py-2.5 text-right">Kutilmoqda</th>
                  </tr>
                </thead>
                <tbody>
                  {sms.perDealer.map((d, i) => (
                    <tr key={d.id} className="border-t border-slate-100">
                      <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{d.name}</td>
                      <td className="px-4 py-2.5 text-slate-500">{d.login}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{formatNumber(d.total)}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-600">{formatNumber(d.sent)}</td>
                      <td className="px-4 py-2.5 text-right text-red-600">{formatNumber(d.failed)}</td>
                      <td className="px-4 py-2.5 text-right text-amber-600">{formatNumber(d.pending)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {!loading && tab === "insurance" && ins && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatBox label="Jami" value={ins.totals.total} />
            <StatBox label="Kutilmoqda" value={ins.totals.pending} tone="orange" />
            <StatBox label="Faol" value={ins.totals.active} />
            <StatBox label="Yakunlangan" value={ins.totals.completed} tone="green" />
            <StatBox label="Bekor qilingan" value={ins.totals.cancelled} tone="red" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Dilerlar bo'yicha">
              <BarList items={ins.perDealer.map((d) => ({ label: d.name, value: d.total }))} />
            </Card>
            <Card title="Hududlar bo'yicha">
              <BarList items={ins.perRegion.map((r) => ({ label: r.region, value: r.total }))} />
            </Card>
          </div>
          <Card title="Sug'urta turlari bo'yicha">
            <BarList items={ins.perType.map((t) => ({ label: t.type, value: t.total }))} />
          </Card>
        </div>
      )}

      {!loading && tab === "docs" && docs && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatBox label="Jami mijozlar" value={docs.counts.total} tone="slate" />
            <StatBox label="18 yoshgacha" value={docs.counts.under18} tone="orange" />
            <StatBox label="Hujjatsiz" value={docs.counts.total - docs.counts.complete} tone="red" />
            <StatBox label="To'liq hujjatli" value={docs.counts.complete} tone="green" />
          </div>
          <Card title="Yetishmayotgan hujjatlar">
            <BarList
              items={[
                { label: "Bola pasporti", value: docs.counts.missingPassport },
                { label: "Ota pasporti", value: docs.counts.missingFather },
                { label: "Ona pasporti", value: docs.counts.missingMother },
                { label: "Rozilik xati", value: docs.counts.missingConsent },
                { label: "Imzo", value: docs.counts.missingSignature },
              ]}
            />
          </Card>
          <Card title="Dilerlar bo'yicha hujjatsizlik" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                    <th className="px-4 py-2.5 text-left">#</th>
                    <th className="px-4 py-2.5 text-left">Diler</th>
                    <th className="px-4 py-2.5 text-left">Login</th>
                    <th className="px-4 py-2.5 text-right">Mijozlar</th>
                    <th className="px-4 py-2.5 text-right">Hujjatsiz</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.perDealer.map((d, i) => (
                    <tr key={d.id} className="border-t border-slate-100">
                      <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{d.name}</td>
                      <td className="px-4 py-2.5 text-slate-500">{d.login}</td>
                      <td className="px-4 py-2.5 text-right">{formatNumber(d.customers)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-red-600">{formatNumber(d.missing)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
