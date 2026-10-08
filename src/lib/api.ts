import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function getStr(sp: URLSearchParams, key: string, def = ""): string {
  const v = sp.get(key);
  return v === null ? def : v.trim();
}

export function getInt(sp: URLSearchParams, key: string, def: number): number {
  const v = Number(sp.get(key));
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : def;
}
