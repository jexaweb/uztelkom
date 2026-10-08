"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DataTable, type Column } from "@/components/DataTable";
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Select,
  SmsStatusBadge,
  Textarea,
} from "@/components/ui";
import { useToast } from "@/components/Toast";
import { useDebounced } from "@/lib/hooks";
import { formatDate, formatDateTime, truncate } from "@/lib/format";

type SmsRow = {
  id: number;
  phone: string;
  message: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  error: string;
  dealerId: number | null;
  dealerName: string | null;
  dealerLogin: string | null;
  dealerCompany: string | null;
};

type DealerOption = { id: number; name: string; login: string };

const STATUS_LABELS: Record<string, string> = {
  "": "Barchasi",
  pending: "Kutilmoqda",
  sent: "Yuborildi",
  failed: "Xatolik",
};

function SmsPageInner() {
  const toast = useToast();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<SmsRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [dealer, setDealer] = useState("");
  const debouncedQ = useDebounced(q);

  const [dealers, setDealers] = useState<DealerOption[]>([]);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // form state
  const [formDealer, setFormDealer] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/dealers?pageSize=100")
      .then((r) => r.json())
      .then((d) => setDealers(d.rows ?? []))
      .catch(() => setDealers([]));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, status, dealer]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (debouncedQ) params.set("q", debouncedQ);
      if (status) params.set("status", status);
      if (dealer) params.set("dealer", dealer);
      const res = await fetch(`/api/sms?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xatolik");
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError("SMS xabarlarni yuklab bo'lmadi.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQ, status, dealer]);

  useEffect(() => {
    load();
  }, [load]);

  const sendOne = async (id: number) => {
    setSendingId(id);
    try {
      const res = await fetch("/api/sms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xatolik");
      toast.success("✅ SMS yuborildi.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "❌ SMS yuborilmadi.");
    } finally {
      setSendingId(null);
      await load();
    }
  };

  const sendAll = async () => {
    setBulkSending(true);
    try {
      const res = await fetch("/api/sms/send-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xatolik");
      toast.success(`✅ Yuborildi: ${data.sent} ta · Xatolik: ${data.failed} ta`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "❌ Ommaviy yuborish bajarilmadi.");
    } finally {
      setBulkSending(false);
      await load();
    }
  };

  const createSms = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealerId: formDealer ? Number(formDealer) : null,
          phone: formPhone,
          message: formMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xatolik");
      toast.success("✅ SMS navbatga qo'shildi.");
      setCreateOpen(false);
      setFormPhone("");
      setFormMessage("");
      setFormDealer("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "❌ SMS yaratilmadi.");
    } finally {
      setCreating(false);
    }
  };

  const columns: Column<SmsRow>[] = [
    {
      key: "idx",
      label: "#",
      render: (_, i) => <span className="text-slate-400">{(page - 1) * pageSize + i + 1}</span>,
    },
    { key: "createdAt", label: "Sana", render: (r) => <span className="whitespace-nowrap">{formatDate(r.createdAt)}</span> },
    { key: "phone", label: "Telefon", render: (r) => <span className="font-medium text-slate-900">{r.phone}</span> },
    { key: "dealerName", label: "Diler", render: (r) => r.dealerName ?? "—" },
    { key: "dealerLogin", label: "Login", render: (r) => <span className="text-slate-500">{r.dealerLogin ?? "—"}</span> },
    { key: "dealerCompany", label: "Kompaniya", render: (r) => r.dealerCompany ?? "—" },
    {
      key: "message",
      label: "Xabar",
      render: (r) => (
        <span className="block max-w-[260px]" title={r.message}>
          {truncate(r.message, 60)}
        </span>
      ),
    },
    { key: "status", label: "Holat", render: (r) => <SmsStatusBadge status={r.status} /> },
    { key: "sentAt", label: "Yuborilgan vaqt", render: (r) => <span className="whitespace-nowrap">{formatDateTime(r.sentAt)}</span> },
    {
      key: "actions",
      label: "Amal",
      render: (r) =>
        r.status === "sent" ? (
          <span className="text-xs text-slate-400">—</span>
        ) : (
          <Button
            variant={r.status === "failed" ? "danger" : "primary"}
            loading={sendingId === r.id}
            onClick={() => sendOne(r.id)}
          >
            {r.status === "failed" ? "Qayta yuborish" : "Yuborish"}
          </Button>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="💬 SMS xabarlar"
        description="SMS yozuvlari, holatlar va yuborish boshqaruvi."
        actions={
          <>
            <Button variant="success" loading={bulkSending} onClick={sendAll}>
              📨 Kutilayotganlarni yuborish
            </Button>
            <Button onClick={() => setCreateOpen(true)}>+ Yangi SMS</Button>
          </>
        }
      />

      <Card bodyClassName="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            type="search"
            placeholder="🔎 Telefon yoki xabar bo'yicha qidirish..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value || "all"} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select value={dealer} onChange={(e) => setDealer(e.target.value)}>
            <option value="">Barcha dilerlar</option>
            {dealers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.login})
              </option>
            ))}
          </Select>
          <Button
            variant="secondary"
            onClick={() => {
              setQ("");
              setStatus("");
              setDealer("");
            }}
          >
            Filtrlarni tozalash
          </Button>
        </div>
      </Card>

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          emptyText={q || status || dealer ? "🔎 Qidiruv bo'yicha ma'lumot topilmadi." : "Ma'lumot topilmadi."}
          footer={<Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} />}
        />
      </div>

      <Modal
        open={createOpen}
        title="+ Yangi SMS"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Bekor qilish
            </Button>
            <Button loading={creating} onClick={createSms}>
              Navbatga qo'shish
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Diler">
            <Select value={formDealer} onChange={(e) => setFormDealer(e.target.value)}>
              <option value="">Dilerni tanlang</option>
              {dealers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.login})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Telefon raqam" required>
            <Input
              placeholder="+998 90 123 45 67"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
            />
          </Field>
          <Field label="Xabar matni" required>
            <Textarea
              rows={4}
              placeholder="Xabar matnini kiriting..."
              value={formMessage}
              onChange={(e) => setFormMessage(e.target.value)}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

export default function SmsPage() {
  return (
    <Suspense fallback={<p className="py-12 text-center text-sm text-slate-500">⏳ Yuklanmoqda...</p>}>
      <SmsPageInner />
    </Suspense>
  );
}
