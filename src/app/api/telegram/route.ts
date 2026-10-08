import { db } from "@/db";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { telegramMessages } from "@/db/schema";
import { getInt, getStr, jsonOk } from "@/lib/api";

export const dynamic = "force-dynamic";

const SEND_STATUSES = ["unsent", "sending", "sent", "failed"];

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = getStr(sp, "q");
  const status = getStr(sp, "status");
  const page = getInt(sp, "page", 1);
  const pageSize = Math.min(getInt(sp, "pageSize", 25), 100);

  const filters = [];
  if (q) {
    const like = `%${q}%`;
    filters.push(
      or(
        ilike(telegramMessages.phone, like),
        ilike(telegramMessages.passport, like),
        ilike(telegramMessages.fullName, like),
        ilike(telegramMessages.telegram, like),
        ilike(telegramMessages.telegramId, like),
        ilike(telegramMessages.idr, like),
        sql`${telegramMessages.id}::text = ${q}`,
      ),
    );
  }
  if (SEND_STATUSES.includes(status)) filters.push(eq(telegramMessages.sendStatus, status));
  const where = filters.length ? and(...filters) : undefined;

  const [rows, countRow, statusCounts] = await Promise.all([
    db
      .select()
      .from(telegramMessages)
      .where(where)
      .orderBy(desc(telegramMessages.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)::int` }).from(telegramMessages).where(where),
    db.execute(sql`
      select send_status, count(*)::int as count
      from telegram_messages
      group by send_status
    `),
  ]);

  const counts: Record<string, number> = {};
  const countRows = (statusCounts as unknown as { rows: { send_status: string; count: number }[] })
    .rows;
  for (const r of countRows ?? []) counts[r.send_status] = Number(r.count);

  return jsonOk({
    rows,
    total: Number(countRow[0]?.count ?? 0),
    page,
    pageSize,
    counts,
  });
}
