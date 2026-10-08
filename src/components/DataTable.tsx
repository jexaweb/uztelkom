"use client";

import { type ReactNode } from "react";
import { cx, formatNumber } from "@/lib/format";
import { EmptyState, SkeletonRows } from "./ui";

export type Column<T> = {
  key: string;
  label: string;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
};

/**
 * Professional data table:
 * sticky header, horizontal scroll,
 * loading skeleton, empty and error states.
 */
export function DataTable<T>({
  columns,
  rows,
  loading = false,
  emptyText = "Ma'lumot topilmadi.",
  emptyHint,
  error,
  skeletonRows = 6,
  minWidth = 960,
  maxHeight = "65vh",
  footer,
  dailyTotals = [],
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  emptyText?: string;
  emptyHint?: string;
  error?: string | null;
  skeletonRows?: number;
  minWidth?: number;
  maxHeight?: string;
  footer?: ReactNode;

  // Kunlik jami
  dailyTotals?: number[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-auto" style={{ maxHeight }}>
        <table
          className="w-full border-collapse text-sm"
          style={{ minWidth }}
        >
          {/* HEADER */}
          <thead>
            <tr>
              {columns.map((column) => {
                const key = String(column.key);

                // day-1, day-2, day-3 ...
                const dayMatch = key.match(/^day-(\d+)$/);

                const dayNumber = dayMatch
                  ? Number(dayMatch[1])
                  : null;

                const dailyTotal =
                  dayNumber !== null
                    ? dailyTotals[dayNumber - 1] ?? 0
                    : null;

                return (
                  <th
                    key={key}
                    className={cx(
                      "sticky top-0 z-20 border-b border-slate-200 bg-white px-3 py-3 text-left text-xs font-semibold text-slate-600",
                      column.className
                    )}
                  >
                    {dayNumber !== null ? (
                      <div className="flex flex-col items-center justify-center leading-tight">
                        {/* KUN */}
                        <span className="text-xs font-semibold text-slate-700">
                          Kun {dayNumber}
                        </span>

                        {/* KUNLIK JAMI */}
                        <span className="mt-1 text-[11px] font-bold text-blue-600">
                          {formatNumber(dailyTotal)}
                        </span>
                      </div>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* BODY */}
          <tbody>
            {loading ? (
              <SkeletonRows
                rows={skeletonRows}
                cols={columns.length}
              />
            ) : error ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    text={error}
                    hint="Sahifani yangilab qayta urinib ko'ring."
                  />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    text={emptyText}
                    hint={emptyHint}
                  />
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={
                    (row as { id?: number | string }).id ?? i
                  }
                  className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70"
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cx(
                        "px-3 py-2.5 align-top text-slate-700",
                        c.className
                      )}
                    >
                      {c.render
                        ? c.render(row, i)
                        : String(
                            (row as Record<string, unknown>)[
                              c.key
                            ] ?? ""
                          )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {footer && (
        <div className="border-t border-slate-100 px-4">
          {footer}
        </div>
      )}
    </div>
  );
}