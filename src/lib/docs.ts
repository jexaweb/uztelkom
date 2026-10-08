/**
 * Document control — every document has an independent status.
 */
export type DocKey = "passport" | "father" | "mother" | "consent" | "signature";

export type DocInput = {
  passport?: string | null;
  fatherPassport?: string | null;
  motherPassport?: string | null;
  consentLetter?: boolean | null;
  hasSignature?: boolean | null;
};

export type DocCheck = { key: DocKey; label: string; ok: boolean };

const filled = (v: string | null | undefined): boolean =>
  typeof v === "string" ? v.trim().length > 0 : !!v;

export function docChecks(d: DocInput): DocCheck[] {
  return [
    { key: "passport", label: "Bola pasporti", ok: filled(d.passport) },
    { key: "father", label: "Ota pasporti", ok: filled(d.fatherPassport) },
    { key: "mother", label: "Ona pasporti", ok: filled(d.motherPassport) },
    { key: "consent", label: "Ota-ona rozilik xati", ok: !!d.consentLetter },
    { key: "signature", label: "Imzo", ok: !!d.hasSignature },
  ];
}

export function missingDocs(d: DocInput): DocCheck[] {
  return docChecks(d).filter((c) => !c.ok);
}

export function hasMissingDocs(d: DocInput): boolean {
  return missingDocs(d).length > 0;
}

/** "✅ Barcha hujjatlar joyida" or "❌ 2 ta hujjat yetishmaydi" */
export function docSummary(d: DocInput): string {
  const missing = missingDocs(d).length;
  if (missing === 0) return "✅ Barcha hujjatlar joyida";
  return `❌ ${missing} ta hujjat yetishmaydi`;
}

/** Automatic Telegram message based on the actual missing document. */
export function telegramMessageFor(d: DocInput): string {
  const missing = new Set(missingDocs(d).map((c) => c.key));
  if (missing.has("passport")) {
    return "Assalomu alaykum, pasportingiz yuklanmagan.\nIltimos, pasport nusxasini yuboring.";
  }
  if (missing.has("consent")) {
    return "Assalomu alaykum, ota-ona rozilik xati talab qilinadi.\nIltimos, hujjatni yuboring.";
  }
  if (missing.has("signature")) {
    return "Assalomu alaykum, hujjatingizda imzo mavjud emas.\nIltimos, imzolangan variantini yuboring.";
  }
  if (missing.has("father") || missing.has("mother")) {
    return "Assalomu alaykum, ota-ona pasport ma'lumotlari talab qilinadi.\nIltimos, hujjatni yuboring.";
  }
  return "Assalomu alaykum! Hujjatlaringiz to'liq va qabul qilindi. Rahmat!";
}
