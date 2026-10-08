/** Parse Excel/TSV clipboard data into rows of cells. */
export function parseDelimited(text: string): string[][] {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => line.split("\t").map((cell) => cell.trim()));
}

/** Normalize a login for fuzzy matching: lowercase, drop spaces/separators. */
export function normalizeLogin(login: string): string {
  return login.toLowerCase().replace(/[\s._\-@]+/g, "");
}

/** Normalize a phone number: keep digits, drop leading 998 for comparison. */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("998")) return digits.slice(3);
  return digits;
}

/** Parse a birth date written in many formats -> yyyy-mm-dd or null. */
export function parseBirthDate(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  // dd.mm.yyyy
  let m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(v);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // yyyy-mm-dd
  m = /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/.exec(v);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}
