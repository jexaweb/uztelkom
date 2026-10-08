import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Login sahifasiga ruxsat
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Login API'ga ruxsat
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth_token")?.value;

  // Token yo'q → login
  if (!token) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  try {
    const secret = process.env.AUTH_SECRET;

    if (!secret) {
      throw new Error("AUTH_SECRET mavjud emas");
    }

    const secretKey = new TextEncoder().encode(secret);

    await jwtVerify(token, secretKey);

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(
      new URL("/login", request.url)
    );

    response.cookies.delete("auth_token");

    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};