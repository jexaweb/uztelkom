import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [totals, perDealer, perDay] = await Promise.all([
      db.execute(sql`
        select
          count(*)::int as total,
          count(*) filter (where status = 'sent')::int as sent,
          count(*) filter (where status = 'failed')::int as failed,
          count(*) filter (where status = 'pending')::int as pending
        from sms_messages
      `),
      db.execute(sql`
        select d.id, d.name, d.login,
          count(s.id)::int as total,
          count(s.id) filter (where s.status = 'sent')::int as sent,
          count(s.id) filter (where s.status = 'failed')::int as failed,
          count(s.id) filter (where s.status = 'pending')::int as pending
        from dealers d
        left join sms_messages s on s.dealer_id = d.id
        group by d.id, d.name, d.login
        order by total desc
        limit 15
      `),
      db.execute(sql`
        select created_at::date as day, count(*)::int as total
        from sms_messages
        where created_at > current_date - interval '14 days'
        group by created_at::date
        order by day
      `),
    ]);

    const t = (totals as unknown as { rows: Record<string, number>[] }).rows?.[0] ?? {};
    const dealers = (perDealer as unknown as { rows: Record<string, unknown>[] }).rows ?? [];
    const days = (perDay as unknown as { rows: { day: string; total: number }[] }).rows ?? [];

    return Response.json({
      totals: {
        total: Number(t.total ?? 0),
        sent: Number(t.sent ?? 0),
        failed: Number(t.failed ?? 0),
        pending: Number(t.pending ?? 0),
      },
      perDealer: dealers.map((d) => ({
        id: Number(d.id),
        name: String(d.name),
        login: String(d.login),
        total: Number(d.total),
        sent: Number(d.sent),
        failed: Number(d.failed),
        pending: Number(d.pending),
      })),
      perDay: days.map((d) => ({ day: d.day, total: Number(d.total) })),
    });
  } catch {
    return Response.json({ error: "Hisobotni yuklab bo'lmadi." }, { status: 500 });
  }
}
