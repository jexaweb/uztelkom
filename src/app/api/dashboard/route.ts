import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, or, desc } from "drizzle-orm";

import { db } from "@/db";
import {
  dealers,
  salesRecords,
  telegramMessages,
  customers,
} from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q")?.trim() ?? "";

    /*
    =========================================================
    SEARCH CONDITION
    =========================================================
    */

    const condition = q
      ? or(
          ilike(dealers.name, `%${q}%`),
          ilike(dealers.login, `%${q}%`),
          ilike(dealers.company, `%${q}%`),
          ilike(dealers.region, `%${q}%`),
          ilike(dealers.phone, `%${q}%`)
        )
      : undefined;

    /*
    =========================================================
    SMS
    =========================================================

    Faqat dealers.type = "sms" bo'lgan dilerlarning
    sales_records ma'lumotlari olinadi.
    */

    const smsRows = await db
      .select({
        id: salesRecords.id,
        dealerId: dealers.id,

        dealerName: dealers.name,
        dealerLogin: dealers.login,
        dealerCompany: dealers.company,
        dealerRegion: dealers.region,
        phone: dealers.phone,

        type: dealers.type,

        year: salesRecords.year,
        month: salesRecords.month,
        day: salesRecords.day,
        amount: salesRecords.amount,

        createdAt: salesRecords.createdAt,
      })
      .from(salesRecords)
      .innerJoin(
        dealers,
        eq(salesRecords.dealerId, dealers.id)
      )
      .where(
        condition
          ? and(
              eq(dealers.type, "sms"),
              condition
            )
          : eq(dealers.type, "sms")
      )
      .orderBy(
        dealers.name,
        salesRecords.year,
        salesRecords.month,
        salesRecords.day
      );

    /*
    =========================================================
    INSURANCE
    =========================================================

    Faqat dealers.type = "insurance" bo'lgan
    dilerlarning sales_records ma'lumotlari olinadi.
    */

    const insuranceRows = await db
      .select({
        id: salesRecords.id,
        dealerId: dealers.id,

        dealerName: dealers.name,
        dealerLogin: dealers.login,
        dealerCompany: dealers.company,
        dealerRegion: dealers.region,
        phone: dealers.phone,

        type: dealers.type,

        year: salesRecords.year,
        month: salesRecords.month,
        day: salesRecords.day,
        amount: salesRecords.amount,

        createdAt: salesRecords.createdAt,
      })
      .from(salesRecords)
      .innerJoin(
        dealers,
        eq(salesRecords.dealerId, dealers.id)
      )
      .where(
        condition
          ? and(
              eq(dealers.type, "insurance"),
              condition
            )
          : eq(dealers.type, "insurance")
      )
      .orderBy(
        dealers.name,
        salesRecords.year,
        salesRecords.month,
        salesRecords.day
      );

    /*
    =========================================================
    TELEGRAM
    =========================================================

    telegram_messages -> customers -> dealers

    Chunki telegram_messages jadvalida dealer_id yo'q.
    */

    const telegramRows = await db
      .select({
        id: telegramMessages.id,

        customerId: telegramMessages.customerId,

        passport: telegramMessages.passport,
        birthDate: telegramMessages.birthDate,

        fullName: telegramMessages.fullName,

        telegram: telegramMessages.telegram,
        telegramId: telegramMessages.telegramId,

        company: telegramMessages.company,
        phone: telegramMessages.phone,

        idr: telegramMessages.idr,
        source: telegramMessages.source,

        hasPassport: telegramMessages.hasPassport,
        hasFatherPassport:
          telegramMessages.hasFatherPassport,
        hasMotherPassport:
          telegramMessages.hasMotherPassport,

        hasConsent: telegramMessages.hasConsent,
        hasSignature: telegramMessages.hasSignature,

        message: telegramMessages.message,
        sendStatus: telegramMessages.sendStatus,
        sentAt: telegramMessages.sentAt,
        error: telegramMessages.error,

        createdAt: telegramMessages.createdAt,

        dealerId: dealers.id,
        dealerName: dealers.name,
        dealerLogin: dealers.login,
        dealerCompany: dealers.company,
        dealerRegion: dealers.region,
      })
      .from(telegramMessages)
      .leftJoin(
        customers,
        eq(
          telegramMessages.customerId,
          customers.id
        )
      )
      .leftJoin(
        dealers,
        eq(customers.dealerId, dealers.id)
      )
      .where(
        q
          ? or(
              ilike(
                telegramMessages.fullName,
                `%${q}%`
              ),
              ilike(
                telegramMessages.phone,
                `%${q}%`
              ),
              ilike(
                telegramMessages.passport,
                `%${q}%`
              ),
              ilike(
                telegramMessages.telegram,
                `%${q}%`
              ),
              ilike(
                telegramMessages.company,
                `%${q}%`
              ),
              ilike(
                dealers.name,
                `%${q}%`
              ),
              ilike(
                dealers.login,
                `%${q}%`
              ),
              ilike(
                dealers.company,
                `%${q}%`
              ),
              ilike(
                dealers.region,
                `%${q}%`
              ),
              ilike(
                dealers.phone,
                `%${q}%`
              )
            )
          : undefined
      )
      .orderBy(
        desc(telegramMessages.createdAt)
      );

    /*
    =========================================================
    RESPONSE
    =========================================================
    */

    return NextResponse.json({
      success: true,

      query: q,

      total:
        smsRows.length +
        insuranceRows.length +
        telegramRows.length,

      sms: smsRows.map((row) => ({
        id: row.id,
        dealerId: row.dealerId,

        dealerName: row.dealerName,
        dealerLogin: row.dealerLogin,
        dealerCompany: row.dealerCompany,
        dealerRegion: row.dealerRegion,

        phone: row.phone,
        type: row.type,

        year: row.year,
        month: row.month,
        day: row.day,
        amount: row.amount,

        date: `${row.year}-${String(
          row.month
        ).padStart(2, "0")}-${String(
          row.day
        ).padStart(2, "0")}`,

        createdAt: row.createdAt,
      })),

      insurance: insuranceRows.map((row) => ({
        id: row.id,
        dealerId: row.dealerId,

        dealerName: row.dealerName,
        dealerLogin: row.dealerLogin,
        dealerCompany: row.dealerCompany,
        dealerRegion: row.dealerRegion,

        phone: row.phone,
        type: row.type,

        year: row.year,
        month: row.month,
        day: row.day,
        amount: row.amount,

        date: `${row.year}-${String(
          row.month
        ).padStart(2, "0")}-${String(
          row.day
        ).padStart(2, "0")}`,

        createdAt: row.createdAt,
      })),

      telegram: telegramRows.map((row) => ({
        id: row.id,

        customerId: row.customerId,

        passport: row.passport,
        birthDate: row.birthDate,

        fullName: row.fullName,

        telegram: row.telegram,
        telegramId: row.telegramId,

        company: row.company,
        phone: row.phone,

        idr: row.idr,
        source: row.source,

        hasPassport: row.hasPassport,
        hasFatherPassport:
          row.hasFatherPassport,
        hasMotherPassport:
          row.hasMotherPassport,

        hasConsent: row.hasConsent,
        hasSignature: row.hasSignature,

        message: row.message,
        sendStatus: row.sendStatus,

        sentAt: row.sentAt,
        error: row.error,

        createdAt: row.createdAt,

        dealerId: row.dealerId,
        dealerName: row.dealerName,
        dealerLogin: row.dealerLogin,
        dealerCompany: row.dealerCompany,
        dealerRegion: row.dealerRegion,
      })),
    });
  } catch (error) {
    console.error(
      "DASHBOARD API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Dashboard ma'lumotlarini olishda xatolik.",
      },
      {
        status: 500,
      }
    );
  }
}