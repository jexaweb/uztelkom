
import { db } from "@/db";
import {
  and,
  asc,
  eq,
  ilike,
  or,
  sql,
} from "drizzle-orm";

import { dealers } from "@/db/schema";
import {
  getInt,
  getStr,
  jsonError,
  jsonOk,
} from "@/lib/api";

export const dynamic = "force-dynamic";

/* ============================================================
   GET — DILERLARNI OLISH
============================================================ */

export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;

    const q = getStr(sp, "q");
    const type = getStr(sp, "type");
    const status = getStr(sp, "status");
    const region = getStr(sp, "region");

    const page = Math.max(
      1,
      getInt(sp, "page", 1),
    );

    const pageSize = Math.min(
      Math.max(
        1,
        getInt(sp, "pageSize", 20),
      ),
      100,
    );

    const filters = [];

    /* Search */
    if (q) {
      const like = `%${q}%`;

      filters.push(
        or(
          ilike(dealers.name, like),
          ilike(dealers.company, like),
          ilike(dealers.login, like),
          ilike(dealers.phone, like),
          ilike(dealers.region, like),
          ilike(dealers.code, like),
          sql`${dealers.id}::text = ${q}`,
        ),
      );
    }

    /* Type */
    if (
      type === "sms" ||
      type === "insurance"
    ) {
      filters.push(
        eq(dealers.type, type),
      );
    }

    /* Status */
    if (status === "active") {
      filters.push(
        eq(dealers.isActive, true),
      );
    }

    if (status === "inactive") {
      filters.push(
        eq(dealers.isActive, false),
      );
    }

    /* Region */
    if (region) {
      filters.push(
        eq(dealers.region, region),
      );
    }

    const where =
      filters.length > 0
        ? and(...filters)
        : undefined;

    const [rows, countRow, regions] =
      await Promise.all([
        db
          .select()
          .from(dealers)
          .where(where)
          .orderBy(asc(dealers.id))
          .limit(pageSize)
          .offset(
            (page - 1) * pageSize,
          ),

        db
          .select({
            count: sql<number>`count(*)::int`,
          })
          .from(dealers)
          .where(where),

        db
          .selectDistinct({
            region: dealers.region,
          })
          .from(dealers)
          .orderBy(
            asc(dealers.region),
          ),
      ]);

    return jsonOk({
      rows,
      total: Number(
        countRow[0]?.count ?? 0,
      ),
      page,
      pageSize,
      regions: regions
        .map((r) => r.region)
        .filter(Boolean),
    });
  } catch (error) {
    console.error(
      "GET /api/dealers ERROR:",
      error,
    );

    return jsonError(
      "Dilerlarni yuklashda xatolik yuz berdi.",
      500,
    );
  }
}

/* ============================================================
   POST — YANGI DILER QO'SHISH
============================================================ */

export async function POST(req: Request) {
  try {
    const body =
      (await req.json().catch(
        () => null,
      )) as Record<
        string,
        unknown
      > | null;

    if (!body) {
      return jsonError(
        "So'rov ma'lumotlari noto'g'ri.",
        400,
      );
    }

    /* --------------------------------------------------------
       FORM MA'LUMOTLARI
    -------------------------------------------------------- */

    const name = String(
      body.name ?? "",
    ).trim();

    const login = String(
      body.login ?? "",
    ).trim();

    const region = String(
      body.region ?? "",
    ).trim();

    const company = String(
      body.company ?? "",
    ).trim();

    const phone = String(
      body.phone ?? "",
    ).trim();

    const code = String(
      body.code ?? "",
    ).trim();

    const type =
      body.type === "insurance"
        ? "insurance"
        : "sms";

    const isActive =
      body.isActive === undefined
        ? true
        : Boolean(body.isActive);

    /* --------------------------------------------------------
       VALIDATION
    -------------------------------------------------------- */

    if (!name) {
      return jsonError(
        "Diler nomini kiriting.",
        400,
      );
    }

    if (!login) {
      return jsonError(
        "Loginni kiriting.",
        400,
      );
    }

    /* --------------------------------------------------------
       LOGIN TEKSHIRISH
    -------------------------------------------------------- */

    const existing =
      await db
        .select({
          id: dealers.id,
          login: dealers.login,
        })
        .from(dealers)
        .where(
          eq(
            dealers.login,
            login,
          ),
        )
        .limit(1);

    if (existing.length > 0) {
      return jsonError(
        `Bu login allaqachon mavjud: ${login}`,
        409,
      );
    }

    /* --------------------------------------------------------
       DATABASE INSERT
    -------------------------------------------------------- */

    const [created] =
      await db
        .insert(dealers)
        .values({
          name,
          login,
          region,
          company,
          phone,
          code,
          type,
          isActive,
        })
        .returning();

    if (!created) {
      return jsonError(
        "Diler yaratilmadi.",
        500,
      );
    }

    console.log(
      "NEW DEALER CREATED:",
      created,
    );

    return jsonOk({
      success: true,
      dealer: created,
      message:
        "Diler muvaffaqiyatli qo'shildi.",
    });
  } catch (error) {
    /* --------------------------------------------------------
       ENG MUHIM QISM:
       HAQIQIY DATABASE XATOSINI TERMINALGA CHIQARAMIZ
    -------------------------------------------------------- */

    console.error(
      "POST /api/dealers ERROR:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Noma'lum database xatosi.";

    return jsonError(
      `Diler yaratilmadi: ${message}`,
      500,
    );
  }
}