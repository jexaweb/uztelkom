/**
 * Telegram Bot API integration.
 * Token is read from the environment (never exposed to the frontend).
 * If no token is configured the system runs in simulation mode so the
 * workflow stays fully testable in development.
 */
export type SendResult = { ok: boolean; simulated?: boolean; error?: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Resolve a usable chat id. Usernames (@x) cannot be messaged by bots. */
export function resolveChatId(
  telegramId?: string | null,
  telegram?: string | null,
): string | null {
  if (telegramId && /^-?\d+$/.test(telegramId.trim())) return telegramId.trim();
  return null;
}

export function hasValidTelegramContact(
  telegramId?: string | null,
  telegram?: string | null,
): boolean {
  return !!resolveChatId(telegramId, telegram);
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    await sleep(250);
    return { ok: true, simulated: true };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; description?: string }
      | null;
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.description ?? `Telegram API xatoligi (${res.status})`,
      };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Tarmoq xatoligi" };
  }
}
