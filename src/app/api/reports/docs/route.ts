import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const counts = await db.execute(sql`
      select
        count(*)::int as total,
        count(*) filter (where birth_date is not null
          and birth_date > current_date - interval '18 years')::int as under18,
        count(*) filter (where coalesce(passport, '') = '')::int as missing_passport,
        count(*) filter (where coalesce(father_passport, '') = '')::int as missing_father,
        count(*) filter (where coalesce(mother_passport, '') = '')::int as missing_mother,
        count(*) filter (where consent_letter = false)::int as missing_consent,
        count(*) filter (where has_signature = false)::int as missing_signature,
        count(*) filter (where coalesce(passport, '') <> ''
          and coalesce(father_passport, '') <> ''
          and coalesce(mother_passport, '') <> ''
          and consent_letter = true
          and has_signature = true)::int as complete
      from customers
    `);
    const c = (counts as unknown as { rows: Record<string, number>[] }).rows?.[0] ?? {};

    const perDealer = await db.execute(sql`
      select d.id, d.name, d.login,
        count(c.id)::int as customers,
        count(c.id) filter (where coalesce(c.passport, '') = ''
          or coalesce(c.father_passport, '') = ''
          or coalesce(c.mother_passport, '') = ''
          or c.consent_letter = false
          or c.has_signature = false)::int as missing
      from dealers d
      left join customers c on c.dealer_id = d.id
      group by d.id, d.name, d.login
      order by missing desc
      limit 15
    `);
    const dealers = (perDealer as unknown as { rows: Record<string, unknown>[] }).rows ?? [];

    return Response.json({
      counts: {
        total: Number(c.total ?? 0),
        under18: Number(c.under18 ?? 0),
        missingPassport: Number(c.missing_passport ?? 0),
        missingFather: Number(c.missing_father ?? 0),
        missingMother: Number(c.missing_mother ?? 0),
        missingConsent: Number(c.missing_consent ?? 0),
        missingSignature: Number(c.missing_signature ?? 0),
        complete: Number(c.complete ?? 0),
      },
      perDealer: dealers.map((d) => ({
        id: Number(d.id),
        name: String(d.name),
        login: String(d.login),
        customers: Number(d.customers),
        missing: Number(d.missing),
      })),
    });
  } catch {
    return Response.json({ error: "Hisobotni yuklab bo'lmadi." }, { status: 500 });
  }
}
