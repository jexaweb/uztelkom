"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

import { DataTable, type Column } from "@/components/DataTable";

type SalesRow = {
  id: number;
  region: string;
  login: string;
  name: string;
  company: string;
  phone: string;
  type: string;
  isActive: boolean;
  days: number[];
  total: number;
};

type ImportRow = {
  login: string;
  days: number[];
};

const MONTHS = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
];

const normalizeLogin = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const parseAmount = (value: unknown): number => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const cleaned = String(value)
    .replace(/\s/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.-]/g, "");

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : 0;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("ru-RU").format(Number(value) || 0);

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month, 0).getDate();
};

const getDayFromHeader = (value: unknown): number | null => {
  const text = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!text) return null;

  const match =
    text.match(/^kun\s*(\d{1,2})$/) ||
    text.match(/^день\s*(\d{1,2})$/) ||
    text.match(/^day\s*(\d{1,2})$/) ||
    text.match(/^(\d{1,2})$/);

  if (!match) return null;

  const day = Number(match[1]);

  return day >= 1 && day <= 31 ? day : null;
};

const isLoginHeader = (value: unknown) => {
  const text = String(value ?? "")
    .trim()
    .toLowerCase();

  return [
    "login",
    "логин",
    "логин ділера",
    "дилер логин",
    "diler login",
    "diler_login",
  ].includes(text);
};

export default function InsurancePage() {
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [rows, setRows] = useState<SalesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [importOpen, setImportOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [excelReading, setExcelReading] = useState(false);

  const [clearingTable, setClearingTable] = useState(false);

  const daysInMonth = useMemo(() => {
    return getDaysInMonth(year, month);
  }, [year, month]);

  // ============================================================
  // LOAD
  // ============================================================

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        year: String(year),
        month: String(month),
        type: "insurance",
      });

      const response = await fetch(`/api/sales?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ?? "Sug'urta ma'lumotlarini yuklashda xatolik."
        );
      }

      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (err) {
      console.error("INSURANCE LOAD ERROR:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Ma'lumotlarni yuklashda xatolik.";

      setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  // ============================================================
  // SEARCH
  // ============================================================

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return rows;

    return rows.filter((row) => {
      return (
        String(row.login ?? "")
          .toLowerCase()
          .includes(q) ||
        String(row.name ?? "")
          .toLowerCase()
          .includes(q) ||
        String(row.company ?? "")
          .toLowerCase()
          .includes(q) ||
        String(row.region ?? "")
          .toLowerCase()
          .includes(q) ||
        String(row.phone ?? "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [rows, search]);

  // ============================================================
  // DAILY TOTALS
  // ============================================================

  const dailyTotals = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, dayIndex) => {
      return filteredRows.reduce((sum, row) => {
        return sum + Number(row.days?.[dayIndex] ?? 0);
      }, 0);
    });
  }, [filteredRows, daysInMonth]);

  // ============================================================
  // GRAND TOTAL
  // ============================================================

  const grandTotal = useMemo(() => {
    return filteredRows.reduce((sum, row) => {
      return sum + Number(row.total ?? 0);
    }, 0);
  }, [filteredRows]);

  // ============================================================
  // CLEAR TABLE
  // ============================================================

  const clearInsuranceTable = async () => {
    if (clearingTable || importing || excelReading) return;

    const confirmed = window.confirm(
      "⚠️ DIQQAT!\n\n" +
        "Sug'urta jadvalidagi BARCHA sotuv ma'lumotlari o'chiriladi.\n\n" +
        "Dilerlar bazasi o'chirilmaydi.\n\n" +
        "Bu amalni ortga qaytarib bo'lmaydi.\n\n" +
        "Jadvalni tozalashni tasdiqlaysizmi?"
    );

    if (!confirmed) return;

    setClearingTable(true);

    try {
      const response = await fetch("/api/sales?type=insurance", {
        method: "DELETE",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ?? "Sug'urta jadvalini tozalashda xatolik."
        );
      }

      window.alert(
        `✅ Sug'urta jadvali tozalandi.\n\n${
          data?.deleted ?? 0
        } ta yozuv o'chirildi.`
      );

      await load();
    } catch (err) {
      console.error("CLEAR INSURANCE ERROR:", err);

      window.alert(
        err instanceof Error
          ? `❌ ${err.message}`
          : "❌ Sug'urta jadvalini tozalab bo'lmaydi."
      );
    } finally {
      setClearingTable(false);
    }
  };

  // ============================================================
  // EXCEL READ
  // ============================================================

  const readExcel = async (file: File) => {
    setExcelReading(true);

    try {
      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: true,
      });

      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error("Excel faylda sheet topilmadi.");
      }

      const worksheet = workbook.Sheets[sheetName];

      const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        defval: "",
        raw: true,
      });

      if (!matrix.length) {
        throw new Error("Excel fayl bo'sh.");
      }

      let headerRowIndex = -1;
      let loginColumnIndex = -1;

      // Login ustunini qidirish
      for (
        let rowIndex = 0;
        rowIndex < Math.min(matrix.length, 15);
        rowIndex++
      ) {
        const row = matrix[rowIndex] ?? [];

        for (let colIndex = 0; colIndex < row.length; colIndex++) {
          if (isLoginHeader(row[colIndex])) {
            headerRowIndex = rowIndex;
            loginColumnIndex = colIndex;
            break;
          }
        }

        if (loginColumnIndex !== -1) break;
      }

      const dayColumnMap = new Map<number, number>();

      // Kun ustunlarini headerdan topish
      if (headerRowIndex !== -1) {
        const header = matrix[headerRowIndex] ?? [];

        header.forEach((cell, index) => {
          const day = getDayFromHeader(cell);

          if (day && day <= daysInMonth) {
            dayColumnMap.set(day, index);
          }
        });
      }

      // Login header topilmasa, mavjud diler loginlari orqali topish
      if (loginColumnIndex === -1) {
        const dealerLogins = new Set(
          rows.map((row) => normalizeLogin(row.login))
        );

        for (
          let rowIndex = 0;
          rowIndex < Math.min(matrix.length, 20);
          rowIndex++
        ) {
          const row = matrix[rowIndex] ?? [];

          for (let colIndex = 0; colIndex < row.length; colIndex++) {
            const value = normalizeLogin(row[colIndex]);

            if (value && dealerLogins.has(value)) {
              loginColumnIndex = colIndex;
              headerRowIndex = rowIndex - 1;
              break;
            }
          }

          if (loginColumnIndex !== -1) break;
        }
      }

      if (loginColumnIndex === -1) {
        throw new Error(
          "Excel faylda Login ustuni topilmadi. Ustun nomi Login yoki Логин bo'lishi kerak."
        );
      }

      // Agar kunlar headerdan topilmasa, raqamlar orqali qidirish
      if (dayColumnMap.size === 0 && headerRowIndex >= 0) {
        const header = matrix[headerRowIndex] ?? [];

        header.forEach((cell, index) => {
          const value = String(cell ?? "").trim();

          if (/^\d{1,2}$/.test(value)) {
            const day = Number(value);

            if (day >= 1 && day <= daysInMonth) {
              dayColumnMap.set(day, index);
            }
          }
        });
      }

      if (dayColumnMap.size === 0) {
        throw new Error(
          "Excel faylda kun ustunlari topilmadi.\n\nMasalan:\nKun 1, Kun 2, Kun 3...\nyoki\n1, 2, 3..."
        );
      }

      const startIndex = Math.max(headerRowIndex + 1, 0);

      const grouped = new Map<string, ImportRow>();

      // Excel qatorlarini o'qish
      for (
        let rowIndex = startIndex;
        rowIndex < matrix.length;
        rowIndex++
      ) {
        const row = matrix[rowIndex] ?? [];

        const login = normalizeLogin(row[loginColumnIndex]);

        if (!login) continue;

        const days = Array.from(
          { length: daysInMonth },
          () => 0
        );

        for (let day = 1; day <= daysInMonth; day++) {
          const columnIndex = dayColumnMap.get(day);

          if (columnIndex === undefined) continue;

          days[day - 1] = parseAmount(row[columnIndex]);
        }

        const existing = grouped.get(login);

        if (existing) {
          for (let i = 0; i < days.length; i++) {
            existing.days[i] += days[i];
          }
        } else {
          grouped.set(login, {
            login,
            days,
          });
        }
      }

      const parsedRows = Array.from(grouped.values());

      if (!parsedRows.length) {
        throw new Error(
          "Excel fayldan hech qanday Login ma'lumoti topilmadi."
        );
      }

      setImportRows(parsedRows);
    } catch (err) {
      console.error("EXCEL READ ERROR:", err);

      setImportRows([]);

      window.alert(
        err instanceof Error
          ? `❌ ${err.message}`
          : "❌ Excel faylni o'qishda xatolik."
      );
    } finally {
      setExcelReading(false);
    }
  };

  const handleExcelChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setExcelFile(file);

    await readExcel(file);

    event.target.value = "";
  };

  // ============================================================
  // CLOSE IMPORT
  // ============================================================

  const closeImportModal = () => {
    if (importing || excelReading) return;

    setImportOpen(false);
    setExcelFile(null);
    setImportRows([]);
  };

  // ============================================================
  // IMPORT EXCEL
  // ============================================================

  const importExcel = async () => {
    if (!importRows.length) {
      window.alert("❌ Avval Excel faylni tanlang.");
      return;
    }

    setImporting(true);

    try {
      const response = await fetch("/api/sales/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          year,
          month,
          type: "insurance",
          rows: importRows,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ??
            "Excel ma'lumotlarini import qilishda xatolik."
        );
      }

      window.alert(
        `✅ Import muvaffaqiyatli tugadi.\n\n${
          data?.writtenRecords ?? data?.imported ?? 0
        } ta yozuv saqlandi.`
      );

      closeImportModal();

      await load();
    } catch (err) {
      console.error("INSURANCE IMPORT ERROR:", err);

      window.alert(
        err instanceof Error
          ? `❌ ${err.message}`
          : "❌ Excel import qilishda xatolik."
      );
    } finally {
      setImporting(false);
    }
  };

  // ============================================================
  // IMPORT STATS
  // ============================================================

  const matchedCount = useMemo(() => {
    const dealerLogins = new Set(
      rows.map((row) => normalizeLogin(row.login))
    );

    return importRows.filter((row) =>
      dealerLogins.has(normalizeLogin(row.login))
    ).length;
  }, [importRows, rows]);

  const notFoundCount = useMemo(() => {
    return Math.max(importRows.length - matchedCount, 0);
  }, [importRows.length, matchedCount]);

  const importTotal = useMemo(() => {
    return importRows.reduce((sum, row) => {
      return (
        sum +
        row.days.reduce(
          (daySum, value) => daySum + Number(value || 0),
          0
        )
      );
    }, 0);
  }, [importRows]);

  // ============================================================
  // DAY COLUMNS
  // ============================================================

  const dayColumns: Column<SalesRow>[] = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;

      return {
        key: `day-${day}`,
        label: `Kun ${day}`,
        className: "text-center",

        render: (row) => {
          const value = Number(row.days?.[index] ?? 0);

          return value ? (
            <span className="font-medium text-slate-800">
              {formatNumber(value)}
            </span>
          ) : (
            <span className="text-slate-300">0</span>
          );
        },
      };
    });
  }, [daysInMonth]);

  // ============================================================
  // TABLE COLUMNS
  // ============================================================

  const columns: Column<SalesRow>[] = useMemo(() => {
    return [
      {
        key: "index",
        label: "#",
        className: "text-center",

        render: (_row, index) => (
          <span className="text-xs font-medium text-slate-500">
            {index + 1}
          </span>
        ),
      },

      {
        key: "region",
        label: "Hudud",

        render: (row) => (
          <span className="font-medium text-slate-700">
            {row.region || "-"}
          </span>
        ),
      },

      {
        key: "login",
        label: "Login",

        render: (row) => (
          <span className="font-semibold text-slate-900">
            {row.login || "-"}
          </span>
        ),
      },

      {
        key: "name",
        label: "Diler",

        render: (row) => (
          <span className="text-slate-700">
            {row.name || "-"}
          </span>
        ),
      },

      {
        key: "company",
        label: "Kompaniya",

        render: (row) => (
          <span className="text-slate-700">
            {row.company || "-"}
          </span>
        ),
      },

      {
        key: "phone",
        label: "Telefon",

        render: (row) => (
          <span className="whitespace-nowrap text-slate-600">
            {row.phone || "-"}
          </span>
        ),
      },

      ...dayColumns,

      {
        key: "total",
        label: "Jami",
        className: "text-right",

        render: (row) => (
          <span className="font-bold text-blue-700">
            {formatNumber(Number(row.total ?? 0))}
          </span>
        ),
      },
    ];
  }, [dayColumns]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-[2200px] p-4 md:p-6">

        {/* HEADER */}
        <div className="mb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-xl">
                  🛡️
                </div>

                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Sug'urta
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    Dilerlarning kunlik sug'urta savdolari
                  </p>
                </div>

              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">

              <button
                type="button"
                onClick={() => setImportOpen(true)}
                disabled={clearingTable}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                📥 Excel import
              </button>

              <button
                type="button"
                onClick={clearInsuranceTable}
                disabled={
                  clearingTable ||
                  importing ||
                  excelReading
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {clearingTable
                  ? "⏳ Tozalanmoqda..."
                  : "🗑 Jadvalni tozalash"}
              </button>

            </div>
          </div>
        </div>

        {/* FILTERS */}
        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">

            <div className="w-full lg:w-32">
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Yil
              </label>

              <select
                value={year}
                onChange={(e) =>
                  setYear(Number(e.target.value))
                }
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {Array.from(
                  { length: 7 },
                  (_, index) =>
                    now.getFullYear() - 3 + index
                ).map((itemYear) => (
                  <option
                    key={itemYear}
                    value={itemYear}
                  >
                    {itemYear}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full lg:w-40">
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Oy
              </label>

              <select
                value={month}
                onChange={(e) =>
                  setMonth(Number(e.target.value))
                }
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {MONTHS.map((monthName, index) => (
                  <option
                    key={monthName}
                    value={index + 1}
                  >
                    {monthName}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full lg:flex-1">
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Qidirish
              </label>

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Login, diler, kompaniya, telefon yoki hudud..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              🔄 Yangilash
            </button>

          </div>
        </section>

        {/* SUMMARY */}
       

        {/* TABLE */}
        <section className="monthly-sales overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <DataTable
            columns={columns}
            rows={filteredRows}
            loading={loading}
            error={error}
            dailyTotals={dailyTotals}
            minWidth={140 + daysInMonth * 52}
            maxHeight="70vh"
          />

        </section>

        {/* ====================================================== */}
        {/* IMPORT MODAL */}
        {/* ====================================================== */}

        {importOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

            <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">

              {/* MODAL HEADER */}
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    🛡️ Sug'urta — Excel import
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {MONTHS[month - 1]} {year}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeImportModal}
                  disabled={
                    importing || excelReading
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  ×
                </button>

              </div>

              {/* MODAL BODY */}
              <div className="max-h-[75vh] overflow-y-auto p-5">

                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">

                  <div className="mb-3 text-4xl">
                    📊
                  </div>

                  <h3 className="font-semibold text-slate-900">
                    Excel faylni tanlang
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    .xlsx, .xls yoki .csv
                  </p>

                  <label className="mt-4 inline-flex cursor-pointer items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                    📁 Fayl tanlash

                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={handleExcelChange}
                      disabled={
                        excelReading || importing
                      }
                    />
                  </label>

                  {excelFile && (
                    <div className="mt-4 rounded-xl bg-white px-4 py-3 text-left shadow-sm">

                      <div className="text-sm font-semibold text-slate-800">
                        📄 {excelFile.name}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {(excelFile.size / 1024).toFixed(1)} KB
                      </div>

                    </div>
                  )}

                </div>

                {/* STATS */}
                {importRows.length > 0 && (
                  <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs text-slate-500">
                        Excel loginlar
                      </div>

                      <div className="mt-1 text-xl font-bold text-slate-900">
                        {importRows.length}
                      </div>
                    </div>

                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="text-xs text-emerald-700">
                        Topilgan
                      </div>

                      <div className="mt-1 text-xl font-bold text-emerald-700">
                        {matchedCount}
                      </div>
                    </div>

                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                      <div className="text-xs text-red-700">
                        Topilmadi
                      </div>

                      <div className="mt-1 text-xl font-bold text-red-700">
                        {notFoundCount}
                      </div>
                    </div>

                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                      <div className="text-xs text-blue-700">
                        Umumiy summa
                      </div>

                      <div className="mt-1 text-xl font-bold text-blue-700">
                        {formatNumber(importTotal)}
                      </div>
                    </div>

                  </div>
                )}

                {/* PREVIEW */}
                {importRows.length > 0 && (
                  <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">

                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">

                      <div className="text-sm font-semibold text-slate-800">
                        Import preview
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        Birinchi 20 ta login ko'rsatilmoqda.
                      </div>

                    </div>

                    <div className="max-h-[350px] overflow-auto">

                      <table className="w-full min-w-[900px] border-collapse text-xs">

                        <thead className="sticky top-0 z-10 bg-white">

                          <tr>

                            <th className="border-b border-slate-200 px-3 py-3 text-left">
                              #
                            </th>

                            <th className="border-b border-slate-200 px-3 py-3 text-left">
                              Login
                            </th>

                            {Array.from(
                              { length: daysInMonth },
                              (_, index) => (
                                <th
                                  key={index}
                                  className="border-b border-slate-200 px-3 py-3 text-center"
                                >
                                  {index + 1}
                                </th>
                              )
                            )}

                            <th className="border-b border-slate-200 px-3 py-3 text-right">
                              Jami
                            </th>

                          </tr>

                        </thead>

                        <tbody>

                          {importRows
                            .slice(0, 20)
                            .map((row, rowIndex) => {

                              const rowTotal =
                                row.days.reduce(
                                  (sum, value) =>
                                    sum +
                                    Number(value || 0),
                                  0
                                );

                              const exists =
                                rows.some(
                                  (item) =>
                                    normalizeLogin(
                                      item.login
                                    ) ===
                                    normalizeLogin(
                                      row.login
                                    )
                                );

                              return (
                                <tr
                                  key={`${row.login}-${rowIndex}`}
                                  className="hover:bg-slate-50"
                                >

                                  <td className="border-b border-slate-100 px-3 py-2 text-slate-500">
                                    {rowIndex + 1}
                                  </td>

                                  <td
                                    className={`border-b border-slate-100 px-3 py-2 font-semibold ${
                                      exists
                                        ? "text-emerald-700"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {row.login}
                                  </td>

                                  {row.days.map(
                                    (value, index) => (
                                      <td
                                        key={index}
                                        className="border-b border-slate-100 px-3 py-2 text-center"
                                      >
                                        {value
                                          ? formatNumber(
                                              value
                                            )
                                          : "0"}
                                      </td>
                                    )
                                  )}

                                  <td className="border-b border-slate-100 px-3 py-2 text-right font-bold text-blue-700">
                                    {formatNumber(
                                      rowTotal
                                    )}
                                  </td>

                                </tr>
                              );
                            })}

                        </tbody>

                      </table>

                    </div>
                  </div>
                )}

                {excelReading && (
                  <div className="mt-5 rounded-xl bg-blue-50 p-4 text-center text-sm font-medium text-blue-700">
                    ⏳ Excel o'qilmoqda...
                  </div>
                )}

              </div>

              {/* FOOTER */}
              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={closeImportModal}
                  disabled={
                    importing || excelReading
                  }
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Bekor qilish
                </button>

                <button
                  type="button"
                  onClick={importExcel}
                  disabled={
                    !importRows.length ||
                    importing ||
                    excelReading
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {importing
                    ? "⏳ Import qilinmoqda..."
                    : "📥 Import qilish"}
                </button>

              </div>

            </div>
          </div>
        )}

      </div>
    </main>
  );
}