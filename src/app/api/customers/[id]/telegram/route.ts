import { db } from "@/db";
import { eq } from "drizzle-orm";
import { customers, telegramMessages } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";
import { telegramMessageFor } from "@/lib/docs";
import { resolveChatId, sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Create a Telegram message from a customer (auto-generated from the actual
 * missing documents) and send it immediately.
 */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const customerId = Number(id);
  if (!Number.isInteger(customerId) || customerId <= 0) return jsonError("Mijoz topilmadi.", 404);

  try {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);
    if (!customer) return jsonError("Mijoz topilmadi.", 404);

    const body = (await req.json().catch(() => null)) as { message?: string } | null;
    const message = body?.message?.trim() || telegramMessageFor(customer);

    const chatId = resolveChatId(customer.telegramId, customer.telegram);
    if (!chatId) {
      return jsonError("Bu mijoz uchun Telegram ID topilmadi — xabar yuborib bo'lmaydi.", 422);
    }

    const [row] = await db
      .insert(telegramMessages)
      .values({
        customerId: customer.id,
        passport: customer.passport,
        birthDate: customer.birthDate,
        fullName: customer.fullName,
        telegram: customer.telegram,
        telegramId: customer.telegramId,
        phone: customer.phone,
        idr: customer.idr,
        source: customer.source,
        hasPassport: !!customer.passport,
        hasFatherPassport: !!customer.fatherPassport,
        hasMotherPassport: !!customer.motherPassport,
        hasConsent: customer.consentLetter,
        hasSignature: customer.hasSignature,
        message,
        sendStatus: "sending",
      })
      .returning();

    const result = await sendTelegramMessage(chatId, message);

    const [updated] = await db
      .update(telegramMessages)
      .set({
        sendStatus: result.ok ? "sent" : "failed",
        sentAt: result.ok ? new Date() : null,
        error: result.ok ? "" : (result.error ?? "Noma'lum xatolik"),
      })
      .where(eq(telegramMessages.id, row.id))
      .returning();

    if (!result.ok) return jsonError(result.error ?? "Xabar yuborilmadi.", 502);
    return jsonOk({ row: updated, simulated: result.simulated });
  } catch {
    return jsonError("Xabar yuborilmadi.\nKeyinroq qayta urinib ko'ring.", 500);
  }
}
