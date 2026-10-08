import { db } from "@/db";
import { eq } from "drizzle-orm";
import { insurances } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const STATUSES = ["pending", "active", "completed", "cancelled"];

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const insId = Number(id);
  if (!Number.isInteger(insId) || insId <= 0) return jsonError("Yozuv topilmadi.", 404);

  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return jsonError("So'rov ma'lumotlari noto'g'ri.");

    const patch: Record<string, unknown> = {};
    if (typeof body.customerName === "string") patch.customerName = body.customerName.trim();
    if (typeof body.phone === "string") patch.phone = body.phone.trim();
    if (typeof body.insuranceType === "string") patch.insuranceType = body.insuranceType.trim();
    if (typeof body.notes === "string") patch.notes = body.notes.trim();
    if (typeof body.status === "string" && STATUSES.includes(body.status)) patch.status = body.status;
    if (typeof body.date === "string") patch.date = body.date || null;
    if (Object.keys(patch).length === 0) return jsonError("O'zgartirish topilmadi.");

    const [updated] = await db
      .update(insurances)
      .set(patch)
      .where(eq(insurances.id, insId))
      .returning();
    if (!updated) return jsonError("Yozuv topilmadi.", 404);
    return jsonOk({ insurance: updated });
  } catch {
    return jsonError("Sug'urta yangilanmadi.", 500);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const insId = Number(id);
  if (!Number.isInteger(insId) || insId <= 0) return jsonError("Yozuv topilmadi.", 404);
  try {
    await db.delete(insurances).where(eq(insurances.id, insId));
    return jsonOk({ ok: true });
  } catch {
    return jsonError("Yozuv o'chirilmadi.", 500);
  }
}
