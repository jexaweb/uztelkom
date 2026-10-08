"use client";

import { useEffect, useState } from "react";

/** Debounce any fast-changing value (search inputs). */
export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, ms));
}

/** Read the initial value of a query param once (client-side). */
export function useInitialParam(key: string): string {
  const [value, setValue] = useState("");
  useEffect(() => {
    setValue(new URLSearchParams(window.location.search).get(key) ?? "");
  }, [key]);
  return value;
}
