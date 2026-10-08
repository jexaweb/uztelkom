import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const MONTH_NAMES = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
];

export async function GET() {
  try {
    const now = new Date();
    const periods: { year: number; month: number }[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      periods.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }

    const monthly = await db.execute(sql`
      select year, month, coalesce(sum(amount), 0)::int as total
      from sales_records
      group by year, month
      order by year, month
    `);
    const monthlyRows = (monthly as unknown as { rows: { year: number; month: number; total: number }[] }).rows;

    const totals = new Map<string, number>();
    for (const r of monthlyRows ?? []) {
      totals.set(`${r.year}-${r.month}`, Number(r.total));
    }

    const monthlySeries = periods.map((p) => ({
      year: p.year,
      month: p.month,
      label: `${MONTH_NAMES[p.month - 1]} ${p.year}`,
      total: totals.get(`${p.year}-${p.month}`) ?? 0,
    }));

    const cur = periods[periods.length - 1];

    const [topDealers, byRegion] = await Promise.all([
      db.execute(sql`
        select d.id, d.name, d.company, coalesce(sum(s.amount), 0)::int as total
        from sales_records s
        join dealers d on d.id = s.dealer_id
        where s.year = ${cur.year} and s.month = ${cur.month}
        group by d.id, d.name, d.company
        order by total desc
        limit 10
      `),
      db.execute(sql`
        select d.region, coalesce(sum(s.amount), 0)::int as total
        from sales_records s
        join dealers d on d.id = s.dealer_id
        where s.year = ${cur.year} and s.month = ${cur.month}
        group by d.region
        order by total desc
      `),
    ]);

    const dealers = (topDealers as unknown as { rows: Record<string, unknown>[] }).rows ?? [];
    const regions = (byRegion as unknown as { rows: { region: string; total: number }[] }).rows ?? [];

    return Response.json({
      currentPeriod: cur,
      monthlySeries,
      topDealers: dealers.map((d) => ({
        id: Number(d.id),
        name: String(d.name),
        company: String(d.company),
        total: Number(d.total),
      })),
      byRegion: regions.map((r) => ({ region: r.region || "—", total: Number(r.total) })),
    });
  } catch {
    return Response.json({ error: "Hisobotni yuklab bo'lmadi." }, { status: 500 });
  }
}

