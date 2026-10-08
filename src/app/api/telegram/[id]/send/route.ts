import { db } from "@/db";
import { eq } from "drizzle-orm";
import { telegramMessages } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";
import { resolveChatId, sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Send one Telegram message (individual send with status tracking). */
export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const msgId = Number(id);
  if (!Number.isInteger(msgId) || msgId <= 0) return jsonError("Xabar topilmadi.", 404);

  const [row] = await db
    .select()
    .from(telegramMessages)
    .where(eq(telegramMessages.id, msgId))
    .limit(1);
  if (!row) return jsonError("Xabar topilmadi.", 404);

  const chatId = resolveChatId(row.telegramId, row.telegram);
  if (!chatId) {
    await db
      .update(telegramMessages)
      .set({ sendStatus: "failed", error: "Telegram ID topilmadi" })
      .where(eq(telegramMessages.id, msgId));
    return jsonError("Bu kontakt uchun Telegram ID topilmadi — xabar yuborib bo'lmaydi.", 422);
  }

  await db
    .update(telegramMessages)
    .set({ sendStatus: "sending", error: "" })
    .where(eq(telegramMessages.id, msgId));

  const result = await sendTelegramMessage(chatId, row.message);

  const [updated] = await db
    .update(telegramMessages)
    .set({
      sendStatus: result.ok ? "sent" : "failed",
      sentAt: result.ok ? new Date() : null,
      error: result.ok ? "" : (result.error ?? "Noma'lum xatolik"),
    })
    .where(eq(telegramMessages.id, msgId))
    .returning();

  if (!result.ok) return jsonError(result.error ?? "Xabar yuborilmadi.", 502);
  return jsonOk({ row: updated, simulated: result.simulated });
}
