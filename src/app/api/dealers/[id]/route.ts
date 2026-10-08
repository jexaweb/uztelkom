import { db } from "@/db";
import { eq, sql } from "drizzle-orm";
import { dealers, smsMessages, insurances, customers, salesRecords } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const dealerId = Number(id);
  if (!Number.isInteger(dealerId) || dealerId <= 0) return jsonError("Diler topilmadi.", 404);

  const [dealer] = await db.select().from(dealers).where(eq(dealers.id, dealerId)).limit(1);
  if (!dealer) return jsonError("Diler topilmadi.", 404);

  const counts = await db.execute(sql`
    select
      (select count(*) from sms_messages where dealer_id = ${dealerId})::int as sms_count,
      (select count(*) from insurances where dealer_id = ${dealerId})::int as insurance_count,
      (select count(*) from customers where dealer_id = ${dealerId})::int as customer_count,
      (select coalesce(sum(amount), 0)::int from sales_records where dealer_id = ${dealerId}) as sales_total
  `);
  const c = (counts as unknown as { rows: Record<string, number>[] }).rows?.[0] ?? {};

  return jsonOk({
    dealer,
    stats: {
      smsCount: Number(c.sms_count ?? 0),
      insuranceCount: Number(c.insurance_count ?? 0),
      customerCount: Number(c.customer_count ?? 0),
      salesTotal: Number(c.sales_total ?? 0),
    },
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const dealerId = Number(id);
  if (!Number.isInteger(dealerId) || dealerId <= 0) return jsonError("Diler topilmadi.", 404);

  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return jsonError("So'rov ma'lumotlari noto'g'ri.");

    const patch: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (typeof body.login === "string" && body.login.trim()) {
      const login = body.login.trim();
      const [dup] = await db
        .select({ id: dealers.id })
        .from(dealers)
        .where(and_eq(dealers.login, login, dealerId))
        .limit(1);
      if (dup) return jsonError("Bu login allaqachon mavjud.");
      patch.login = login;
    }
    if (typeof body.region === "string") patch.region = body.region.trim();
    if (typeof body.company === "string") patch.company = body.company.trim();
    if (typeof body.phone === "string") patch.phone = body.phone.trim();
    if (typeof body.code === "string") patch.code = body.code.trim();
    if (body.type === "sms" || body.type === "insurance") patch.type = body.type;
    if (typeof body.isActive === "boolean") patch.isActive = body.isActive;
    patch.updatedAt = new Date();

    if (Object.keys(patch).length === 0) return jsonError("O'zgartirish topilmadi.");

    const [updated] = await db
      .update(dealers)
      .set(patch)
      .where(eq(dealers.id, dealerId))
      .returning();

    if (!updated) return jsonError("Diler topilmadi.", 404);
    return jsonOk({ dealer: updated });
  } catch {
    return jsonError("Diler yangilanmadi.\nMa'lumotlarni tekshirib qayta urinib ko'ring.", 500);
  }
}

/** Soft delete — historical records are never lost. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const dealerId = Number(id);
  if (!Number.isInteger(dealerId) || dealerId <= 0) return jsonError("Diler topilmadi.", 404);

  try {
    const [updated] = await db
      .update(dealers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(dealers.id, dealerId))
      .returning();
    if (!updated) return jsonError("Diler topilmadi.", 404);
    return jsonOk({ dealer: updated });
  } catch {
    return jsonError("Diler faolsizlantirilmadi.", 500);
  }
}

function and_eq(column: typeof dealers.login, value: string, exceptId: number) {
  return sql`${column} = ${value} and ${dealers.id} <> ${exceptId}`;
}
