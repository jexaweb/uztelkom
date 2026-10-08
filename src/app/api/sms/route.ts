import { db } from "@/db";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { smsMessages, dealers } from "@/db/schema";
import { getInt, getStr, jsonError, jsonOk } from "@/lib/api";
import { isValidPhone, sendSms } from "@/lib/sms";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = getStr(sp, "q");
  const status = getStr(sp, "status");
  const dealerId = getStr(sp, "dealer");
  const page = getInt(sp, "page", 1);
  const pageSize = Math.min(getInt(sp, "pageSize", 20), 100);

  const filters = [];
  if (q) {
    const like = `%${q}%`;
    filters.push(or(ilike(smsMessages.phone, like), ilike(smsMessages.message, like)));
  }
  if (status === "pending" || status === "sent" || status === "failed") {
    filters.push(eq(smsMessages.status, status));
  }
  if (dealerId) filters.push(eq(smsMessages.dealerId, Number(dealerId)));
  const where = filters.length ? and(...filters) : undefined;

  const [rows, countRow] = await Promise.all([
    db
      .select({
        id: smsMessages.id,
        phone: smsMessages.phone,
        message: smsMessages.message,
        status: smsMessages.status,
        sentAt: smsMessages.sentAt,
        error: smsMessages.error,
        createdAt: smsMessages.createdAt,
        dealerId: smsMessages.dealerId,
        dealerName: dealers.name,
        dealerLogin: dealers.login,
        dealerCompany: dealers.company,
      })
      .from(smsMessages)
      .leftJoin(dealers, eq(smsMessages.dealerId, dealers.id))
      .where(where)
      .orderBy(desc(smsMessages.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)::int` }).from(smsMessages).where(where),
  ]);

  return jsonOk({ rows, total: Number(countRow[0]?.count ?? 0), page, pageSize });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return jsonError("So'rov ma'lumotlari noto'g'ri.");

    const phone = String(body.phone ?? "").trim();
    const message = String(body.message ?? "").trim();
    const dealerId = body.dealerId ? Number(body.dealerId) : null;

    if (!isValidPhone(phone)) return jsonError("To'g'ri telefon raqam kiriting.");
    if (!message) return jsonError("Xabar matni bo'sh bo'lmasligi kerak.");

    const [created] = await db
      .insert(smsMessages)
      .values({ phone, message, dealerId, status: "pending" })
      .returning();

    return jsonOk({ sms: created });
  } catch {
    return jsonError("SMS yaratilmadi.\nMa'lumotlarni tekshirib qayta urinib ko'ring.", 500);
  }
}

/** Send (or retry) a single SMS. */
export async function PUT(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { id?: number } | null;
    const id = Number(body?.id);
    if (!Number.isInteger(id) || id <= 0) return jsonError("SMS topilmadi.", 404);

    const [sms] = await db.select().from(smsMessages).where(eq(smsMessages.id, id)).limit(1);
    if (!sms) return jsonError("SMS topilmadi.", 404);

    const result = await sendSms(sms.phone, sms.message);
    const [updated] = await db
      .update(smsMessages)
      .set({
        status: result.ok ? "sent" : "failed",
        sentAt: result.ok ? new Date() : null,
        error: result.ok ? "" : (result.error ?? "Noma'lum xatolik"),
      })
      .where(eq(smsMessages.id, id))
      .returning();

    if (!result.ok) return jsonError(result.error ?? "SMS yuborilmadi.", 502);
    return jsonOk({ sms: updated, simulated: result.simulated });
  } catch {
    return jsonError("SMS yuborilmadi.\nKeyinroq qayta urinib ko'ring.", 500);
  }
}
