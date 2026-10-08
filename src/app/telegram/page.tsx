"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DataTable, type Column } from "@/components/DataTable";
import {
  Badge,
  Button,
  Card,
  Modal,
  PageHeader,
  Pagination,
  Select,
  TelegramSendBadge,
  Textarea,
} from "@/components/ui";
import { useToast } from "@/components/Toast";
import { sleep, useDebounced } from "@/lib/hooks";
import { ageLabel, isUnder18 } from "@/lib/age";
import { docSummary } from "@/lib/docs";
import { formatDate, formatDateTime } from "@/lib/format";
import { parseBirthDate, parseDelimited } from "@/lib/paste";

type TgRow = {
  id: number;
  passport: string;
  birthDate: string | null;
  fullName: string;
  telegram: string;
  telegramId: string;
  company: string;
  phone: string;
  idr: string;
  source: string;
  hasPassport: boolean;
  hasFatherPassport: boolean;
  hasMotherPassport: boolean;
  hasConsent: boolean;
  hasSignature: boolean;
  message: string;
  sendStatus: string;
  sentAt: string | null;
  error: string;
  createdAt: string;
};

const SEND_STATUS_LABELS: Record<string, string> = {
  "": "Barchasi",
  unsent: "Yuborilmagan",
  sending: "Yuborilmoqda",
  sent: "Yuborildi",
  failed: "Xatolik",
};

function TelegramIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 12.8l-4.1-1.3c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  );
}

type Progress = {
  active: boolean;
  done: boolean;
  current: number;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
};

const initialProgress: Progress = {
  active: false,
  done: false,
  current: 0,
  total: 0,
  sent: 0,
  failed: 0,
  skipped: 0,
};

function TelegramPageInner() {
  const toast = useToast();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<TgRow[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debouncedQ = useDebounced(q);
  const [status, setStatus] = useState("");

  const [edited, setEdited] = useState<Record<number, string>>({});
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [progress, setProgress] = useState<Progress>(initialProgress);

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (debouncedQ) params.set("q", debouncedQ);
      if (status) params.set("status", status);
      const res = await fetch(`/api/telegram?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xatolik");
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setCounts(data.counts ?? {});
    } catch {
      setError("Telegram xabarlarni yuklab bo'lmadi.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQ, status]);

  useEffect(() => {
    load();
  }, [load]);

  // Excel paste anywhere on the page -> open import modal
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      const text = e.clipboardData?.getData("text");
      if (!text || (!text.includes("\t") && !text.includes("\n"))) return;
      e.preventDefault();
      setImportText(text);
      setImportOpen(true);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const getMessage = (row: TgRow) => edited[row.id] ?? row.message;

  const setMessage = (id: number, value: string) =>
    setEdited((prev) => ({ ...prev, [id]: value }));

  const sendOne = async (row: TgRow) => {
    const message = getMessage(row);
    setSendingId(row.id);
    try {
      if (message !== row.message) {
        await fetch(`/api/telegram/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });
      }
      const res = await fetch(`/api/telegram/${row.id}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xatolik");
      toast.success("✅ Telegram xabari yuborildi.");
      setEdited((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "❌ Xabar yuborilmadi.");
    } finally {
      setSendingId(null);
      await load();
    }
  };

  const targets = rows.filter((r) => r.sendStatus !== "sent");

  const sendAll = async () => {
    setConfirmOpen(false);
    setProgress({ ...initialProgress, active: true, total: targets.length });
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < targets.length; i += 1) {
      const row = targets[i];
      setProgress((p) => ({ ...p, current: i + 1 }));
      const chatId = (row.telegramId ?? "").trim();
      if (!/^-?\d+$/.test(chatId)) {
        skipped += 1;
        setProgress((p) => ({ ...p, skipped }));
        await sleep(80);
        continue;
      }
      try {
        const message = getMessage(row);
        if (message !== row.message) {
          await fetch(`/api/telegram/${row.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
          });
        }
        const res = await fetch(`/api/telegram/${row.id}/send`, { method: "POST" });
        if (res.ok) {
          sent += 1;
          setProgress((p) => ({ ...p, sent }));
        } else {
          failed += 1;
          setProgress((p) => ({ ...p, failed }));
        }
      } catch {
        failed += 1;
        setProgress((p) => ({ ...p, failed }));
      }
      await sleep(150);
    }

    setProgress((p) => ({ ...p, active: false, done: true }));
    toast.success(`✅ Yuborildi: ${sent} · Xatolik: ${failed} · O'tkazib yuborildi: ${skipped}`);
    await load();
  };

  // ---- Excel import parsing ----
  const parsedRows = (() => {
    if (!importText.trim()) return [];
    const raw = parseDelimited(importText);
    return raw
      .map((cells, idx) => {
        const first = (cells[0] ?? "").toLowerCase();
        if (idx === 0 && (first.includes("pasport") || first.includes("#"))) return null;
        const [passport = "", birthRaw = "", , company = "", phone = "", , fullName = "", telegram = "", telegramId = "", , idr = "", source = ""] = cells;
        const birthDate = parseBirthDate(birthRaw);
        return {
          passport: passport.trim(),
          birthDate,
          company: company.trim(),
          phone: phone.trim(),
          fullName: fullName.trim(),
          telegram: telegram.trim(),
          telegramId: telegramId.trim(),
          idr: idr.trim(),
          source: source.trim(),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null && (!!r.passport || !!r.phone));
  })();

  const invalidCount = (() => {
    if (!importText.trim()) return 0;
    const raw = parseDelimited(importText);
    return raw.filter((cells, idx) => {
      const first = (cells[0] ?? "").toLowerCase();
      if (idx === 0 && (first.includes("pasport") || first.includes("#"))) return false;
      return !(cells[0] ?? "").trim() && !(cells[4] ?? "").trim();
    }).length;
  })();

  const runImport = async () => {
    setImporting(true);
    try {
      const res = await fetch("/api/telegram/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedRows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xatolik");
      const warn = data.warnings?.length ? `\n${data.warnings.slice(0, 3).join("\n")}` : "";
      toast.success(
        `✅ Excel ma'lumotlari yuklandi. Import: ${data.imported} · Yangi mijoz: ${data.createdCustomers} · O'tkazib yuborildi: ${data.skipped}${warn}`,
      );
      setImportOpen(false);
      setImportText("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "❌ Import bajarilmadi.");
    } finally {
      setImporting(false);
    }
  };

  const columns: Column<TgRow>[] = [
    {
      key: "idx",
      label: "#",
      render: (_, i) => <span className="text-slate-400">{(page - 1) * pageSize + i + 1}</span>,
    },
    { key: "passport", label: "Pasport", render: (r) => <span className="font-mono text-xs">{r.passport || "—"}</span> },
    {
      key: "birthDate",
      label: "Tug'ilgan sana",
      render: (r) => (
        <span className="whitespace-nowrap">
          {formatDate(r.birthDate)}
          {isUnder18(r.birthDate) && (
            <Badge tone="orange" className="ml-1">{ageLabel(r.birthDate)}</Badge>
          )}
        </span>
      ),
    },
    {
      key: "ageStatus",
      label: "Holati",
      render: (r) =>
        isUnder18(r.birthDate) ? <Badge tone="orange">18 yoshgacha</Badge> : <Badge tone="slate">Kattalar</Badge>,
    },
    { key: "company", label: "Firma", render: (r) => r.company || "—" },
    { key: "phone", label: "Telefon", render: (r) => <span className="font-medium text-slate-900">{r.phone}</span> },
    { key: "createdAt", label: "Sana", render: (r) => <span className="whitespace-nowrap">{formatDate(r.createdAt)}</span> },
    { key: "fullName", label: "F.I.SH", render: (r) => r.fullName || "—" },
    { key: "telegram", label: "Telegram", render: (r) => r.telegram || "—" },
    { key: "telegramId", label: "ID", render: (r) => <span className="font-mono text-xs">{r.telegramId || "—"}</span> },
    {
      key: "docStatus",
      label: "Hujjat holati",
      render: (r) => {
        const flags = {
          passport: r.hasPassport ? "x" : "",
          fatherPassport: r.hasFatherPassport ? "x" : "",
          motherPassport: r.hasMotherPassport ? "x" : "",
          consentLetter: r.hasConsent,
          hasSignature: r.hasSignature,
        };
        return <span className="text-xs font-medium text-slate-600">{docSummary(flags)}</span>;
      },
    },
    { key: "idr", label: "IDr", render: (r) => r.idr || "—" },
    { key: "source", label: "Manba", render: (r) => r.source || "—" },
    {
      key: "message",
      label: "Xabar (tahrirlash mumkin)",
      render: (r) => (
        <Textarea
          rows={2}
          className="min-w-[240px] text-xs"
          value={getMessage(r)}
          onChange={(e) => setMessage(r.id, e.target.value)}
        />
      ),
    },
    {
      key: "actions",
      label: "Amal",
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <Button
            variant={r.sendStatus === "failed" ? "danger" : "primary"}
            loading={sendingId === r.id}
            onClick={() => sendOne(r)}
          >
            {r.sendStatus === "failed" ? "Qayta yuborish" : "Yuborish"}
          </Button>
          <TelegramSendBadge status={r.sendStatus} />
          {r.sendStatus === "sent" && r.sentAt && (
            <span className="text-xs text-slate-400">{formatDateTime(r.sentAt)}</span>
          )}
          {r.sendStatus === "failed" && r.error && (
            <span className="max-w-[140px] text-xs text-red-500">{r.error}</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="📩 Telegram xabarlar"
        description="Excel'dan import qiling, xabarlarni tahrirlang va yuboring."
        actions={
          <>
            <Button variant="secondary" onClick={load}>
              🔄 Yangilash
            </Button>
            <Button onClick={() => setImportOpen(true)}>📥 Excel'dan import</Button>
          </>
        }
      />

      {/* Header panel */}
      <Card bodyClassName="p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
            <TelegramIcon />
          </div>
          <div className="min-w-[240px] flex-1">
            <h2 className="text-lg font-bold text-slate-900">Telegram Xabar Yuborish</h2>
            <p className="mt-1 text-sm text-slate-500">
              Excel&lsquo;dan nusxa ko&lsquo;chiring va jadvalga joylang.
              <br />
              Har bir kontakt uchun alohida xabar yozing.
              <br />
              Pastdagi &ldquo;Yuborish&rdquo; tugmasini bosing.
            </p>
          </div>
          <Badge tone="blue" className="px-3 py-1 text-sm">
            Jami: {total} ta
          </Badge>
        </div>
      </Card>

      {/* Filters */}
      <Card bodyClassName="mt-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            type="search"
            placeholder="🔎 Telefon, passport, F.I.SH yoki Telegram ID..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
          />
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(SEND_STATUS_LABELS).map(([value, label]) => (
              <option key={value || "all"} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Button
            variant="secondary"
            onClick={() => {
              setQ("");
              setStatus("");
            }}
          >
            Filtrlarni tozalash
          </Button>
        </div>
      </Card>

      {/* Table */}
      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          emptyText={q || status ? "🔎 Qidiruv bo'yicha ma'lumot topilmadi." : "Ma'lumot topilmadi."}
          minWidth={1900}
          maxHeight="70vh"
          footer={<Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} />}
        />
      </div>

      {/* Bulk send */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          variant="success"
          loading={progress.active}
          disabled={targets.length === 0}
          onClick={() => setConfirmOpen(true)}
        >
          ✈️ Barchasiga Telegramga yuborish ({targets.length} ta)
        </Button>
        {progress.active && (
          <div className="min-w-[240px] flex-1">
            <p className="text-sm font-medium text-slate-700">
              Yuborilmoqda... {progress.current} / {progress.total}
            </p>
            <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}
              />
            </div>
          </div>
        )}
        {progress.done && !progress.active && (
          <div className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
            Yuborildi: {progress.sent} · Xatolik: {progress.failed} · O&lsquo;tkazib yuborildi:{" "}
            {progress.skipped}
          </div>
        )}
      </div>

      {/* Info panel */}
      <Card title="ℹ Excel'dan nusxa ko'chirish" className="mt-4">
        <p className="text-sm text-slate-600">
          Excel fayldagi ma&rsquo;lumotlarni (Ctrl + C) nusxa ko&lsquo;chiring va shu jadvalga
          (Ctrl + V) joylang.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">Xabarlar:</span> Har bir kontakt uchun xabar
          yozing yoki mavjud xabarni tahrirlang.
        </p>
      </Card>

      {/* Import modal */}
      <Modal
        open={importOpen}
        title="📥 Excel'dan import"
        wide
        onClose={() => setImportOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setImportOpen(false)}>
              Bekor qilish
            </Button>
            <Button loading={importing} disabled={parsedRows.length === 0} onClick={runImport}>
              Import qilish ({parsedRows.length})
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-500">
          Ustunlar tartibi: Pasport · Tug&lsquo;ilgan sana · Holati · Firma · Telefon · Sana ·
          F.I.SH · Telegram · ID · Hujjat holati · IDr · Manba. Xabarlar har bir kontakt uchun
          avtomatik yaratiladi va tahrirlash mumkin.
        </p>
        <Textarea
          rows={8}
          placeholder={"AA1234567\t12.05.2010\t...\tFirma\t+998901234567\t...\tAliyev Ali\t@ali\t123456789\t..."}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <p className="font-semibold">
            Oldindan ko&rsquo;rish: {parsedRows.length} ta qator
            {invalidCount > 0 && <span className="text-orange-600"> · {invalidCount} ta yaroqsiz qator</span>}
          </p>
          {parsedRows.slice(0, 5).map((r, i) => (
            <p key={i} className="mt-0.5">
              <span className="font-mono">{r.passport || "—"}</span> · {r.phone || "—"} · {r.fullName || "—"} ·{" "}
              {r.telegramId || r.telegram || "Telegram yo'q"}
            </p>
          ))}
          {parsedRows.length > 5 && <p>...va yana {parsedRows.length - 5} ta qator</p>}
        </div>
      </Modal>

      {/* Confirm bulk send */}
      <Modal
        open={confirmOpen}
        title="Telegram xabar yuborish"
        onClose={() => setConfirmOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Bekor qilish
            </Button>
            <Button variant="success" onClick={sendAll}>
              Yuborish
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{targets.length} ta</span> kontaktga Telegram
          xabar yuborilsinmi? Faqat to&lsquo;g&lsquo;ri Telegram ID&lsquo;li kontaktlarga yuboriladi.
        </p>
      </Modal>
    </div>
  );
}

export default function TelegramPage() {
  return (
    <Suspense fallback={<p className="py-12 text-center text-sm text-slate-500">⏳ Yuklanmoqda...</p>}>
      <TelegramPageInner />
    </Suspense>
  );
}
