import { db } from "@/db";
import { eq, inArray } from "drizzle-orm";
import { smsMessages } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";
import { sendSms } from "@/lib/sms";

export const dynamic = "force-dynamic";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Controlled bulk sending — messages are processed one by one with a small
 * delay to respect provider limits (never all at once).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { ids?: number[] } | null;
    let ids = Array.isArray(body?.ids) ? body!.ids!.map(Number).filter((n) => n > 0) : [];

    if (ids.length === 0) {
      const pending = await db
        .select({ id: smsMessages.id })
        .from(smsMessages)
        .where(eq(smsMessages.status, "pending"));
      ids = pending.map((p) => p.id);
    }
    if (ids.length === 0) return jsonOk({ sent: 0, failed: 0, skipped: 0 });

    const rows = await db.select().from(smsMessages).where(inArray(smsMessages.id, ids));

    let sent = 0;
    let failed = 0;
    for (const row of rows) {
      const result = await sendSms(row.phone, row.message);
      await db
        .update(smsMessages)
        .set({
          status: result.ok ? "sent" : "failed",
          sentAt: result.ok ? new Date() : null,
          error: result.ok ? "" : (result.error ?? "Noma'lum xatolik"),
        })
        .where(eq(smsMessages.id, row.id));
      if (result.ok) sent += 1;
      else failed += 1;
      await sleep(120);
    }

    return jsonOk({ sent, failed, skipped: 0 });
  } catch {
    return jsonError("Ommaviy yuborish bajarilmadi.", 500);
  }
}
