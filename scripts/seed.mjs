/**
 * Seed script — populates the database with realistic sample data.
 * Run with: node scripts/seed.mjs
 */
import { Client } from "pg";

const client = new Client({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
});

/* deterministic PRNG so the seed is reproducible */
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20240617);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
const chance = (p) => rand() < p;

const REGIONS = [
  "Toshkent shahri", "Toshkent viloyati", "Samarqand", "Buxoro", "Farg'ona",
  "Andijon", "Namangan", "Qashqadaryo", "Qoraqalpog'iston", "Xorazm",
  "Jizzax", "Navoiy", "Sirdaryo", "Surxondaryo",
];
const DEALER_NAMES = [
  "Anor Telekom", "Texno Park", "Smart Media", "Raqamli Dunyo", "Aloqa Markazi",
  "Mobil House", "Signal Telecom", "Barqaror Aloqa", "Yangi Avlod", "Tezkor Xizmat",
  "Bilim Telecom", "Marhamat Aloqa", "Oltin Vodiy", "Chilonzor Mobile",
];
const COMPANIES = ["UZTELECOM", "UZTELECOM", "UZTELECOM", "Anor Group", "Smart Media MCHJ"];
const FIRST_NAMES = [
  "Aliyev", "Karimov", "Toshmatov", "Rahimov", "Sultonov", "Yusupov", "Normatov",
  "Ergashev", "Qodirov", "Xolmatov", "Salimov", "Ismoilov", "Jo'rayev", "Mamatqulov",
];
const FIRST = ["Ali", "Vali", "Sardor", "Jasur", "Bekzod", "Dilshod", "Otabek", "Sherzod", "Aziz", "Kamol"];
const INSURANCE_TYPES = ["OSAGO", "Kasko", "Tibbiy sug'urta", "Sug'urta polisi", "Yuk sug'urtasi"];
const SMS_TEXTS = [
  "Hurmatli mijoz, hisobingiz to'ldirildi.",
  "Eslatma: to'lov muddati yaqinlashmoqda.",
  "Hujjatlaringiz qabul qilindi. Rahmat!",
  "Yangi tarif faollashdi. Batafsil: uztelecom.uz",
  "Iltimos, kerakli hujjatlarni ilova qiling.",
  "Xizmatimizdan foydalanganingiz uchun rahmat.",
];

const phone = () => `+998${pick(["90", "91", "93", "94", "95", "97", "98", "99"])}${int(1000000, 9999999)}`;
const passportNum = () =>
  `${pick(["AA", "AB", "AC", "AD", "AE", "AF"])}${int(1000000, 9999999)}`;
const dateStr = (y, m, d) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function messageFor(flags) {
  if (!flags.passport) return "Assalomu alaykum, pasportingiz yuklanmagan.\nIltimos, pasport nusxasini yuboring.";
  if (!flags.consent) return "Assalomu alaykum, ota-ona rozilik xati talab qilinadi.\nIltimos, hujjatni yuboring.";
  if (!flags.signature) return "Assalomu alaykum, hujjatingizda imzo mavjud emas.\nIltimos, imzolangan variantini yuboring.";
  if (!flags.father || !flags.mother)
    return "Assalomu alaykum, ota-ona pasport ma'lumotlari talab qilinadi.\nIltimos, hujjatni yuboring.";
  return "Assalomu alaykum! Hujjatlaringiz to'liq va qabul qilindi. Rahmat!";
}

await client.connect();

console.log("Clearing existing data...");
await client.query(
  "truncate telegram_messages, customers, sms_messages, insurances, sales_records, dealers restart identity cascade",
);

/* ---------------- dealers ---------------- */
console.log("Seeding dealers...");
const dealerIds = [];
for (let i = 0; i < 24; i += 1) {
  const name = `${DEALER_NAMES[i % DEALER_NAMES.length]}${i >= DEALER_NAMES.length ? ` ${Math.floor(i / DEALER_NAMES.length) + 1}` : ""}`;
  const login = `diler_${String(i + 1).padStart(2, "0")}`;
  const res = await client.query(
    `insert into dealers (region, name, company, login, phone, code, type, is_active)
     values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
    [
      pick(REGIONS),
      name,
      pick(COMPANIES),
      login,
      phone(),
      `D-${int(1000, 9999)}`,
      chance(0.55) ? "sms" : "insurance",
      chance(0.92),
    ],
  );
  dealerIds.push(res.rows[0].id);
}

/* ---------------- customers ---------------- */
console.log("Seeding customers...");
const customers = [];
const now = new Date();
for (let i = 0; i < 160; i += 1) {
  const fullName = `${pick(FIRST_NAMES)} ${pick(FIRST)}`;
  let birthDate;
  if (chance(0.38)) {
    // under 18: born between 2008 and 2012
    birthDate = dateStr(int(2008, 2012), int(1, 12), int(1, 28));
  } else {
    birthDate = dateStr(int(1975, 2007), int(1, 12), int(1, 28));
  }
  const hasPassport = chance(0.75);
  const hasFather = chance(0.55);
  const hasMother = chance(0.5);
  const consent = chance(0.45);
  const signature = chance(0.7);
  const tgHandle = chance(0.7) ? `@user${int(10000, 99999)}` : "";
  const res = await client.query(
    `insert into customers (dealer_id, full_name, phone, birth_date, passport, father_passport,
       mother_passport, consent_letter, has_signature, telegram, telegram_id, idr, source, notes)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning id, passport, father_passport,
       mother_passport, consent_letter, has_signature, full_name, phone, birth_date, telegram, telegram_id, idr, source`,
    [
      pick(dealerIds),
      fullName,
      phone(),
      birthDate,
      hasPassport ? passportNum() : "",
      hasFather ? passportNum() : "",
      hasMother ? passportNum() : "",
      consent,
      signature,
      tgHandle,
      tgHandle ? String(int(100000000, 999999999)) : "",
      `IDR-${int(10000, 99999)}`,
      pick(["Excel import", "Veb-sayt", "Ofis", "Diler"]),
      chance(0.2) ? "Qo'shimcha tekshiruv talab qilinadi." : "",
    ],
  );
  customers.push(res.rows[0]);
}

/* ---------------- sms ---------------- */
console.log("Seeding SMS messages...");
const smsRows = [];
for (let i = 0; i < 260; i += 1) {
  const status = chance(0.62) ? "sent" : chance(0.5) ? "pending" : "failed";
  smsRows.push([
    pick(dealerIds),
    phone(),
    pick(SMS_TEXTS),
    status,
    status === "sent" ? new Date(now.getTime() - int(0, 30) * 86400000) : null,
    status === "failed" ? "Provayder xatoligi" : "",
  ]);
}
await insertMany("sms_messages", ["dealer_id", "phone", "message", "status", "sent_at", "error"], smsRows);

/* ---------------- insurances ---------------- */
console.log("Seeding insurances...");
const insRows = [];
for (let i = 0; i < 180; i += 1) {
  const status = chance(0.3) ? "pending" : chance(0.45) ? "active" : chance(0.6) ? "completed" : "cancelled";
  insRows.push([
    pick(dealerIds),
    `${pick(FIRST_NAMES)} ${pick(FIRST)}`,
    phone(),
    pick(INSURANCE_TYPES),
    dateStr(now.getFullYear(), int(1, 12), int(1, 28)),
    status,
    chance(0.3) ? "Hujjatlar tekshirilmoqda." : "",
  ]);
}
await insertMany(
  "insurances",
  ["dealer_id", "customer_name", "phone", "insurance_type", "date", "status", "notes"],
  insRows,
);

/* ---------------- telegram messages ---------------- */
console.log("Seeding telegram messages...");
const tgCandidates = customers.filter((c) => {
  const flags = {
    passport: !!c.passport,
    father: !!c.father_passport,
    mother: !!c.mother_passport,
    consent: c.consent_letter,
    signature: c.has_signature,
  };
  return !flags.passport || !flags.father || !flags.mother || !flags.consent || !flags.signature;
});
const tgRows = [];
for (const c of tgCandidates.slice(0, 90)) {
  const flags = {
    passport: !!c.passport,
    father: !!c.father_passport,
    mother: !!c.mother_passport,
    consent: c.consent_letter,
    signature: c.has_signature,
  };
  const sendStatus = chance(0.6) ? "unsent" : chance(0.6) ? "sent" : "failed";
  tgRows.push([
    c.id,
    c.passport,
    c.birth_date,
    c.full_name,
    c.telegram,
    c.telegram_id,
    pick(COMPANIES),
    c.phone,
    c.idr,
    c.source,
    !!c.passport,
    !!c.father_passport,
    !!c.mother_passport,
    c.consent_letter,
    c.has_signature,
    messageFor(flags),
    sendStatus,
    sendStatus === "sent" ? new Date(now.getTime() - int(0, 20) * 86400000) : null,
    sendStatus === "failed" ? "Telegram ID topilmadi" : "",
  ]);
}
await insertMany(
  "telegram_messages",
  [
    "customer_id", "passport", "birth_date", "full_name", "telegram", "telegram_id", "company",
    "phone", "idr", "source", "has_passport", "has_father_passport", "has_mother_passport",
    "has_consent", "has_signature", "message", "send_status", "sent_at", "error",
  ],
  tgRows,
);

/* ---------------- sales ---------------- */
console.log("Seeding sales records...");
const year = now.getFullYear();
const month = now.getMonth() + 1;
const daysInMonth = new Date(year, month, 0).getDate();
const salesRows = [];
for (const id of dealerIds) {
  for (let day = 1; day <= daysInMonth; day += 1) {
    salesRows.push([id, year, month, day, chance(0.12) ? 0 : int(1, 30)]);
  }
}
await insertMany("sales_records", ["dealer_id", "year", "month", "day", "amount"], salesRows);

const counts = await client.query(
  `select
    (select count(*) from dealers) as dealers,
    (select count(*) from customers) as customers,
    (select count(*) from sms_messages) as sms,
    (select count(*) from insurances) as insurances,
    (select count(*) from telegram_messages) as telegram,
    (select count(*) from sales_records) as sales`,
);
console.log("Seed complete:", counts.rows[0]);
await client.end();

async function insertMany(table, columns, rows) {
  if (rows.length === 0) return;
  const values = [];
  const placeholders = [];
  rows.forEach((row, i) => {
    const ph = row.map((_, j) => `$${i * row.length + j + 1}`);
    placeholders.push(`(${ph.join(",")})`);
    values.push(...row);
  });
  await client.query(
    `insert into ${table} (${columns.join(",")}) values ${placeholders.join(",")}`,
    values,
  );
}
