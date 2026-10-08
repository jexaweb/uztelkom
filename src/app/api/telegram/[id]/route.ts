import { db } from "@/db";
import { eq } from "drizzle-orm";
import { telegramMessages } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Update the (editable) message text of a row. */
export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const msgId = Number(id);
  if (!Number.isInteger(msgId) || msgId <= 0) return jsonError("Xabar topilmadi.", 404);

  try {
    const body = (await req.json().catch(() => null)) as { message?: string } | null;
    const message = String(body?.message ?? "");
    if (!message.trim()) return jsonError("Xabar matni bo'sh bo'lmasligi kerak.");

    const [updated] = await db
      .update(telegramMessages)
      .set({ message })
      .where(eq(telegramMessages.id, msgId))
      .returning();
    if (!updated) return jsonError("Xabar topilmadi.", 404);
    return jsonOk({ row: updated });
  } catch {
    return jsonError("Xabar saqlanmadi.", 500);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const msgId = Number(id);
  if (!Number.isInteger(msgId) || msgId <= 0) return jsonError("Xabar topilmadi.", 404);
  try {
    await db.delete(telegramMessages).where(eq(telegramMessages.id, msgId));
    return jsonOk({ ok: true });
  } catch {
    return jsonError("Xabar o'chirilmadi.", 500);
  }
}
