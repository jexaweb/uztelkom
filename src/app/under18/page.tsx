"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DataTable, type Column } from "@/components/DataTable";
import {
  Badge,
  Button,
  Card,
  DocOkBadge,
  Field,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Textarea,
} from "@/components/ui";
import { useToast } from "@/components/Toast";
import { ageLabel, isUnder18 } from "@/lib/age";
import { docSummary, telegramMessageFor } from "@/lib/docs";
import { useDebounced } from "@/lib/hooks";
import { formatDate, truncate } from "@/lib/format";

type CustomerRow = {
  id: number;
  fullName: string;
  phone: string;
  birthDate: string | null;
  passport: string;
  fatherPassport: string;
  motherPassport: string;
  consentLetter: boolean;
  hasSignature: boolean;
  telegram: string;
  telegramId: string;
  notes: string;
  dealerId: number | null;
  dealerName: string | null;
  dealerLogin: string | null;
  dealerCompany: string | null;
  age: number | null;
  under18: boolean;
  missingCount: number;
};

const TABS = [
  { key: "all", label: "Barchasi" },
  { key: "under18", label: "18 yoshgacha" },
  { key: "nodocs", label: "Hujjatsiz" },
] as const;

function Under18PageInner() {
  const toast = useToast();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState(searchParams.get("tab") ?? "all");
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debouncedQ = useDebounced(q);
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [docsOpen, setDocsOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [active, setActive] = useState<CustomerRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [tgSending, setTgSending] = useState(false);

  // document form
  const [dPassport, setDPassport] = useState("");
  const [dFather, setDFather] = useState("");
  const [dMother, setDMother] = useState("");
  const [dConsent, setDConsent] = useState(false);
  const [dSignature, setDSignature] = useState(false);
  const [dNotes, setDNotes] = useState("");

  // sms form
  const [smsText, setSmsText] = useState("");

  useEffect(() => {
    setPage(1);
  }, [tab, debouncedQ]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ tab, page: String(page), pageSize: String(pageSize) });
      if (debouncedQ) params.set("q", debouncedQ);
      const res = await fetch(`/api/under18?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xatolik");
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError("Mijozlarni yuklab bo'lmadi.");
    } finally {
      setLoading(false);
    }
  }, [tab, page, debouncedQ]);

  useEffect(() => {
    load();
  }, [load]);

  const openDocs = (row: CustomerRow) => {
    setActive(row);
    setDPassport(row.passport ?? "");
    setDFather(row.fatherPassport ?? "");
    setDMother(row.motherPassport ?? "");
    setDConsent(row.consentLetter);
    setDSignature(row.hasSignature);
    setDNotes(row.notes ?? "");
    setDocsOpen(true);
  };

  const saveDocs = async () => {
    if (!active) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${active.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passport: dPassport,
          fatherPassport: dFather,
          motherPassport: dMother,
          consentLetter: dConsent,
          hasSignature: dSignature,
          notes: dNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xatolik");
      toast.success("✅ Hujjat holati saqlandi.");
      setDocsOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "❌ Saqlanmadi.");
    } finally {
      setSaving(false);
    }
  };

  const sendTelegram = async (row: CustomerRow) => {
    setTgSending(true);
    try {
      const res = await fetch(`/api/customers/${row.id}/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: telegramMessageFor(row) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xatolik");
      toast.success("✅ Telegram xabari yuborildi.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "❌ Telegram xabari yuborilmadi.");
    } finally {
      setTgSending(false);
    }
  };

  const openSms = (row: CustomerRow) => {
    setActive(row);
    const missing = docSummary(row);
    setSmsText(
      `Assalomu alaykum${row.fullName ? `, ${row.fullName}` : ""}! ${missing}. Iltimos, kerakli hujjatlarni yuboring.`,
    );
    setSmsOpen(true);
  };

  const sendSmsNow = async () => {
    if (!active) return;
    setSaving(true);
    try {
      const create = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealerId: active.dealerId, phone: active.phone, message: smsText }),
      });
      const created = await create.json();
      if (!create.ok) throw new Error(created.error ?? "Xatolik");
      const send = await fetch("/api/sms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: created.sms.id }),
      });
      const sent = await send.json();
      if (!send.ok) throw new Error(sent.error ?? "Xatolik");
      toast.success("✅ SMS yuborildi.");
      setSmsOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "❌ SMS yuborilmadi.");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<CustomerRow>[] = [
    {
      key: "idx",
      label: "#",
      render: (_, i) => <span className="text-slate-400">{(page - 1) * pageSize + i + 1}</span>,
    },
    { key: "phone", label: "Telefon", render: (r) => <span className="font-medium text-slate-900">{r.phone}</span> },
    { key: "birthDate", label: "Tug'ilgan sana", render: (r) => <span className="whitespace-nowrap">{formatDate(r.birthDate)}</span> },
    {
      key: "age",
      label: "Yosh",
      render: (r) =>
        isUnder18(r.birthDate) ? (
          <Badge tone="orange">{ageLabel(r.birthDate)}</Badge>
        ) : (
          <span className="text-slate-500">{ageLabel(r.birthDate)}</span>
        ),
    },
    { key: "dealerName", label: "Diler", render: (r) => r.dealerName ?? "—" },
    { key: "dealerLogin", label: "Login", render: (r) => <span className="text-slate-500">{r.dealerLogin ?? "—"}</span> },
    { key: "dealerCompany", label: "Kompaniya", render: (r) => r.dealerCompany ?? "—" },
    { key: "passport", label: "Bola pasporti", render: (r) => <DocOkBadge ok={!!r.passport} /> },
    { key: "fatherPassport", label: "Ota pasporti", render: (r) => <DocOkBadge ok={!!r.fatherPassport} /> },
    { key: "motherPassport", label: "Ona pasporti", render: (r) => <DocOkBadge ok={!!r.motherPassport} /> },
    { key: "consentLetter", label: "Rozilik xati", render: (r) => <DocOkBadge ok={r.consentLetter} /> },
    { key: "hasSignature", label: "Imzo", render: (r) => <DocOkBadge ok={r.hasSignature} /> },
    {
      key: "docSummary",
      label: "Hujjat holati",
      render: (r) =>
        r.missingCount === 0 ? (
          <DocOkBadge ok />
        ) : (
          <span className="text-xs font-medium text-red-600">{docSummary(r)}</span>
        ),
    },
    {
      key: "telegram",
      label: "Telegram",
      render: (r) => (
        <Button
          variant="secondary"
          loading={tgSending}
          disabled={!r.telegramId && !r.telegram}
          onClick={() => sendTelegram(r)}
          title={!r.telegramId && !r.telegram ? "Telegram kontakt topilmadi" : "Telegram xabar yuborish"}
        >
          📩 Yuborish
        </Button>
      ),
    },
    {
      key: "sms",
      label: "SMS",
      render: (r) => (
        <Button variant="secondary" onClick={() => openSms(r)}>
          💬 SMS
        </Button>
      ),
    },
    {
      key: "notes",
      label: "Izoh",
      render: (r) => (
        <span className="block max-w-[160px] text-slate-600" title={r.notes}>
          {r.notes ? truncate(r.notes, 40) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Amal",
      render: (r) => (
        <Button variant="ghost" onClick={() => openDocs(r)}>
          📄 Hujjatlar
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="📄 18 yoshgacha / Hujjatsiz"
        description="Yoshi 18 dan kichik mijozlar va hujjatlari to'liq bo'lmagan yozuvlar."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
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
        <div className="ml-auto w-full max-w-xs">
          <Input
            type="search"
            placeholder="🔎 Ism, telefon yoki passport..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <Card bodyClassName="p-0">
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          emptyText={q ? "🔎 Qidiruv bo'yicha ma'lumot topilmadi." : "Ma'lumot topilmadi."}
          minWidth={1500}
          footer={<Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} />}
        />
      </Card>

      {/* Documents modal */}
      <Modal
        open={docsOpen}
        title={active ? `Hujjatlar — ${active.fullName || active.phone}` : "Hujjatlar"}
        onClose={() => setDocsOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDocsOpen(false)}>
              Bekor qilish
            </Button>
            <Button loading={saving} onClick={saveDocs}>
              Saqlash
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Bola pasporti / ID">
            <Input value={dPassport} onChange={(e) => setDPassport(e.target.value)} placeholder="AA1234567" />
          </Field>
          <Field label="Ota pasporti">
            <Input value={dFather} onChange={(e) => setDFather(e.target.value)} placeholder="AA1234567" />
          </Field>
          <Field label="Ona pasporti">
            <Input value={dMother} onChange={(e) => setDMother(e.target.value)} placeholder="AA1234567" />
          </Field>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={dConsent}
                onChange={(e) => setDConsent(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Ota-ona rozilik xati bor
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={dSignature}
                onChange={(e) => setDSignature(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Imzo mavjud
            </label>
          </div>
          <Field label="Izoh">
            <Textarea rows={3} value={dNotes} onChange={(e) => setDNotes(e.target.value)} />
          </Field>
        </div>
      </Modal>

      {/* SMS modal */}
      <Modal
        open={smsOpen}
        title="SMS yuborish"
        onClose={() => setSmsOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSmsOpen(false)}>
              Bekor qilish
            </Button>
            <Button loading={saving} onClick={sendSmsNow}>
              💬 Yuborish
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Qabul qiluvchi: <span className="font-medium text-slate-800">{active?.phone}</span>
          </p>
          <Field label="Xabar matni">
            <Textarea rows={4} value={smsText} onChange={(e) => setSmsText(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

export default function Under18Page() {
  return (
    <Suspense fallback={<p className="py-12 text-center text-sm text-slate-500">⏳ Yuklanmoqda...</p>}>
      <Under18PageInner />
    </Suspense>
  );
}
