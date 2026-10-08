import { db } from "@/db";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { insurances, dealers } from "@/db/schema";
import { getInt, getStr, jsonError, jsonOk } from "@/lib/api";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "active", "completed", "cancelled"];

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = getStr(sp, "q");
  const status = getStr(sp, "status");
  const dealer = getStr(sp, "dealer");
  const page = getInt(sp, "page", 1);
  const pageSize = Math.min(getInt(sp, "pageSize", 20), 100);

  const filters = [];
  if (q) {
    const like = `%${q}%`;
    filters.push(
      or(
        ilike(insurances.customerName, like),
        ilike(insurances.phone, like),
        ilike(insurances.insuranceType, like),
        ilike(insurances.notes, like),
      ),
    );
  }
  if (STATUSES.includes(status)) filters.push(eq(insurances.status, status));
  if (dealer) filters.push(eq(insurances.dealerId, Number(dealer)));
  const where = filters.length ? and(...filters) : undefined;

  const [rows, countRow] = await Promise.all([
    db
      .select({
        id: insurances.id,
        customerName: insurances.customerName,
        phone: insurances.phone,
        insuranceType: insurances.insuranceType,
        date: insurances.date,
        status: insurances.status,
        notes: insurances.notes,
        createdAt: insurances.createdAt,
        dealerId: insurances.dealerId,
        dealerName: dealers.name,
        dealerLogin: dealers.login,
        dealerCompany: dealers.company,
        dealerRegion: dealers.region,
      })
      .from(insurances)
      .leftJoin(dealers, eq(insurances.dealerId, dealers.id))
      .where(where)
      .orderBy(desc(insurances.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)::int` }).from(insurances).where(where),
  ]);

  return jsonOk({ rows, total: Number(countRow[0]?.count ?? 0), page, pageSize });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return jsonError("So'rov ma'lumotlari noto'g'ri.");

    const customerName = String(body.customerName ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const insuranceType = String(body.insuranceType ?? "").trim();
    const status = STATUSES.includes(String(body.status)) ? String(body.status) : "pending";
    const date = typeof body.date === "string" && body.date ? body.date : null;

    if (!customerName && !phone) return jsonError("Mijoz ismi yoki telefon raqam kerak.");
    if (!insuranceType) return jsonError("Sug'urta turi kiritilishi shart.");

    const [created] = await db
      .insert(insurances)
      .values({
        customerName,
        phone,
        insuranceType,
        status,
        date,
        notes: String(body.notes ?? "").trim(),
        dealerId: body.dealerId ? Number(body.dealerId) : null,
      })
      .returning();

    return jsonOk({ insurance: created });
  } catch {
    return jsonError("Sug'urta yozilmadi.\nMa'lumotlarni tekshirib qayta urinib ko'ring.", 500);
  }
}
