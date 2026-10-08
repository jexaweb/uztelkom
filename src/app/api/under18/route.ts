import { db } from "@/db";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { customers, dealers } from "@/db/schema";
import { getInt, getStr, jsonOk } from "@/lib/api";
import { calculateAge, isUnder18 } from "@/lib/age";
import { missingDocs } from "@/lib/docs";

export const dynamic = "force-dynamic";

/**
 * Under-18 / missing documents list.
 * tab = all | under18 | nodocs
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const tab = getStr(sp, "tab", "all");
  const q = getStr(sp, "q");
  const page = getInt(sp, "page", 1);
  const pageSize = Math.min(getInt(sp, "pageSize", 20), 100);

  const filters = [];
  if (q) {
    const like = `%${q}%`;
    filters.push(
      or(
        ilike(customers.fullName, like),
        ilike(customers.phone, like),
        ilike(customers.passport, like),
        ilike(customers.telegram, like),
        sql`${customers.id}::text = ${q}`,
      ),
    );
  }
  if (tab === "under18") {
    filters.push(
      sql`${customers.birthDate} is not null and ${customers.birthDate} > current_date - interval '18 years'`,
    );
  }
  if (tab === "nodocs") {
    filters.push(
      sql`coalesce(${customers.passport}, '') = ''
          or coalesce(${customers.fatherPassport}, '') = ''
          or coalesce(${customers.motherPassport}, '') = ''
          or ${customers.consentLetter} = false
          or ${customers.hasSignature} = false`,
    );
  }
  const where = filters.length ? and(...filters) : undefined;

  const [rows, countRow] = await Promise.all([
    db
      .select({
        id: customers.id,
        fullName: customers.fullName,
        phone: customers.phone,
        birthDate: customers.birthDate,
        passport: customers.passport,
        fatherPassport: customers.fatherPassport,
        motherPassport: customers.motherPassport,
        consentLetter: customers.consentLetter,
        hasSignature: customers.hasSignature,
        telegram: customers.telegram,
        telegramId: customers.telegramId,
        notes: customers.notes,
        createdAt: customers.createdAt,
        dealerId: customers.dealerId,
        dealerName: dealers.name,
        dealerLogin: dealers.login,
        dealerCompany: dealers.company,
        dealerRegion: dealers.region,
      })
      .from(customers)
      .leftJoin(dealers, eq(customers.dealerId, dealers.id))
      .where(where)
      .orderBy(desc(customers.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)::int` }).from(customers).where(where),
  ]);

  const enriched = rows.map((r) => ({
    ...r,
    age: calculateAge(r.birthDate),
    under18: isUnder18(r.birthDate),
    missingCount: missingDocs(r).length,
  }));

  return jsonOk({ rows: enriched, total: Number(countRow[0]?.count ?? 0), page, pageSize });
}
