import { db } from "@/db";
import { eq } from "drizzle-orm";
import { customers, dealers } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";
import { calculateAge, isUnder18 } from "@/lib/age";
import { missingDocs } from "@/lib/docs";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const customerId = Number(id);
  if (!Number.isInteger(customerId) || customerId <= 0) return jsonError("Mijoz topilmadi.", 404);

  const [row] = await db
    .select({
      customer: customers,
      dealerName: dealers.name,
      dealerLogin: dealers.login,
      dealerCompany: dealers.company,
      dealerRegion: dealers.region,
    })
    .from(customers)
    .leftJoin(dealers, eq(customers.dealerId, dealers.id))
    .where(eq(customers.id, customerId))
    .limit(1);

  if (!row) return jsonError("Mijoz topilmadi.", 404);

  return jsonOk({
    customer: row.customer,
    dealer: row.dealerName
      ? { name: row.dealerName, login: row.dealerLogin, company: row.dealerCompany, region: row.dealerRegion }
      : null,
    age: calculateAge(row.customer.birthDate),
    under18: isUnder18(row.customer.birthDate),
    missing: missingDocs(row.customer).map((d) => d.key),
  });
}

/** Update document status / notes for a customer. */
export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const customerId = Number(id);
  if (!Number.isInteger(customerId) || customerId <= 0) return jsonError("Mijoz topilmadi.", 404);

  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return jsonError("So'rov ma'lumotlari noto'g'ri.");

    const patch: Record<string, unknown> = {};
    if (typeof body.passport === "string") patch.passport = body.passport.trim();
    if (typeof body.fatherPassport === "string") patch.fatherPassport = body.fatherPassport.trim();
    if (typeof body.motherPassport === "string") patch.motherPassport = body.motherPassport.trim();
    if (typeof body.consentLetter === "boolean") patch.consentLetter = body.consentLetter;
    if (typeof body.hasSignature === "boolean") patch.hasSignature = body.hasSignature;
    if (typeof body.notes === "string") patch.notes = body.notes.trim();
    if (Object.keys(patch).length === 0) return jsonError("O'zgartirish topilmadi.");

    const [updated] = await db
      .update(customers)
      .set(patch)
      .where(eq(customers.id, customerId))
      .returning();
    if (!updated) return jsonError("Mijoz topilmadi.", 404);
    return jsonOk({ customer: updated });
  } catch {
    return jsonError("Mijoz yangilanmadi.", 500);
  }
}
