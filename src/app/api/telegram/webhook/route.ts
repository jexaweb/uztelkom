import { db } from "@/db";
import { eq } from "drizzle-orm";
import { customers } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return jsonError("Ruxsat berilmadi.", 401);
  }

  try {
    const update = await req.json();

    const message = update?.message;
    const chatId = message?.chat?.id;
    const text = String(message?.text ?? "").trim();

    if (!chatId || !text) {
      return jsonOk({ ok: true, ignored: true });
    }

    // Hozircha faqat /start qabul qilamiz.
    if (text === "/start" || text.startsWith("/start ")) {
      console.log("Telegram /start qabul qilindi:", String(chatId));
    }

    return jsonOk({ ok: true });
  } catch {
    return jsonError("Webhook so'rovini o'qib bo'lmadi.", 400);
  }
}