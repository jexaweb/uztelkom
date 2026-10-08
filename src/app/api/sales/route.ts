import { db } from "@/db";
import { and, asc, eq } from "drizzle-orm";
import { dealers, salesRecords } from "@/db/schema";
import { getInt, jsonOk, jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * ============================================================
 * GET /api/sales
 *
 * type=sms
 *      -> faqat SMS dilerlar
 *
 * type=insurance
 *      -> faqat SUG'URTA dilerlar
 *
 * type berilmasa
 *      -> SMS
 * ============================================================
 */
export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;

    const now = new Date();

    const year = getInt(
      sp,
      "year",
      now.getFullYear()
    );

    const month = Math.min(
      Math.max(
        getInt(
          sp,
          "month",
          now.getMonth() + 1
        ),
        1
      ),
      12
    );

    /**
     * Jadval turi
     *
     * sms
     * insurance
     */
    const requestedType = (
      sp.get("type") ?? "sms"
    ).toLowerCase();

    const type =
      requestedType === "insurance"
        ? "insurance"
        : "sms";

    /**
     * Oydagi kunlar soni
     */
    const daysInMonth = new Date(
      year,
      month,
      0
    ).getDate();

    /**
     * ========================================================
     * DILERLAR + SOTUVLAR
     * ========================================================
     */
    const [dealerRows, salesRows] =
      await Promise.all([
        /**
         * FAQAT TANLANGAN TURDAGI DILERLAR
         */
        db
          .select()
          .from(dealers)
          .where(
            eq(
              dealers.type,
              type
            )
          )
          .orderBy(
            asc(dealers.id)
          ),

        /**
         * Shu yil + oy sotuvlari
         */
        db
          .select()
          .from(salesRecords)
          .where(
            and(
              eq(
                salesRecords.year,
                year
              ),
              eq(
                salesRecords.month,
                month
              )
            )
          ),
      ]);

    /**
     * ========================================================
     * TANLANGAN TURDAGI DILER ID'LARI
     * ========================================================
     */
    const dealerIds = new Set(
      dealerRows.map(
        (dealer) => dealer.id
      )
    );

    /**
     * ========================================================
     * DEALER ID -> KUNLIK SOTUVLAR
     * ========================================================
     */
    const map = new Map<
      number,
      number[]
    >();

    for (const record of salesRows) {
      /**
       * Faqat shu jadval turiga
       * tegishli dilerlar hisoblanadi.
       */
      if (
        !dealerIds.has(
          record.dealerId
        )
      ) {
        continue;
      }

      const days =
        map.get(
          record.dealerId
        ) ??
        new Array<number>(
          daysInMonth
        ).fill(0);

      if (
        record.day >= 1 &&
        record.day <= daysInMonth
      ) {
        days[
          record.day - 1
        ] = Number(
          record.amount || 0
        );
      }

      map.set(
        record.dealerId,
        days
      );
    }

    /**
     * ========================================================
     * KUNLIK JAMI
     * ========================================================
     */
    const dailyTotals =
      new Array<number>(
        daysInMonth
      ).fill(0);

    for (const days of map.values()) {
      for (
        let index = 0;
        index < daysInMonth;
        index++
      ) {
        dailyTotals[index] +=
          Number(
            days[index] || 0
          );
      }
    }

    /**
     * ========================================================
     * TABLE ROWS
     * ========================================================
     */
    const rows = dealerRows.map(
      (dealer) => {
        const days =
          map.get(
            dealer.id
          ) ??
          new Array<number>(
            daysInMonth
          ).fill(0);

        const total =
          days.reduce(
            (
              sum,
              value
            ) =>
              sum +
              Number(
                value || 0
              ),
            0
          );

        return {
          id: dealer.id,

          region:
            dealer.region,

          login:
            dealer.login,

          name:
            dealer.name,

          company:
            dealer.company,

          phone:
            dealer.phone,

          type:
            dealer.type,

          isActive:
            dealer.isActive,

          days,

          total,
        };
      }
    );

    /**
     * ========================================================
     * GRAND TOTAL
     * ========================================================
     */
    const grandTotal =
      dailyTotals.reduce(
        (
          sum,
          value
        ) =>
          sum +
          Number(
            value || 0
          ),
        0
      );

    /**
     * ========================================================
     * RESPONSE
     * ========================================================
     */
    return jsonOk({
      success: true,

      type,

      year,

      month,

      daysInMonth,

      rows,

      dailyTotals,

      grandTotal,
    });
  } catch (error) {
    console.error(
      "GET SALES ERROR:",
      error
    );

    return jsonError(
      "Sotuv ma'lumotlarini yuklab bo'lmadi.",
      500
    );
  }
}

/**
 * ============================================================
 * DELETE /api/sales
 *
 * type=sms
 *      -> faqat SMS dilerlarning sotuvlarini o'chiradi
 *
 * type=insurance
 *      -> faqat SUG'URTA dilerlarning sotuvlarini o'chiradi
 *
 * DILERLARNING O'ZI O'CHMAYDI.
 * ============================================================
 */
export async function DELETE(
  req: Request
) {
  try {
    const sp =
      new URL(req.url)
        .searchParams;

    const requestedType = (
      sp.get("type") ?? "sms"
    ).toLowerCase();

    const type =
      requestedType === "insurance"
        ? "insurance"
        : "sms";

    /**
     * Tanlangan turdagi dilerlar
     */
    const dealerRows =
      await db
        .select({
          id: dealers.id,
        })
        .from(dealers)
        .where(
          eq(
            dealers.type,
            type
          )
        );

    /**
     * Agar bunday diler bo'lmasa
     */
    if (
      dealerRows.length === 0
    ) {
      return jsonOk({
        success: true,
        deleted: 0,
        type,
        message:
          type === "insurance"
            ? "Sug'urta dilerlari topilmadi."
            : "SMS dilerlari topilmadi.",
      });
    }

    let deleted = 0;

    /**
     * Har bir dilerning
     * sales_records yozuvlarini o'chirish
     */
    for (const dealer of dealerRows) {
      const deletedRows =
        await db
          .delete(
            salesRecords
          )
          .where(
            eq(
              salesRecords.dealerId,
              dealer.id
            )
          )
          .returning({
            id:
              salesRecords.id,
          });

      deleted +=
        deletedRows.length;
    }

    return jsonOk({
      success: true,

      deleted,

      type,

      message:
        type === "insurance"
          ? "Sug'urta jadvali muvaffaqiyatli tozalandi."
          : "Asosiy jadval muvaffaqiyatli tozalandi.",
    });
  } catch (error) {
    console.error(
      "DELETE SALES ERROR:",
      error
    );

    return jsonError(
      "Jadvalni tozalashda xatolik yuz berdi.",
      500
    );
  }
}