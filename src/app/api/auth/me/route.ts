import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Tizimga kirilmagan",
        },
        { status: 401 },
      );
    }

    const secret = process.env.AUTH_SECRET;

    if (!secret) {
      throw new Error("AUTH_SECRET topilmadi");
    }

    const secretKey = new TextEncoder().encode(secret);

    const { payload } = await jwtVerify(
      token,
      secretKey,
    );

    return NextResponse.json({
      success: true,
      user: {
        id: Number(payload.id),
        fullName: String(payload.fullName),
        login: String(payload.login),
        role:
          payload.role === "admin"
            ? "admin"
            : "operator",
      },
    });
  } catch (error) {
    console.error("AUTH ME ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Sessiya yaroqsiz",
      },
      { status: 401 },
    );
  }
}