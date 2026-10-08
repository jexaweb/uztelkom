"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DataTable,
  type Column,
} from "@/components/DataTable";

import {
  Button,
  Card,
  Modal,
  PageHeader,
} from "@/components/ui";

import { useToast } from "@/components/Toast";
import { formatNumber } from "@/lib/format";

/* =========================================================
   TYPES
========================================================= */

type SalesDay = {
  day: number;
  amount: number;
};

type ImportRow = {
  login: string;
  days: SalesDay[];
};

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

/* =========================================================
   MONTHS
========================================================= */

const MONTHS = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentyabr",
  "Oktyabr",
  "Noyabr",
  "Dekabr",
];

/* =========================================================
   HELPERS
========================================================= */

function normalizeLogin(value: unknown): string {
  return String(value ?? "")
    .replace(/\uFEFF/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-./\\]+/g, "");
}

function parseAmount(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value === "string" &&
    value.trim() === ""
  ) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? Math.trunc(value)
      : null;
  }

  const text = String(value)
    .replace(/\u00A0/g, "")
    .replace(/\s/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.-]/g, "");

  if (!text) return null;

  const number = Number(text);

  if (!Number.isFinite(number)) {
    return null;
  }

  return Math.trunc(number);
}

function isLoginHeader(value: unknown): boolean {
  const text = normalizeLogin(value);

  return (
    text === "login" ||
    text === "логин" ||
    text === "loginlar" ||
    text === "dilerlogin" ||
    text === "dealerlogin" ||
    text.includes("login") ||
    text.includes("логин")
  );
}

function getDayFromHeader(
  value: unknown
): number | null {
  const text = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!text) return null;

  const match = text.match(
    /^(?:kun|day)?\s*(\d{1,2})$/
  );

  if (!match) return null;

  const day = Number(match[1]);

  if (
    !Number.isInteger(day) ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return day;
}

function getDaysInMonth(
  year: number,
  month: number
): number {
  return new Date(year, month, 0).getDate();
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function MainTablePage() {
  const toast = useToast();

  const now = new Date();

  /* =======================================================
     SEARCH
  ======================================================= */

  const [search, setSearch] = useState("");

  /* =======================================================
     MAIN TABLE STATE
  ======================================================= */

  const [year, setYear] = useState(
    now.getFullYear()
  );

  const [month, setMonth] = useState(
    now.getMonth() + 1
  );

  const [rows, setRows] = useState<SalesRow[]>(
    []
  );

  const [daysInMonth, setDaysInMonth] =
    useState(
      getDaysInMonth(
        now.getFullYear(),
        now.getMonth() + 1
      )
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  /* =======================================================
     CLEAR
  ======================================================= */

  const [
    clearingTable,
    setClearingTable,
  ] = useState(false);

  /* =======================================================
     EXCEL
  ======================================================= */

  const [
    importOpen,
    setImportOpen,
  ] = useState(false);

  const [
    excelFile,
    setExcelFile,
  ] = useState<File | null>(null);

  const [
    importRows,
    setImportRows,
  ] = useState<ImportRow[]>([]);

  const [
    importing,
    setImporting,
  ] = useState(false);

  const [
    excelReading,
    setExcelReading,
  ] = useState(false);

  /* =======================================================
     LOAD
  ======================================================= */

  const load = useCallback(
    async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/sales?year=${year}&month=${month}&type=sms`,
          {
            cache: "no-store",
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.error ?? "Ma'lumotlarni yuklab bo'lmadi."
          );
        }

        setRows(
          Array.isArray(data.rows)
            ? data.rows
            : []
        );

        setDaysInMonth(
          data.daysInMonth ??
            getDaysInMonth(year, month)
        );
      } catch (error) {
        console.error(
          "LOAD SALES ERROR:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Ma'lumotlarni yuklab bo'lmadi."
        );
      } finally {
        setLoading(false);
      }
    },
    [year, month]
  );

  useEffect(() => {
    load();
  }, [load]);

  /* =======================================================
     SEARCH FILTER
  ======================================================= */

  const filteredRows = useMemo(() => {
    const q = search
      .trim()
      .toLowerCase();

    if (!q) {
      return rows;
    }

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

  /* =======================================================
     CLEAR MAIN TABLE
  ======================================================= */

  const clearMainTable = async () => {
    if (
      clearingTable ||
      importing ||
      excelReading
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "⚠️ DIQQAT!\n\n" +
          "Asosiy jadvaldagi BARCHA sotuv ma'lumotlari o'chiriladi.\n\n" +
          "Dilerlar bazasi o'chirilmaydi.\n\n" +
          "Bu amalni ortga qaytarib bo'lmaydi.\n\n" +
          "Jadvalni tozalashni tasdiqlaysizmi?"
      );

    if (!confirmed) return;

    setClearingTable(true);

    try {
      const res = await fetch(
        "/api/sales?type=sms",
        {
          method: "DELETE",
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ??
            "Jadvalni tozalashda xatolik yuz berdi."
        );
      }

      toast.success(
        `✅ Jadval tozalandi. ${
          data.deleted ?? 0
        } ta yozuv o'chirildi.`
      );

      await load();
    } catch (error) {
      console.error(
        "CLEAR MAIN TABLE ERROR:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "❌ Jadvalni tozalab bo'lmadi."
      );
    } finally {
      setClearingTable(false);
    }
  };

  /* =======================================================
     EXCEL FILE
  ======================================================= */

  const handleExcelFile = async (
    file: File
  ) => {
    setExcelReading(true);

    try {
      const fileName =
        file.name.toLowerCase();

      const allowed =
        fileName.endsWith(".xlsx") ||
        fileName.endsWith(".xls") ||
        fileName.endsWith(".csv");

      if (!allowed) {
        throw new Error(
          "Faqat .xlsx, .xls yoki .csv fayl yuklash mumkin."
        );
      }

      const XLSX =
        await import("xlsx");

      const buffer =
        await file.arrayBuffer();

      const workbook =
        XLSX.read(buffer, {
          type: "array",
          cellDates: false,
        });

      if (
        !workbook.SheetNames ||
        workbook.SheetNames.length === 0
      ) {
        throw new Error(
          "Excel faylda sheet topilmadi."
        );
      }

      const sheet =
        workbook.Sheets[
          workbook.SheetNames[0]
        ];

      const matrix =
        XLSX.utils.sheet_to_json(
          sheet,
          {
            header: 1,
            defval: "",
            raw: true,
          }
        ) as unknown[][];

      if (matrix.length === 0) {
        throw new Error(
          "Excel fayl bo'sh."
        );
      }

      /* ===================================================
         LOGIN COLUMN
      =================================================== */

      let headerRowIndex = -1;
      let loginColumnIndex = -1;

      const maxHeaderRows =
        Math.min(
          matrix.length,
          15
        );

      for (
        let rowIndex = 0;
        rowIndex < maxHeaderRows;
        rowIndex++
      ) {
        const row =
          matrix[rowIndex] ?? [];

        for (
          let columnIndex = 0;
          columnIndex < row.length;
          columnIndex++
        ) {
          if (
            isLoginHeader(
              row[columnIndex]
            )
          ) {
            headerRowIndex =
              rowIndex;

            loginColumnIndex =
              columnIndex;

            break;
          }
        }

        if (
          loginColumnIndex !== -1
        ) {
          break;
        }
      }

      /* ===================================================
         IF LOGIN HEADER NOT FOUND
      =================================================== */

      if (
        loginColumnIndex === -1
      ) {
        const dealerLogins =
          new Set(
            rows
              .map((row) =>
                normalizeLogin(
                  row.login
                )
              )
              .filter(Boolean)
          );

        let bestColumn = -1;
        let bestMatches = 0;

        const rowsToCheck =
          Math.min(
            matrix.length,
            30
          );

        const maxColumns =
          Math.max(
            ...matrix
              .slice(
                0,
                rowsToCheck
              )
              .map(
                (row) =>
                  row.length
              ),
            0
          );

        for (
          let columnIndex = 0;
          columnIndex < maxColumns;
          columnIndex++
        ) {
          let matches = 0;

          for (
            let rowIndex = 0;
            rowIndex < rowsToCheck;
            rowIndex++
          ) {
            const value =
              normalizeLogin(
                matrix[rowIndex]?.[
                  columnIndex
                ]
              );

            if (
              value &&
              dealerLogins.has(value)
            ) {
              matches++;
            }
          }

          if (
            matches > bestMatches
          ) {
            bestMatches =
              matches;

            bestColumn =
              columnIndex;
          }
        }

        if (
          bestColumn !== -1 &&
          bestMatches > 0
        ) {
          loginColumnIndex =
            bestColumn;

          headerRowIndex = -1;
        }
      }

      if (
        loginColumnIndex === -1
      ) {
        throw new Error(
          "Excel fayldan Login ustuni topilmadi. Excelda Login yoki Логин ustuni bo'lishi kerak."
        );
      }

      /* ===================================================
         DATA START
      =================================================== */

      const dataStartIndex =
        headerRowIndex >= 0
          ? headerRowIndex + 1
          : 0;

      /* ===================================================
         DAY COLUMNS
      =================================================== */

      const dayColumnMap =
        new Map<
          number,
          number
        >();

      if (
        headerRowIndex >= 0
      ) {
        const header =
          matrix[
            headerRowIndex
          ] ?? [];

        for (
          let columnIndex = 0;
          columnIndex <
          header.length;
          columnIndex++
        ) {
          if (
            columnIndex ===
            loginColumnIndex
          ) {
            continue;
          }

          const day =
            getDayFromHeader(
              header[columnIndex]
            );

          if (
            day !== null &&
            day <= daysInMonth
          ) {
            dayColumnMap.set(
              day,
              columnIndex
            );
          }
        }
      }

      /* ===================================================
         NUMERIC COLUMNS
      =================================================== */

      if (
        dayColumnMap.size === 0
      ) {
        const maxColumns =
          Math.max(
            ...matrix
              .slice(
                dataStartIndex,
                Math.min(
                  matrix.length,
                  dataStartIndex + 30
                )
              )
              .map(
                (row) =>
                  row.length
              ),
            0
          );

        let dayNumber = 1;

        for (
          let columnIndex = 0;
          columnIndex < maxColumns &&
          dayNumber <= daysInMonth;
          columnIndex++
        ) {
          if (
            columnIndex ===
            loginColumnIndex
          ) {
            continue;
          }

          let numericCount = 0;
          let nonEmptyCount = 0;

          for (
            let rowIndex =
              dataStartIndex;
            rowIndex <
              Math.min(
                matrix.length,
                dataStartIndex + 30
              );
            rowIndex++
          ) {
            const value =
              matrix[rowIndex]?.[
                columnIndex
              ];

            if (
              value === "" ||
              value === null ||
              value === undefined
            ) {
              continue;
            }

            nonEmptyCount++;

            if (
              parseAmount(value) !== null
            ) {
              numericCount++;
            }
          }

          if (
            nonEmptyCount > 0 &&
            numericCount >=
              Math.max(
                1,
                Math.floor(
                  nonEmptyCount *
                    0.5
                )
              )
          ) {
            dayColumnMap.set(
              dayNumber,
              columnIndex
            );

            dayNumber++;
          }
        }
      }

      if (
        dayColumnMap.size === 0
      ) {
        throw new Error(
          "Excelda kunlar ustunlari topilmadi."
        );
      }

      /* ===================================================
         PARSE ROWS
      =================================================== */

      const parsed: ImportRow[] =
        [];

      for (
        const cells of matrix.slice(
          dataStartIndex
        )
      ) {
        const login =
          String(
            cells[
              loginColumnIndex
            ] ?? ""
          ).trim();

        if (!login) {
          continue;
        }

        const days: SalesDay[] =
          [];

        for (
          const [
            day,
            columnIndex,
          ] of dayColumnMap.entries()
        ) {
          if (
            day > daysInMonth
          ) {
            continue;
          }

          const amount =
            parseAmount(
              cells[columnIndex]
            );

          if (
            amount === null
          ) {
            continue;
          }

          days.push({
            day,
            amount,
          });
        }

        parsed.push({
          login,
          days,
        });
      }

      if (
        parsed.length === 0
      ) {
        throw new Error(
          "Excel faylda diler loginlari topilmadi."
        );
      }

      /* ===================================================
         GROUP DUPLICATE LOGINS
      =================================================== */

      const grouped =
        new Map<
          string,
          {
            login: string;
            days: Map<
              number,
              number
            >;
          }
        >();

      for (
        const row of parsed
      ) {
        const key =
          normalizeLogin(
            row.login
          );

        const existing =
          grouped.get(key);

        if (!existing) {
          const dayMap =
            new Map<
              number,
              number
            >();

          for (
            const item of row.days
          ) {
            dayMap.set(
              item.day,
              item.amount
            );
          }

          grouped.set(
            key,
            {
              login:
                row.login.trim(),
              days: dayMap,
            }
          );

          continue;
        }

        for (
          const item of row.days
        ) {
          existing.days.set(
            item.day,
            (existing.days.get(
              item.day
            ) ?? 0) +
              item.amount
          );
        }
      }

      /* ===================================================
         FINAL ROWS
      =================================================== */

      const finalRows: ImportRow[] =
        Array.from(
          grouped.values()
        ).map((item) => ({
          login: item.login,
          days: Array.from(
            item.days.entries()
          )
            .sort(
              (a, b) =>
                a[0] - b[0]
            )
            .map(
              ([
                day,
                amount,
              ]) => ({
                day,
                amount,
              })
            ),
        }));

      setExcelFile(file);
      setImportRows(
        finalRows
      );

      toast.success(
        `✅ Excel o'qildi. ${finalRows.length} ta login topildi.`
      );
    } catch (error) {
      console.error(
        "EXCEL READ ERROR:",
        error
      );

      setExcelFile(null);
      setImportRows([]);

      toast.error(
        error instanceof Error
          ? error.message
          : "Excel faylni o'qib bo'lmadi."
      );
    } finally {
      setExcelReading(false);
    }
  };

  /* =======================================================
     IMPORT
  ======================================================= */

  const runImport = async () => {
    if (
      importRows.length === 0
    ) {
      toast.error(
        "Avval Excel fayl tanlang."
      );

      return;
    }

    setImporting(true);

    try {
      const res = await fetch(
        "/api/sales/import",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            year,
            month,
            type: "sms",
            rows: importRows,
          }),
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ??
            "Import xatosi."
        );
      }

      const warnings =
        Array.isArray(
          data.warnings
        )
          ? data.warnings
          : [];

      let message =
        `✅ Excel import tugadi.\n` +
        `Mos kelgan: ${
          data.imported ?? 0
        }\n` +
        `Saqlangan kunlik yozuvlar: ${
          data.writtenRecords ?? 0
        }\n` +
        `O'tkazib yuborilgan: ${
          data.skipped ?? 0
        }`;

      if (
        warnings.length > 0
      ) {
        message +=
          "\n\n" +
          warnings
            .slice(0, 5)
            .join("\n");

        if (
          warnings.length > 5
        ) {
          message +=
            `\n... yana ${
              warnings.length - 5
            } ta ogohlantirish`;
        }
      }

      toast.success(
        message
      );

      setImportOpen(false);
      setExcelFile(null);
      setImportRows([]);

      await load();
    } catch (error) {
      console.error(
        "IMPORT ERROR:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "❌ Import bajarilmadi."
      );
    } finally {
      setImporting(false);
    }
  };

  /* =======================================================
     CLEAR EXCEL
  ======================================================= */

  const clearExcel = () => {
    if (importing) {
      return;
    }

    setExcelFile(null);
    setImportRows([]);
  };

  /* =======================================================
     DEALER ORDER
  ======================================================= */

  const dealerOrder =
    useMemo(() => {
      const map =
        new Map<
          string,
          number
        >();

      rows.forEach(
        (row, index) => {
          map.set(
            normalizeLogin(
              row.login
            ),
            index
          );
        }
      );

      return map;
    }, [rows]);

  /* =======================================================
     SORT IMPORT
  ======================================================= */

  const sortedImportRows =
    useMemo(() => {
      return [
        ...importRows,
      ].sort((a, b) => {
        const aIndex =
          dealerOrder.get(
            normalizeLogin(
              a.login
            )
          ) ?? 999999;

        const bIndex =
          dealerOrder.get(
            normalizeLogin(
              b.login
            )
          ) ?? 999999;

        return (
          aIndex - bIndex
        );
      });
    }, [
      importRows,
      dealerOrder,
    ]);

  /* =======================================================
     DEALER LOGIN SET
  ======================================================= */

  const dealerLoginSet =
    useMemo(() => {
      return new Set(
        rows.map((row) =>
          normalizeLogin(
            row.login
          )
        )
      );
    }, [rows]);

  /* =======================================================
     MATCH COUNT
  ======================================================= */

  const matchedCount =
    importRows.filter(
      (row) =>
        dealerLoginSet.has(
          normalizeLogin(
            row.login
          )
        )
    ).length;

  const notFoundCount =
    importRows.length -
    matchedCount;

  /* =======================================================
     IMPORT TOTAL
  ======================================================= */

  const importTotal =
    importRows.reduce(
      (total, row) =>
        total +
        row.days.reduce(
          (
            sum,
            day
          ) =>
            sum +
            Number(
              day.amount || 0
            ),
          0
        ),
      0
    );

  /* =======================================================
     DAY COLUMNS
  ======================================================= */

  const dayColumns:
    Column<SalesRow>[] =
    Array.from(
      {
        length:
          daysInMonth,
      },
      (_, i) => ({
        key: `day-${i + 1}`,
        label: `Kun ${
          i + 1
        }`,
        className:
          "text-center",
        render: (
          row
        ) => {
          const value =
            row.days[i] ?? 0;

          return value ? (
            <span className="font-medium text-slate-800">
              {formatNumber(
                value
              )}
            </span>
          ) : (
            <span className="text-slate-300">
              0
            </span>
          );
        },
      })
    );

  /* =======================================================
     TABLE COLUMNS
  ======================================================= */

  const columns:
    Column<SalesRow>[] =
    [
      {
        key: "idx",
        label: "#",
        render: (
          _,
          index
        ) => (
          <span className="text-slate-400">
            {index + 1}
          </span>
        ),
      },

      {
        key: "region",
        label: "Hudud",
        render: (
          row
        ) =>
          row.region ||
          "—",
      },

      {
        key: "login",
        label: "Login",
        render: (
          row
        ) => (
          <span className="font-mono text-xs font-semibold text-slate-600">
            {row.login}
          </span>
        ),
      },

      {
        key: "name",
        label: "Diler",
        render: (
          row
        ) => (
          <span className="font-medium text-slate-900">
            {row.name}
          </span>
        ),
      },

      {
        key: "company",
        label: "Kompaniya",
        render: (
          row
        ) =>
          row.company ||
          "—",
      },

      {
        key: "phone",
        label: "Telefon",
        render: (
          row
        ) =>
          row.phone ||
          "—",
      },

      ...dayColumns,

      {
        key: "total",
        label: "Jami",
        render: (
          row
        ) => (
          <span className="font-bold text-blue-700">
            {formatNumber(
              row.total
            )}
          </span>
        ),
      },
    ];

  /* =======================================================
     DAILY TOTALS
  ======================================================= */

  const dailyTotals =
    useMemo(() => {
      return Array.from(
        {
          length:
            daysInMonth,
        },
        (_, dayIndex) => {
          return rows.reduce(
            (
              sum,
              row
            ) =>
              sum +
              Number(
                row.days[
                  dayIndex
                ] ?? 0
              ),
            0
          );
        }
      );
    }, [
      rows,
      daysInMonth,
    ]);

  /* =======================================================
     GRAND TOTAL
  ======================================================= */

  const grandTotal =
    rows.reduce(
      (
        sum,
        row
      ) =>
        sum +
        Number(
          row.total || 0
        ),
      0
    );

  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <div className="space-y-5">

      {/* =================================================
          HEADER
      ================================================= */}

      <PageHeader
        title="📊 Asosiy jadval"
        description="Kunlik sotuvlar — dilerlar bazasi asosida."
        actions={
          <div className="flex flex-wrap items-center gap-2">

         

      

            {/* EXCEL */}

            <Button
              onClick={() =>
                setImportOpen(true)
              }
              disabled={
                clearingTable
              }
            >
              📥 Excel import
            </Button>

            {/* CLEAR */}

            <Button
              variant="secondary"
              onClick={
                clearMainTable
              }
              disabled={
                clearingTable ||
                importing ||
                excelReading
              }
              loading={
                clearingTable
              }
            >
              🗑 Jadvalni tozalash
            </Button>
          </div>
        }
      />

      {/* =================================================
          FILTERS
      ================================================= */}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">

          {/* YEAR */}

          <div className="w-full lg:w-32">

            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
              Yil
            </label>

            <select
              value={year}
              onChange={(e) =>
                setYear(
                  Number(
                    e.target.value
                  )
                )
              }
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {Array.from(
                {
                  length: 7,
                },
                (_, index) =>
                  now.getFullYear() -
                  3 +
                  index
              ).map(
                (itemYear) => (
                  <option
                    key={
                      itemYear
                    }
                    value={
                      itemYear
                    }
                  >
                    {itemYear}
                  </option>
                )
              )}
            </select>
          </div>

          {/* MONTH */}

          <div className="w-full lg:w-40">

            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
              Oy
            </label>

            <select
              value={month}
              onChange={(e) =>
                setMonth(
                  Number(
                    e.target.value
                  )
                )
              }
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {MONTHS.map(
                (
                  monthName,
                  index
                ) => (
                  <option
                    key={
                      monthName
                    }
                    value={
                      index + 1
                    }
                  >
                    {
                      monthName
                    }
                  </option>
                )
              )}
            </select>
          </div>

          {/* SEARCH */}

          <div className="w-full lg:flex-1">

            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
              Qidirish
            </label>

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Login, diler, kompaniya, telefon yoki hudud..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* REFRESH */}

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            🔄 Yangilash
          </button>

        </div>

        {/* SEARCH RESULT */}

        {search.trim() && (
          <div className="mt-3 text-xs text-slate-500">
            Qidiruv natijasi:{" "}
            <b className="text-slate-800">
              {filteredRows.length}
            </b>{" "}
            ta diler
          </div>
        )}

      </section>


     

      {/* =================================================
          TABLE
      ================================================= */}

      <Card
        className="monthly-sales overflow-hidden bg-white shadow-sm"
        bodyClassName="p-0"
      >
        <DataTable
          columns={columns}
          rows={filteredRows}
          loading={loading}
          error={error}
          dailyTotals={
            dailyTotals
          }
          minWidth={
            140 +
            daysInMonth * 52
          }
          maxHeight="70vh"
        />
      </Card>

      {/* =================================================
          EXCEL IMPORT MODAL
      ================================================= */}

      <Modal
        open={importOpen}
        title="📥 Excel import — Asosiy jadval"
        wide
        onClose={() => {
          if (!importing) {
            setImportOpen(false);
          }
        }}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={
                importing
              }
              onClick={() =>
                setImportOpen(
                  false
                )
              }
            >
              Bekor qilish
            </Button>

            <Button
              loading={
                importing
              }
              disabled={
                importRows.length ===
                  0 ||
                excelReading
              }
              onClick={
                runImport
              }
            >
              Import qilish (
              {
                importRows.length
              }
              )
            </Button>
          </>
        }
      >

        {/* INFO */}

        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4">

          <p className="font-semibold text-blue-900">
            📊 Excel formati
          </p>

          <p className="mt-2 text-sm text-blue-800">
            Tizim Excel ichidan{" "}
            <b>
              Login / Логин
            </b>{" "}
            ustunini avtomatik
            topadi.
          </p>

          <p className="mt-1 text-sm text-blue-800">
            Hudud, ism,
            kompaniya kabi
            ustunlar login
            sifatida olinmaydi.
          </p>

          <p className="mt-1 text-sm text-blue-800">
            Kun ustunlari:{" "}
            <b>
              Kun 1, Kun 2,
              ... Kun 31
            </b>
          </p>

          <p className="mt-3 text-xs text-blue-700">
            ⚡ Exceldagi qator
            tartibi muhim emas.
            Ma'lumotlar dilerning
            loginiga qarab
            bazadagi to'g'ri
            dilerga yoziladi.
          </p>

        </div>

        {/* FILE INPUT */}

        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition hover:border-blue-400 hover:bg-blue-50">

          <input
            id="excel-upload"
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            disabled={
              importing ||
              excelReading
            }
            onChange={(e) => {
              const file =
                e.target.files?.[0];

              if (file) {
                handleExcelFile(
                  file
                );
              }

              e.currentTarget.value =
                "";
            }}
          />

          <label
            htmlFor="excel-upload"
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 ${
              importing ||
              excelReading
                ? "pointer-events-none opacity-50"
                : ""
            }`}
          >
            📁 Excel fayl tanlash
          </label>

          <p className="mt-3 text-xs text-slate-500">
            .xlsx, .xls yoki
            .csv
          </p>

          {/* READING */}

          {excelReading && (
            <div className="mt-4 rounded-lg bg-blue-100 px-4 py-3 text-sm font-medium text-blue-700">
              ⏳ Excel fayl
              o'qilmoqda...
            </div>
          )}

          {/* FILE INFO */}

          {excelFile &&
            !excelReading && (
              <div className="mx-auto mt-5 max-w-xl rounded-xl border border-green-200 bg-white p-4 text-left shadow-sm">

                <div className="flex items-center justify-between gap-3">

                  <div className="flex min-w-0 items-center gap-3">

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-green-100 text-xl">
                      📊
                    </div>

                    <div className="min-w-0">

                      <p className="truncate font-semibold text-slate-800">
                        {
                          excelFile.name
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {(
                          excelFile.size /
                          1024
                        ).toFixed(
                          1
                        )}{" "}
                        KB
                        {" · "}
                        {
                          importRows.length
                        }{" "}
                        ta login
                      </p>

                    </div>

                  </div>

                  <button
                    type="button"
                    disabled={
                      importing
                    }
                    onClick={
                      clearExcel
                    }
                    className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    ✕
                  </button>

                </div>

              </div>
            )}

        </div>

        {/* =================================================
            STATISTICS
        ================================================= */}

        {importRows.length >
          0 && (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">
                Excel loginlar
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {
                  importRows.length
                }
              </p>
            </div>

            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-xs font-medium text-green-700">
                Bazada topildi
              </p>

              <p className="mt-1 text-2xl font-bold text-green-700">
                {
                  matchedCount
                }
              </p>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-medium text-red-700">
                Bazada topilmadi
              </p>

              <p className="mt-1 text-2xl font-bold text-red-700">
                {
                  notFoundCount
                }
              </p>
            </div>

          </div>
        )}

        {/* =================================================
            IMPORT TOTAL
        ================================================= */}

        {importRows.length >
          0 && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">

            <div className="flex items-center justify-between">

              <span className="text-sm text-slate-600">
                Excel ma'lumotlari
                jami
              </span>

              <span className="text-lg font-bold text-blue-700">
                {formatNumber(
                  importTotal
                )}
              </span>

            </div>

          </div>
        )}

        {/* =================================================
            PREVIEW
        ================================================= */}

        {sortedImportRows.length >
          0 && (
          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">

            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">

              <p className="font-semibold text-slate-800">
                📋 Import preview
              </p>

              <p className="text-xs text-slate-500">
                Login bo'yicha
                moslashtirilgan
                tartib
              </p>

            </div>

            <div className="max-h-80 overflow-auto">

              <table className="w-full text-sm">

                <thead className="sticky top-0 z-10 bg-white">

                  <tr className="border-b border-slate-200">

                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
                      #
                    </th>

                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
                      Login
                    </th>

                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">
                      Holat
                    </th>

                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">
                      Kunlar
                    </th>

                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">
                      Jami
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {sortedImportRows
                    .slice(0, 100)
                    .map(
                      (
                        row,
                        index
                      ) => {

                        const matched =
                          dealerLoginSet.has(
                            normalizeLogin(
                              row.login
                            )
                          );

                        const total =
                          row.days.reduce(
                            (
                              sum,
                              item
                            ) =>
                              sum +
                              Number(
                                item.amount ||
                                  0
                              ),
                            0
                          );

                        return (
                          <tr
                            key={`${row.login}-${index}`}
                            className="border-b border-slate-100 last:border-0"
                          >

                            <td className="px-3 py-2 text-slate-400">
                              {
                                index +
                                1
                              }
                            </td>

                            <td className="px-3 py-2">
                              <span className="font-mono text-xs font-semibold text-slate-700">
                                {
                                  row.login
                                }
                              </span>
                            </td>

                            <td className="px-3 py-2 text-center">

                              {matched ? (
                                <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                                  ✓ Topildi
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                                  ✕ Topilmadi
                                </span>
                              )}

                            </td>

                            <td className="px-3 py-2 text-center text-slate-600">
                              {
                                row.days
                                  .length
                              }
                            </td>

                            <td className="px-3 py-2 text-right font-semibold text-slate-800">
                              {formatNumber(
                                total
                              )}
                            </td>

                          </tr>
                        );
                      }
                    )}

                </tbody>

              </table>

            </div>

            {sortedImportRows.length >
              100 && (
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
                Birinchi 100 ta
                login ko'rsatilmoqda.
                Jami{" "}
                {
                  sortedImportRows.length
                }{" "}
                ta login.
              </div>
            )}

          </div>
        )}

        {/* =================================================
            EMPTY
        ================================================= */}

        {!excelFile &&
          importRows.length ===
            0 &&
          !excelReading && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">

              <div className="text-3xl">
                📊
              </div>

              <p className="mt-2 font-semibold text-slate-700">
                Excel fayl
                tanlanmagan
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Yuqoridagi{" "}
                <b>
                  Excel fayl
                  tanlash
                </b>{" "}
                tugmasini bosib
                faylni yuklang.
              </p>

            </div>
          )}

      </Modal>
    </div>
  );
}