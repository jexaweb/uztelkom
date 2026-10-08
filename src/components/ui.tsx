"use client";

import { type ReactNode, useEffect } from "react";
import { cx, formatNumber } from "@/lib/format";

/* ------------------------------- Button ------------------------------- */
type ButtonVariant = "primary" | "secondary" | "success" | "danger" | "ghost";

export function Button({
  variant = "primary",
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
}) {
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:text-slate-400",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300",
    danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
    ghost: "text-slate-600 hover:bg-slate-100 disabled:text-slate-300",
  };
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed",
        variants[variant],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

/* ------------------------------- Spinner ------------------------------ */
export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={cx("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}

/* -------------------------------- Badge ------------------------------- */
type BadgeTone = "slate" | "green" | "red" | "orange" | "blue" | "yellow";

export function Badge({
  tone = "slate",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  const tones: Record<BadgeTone, string> = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    orange: "bg-orange-50 text-orange-700 ring-orange-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    yellow: "bg-amber-50 text-amber-700 ring-amber-200",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SmsStatusBadge({ status }: { status: string }) {
  if (status === "sent") return <Badge tone="green">Yuborildi</Badge>;
  if (status === "failed") return <Badge tone="red">Xatolik</Badge>;
  return <Badge tone="yellow">Kutilmoqda</Badge>;
}

export function InsuranceStatusBadge({ status }: { status: string }) {
  if (status === "active") return <Badge tone="blue">Faol</Badge>;
  if (status === "completed") return <Badge tone="green">Yakunlangan</Badge>;
  if (status === "cancelled") return <Badge tone="red">Bekor qilingan</Badge>;
  return <Badge tone="yellow">Kutilmoqda</Badge>;
}

export function TelegramSendBadge({ status }: { status: string }) {
  if (status === "sent") return <Badge tone="green">Yuborildi</Badge>;
  if (status === "sending") return <Badge tone="blue">Yuborilmoqda</Badge>;
  if (status === "failed") return <Badge tone="red">Xatolik</Badge>;
  return <Badge tone="slate">Yuborilmagan</Badge>;
}

export function DocOkBadge({ ok }: { ok: boolean }) {
  return ok ? <Badge tone="green">✅ BOR</Badge> : <Badge tone="red">❌ YO&lsquo;Q</Badge>;
}

/* --------------------------------- Card ------------------------------- */
export function Card({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cx("rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cx("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/* -------------------------------- Modal ------------------------------- */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="animate-fade-in fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cx(
          "animate-slide-up my-8 w-full rounded-2xl bg-white shadow-2xl",
          wide ? "max-w-4xl" : "max-w-lg",
        )}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Yopish"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">{footer}</footer>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Forms ------------------------------- */
export function Field({
  label,
  required,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

const controlCx =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none disabled:bg-slate-50";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(controlCx, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(controlCx, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(controlCx, props.className)} />;
}

/* ------------------------------ Empty state --------------------------- */
export function EmptyState({ text = "Ma'lumot topilmadi.", hint }: { text?: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-4 py-12 text-center">
      <div className="text-3xl">🗂️</div>
      <p className="text-sm font-medium text-slate-600">{text}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

/* ----------------------------- Skeleton rows -------------------------- */
export function SkeletonRows({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-slate-100">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-3 py-3">
              <div
                className="h-4 animate-pulse rounded bg-slate-100"
                style={{ width: `${45 + ((r * 7 + c * 13) % 50)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ----------------------------- Pagination ----------------------------- */
export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-3">
      <p className="text-sm text-slate-500">
        {formatNumber(from)}–{formatNumber(to)} / jami {formatNumber(total)}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="secondary" onClick={() => onPage(page - 1)} disabled={page <= 1}>
          ← Oldingi
        </Button>
        <span className="px-2 text-sm text-slate-600">
          {page} / {pages}
        </span>
        <Button variant="secondary" onClick={() => onPage(page + 1)} disabled={page >= pages}>
          Keyingi →
        </Button>
      </div>
    </div>
  );
}

/* ----------------------------- Page header ---------------------------- */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
