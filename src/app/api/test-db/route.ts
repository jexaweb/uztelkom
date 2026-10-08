import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";

import { db } from "@/db";
import {
  dealers,
  smsMessages,
} from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. XAYRULLA dilerini olamiz
    const dealer = await db
      .select({
        id: dealers.id,
        name: dealers.name,
        company: dealers.company,
        login: dealers.login,
        type: dealers.type,
      })
      .from(dealers)
      .where(
        eq(
          dealers.id,
          1
        )
      )
      .limit(1);

    // 2. Shu dilerga tegishli SMS lar
    const sms = await db
      .select({
        id: smsMessages.id,
        dealerId: smsMessages.dealerId,
        phone: smsMessages.phone,
        message: smsMessages.message,
        status: smsMessages.status,
        sentAt: smsMessages.sentAt,
        createdAt: smsMessages.createdAt,
      })
      .from(smsMessages)
      .where(
        eq(
          smsMessages.dealerId,
          1
        )
      )
      .orderBy(
        desc(
          smsMessages.id
        )
      )
      .limit(100);

    return NextResponse.json({
      success: true,

      dealer,

      smsCount:
        sms.length,

      sms,
    });
  } catch (error) {
    console.error(
      "TEST SMS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      }
    );
  }
}