"use client";

import { useCallback, useEffect, useMemo, useState } from "react";



/* =========================================================
   TYPES
========================================================= */

type SmsRow = {
  id: number;
  dealerId: number | null;

  dealerName: string;
  dealerLogin: string;
  dealerCompany: string;
  dealerRegion: string;

  phone: string;
  type: string;

  year: number;
  month: number;
  day: number;
  amount: number;

  date: string;
  createdAt?: string;
};

type InsuranceRow = {
  id: number;
  dealerId: number | null;

  dealerName: string;
  dealerLogin: string;
  dealerCompany: string;
  dealerRegion: string;

  phone: string;
  type: string;

  year: number;
  month: number;
  day: number;
  amount: number;

  date: string;
  createdAt?: string;

  customerName?: string;
  insuranceType?: string;
  status?: string;
  notes?: string;
};

type TelegramRow = {
  id: number;

  customerId: number | null;

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

  createdAt?: string;

  dealerId: number | null;
  dealerName: string | null;
  dealerLogin: string | null;
  dealerCompany: string | null;
  dealerRegion: string | null;
};

type DashboardResponse = {
  success: boolean;
  query: string;
  total: number;

  sms: SmsRow[];
  insurance: InsuranceRow[];
  telegram: TelegramRow[];

  error?: string;
};

/* =========================================================
   EMPTY DATA
========================================================= */

const EMPTY_DATA: DashboardResponse = {
  success: true,
  query: "",
  total: 0,
  sms: [],
  insurance: [],
  telegram: [],
};

/* =========================================================
   HELPERS
========================================================= */

function safeText(value: unknown): string {
  return String(value ?? "");
}

function formatNumber(value: unknown): string {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat("uz-UZ").format(number);
}

function formatDate(value: unknown): string {
  if (!value) {
    return "—";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return safeText(value);
  }

  return date.toLocaleDateString("uz-UZ");
}



/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}: {
  status?: string | null;
}) {
  const value = safeText(status)
    .trim()
    .toLowerCase();

  let className =
    "bg-slate-100 text-slate-600";

  let label = "Noma'lum";

  if (
    value === "sent" ||
    value === "success" ||
    value === "sent_success" ||
    value === "yuborildi"
  ) {
    className =
      "bg-green-100 text-green-700";

    label = "Yuborildi";
  } else if (
    value === "pending" ||
    value === "waiting" ||
    value === "kutilmoqda"
  ) {
    className =
      "bg-yellow-100 text-yellow-700";

    label = "Kutilmoqda";
  } else if (
    value === "failed" ||
    value === "error" ||
    value === "xato"
  ) {
    className =
      "bg-red-100 text-red-700";

    label = "Xatolik";
  } else if (
    value === "unsent" ||
    value === "not_sent" ||
    value === "yuborilmagan"
  ) {
    className =
      "bg-slate-100 text-slate-600";

    label = "Yuborilmagan";
  } else if (value) {
    label = status ?? "Noma'lum";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

/* =========================================================
   DOCUMENT BADGE
========================================================= */

function DocumentBadge({
  value,
  label,
}: {
  value?: boolean | null;
  label: string;
}) {
  return value ? (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
      ✓ {label}
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
      ✕ {label}
    </span>
  );
}

/* =========================================================
   EMPTY TABLE MESSAGE
========================================================= */

function EmptyTable({
  icon,
  title,
  description,
  colSpan,
}: {
  icon: string;
  title: string;
  description: string;
  colSpan: number;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-5 py-14 text-center"
      >
        <div className="flex flex-col items-center justify-center">
          <div className="text-3xl">
            {icon}
          </div>

          <p className="mt-2 font-semibold text-slate-700">
            {title}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>
      </td>
    </tr>
  );
}

/* =========================================================
   SMS TABLE
========================================================= */

function SmsTable({
  rows,
}: {
  rows: SmsRow[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            📩 SMS jadvali
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            SMS dilerlarining kunlik savdo ma'lumotlari
          </p>
        </div>

        <div className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700">
          {rows.length} ta yozuv
        </div>
      </div>

      <div className="max-h-[650px] overflow-auto">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-200 bg-white">
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-slate-500">
                #
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-slate-500">
                Hudud
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-slate-500">
                Login
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-slate-500">
                Diler
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-slate-500">
                Kompaniya
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-slate-500">
                Telefon
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-bold text-slate-500">
                Sana
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-bold text-slate-500">
                Kun
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold text-slate-500">
                Summa
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <EmptyTable
                icon="📭"
                title="SMS ma'lumot topilmadi"
                description="Qidiruv orqali diler yoki kompaniyani toping."
                colSpan={9}
              />
            ) : (
              rows.map((row, index) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 transition hover:bg-blue-50/40"
                >
                  <td className="px-4 py-3 text-slate-400">
                    {index + 1}
                  </td>

                  <td className="px-4 py-3">
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {safeText(row.dealerRegion) || "—"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-bold text-blue-700">
                      {safeText(row.dealerLogin) || "—"}
                    </span>
                  </td>

                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {safeText(row.dealerName) || "—"}
                  </td>

                  <td className="max-w-[280px] px-4 py-3">
                    <span className="block truncate text-slate-700">
                      {safeText(row.dealerCompany) || "—"}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {safeText(row.phone) || "—"}
                  </td>

                  <td className="px-4 py-3 text-center text-slate-600">
                    {safeText(row.date) || "—"}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-blue-50 px-2 font-bold text-blue-700">
                      {row.day}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-slate-900">
                      {formatNumber(row.amount)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3">
          <span className="text-xs text-slate-500">
            Jami yozuvlar
          </span>

          <span className="font-bold text-blue-700">
            {rows.length}
          </span>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   INSURANCE TABLE
========================================================= */

function InsuranceTable({
  rows,
}: {
  rows: InsuranceRow[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            🛡 Sug'urta jadvali
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Sug'urta dilerlarining ma'lumotlari
          </p>
        </div>

        <div className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
          {rows.length} ta yozuv
        </div>
      </div>

      <div className="max-h-[650px] overflow-auto">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-slate-500">
                #
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-slate-500">
                Hudud
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-slate-500">
                Login
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-slate-500">
                Diler
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-slate-500">
                Kompaniya
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-slate-500">
                Telefon
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-bold text-slate-500">
                Sana
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-slate-500">
                Sug'urta turi
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-bold text-slate-500">
                Holat
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <EmptyTable
                icon="🛡️"
                title="Sug'urta ma'lumot topilmadi"
                description="Tanlangan diler bo'yicha sug'urta yozuvi yo'q."
                colSpan={9}
              />
            ) : (
              rows.map((row, index) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 transition hover:bg-emerald-50/40"
                >
                  <td className="px-4 py-3 text-slate-400">
                    {index + 1}
                  </td>

                  <td className="px-4 py-3">
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {safeText(row.dealerRegion) || "—"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-bold text-emerald-700">
                      {safeText(row.dealerLogin) || "—"}
                    </span>
                  </td>

                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {safeText(row.dealerName) || "—"}
                  </td>

                  <td className="max-w-[280px] px-4 py-3">
                    <span className="block truncate text-slate-700">
                      {safeText(row.dealerCompany) || "—"}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {safeText(row.phone) || "—"}
                  </td>

                  <td className="px-4 py-3 text-center text-slate-600">
                    {safeText(row.date) || "—"}
                  </td>

                  <td className="px-4 py-3">
                    <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                      {safeText(row.insuranceType) || "Sug'urta"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <StatusBadge
                      status={row.status}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3">
          <span className="text-xs text-slate-500">
            Jami yozuvlar
          </span>

          <span className="font-bold text-emerald-700">
            {rows.length}
          </span>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   TELEGRAM TABLE
========================================================= */

function TelegramTable({
  rows,
}: {
  rows: TelegramRow[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            💬 Telegram Messages
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Telegram orqali yuborilgan va yuboriladigan xabarlar
          </p>
        </div>

        <div className="rounded-full bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-700">
          {rows.length} ta xabar
        </div>
      </div>

      <div className="max-h-[650px] overflow-auto">
        <table className="w-full min-w-[1500px] border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-slate-500">
                #
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-slate-500">
                F.I.Sh
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-slate-500">
                Passport
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-slate-500">
                Tug'ilgan sana
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-slate-500">
                Telefon
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-slate-500">
                Telegram
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-slate-500">
                Kompaniya
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-slate-500">
                Diler
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-bold text-slate-500">
                Passport
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-bold text-slate-500">
                Ota passport
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-bold text-slate-500">
                Ona passport
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-bold text-slate-500">
                Rozilik
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-bold text-slate-500">
                Imzo
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-bold text-slate-500">
                Holat
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-slate-500">
                Xabar
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <EmptyTable
                icon="💬"
                title="Telegram xabarlar topilmadi"
                description="Hozircha Telegram ma'lumotlari mavjud emas."
                colSpan={15}
              />
            ) : (
              rows.map((row, index) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 transition hover:bg-sky-50/40"
                >
                  <td className="px-4 py-3 text-slate-400">
                    {index + 1}
                  </td>

                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-900">
                      {safeText(row.fullName) || "—"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-slate-700">
                      {safeText(row.passport) || "—"}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {safeText(row.birthDate) || "—"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {safeText(row.phone) || "—"}
                  </td>

                  <td className="px-4 py-3">
                    {row.telegram ? (
                      <span className="rounded-lg bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">
                        {row.telegram}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="max-w-[220px] px-4 py-3">
                    <span className="block truncate text-slate-700">
                      {safeText(row.company) || "—"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {safeText(row.dealerName) || "—"}
                      </p>

                      <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                        {safeText(row.dealerLogin)}
                      </p>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <DocumentBadge
                      value={row.hasPassport}
                      label="Bor"
                    />
                  </td>

                  <td className="px-4 py-3 text-center">
                    <DocumentBadge
                      value={row.hasFatherPassport}
                      label="Bor"
                    />
                  </td>

                  <td className="px-4 py-3 text-center">
                    <DocumentBadge
                      value={row.hasMotherPassport}
                      label="Bor"
                    />
                  </td>

                  <td className="px-4 py-3 text-center">
                    <DocumentBadge
                      value={row.hasConsent}
                      label="Bor"
                    />
                  </td>

                  <td className="px-4 py-3 text-center">
                    <DocumentBadge
                      value={row.hasSignature}
                      label="Bor"
                    />
                  </td>

                  <td className="px-4 py-3 text-center">
                    <StatusBadge
                      status={row.sendStatus}
                    />
                  </td>

                  <td className="max-w-[320px] px-4 py-3">
                    <span
                      className="block truncate text-slate-600"
                      title={safeText(row.message)}
                    >
                      {safeText(row.message) || "—"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================================================
   DASHBOARD PAGE
========================================================= */

export default function DashboardPage() {
  /*
    searchInput:
    input ichidagi yozuv.

    search:
    faqat Qidirish tugmasi bosilgandan keyin
    haqiqiy qidiruv sifatida ishlaydi.
  */

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [data, setData] =
    useState<DashboardResponse>(EMPTY_DATA);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /* =======================================================
     LOAD
  ======================================================= */

  const loadDashboard = useCallback(
    async (query?: string) => {
      const cleanQuery =
        (query ?? searchInput).trim();

      /*
        MUHIM:
        Qidiruv bo'lmasa bazadan barcha ma'lumotlarni
        olib kelmaymiz.
      */

      if (!cleanQuery) {
        setData(EMPTY_DATA);
        setError(null);
        setLoading(false);

        return;
      }

      try {
        setLoading(true);
        setError(null);

        const params =
          new URLSearchParams();

        params.set("q", cleanQuery);

        const response =
          await fetch(
            `/api/dashboard?${params.toString()}`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const result =
          await response.json();

        if (!response.ok || !result?.success) {
          throw new Error(
            result?.error ||
              "Dashboard ma'lumotlarini olishda xatolik."
          );
        }

        setData({
          success:
            result?.success ?? true,

          query:
            result?.query ?? cleanQuery,

          total:
            Number(result?.total ?? 0),

          sms:
            Array.isArray(result?.sms)
              ? result.sms
              : [],

          insurance:
            Array.isArray(result?.insurance)
              ? result.insurance
              : [],

          telegram:
            Array.isArray(result?.telegram)
              ? result.telegram
              : [],
        });
      } catch (err) {
        console.error(
          "DASHBOARD LOAD ERROR:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Ma'lumotlarni yuklab bo'lmadi."
        );

        setData({
          ...EMPTY_DATA,
          query: cleanQuery,
        });
      } finally {
        setLoading(false);
      }
    },
    [searchInput]
  );

  /* =======================================================
     SEARCH
  ======================================================= */

  function handleSearch() {
    const value =
      searchInput.trim();

    /*
      Input bo'sh bo'lsa:
      jadvallarni bo'shatamiz.
    */

    if (!value) {
      setSearch("");
      setData(EMPTY_DATA);
      setError(null);
      return;
    }

    setSearch(value);
  }

  /* =======================================================
     CLEAR
  ======================================================= */

  function handleClear() {
    setSearchInput("");
    setSearch("");

    setData(EMPTY_DATA);
    setError(null);
    setLoading(false);
  }

  /* =======================================================
     ENTER
  ======================================================= */

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      handleSearch();
    }
  }

  /* =======================================================
     SEARCH EFFECT
  ======================================================= */

  useEffect(() => {
    /*
      Sahifa ochilganda search = "".
      Shuning uchun API umuman chaqirilmaydi.
    */

    if (!search.trim()) {
      setData(EMPTY_DATA);
      setLoading(false);

      return;
    }

    loadDashboard(search);
  }, [search, loadDashboard]);

  /* =======================================================
     ROWS
  ======================================================= */

  const smsRows = useMemo(
    () => data.sms ?? [],
    [data.sms]
  );

  const insuranceRows = useMemo(
    () => data.insurance ?? [],
    [data.insurance]
  );

  const telegramRows = useMemo(
    () => data.telegram ?? [],
    [data.telegram]
  );

  /* =======================================================
     TOTALS
  ======================================================= */

  const smsTotal = useMemo(() => {
    return smsRows.reduce(
      (sum, row) =>
        sum +
        Number(row.amount ?? 0),
      0
    );
  }, [smsRows]);

  const insuranceTotal =
    useMemo(() => {
      return insuranceRows.reduce(
        (sum, row) =>
          sum +
          Number(row.amount ?? 0),
        0
      );
    }, [insuranceRows]);

  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[2400px] space-y-5 p-4 md:p-6">

        {/* =================================================
            HEADER
        ================================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-2xl shadow-sm">
                <img src="/nastroka.svg" alt="Logo" className="h-6 w-6" />
                </div>

                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">
                    UZTELECOM
                  </h1>

                  <p className="text-sm text-slate-500">
                    Diler nazorati dashboard
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (search.trim()) {
                  loadDashboard(search);
                }
              }}
              disabled={
                loading || !search.trim()
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />

                  Yuklanmoqda...
                </>
              ) : (
                <>
                  🔄 Yangilash
                </>
              )}
            </button>
          </div>
        </section>

        {/* =================================================
            SEARCH
        ================================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-2">
            <label className="text-sm font-bold text-slate-700">
               Diler yoki kompaniya qidirish
            </label>

            <p className="mt-1 text-xs text-slate-400">
              Login, diler nomi, kompaniya, telefon yoki hudud bo&apos;yicha qidiring
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg">
                <img src="/search.svg" alt="Search" className="h-5 w-5" />
              </span>

              <input
                type="text"
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(
                    event.target.value
                  )
                }
                onKeyDown={handleKeyDown}
                placeholder="Masalan: XAYRULLA yoki Nilufar_UJ..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-12 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />

              {searchInput && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  ×
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="h-12 rounded-xl bg-blue-600 px-7 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Qidirilmoqda..."
                : "Qidirish"}
            </button>

            {search && (
              <button
                type="button"
                onClick={handleClear}
                className="h-12 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Tozalash
              </button>
            )}
          </div>

          {search.trim() && (
            <div className="mt-3 text-xs text-slate-500">
              Qidiruv:{" "}
              <span className="font-bold text-slate-800">
                {search}
              </span>
            </div>
          )}
        </section>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <div className="text-xl">
                ❌
              </div>

              <div>
                <h3 className="font-bold text-red-800">
                  Xatolik
                </h3>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* =================================================
            STATISTICS
        ================================================= */}

        {search && (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            {/* JAMI */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Jami yozuv
                  </p>

                  <p className="mt-2 text-3xl font-black text-slate-900">
                    {formatNumber(
                      data.total
                    )}
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                  📊
                </div>
              </div>
            </div>

            {/* SMS */}

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                    SMS
                  </p>

                  <p className="mt-2 text-3xl font-black text-blue-900">
                    {formatNumber(
                      smsRows.length
                    )}
                  </p>

                  <p className="mt-1 text-xs text-blue-600">
                    Jami:{" "}
                    {formatNumber(
                      smsTotal
                    )}
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
                  📩
                </div>
              </div>
            </div>

            {/* SUG'URTA */}

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                    Sug&apos;urta
                  </p>

                  <p className="mt-2 text-3xl font-black text-emerald-900">
                    {formatNumber(
                      insuranceRows.length
                    )}
                  </p>

                  <p className="mt-1 text-xs text-emerald-600">
                    Jami:{" "}
                    {formatNumber(
                      insuranceTotal
                    )}
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
                  🛡
                </div>
              </div>
            </div>

            {/* TELEGRAM */}

            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-sky-600">
                    Telegram
                  </p>

                  <p className="mt-2 text-3xl font-black text-sky-900">
                    {formatNumber(
                      telegramRows.length
                    )}
                  </p>

                  <p className="mt-1 text-xs text-sky-600">
                    Telegram xabarlar
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
                  💬
                </div>
              </div>
            </div>

          </section>
        )}

        {/* =================================================
            LOADING
        ================================================= */}

        {loading && (
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-3">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />

              <span className="text-sm font-semibold text-blue-700">
                Ma&apos;lumotlar yuklanmoqda...
              </span>
            </div>
          </section>
        )}

        {/* =================================================
            3 TABLES — YONMA-YON
        ================================================= */}

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-1">

          {/* SMS */}

          <SmsTable
            rows={smsRows}
          />

          {/* SUG'URTA */}

          <InsuranceTable
            rows={insuranceRows}
          />

          {/* TELEGRAM */}

          <TelegramTable
            rows={telegramRows}
          />

        </section>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="pb-6 text-center text-xs text-slate-400">
          UZTELECOM • Diler nazorati
        </div>

      </div>
    </main>
  );
}