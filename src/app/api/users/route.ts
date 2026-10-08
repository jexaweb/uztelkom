import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";

import { db } from "@/db";
import { users } from "@/db/schema";

async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) return null;

    const secret = process.env.AUTH_SECRET;

    if (!secret) return null;

    const secretKey = new TextEncoder().encode(secret);

    const { payload } = await jwtVerify(token, secretKey);

    return {
      id: Number(payload.id),
      role: payload.role === "admin" ? "admin" : "operator",
    };
  } catch {
    return null;
  }
}

// GET — foydalanuvchilarni ko‘rish
export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Avval tizimga kiring",
        },
        { status: 401 },
      );
    }

    const rows = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        login: users.login,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.id));

    return NextResponse.json({
      success: true,
      users: rows,
    });
  } catch (error) {
    console.error("GET USERS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Foydalanuvchilarni olishda xatolik",
      },
      { status: 500 },
    );
  }
}

// POST — yangi foydalanuvchi yaratish
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    // Faqat ADMIN
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Faqat administrator foydalanuvchi qo‘sha oladi",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    const fullName = String(body.fullName ?? "").trim();
    const login = String(body.login ?? "").trim();
    const password = String(body.password ?? "");
    const role = body.role === "admin" ? "admin" : "operator";

    if (!fullName || !login || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Ism, login va parol majburiy",
        },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Parol kamida 6 ta belgidan iborat bo‘lishi kerak",
        },
        { status: 400 },
      );
    }

    const existing = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.login, login))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Bu login allaqachon mavjud",
        },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [newUser] = await db
      .insert(users)
      .values({
        fullName,
        login,
        passwordHash,
        role,
        isActive: true,
      })
      .returning({
        id: users.id,
        fullName: users.fullName,
        login: users.login,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    return NextResponse.json(
      {
        success: true,
        message: "Foydalanuvchi yaratildi",
        user: newUser,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("CREATE USER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Foydalanuvchi yaratishda xatolik",
      },
      { status: 500 },
    );
  }
}