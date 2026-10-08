import { db } from "@/db";
import { eq } from "drizzle-orm";
import { customers, telegramMessages } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";
import { telegramMessageFor } from "@/lib/docs";
import { normalizePhone } from "@/lib/paste";

export const dynamic = "force-dynamic";

type ImportRow = {
  passport?: string;
  birthDate?: string | null;
  fullName?: string;
  telegram?: string;
  telegramId?: string;
  company?: string;
  phone?: string;
  idr?: string;
  source?: string;
};

/**
 * Excel/paste import for the Telegram workflow.
 * Matches existing customers by passport or phone, otherwise creates a new
 * customer record — never duplicates silently.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { rows?: ImportRow[] } | null;
    const rows = Array.isArray(body?.rows) ? body!.rows! : [];
    if (rows.length === 0) return jsonError("Import qilish uchun ma'lumot topilmadi.");

    const warnings: string[] = [];
    let imported = 0;
    let createdCustomers = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const passport = (row.passport ?? "").trim();
      const phone = (row.phone ?? "").trim();
      const norm = normalizePhone(phone);

      if (!passport && !norm) {
        skipped += 1;
        warnings.push(`Qator ${i + 1}: passport va telefon raqam ko'rsatilmagan — o'tkazib yuborildi.`);
        continue;
      }

      // match existing customer
      let customer: (typeof customers.$inferSelect) | null = null;
      if (passport) {
        const [found] = await db
          .select()
          .from(customers)
          .where(eq(customers.passport, passport))
          .limit(1);
        customer = found ?? null;
      }
      if (!customer && phone) {
        const [found] = await db
          .select()
          .from(customers)
          .where(eq(customers.phone, phone))
          .limit(1);
        customer = found ?? null;
      }

      if (!customer) {
        const [created] = await db
          .insert(customers)
          .values({
            fullName: (row.fullName ?? "").trim(),
            phone,
            birthDate: row.birthDate ?? null,
            passport,
            telegram: (row.telegram ?? "").trim(),
            telegramId: (row.telegramId ?? "").trim(),
            idr: (row.idr ?? "").trim(),
            source: (row.source ?? "").trim(),
          })
          .returning();
        customer = created;
        createdCustomers += 1;
      }

      const flags = {
        passport: customer.passport,
        fatherPassport: customer.fatherPassport,
        motherPassport: customer.motherPassport,
        consentLetter: customer.consentLetter,
        hasSignature: customer.hasSignature,
      };

      await db.insert(telegramMessages).values({
        customerId: customer.id,
        passport: customer.passport,
        birthDate: customer.birthDate ?? row.birthDate ?? null,
        fullName: customer.fullName || (row.fullName ?? "").trim(),
        telegram: customer.telegram || (row.telegram ?? "").trim(),
        telegramId: customer.telegramId || (row.telegramId ?? "").trim(),
        company: (row.company ?? "").trim(),
        phone: customer.phone || phone,
        idr: customer.idr || (row.idr ?? "").trim(),
        source: customer.source || (row.source ?? "").trim(),
        hasPassport: !!customer.passport,
        hasFatherPassport: !!customer.fatherPassport,
        hasMotherPassport: !!customer.motherPassport,
        hasConsent: customer.consentLetter,
        hasSignature: customer.hasSignature,
        message: telegramMessageFor(flags),
        sendStatus: "unsent",
      });
      imported += 1;
    }

    return jsonOk({ imported, createdCustomers, skipped, warnings });
  } catch {
    return jsonError("Import bajarilmadi.\nMa'lumotlarni tekshirib qayta urinib ko'ring.", 500);
  }
}

type CustomerRow = Awaited<ReturnType<typeof findCustomer>>;
async function findCustomer() {
  return null as unknown as (typeof customers.$inferSelect) | null;
}
