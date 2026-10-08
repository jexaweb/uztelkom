import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Public system status — never exposes secrets. */
export async function GET() {
  try {
    const counts = await db.execute(sql`
      select
        (select count(*) from dealers)::int as dealers,
        (select count(*) from dealers where is_active = true)::int as active_dealers,
        (select count(*) from customers)::int as customers,
        (select count(*) from sms_messages)::int as sms,
        (select count(*) from insurances)::int as insurances,
        (select count(*) from telegram_messages)::int as telegram,
        (select count(*) from sales_records)::int as sales
    `);
    const c = (counts as unknown as { rows: Record<string, number>[] }).rows?.[0] ?? {};

    return Response.json({
      telegramConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
      smsConfigured: !!process.env.SMS_API_URL && !!process.env.SMS_TOKEN,
      counts: {
        dealers: Number(c.dealers ?? 0),
        activeDealers: Number(c.active_dealers ?? 0),
        customers: Number(c.customers ?? 0),
        sms: Number(c.sms ?? 0),
        insurances: Number(c.insurances ?? 0),
        telegram: Number(c.telegram ?? 0),
        sales: Number(c.sales ?? 0),
      },
    });
  } catch {
    return Response.json({ error: "Sozlamalarni yuklab bo'lmadi." }, { status: 500 });
  }
}
