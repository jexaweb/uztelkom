import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const secret = process.env.AUTH_SECRET;

if (!secret) {
  throw new Error("AUTH_SECRET .env.local faylida mavjud emas");
}

const secretKey = new TextEncoder().encode(secret);

export type AuthUser = {
  id: number;
  fullName: string;
  login: string;
  role: "admin" | "operator";
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  password: string,
  passwordHash: string,
) {
  return bcrypt.compare(password, passwordHash);
}

export async function createToken(user: AuthUser) {
  return new SignJWT({
    id: user.id,
    fullName: user.fullName,
    login: user.login,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey);

    return {
      id: Number(payload.id),
      fullName: String(payload.fullName),
      login: String(payload.login),
      role: payload.role as "admin" | "operator",
    };
  } catch {
    return null;
  }
}