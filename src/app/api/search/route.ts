import { db } from "@/db";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { dealers, customers, smsMessages, insurances, telegramMessages } from "@/db/schema";
import { getStr, jsonOk } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Global search across phone, passport, name, dealer, login, company, telegram, id. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = getStr(sp, "q");
  if (q.length < 2) return jsonOk({ groups: [] });

  const like = `%${q}%`;
  const idNum = Number(q);
  const byId = Number.isInteger(idNum) && idNum > 0 ? eq : undefined;
  void byId;

  const [
    dealerRows,
    customerRows,
    smsRows,
    insRows,
    tgRows,
  ] = await Promise.all([
    db
      .select({ id: dealers.id, name: dealers.name, company: dealers.company, login: dealers.login })
      .from(dealers)
      .where(
        or(
          ilike(dealers.name, like),
          ilike(dealers.company, like),
          ilike(dealers.login, like),
          ilike(dealers.phone, like),
          ilike(dealers.region, like),
          sql`${dealers.id}::text = ${q}`,
        ),
      )
      .limit(5),
    db
      .select({
        id: customers.id,
        fullName: customers.fullName,
        phone: customers.phone,
        passport: customers.passport,
      })
      .from(customers)
      .where(
        or(
          ilike(customers.fullName, like),
          ilike(customers.phone, like),
          ilike(customers.passport, like),
          ilike(customers.telegram, like),
          ilike(customers.telegramId, like),
          ilike(customers.idr, like),
          sql`${customers.id}::text = ${q}`,
        ),
      )
      .limit(6),
    db
      .select({ id: smsMessages.id, phone: smsMessages.phone, message: smsMessages.message })
      .from(smsMessages)
      .where(or(ilike(smsMessages.phone, like), ilike(smsMessages.message, like)))
      .limit(5),
    db
      .select({
        id: insurances.id,
        customerName: insurances.customerName,
        phone: insurances.phone,
        insuranceType: insurances.insuranceType,
      })
      .from(insurances)
      .where(
        or(
          ilike(insurances.customerName, like),
          ilike(insurances.phone, like),
          ilike(insurances.insuranceType, like),
        ),
      )
      .limit(5),
    db
      .select({
        id: telegramMessages.id,
        fullName: telegramMessages.fullName,
        phone: telegramMessages.phone,
        passport: telegramMessages.passport,
        telegram: telegramMessages.telegram,
        idr: telegramMessages.idr,
      })
      .from(telegramMessages)
      .where(
        or(
          ilike(telegramMessages.fullName, like),
          ilike(telegramMessages.phone, like),
          ilike(telegramMessages.passport, like),
          ilike(telegramMessages.telegram, like),
          ilike(telegramMessages.telegramId, like),
          ilike(telegramMessages.idr, like),
        ),
      )
      .limit(6),
  ]);

  const groups = [
    {
      type: "dealers",
      label: "Dilerlar",
      icon: "👥",
      items: dealerRows.map((d) => ({
        id: d.id,
        type: "dealer",
        title: d.name,
        subtitle: `${d.company} · login: ${d.login}`,
        href: `/dealers?highlight=${d.id}`,
      })),
    },
    {
      type: "customers",
      label: "Mijozlar",
      icon: "🧾",
      items: customerRows.map((c) => ({
        id: c.id,
        type: "customer",
        title: c.fullName || "Mijoz",
        subtitle: `${c.phone} · passport: ${c.passport || "—"}`,
        href: `/under18?highlight=${c.id}`,
      })),
    },
    {
      type: "sms",
      label: "SMS",
      icon: "💬",
      items: smsRows.map((s) => ({
        id: s.id,
        type: "sms",
        title: s.phone,
        subtitle: s.message,
        href: `/sms?q=${encodeURIComponent(s.phone)}`,
      })),
    },
    {
      type: "insurance",
      label: "Sug'urta",
      icon: "🛡️",
      items: insRows.map((i) => ({
        id: i.id,
        type: "insurance",
        title: i.customerName || i.phone,
        subtitle: `${i.insuranceType} · ${i.phone}`,
        href: `/insurance?q=${encodeURIComponent(i.phone)}`,
      })),
    },
    {
      type: "telegram",
      label: "Telegram",
      icon: "📩",
      items: tgRows.map((t) => ({
        id: t.id,
        type: "telegram",
        title: t.fullName || t.phone,
        subtitle: `${t.telegram || "—"} · ${t.phone} · ${t.passport || ""}`,
        href: `/telegram?q=${encodeURIComponent(t.phone)}`,
      })),
    },
  ].filter((g) => g.items.length > 0);

  return jsonOk({ groups });
}
