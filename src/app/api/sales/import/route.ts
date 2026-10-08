import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { dealers, salesRecords } from "@/db/schema";

export const dynamic = "force-dynamic";

// ============================================================
// TYPES
// ============================================================

type ImportType = "sms" | "insurance";

type ImportDayObject = {
  day?: number;
  amount?: number;
};

type ImportRow = {
  login?: string;

  // Sug'urta page.tsx:
  // days: number[]

  // Main table:
  // days: { day, amount }[]
  days?: Array<
    number | ImportDayObject
  >;
};

// ============================================================
// LOGIN NORMALIZE
// ============================================================

function normalizeLogin(value: unknown): string {
  return String(value ?? "")
    .replace(/\uFEFF/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-./\\]+/g, "");
}

// ============================================================
// NUMBER PARSER
// ============================================================

function parseAmount(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value === "string" &&
    value.trim() === ""
  ) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? Math.trunc(value)
      : null;
  }

  const cleaned = String(value)
    .replace(/\u00A0/g, "")
    .replace(/\s/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.-]/g, "");

  if (!cleaned) {
    return null;
  }

  const number = Number(cleaned);

  if (!Number.isFinite(number)) {
    return null;
  }

  return Math.trunc(number);
}

// ============================================================
// DAY PARSER
// ============================================================

function parseDay(
  value: unknown
): number | null {
  const day = Number(value);

  if (
    !Number.isInteger(day) ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return day;
}

// ============================================================
// GET DAY VALUE
//
// Ikkala formatni ham qabul qiladi:
//
// 1) Sug'urta:
//    days: [100, 200, 300]
//
// 2) Main table:
//    days: [
//      { day: 1, amount: 100 },
//      { day: 2, amount: 200 }
//    ]
// ============================================================

function normalizeDays(
  days: ImportRow["days"]
): Map<number, number> {
  const result = new Map<
    number,
    number
  >();

  if (!Array.isArray(days)) {
    return result;
  }

  for (
    let index = 0;
    index < days.length;
    index++
  ) {
    const item = days[index];

    // --------------------------------------------------------
    // FORMAT 1:
    // days: number[]
    //
    // index 0 = Kun 1
    // index 1 = Kun 2
    // --------------------------------------------------------

    if (
      typeof item === "number" ||
      typeof item === "string"
    ) {
      const amount =
        parseAmount(item);

      if (amount === null) {
        continue;
      }

      const day = index + 1;

      result.set(
        day,
        (result.get(day) ?? 0) +
          amount
      );

      continue;
    }

    // --------------------------------------------------------
    // FORMAT 2:
    // days: { day, amount }[]
    // --------------------------------------------------------

    if (
      item &&
      typeof item === "object"
    ) {
      const day = parseDay(
        item.day
      );

      const amount =
        parseAmount(item.amount);

      if (
        day === null ||
        amount === null
      ) {
        continue;
      }

      result.set(
        day,
        (result.get(day) ?? 0) +
          amount
      );
    }
  }

  return result;
}

// ============================================================
// POST
// EXCEL IMPORT
// ============================================================

export async function POST(
  request: Request
) {
  try {
    // ========================================================
    // REQUEST BODY
    // ========================================================

    const body =
      await request.json();

    const year = Number(
      body?.year
    );

    const month = Number(
      body?.month
    );

    const type: ImportType =
      body?.type === "insurance"
        ? "insurance"
        : "sms";

    const rows =
      body?.rows as ImportRow[];

    // ========================================================
    // VALIDATION
    // ========================================================

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Yil noto'g'ri.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Oy noto'g'ri.",
        },
        {
          status: 400,
        }
      );
    }

    if (!Array.isArray(rows)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "rows massiv bo'lishi kerak.",
        },
        {
          status: 400,
        }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Excel faylda ma'lumot topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // 1. EXCEL LOGINLARINI TARTIBLASH
    //
    // Bir xil login Excelda bir necha marta bo'lsa,
    // kunlik qiymatlar qo'shib yuboriladi.
    // ========================================================

    const excelMap =
      new Map<
        string,
        {
          login: string;
          days: Map<
            number,
            number
          >;
        }
      >();

    for (const row of rows) {
      const login =
        normalizeLogin(
          row?.login
        );

      if (!login) {
        continue;
      }

      const dayMap =
        normalizeDays(
          row?.days
        );

      const existing =
        excelMap.get(login);

      // Birinchi marta
      if (!existing) {
        excelMap.set(
          login,
          {
            login,
            days: dayMap,
          }
        );

        continue;
      }

      // Login oldin ham bo'lgan
      for (
        const [
          day,
          amount,
        ] of dayMap.entries()
      ) {
        existing.days.set(
          day,
          (
            existing.days.get(
              day
            ) ?? 0
          ) + amount
        );
      }
    }

    // ========================================================
    // EXCEL LOGIN TOPILMAGAN BO'LSA
    // ========================================================

    if (excelMap.size === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Excel fayldan hech qanday login topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // 2. FAQAT KERAKLI TURDAGI DILERLARNI OLAMIZ
    //
    // SMS:
    // dealers.type = "sms"
    //
    // SUG'URTA:
    // dealers.type = "insurance"
    // ========================================================

    const dealerRows =
      await db
        .select({
          id: dealers.id,
          login: dealers.login,
          name: dealers.name,
          company: dealers.company,
          phone: dealers.phone,
          region: dealers.region,
          type: dealers.type,
          isActive:
            dealers.isActive,
        })
        .from(dealers)
        .where(
          and(
            eq(
              dealers.type,
              type
            ),
            eq(
              dealers.isActive,
              true
            )
          )
        )
        .orderBy(
          dealers.id
        );

    // ========================================================
    // DILERLAR TOPILMAGAN
    // ========================================================

    if (
      dealerRows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            type === "insurance"
              ? "Sug'urta turidagi faol dilerlar topilmadi."
              : "SMS turidagi faol dilerlar topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    // ========================================================
    // 3. DATABASE LOGIN MAP
    // ========================================================

    const dealerMap =
      new Map<
        string,
        (typeof dealerRows)[number]
      >();

    for (
      const dealer of dealerRows
    ) {
      const login =
        normalizeLogin(
          dealer.login
        );

      if (!login) {
        continue;
      }

      dealerMap.set(
        login,
        dealer
      );
    }

    // ========================================================
    // 4. EXCEL ↔ DATABASE MATCH
    // ========================================================

    const matchedDealerIds: number[] =
      [];

    const matchedLogins =
      new Set<string>();

    const warnings: string[] =
      [];

    let imported = 0;
    let skipped = 0;

    for (
      const [
        login,
      ] of excelMap.entries()
    ) {
      const dealer =
        dealerMap.get(login);

      if (!dealer) {
        skipped++;

        warnings.push(
          `Excel login bazada topilmadi: ${login}`
        );

        continue;
      }

      imported++;

      matchedLogins.add(
        login
      );

      matchedDealerIds.push(
        dealer.id
      );
    }

    // ========================================================
    // 5. DATABASE TRANSACTION
    //
    // FAQAT:
    // - kerakli type
    // - kerakli year
    // - kerakli month
    // - Excelda topilgan dealerlar
    //
    // o'chiriladi/yangilanadi.
    //
    // Boshqa oyga tegmaydi.
    // Boshqa type ga tegmaydi.
    // Dilerning o'ziga tegmaydi.
    // ========================================================

    let deletedRecords = 0;
    let writtenRecords = 0;

    await db.transaction(
      async (tx) => {
        // ----------------------------------------------------
        // ESKI RECORDLARNI O'CHIRISH
        // ----------------------------------------------------

        if (
          matchedDealerIds.length >
          0
        ) {
          const deleted =
            await tx
              .delete(
                salesRecords
              )
              .where(
                and(
                  inArray(
                    salesRecords.dealerId,
                    matchedDealerIds
                  ),
                  eq(
                    salesRecords.year,
                    year
                  ),
                  eq(
                    salesRecords.month,
                    month
                  )
                )
              )
              .returning({
                id:
                  salesRecords.id,
              });

          deletedRecords =
            deleted.length;
        }

        // ----------------------------------------------------
        // YANGI RECORDLARNI YOZISH
        // ----------------------------------------------------

        for (
          const login of matchedLogins
        ) {
          const dealer =
            dealerMap.get(login);

          if (!dealer) {
            continue;
          }

          const excelRow =
            excelMap.get(login);

          if (!excelRow) {
            continue;
          }

          // --------------------------------------------------
          // DAYS MAP
          //
          // 1 -> 500
          // 2 -> 700
          // 3 -> 300
          // --------------------------------------------------

          const sortedDays =
            Array.from(
              excelRow.days.entries()
            ).sort(
              (a, b) =>
                a[0] - b[0]
            );

          for (
            const [
              day,
              amount,
            ] of sortedDays
          ) {
            const validDay =
              parseDay(day);

            const validAmount =
              parseAmount(
                amount
              );

            if (
              validDay === null ||
              validAmount === null
            ) {
              continue;
            }

            // ------------------------------------------------
            // 0 bo'lgan kunlarni ham saqlaymiz
            // ------------------------------------------------

            await tx
              .insert(
                salesRecords
              )
              .values({
                dealerId:
                  dealer.id,

                year,

                month,

                day:
                  validDay,

                amount:
                  validAmount,
              })
              .onConflictDoUpdate({
                target: [
                  salesRecords.dealerId,
                  salesRecords.year,
                  salesRecords.month,
                  salesRecords.day,
                ],

                set: {
                  amount:
                    validAmount,
                },
              });

            writtenRecords++;
          }
        }
      }
    );

    // ========================================================
    // 6. RESPONSE
    // ========================================================

    return NextResponse.json(
      {
        success: true,

        type,

        year,

        month,

        imported,

        writtenRecords,

        skipped,

        deletedRecords,

        warnings,

        message:
          type === "insurance"
            ? "Sug'urta Excel ma'lumotlari muvaffaqiyatli saqlandi."
            : "SMS Excel ma'lumotlari muvaffaqiyatli saqlandi.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    // ========================================================
    // ERROR
    // ========================================================

    console.error(
      "SALES IMPORT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Excel import qilishda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}