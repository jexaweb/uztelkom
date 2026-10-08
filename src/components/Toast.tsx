"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cx } from "@/lib/format";

type ToastTone = "success" | "error" | "info";
type Toast = { id: number; tone: ToastTone; message: string };
type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cx(
              "animate-slide-up pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1",
              t.tone === "success" && "bg-white text-emerald-800 ring-emerald-200",
              t.tone === "error" && "bg-white text-red-800 ring-red-200",
              t.tone === "info" && "bg-white text-blue-800 ring-blue-200",
            )}
          >
            <span className="text-lg leading-none">
              {t.tone === "success" ? "✅" : t.tone === "error" ? "❌" : "ℹ️"}
            </span>
            <span className="flex-1 whitespace-pre-line">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
