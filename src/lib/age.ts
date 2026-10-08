/**
 * Correct age calculation using full birth date (year + month + day).
 * 17 years 11 months -> 17 (UNDER 18)
 * 18 years 0 months  -> 18 (ADULT)
 */
export function calculateAge(birthDate: string | Date | null | undefined): number | null {
  if (!birthDate) return null;
  const b = birthDate instanceof Date ? new Date(birthDate) : parseDateOnly(birthDate);
  if (!b || Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const monthDiff = now.getMonth() - b.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < b.getDate())) {
    age -= 1;
  }
  return age < 0 ? 0 : age;
}

export function isUnder18(birthDate: string | Date | null | undefined): boolean {
  const age = calculateAge(birthDate);
  return age !== null && age < 18;
}

/** Parse "YYYY-MM-DD" as local midnight to avoid timezone day shifts. */
export function parseDateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "17 yosh 11 oy" style label. */
export function ageLabel(birthDate: string | Date | null | undefined): string {
  if (!birthDate) return "—";
  const b = birthDate instanceof Date ? new Date(birthDate) : parseDateOnly(birthDate);
  if (!b || Number.isNaN(b.getTime())) return "—";
  const now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} oy`;
  if (rest === 0) return `${years} yosh`;
  return `${years} yosh ${rest} oy`;
}
