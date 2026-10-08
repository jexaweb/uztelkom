import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
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

    if (!secret) {
      throw new Error("AUTH_SECRET topilmadi");
    }

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

/* =========================
   GET — Bitta user
========================= */

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Tizimga kirmagansiz",
        },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const userId = Number(id);

    if (!Number.isInteger(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Noto‘g‘ri user ID",
        },
        { status: 400 },
      );
    }

    const [user] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        login: users.login,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Foydalanuvchi topilmadi",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("GET USER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Server xatosi",
      },
      { status: 500 },
    );
  }
}

/* =========================
   PUT — Userni o‘zgartirish
========================= */

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Tizimga kirmagansiz",
        },
        { status: 401 },
      );
    }

    // Faqat ADMIN o'zgartira oladi
    if (currentUser.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Bu amal faqat admin uchun",
        },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    const userId = Number(id);

    if (!Number.isInteger(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Noto‘g‘ri user ID",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    const fullName =
      typeof body.fullName === "string"
        ? body.fullName.trim()
        : undefined;

    const login =
      typeof body.login === "string"
        ? body.login.trim()
        : undefined;

    const role =
      body.role === "admin" || body.role === "operator"
        ? body.role
        : undefined;

    const isActive =
      typeof body.isActive === "boolean"
        ? body.isActive
        : undefined;

    const password =
      typeof body.password === "string"
        ? body.password
        : undefined;

    if (
      fullName === undefined &&
      login === undefined &&
      role === undefined &&
      isActive === undefined &&
      password === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "O‘zgartirish uchun ma’lumot yuborilmadi",
        },
        { status: 400 },
      );
    }

    // O'zini bloklashga ruxsat bermaymiz
    if (
      userId === currentUser.id &&
      isActive === false
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "O‘zingizni bloklay olmaysiz",
        },
        { status: 400 },
      );
    }

    // O'zini adminlikdan chiqarish mumkin emas
    if (
      userId === currentUser.id &&
      role === "operator"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "O‘zingizning admin huquqingizni olib tashlay olmaysiz",
        },
        { status: 400 },
      );
    }

    // Login bo'lsa, duplicate tekshirish
    if (login !== undefined) {
      if (!login) {
        return NextResponse.json(
          {
            success: false,
            message: "Login bo‘sh bo‘lishi mumkin emas",
          },
          { status: 400 },
        );
      }

      const [existingUser] = await db
        .select({
          id: users.id,
        })
        .from(users)
        .where(eq(users.login, login))
        .limit(1);

      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json(
          {
            success: false,
            message: "Bu login allaqachon mavjud",
          },
          { status: 409 },
        );
      }
    }

    // Password hash
    let passwordHash: string | undefined;

    if (password !== undefined) {
      if (password.length < 6) {
        return NextResponse.json(
          {
            success: false,
            message: "Parol kamida 6 ta belgidan iborat bo‘lishi kerak",
          },
          { status: 400 },
        );
      }

      passwordHash = await bcrypt.hash(password, 12);
    }

    const updateData: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (fullName !== undefined) {
      if (!fullName) {
        return NextResponse.json(
          {
            success: false,
            message: "Ism familiya bo‘sh bo‘lishi mumkin emas",
          },
          { status: 400 },
        );
      }

      updateData.fullName = fullName;
    }

    if (login !== undefined) {
      updateData.login = login;
    }

    if (role !== undefined) {
      updateData.role = role;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    if (passwordHash !== undefined) {
      updateData.passwordHash = passwordHash;
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        fullName: users.fullName,
        login: users.login,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    if (!updatedUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Foydalanuvchi topilmadi",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Foydalanuvchi muvaffaqiyatli yangilandi",
      user: updatedUser,
    });
  } catch (error) {
    console.error("UPDATE USER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Foydalanuvchini yangilashda xatolik",
      },
      { status: 500 },
    );
  }
}

/* =========================
   DELETE — Userni o‘chirish
========================= */

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Tizimga kirmagansiz",
        },
        { status: 401 },
      );
    }

    // Faqat ADMIN
    if (currentUser.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Bu amal faqat admin uchun",
        },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    const userId = Number(id);

    if (!Number.isInteger(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Noto‘g‘ri user ID",
        },
        { status: 400 },
      );
    }

    // O'zini o'chirishga ruxsat yo'q
    if (userId === currentUser.id) {
      return NextResponse.json(
        {
          success: false,
          message: "O‘zingizni o‘chira olmaysiz",
        },
        { status: 400 },
      );
    }

    const [deletedUser] = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        fullName: users.fullName,
        login: users.login,
      });

    if (!deletedUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Foydalanuvchi topilmadi",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Foydalanuvchi o‘chirildi",
      user: deletedUser,
    });
  } catch (error) {
    console.error("DELETE USER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Foydalanuvchini o‘chirishda xatolik",
      },
      { status: 500 },
    );
  }
}