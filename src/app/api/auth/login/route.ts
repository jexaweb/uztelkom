import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { comparePassword, createToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const login = String(body.login ?? "").trim();
    const password = String(body.password ?? "");

    if (!login || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Login va parolni kiriting",
        },
        { status: 400 },
      );
    }

    const result = await db
      .select()
      .from(users)
      .where(eq(users.login, login))
      .limit(1);

    const user = result[0];

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Login yoki parol noto‘g‘ri",
        },
        { status: 401 },
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Bu foydalanuvchi bloklangan",
        },
        { status: 403 },
      );
    }

    const passwordCorrect = await comparePassword(
      password,
      user.passwordHash,
    );

    if (!passwordCorrect) {
      return NextResponse.json(
        {
          success: false,
          message: "Login yoki parol noto‘g‘ri",
        },
        { status: 401 },
      );
    }

    const role =
      user.role === "admin" ? "admin" : "operator";

    const token = await createToken({
      id: user.id,
      fullName: user.fullName,
      login: user.login,
      role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        login: user.login,
        role,
      },
    });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Server xatosi",
      },
      { status: 500 },
    );
  }
}