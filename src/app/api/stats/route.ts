import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Dashboard statistics — always computed from the database. */
export async function GET() {
  try {
    const rows = await db.execute(sql`
      select
        (select count(*) from sms_messages)::int as sms_total,
        (select count(*) from sms_messages where status = 'pending')::int as sms_pending,
        (select count(*) from sms_messages where status = 'sent')::int as sms_sent,
        (select count(*) from sms_messages where status = 'failed')::int as sms_failed,
        (select count(*) from insurances)::int as insurance_total,
        (select count(*) from customers where birth_date is not null
           and birth_date > current_date - interval '18 years')::int as under18_total,
        (select count(*) from customers
           where coalesce(passport, '') = ''
              or coalesce(father_passport, '') = ''
              or coalesce(mother_passport, '') = ''
              or consent_letter = false
              or has_signature = false)::int as missing_docs_total,
        (select count(*) from telegram_messages)::int as telegram_total,
        (select count(*) from dealers)::int as dealers_total,
        (select count(*) from dealers where is_active = true)::int as dealers_active
    `);
    const row = (rows as unknown as { rows: Record<string, number>[] }).rows?.[0] ?? {};
    return Response.json({
      smsTotal: Number(row.sms_total ?? 0),
      smsPending: Number(row.sms_pending ?? 0),
      smsSent: Number(row.sms_sent ?? 0),
      smsFailed: Number(row.sms_failed ?? 0),
      insuranceTotal: Number(row.insurance_total ?? 0),
      under18Total: Number(row.under18_total ?? 0),
      missingDocsTotal: Number(row.missing_docs_total ?? 0),
      telegramTotal: Number(row.telegram_total ?? 0),
      dealersTotal: Number(row.dealers_total ?? 0),
      dealersActive: Number(row.dealers_active ?? 0),
    });
  } catch {
    return Response.json({ error: "Statistikani yuklab bo'lmadi." }, { status: 500 });
  }
}
