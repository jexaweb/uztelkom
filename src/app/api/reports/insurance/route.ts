import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [totals, perDealer, perRegion, perType] = await Promise.all([
      db.execute(sql`
        select
          count(*)::int as total,
          count(*) filter (where status = 'pending')::int as pending,
          count(*) filter (where status = 'active')::int as active,
          count(*) filter (where status = 'completed')::int as completed,
          count(*) filter (where status = 'cancelled')::int as cancelled
        from insurances
      `),
      db.execute(sql`
        select d.id, d.name, d.login, count(i.id)::int as total
        from dealers d
        left join insurances i on i.dealer_id = d.id
        group by d.id, d.name, d.login
        order by total desc
        limit 15
      `),
      db.execute(sql`
        select d.region, count(i.id)::int as total
        from dealers d
        left join insurances i on i.dealer_id = d.id
        group by d.region
        order by total desc
      `),
      db.execute(sql`
        select insurance_type, count(*)::int as total
        from insurances
        group by insurance_type
        order by total desc
      `),
    ]);

    const t = (totals as unknown as { rows: Record<string, number>[] }).rows?.[0] ?? {};
    const dealers = (perDealer as unknown as { rows: Record<string, unknown>[] }).rows ?? [];
    const regions = (perRegion as unknown as { rows: { region: string; total: number }[] }).rows ?? [];
    const types = (perType as unknown as { rows: { insurance_type: string; total: number }[] }).rows ?? [];

    return Response.json({
      totals: {
        total: Number(t.total ?? 0),
        pending: Number(t.pending ?? 0),
        active: Number(t.active ?? 0),
        completed: Number(t.completed ?? 0),
        cancelled: Number(t.cancelled ?? 0),
      },
      perDealer: dealers.map((d) => ({
        id: Number(d.id),
        name: String(d.name),
        login: String(d.login),
        total: Number(d.total),
      })),
      perRegion: regions.map((r) => ({ region: r.region || "—", total: Number(r.total) })),
      perType: types.map((r) => ({ type: r.insurance_type || "—", total: Number(r.total) })),
    });
  } catch {
    return Response.json({ error: "Hisobotni yuklab bo'lmadi." }, { status: 500 });
  }
}
