import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import DashboardClient from "./DashboardClient";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    const secret = process.env.AUTH_SECRET;

    if (!secret) {
      throw new Error("AUTH_SECRET topilmadi");
    }

    const secretKey = new TextEncoder().encode(secret);

    await jwtVerify(token, secretKey);

    return <DashboardClient />;
  } catch {
    redirect("/login");
  }
}