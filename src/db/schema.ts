import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Dealers — Master Dealer Database                                    */
/* ------------------------------------------------------------------ */
export const dealers = pgTable(
  "dealers",
  {
    id: serial("id").primaryKey(),
    region: text("region").notNull().default(""),
    name: text("name").notNull(),
    company: text("company").notNull().default(""),
    login: text("login").notNull(),
    phone: text("phone").notNull().default(""),
    code: text("code").notNull().default(""),
    // 'sms' | 'insurance' — required, never guessed
    type: text("type").notNull().default("sms"),
    // soft delete: historical data is always preserved
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("dealers_login_uidx").on(t.login),
    index("dealers_type_idx").on(t.type),
    index("dealers_region_idx").on(t.region),
  ],
);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),

    fullName: text("full_name").notNull().default(""),

    login: text("login").notNull(),

    passwordHash: text("password_hash").notNull(),

    role: text("role").notNull().default("operator"),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at").notNull().defaultNow(),

    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_login_uidx").on(t.login),
    index("users_role_idx").on(t.role),
    index("users_active_idx").on(t.isActive),
  ],
);
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
/* ------------------------------------------------------------------ */
/* Customers — document / passport tracking                            */
/* ------------------------------------------------------------------ */
export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    dealerId: integer("dealer_id").references(() => dealers.id, { onDelete: "set null" }),
    fullName: text("full_name").notNull().default(""),
    phone: text("phone").notNull().default(""),
    birthDate: date("birth_date"),
    // documents (independent status per document)
    passport: text("passport").notNull().default(""),
    fatherPassport: text("father_passport").notNull().default(""),
    motherPassport: text("mother_passport").notNull().default(""),
    consentLetter: boolean("consent_letter").notNull().default(false),
    hasSignature: boolean("has_signature").notNull().default(false),
    // telegram
    telegram: text("telegram").notNull().default(""),
    telegramId: text("telegram_id").notNull().default(""),
    idr: text("idr").notNull().default(""),
    source: text("source").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("customers_phone_idx").on(t.phone),
    index("customers_passport_idx").on(t.passport),
    index("customers_dealer_idx").on(t.dealerId),
    index("customers_birth_idx").on(t.birthDate),
  ],
);

/* ------------------------------------------------------------------ */
/* SMS messages                                                        */
/* ------------------------------------------------------------------ */
export const smsMessages = pgTable(
  "sms_messages",
  {
    id: serial("id").primaryKey(),
    dealerId: integer("dealer_id").references(() => dealers.id, { onDelete: "set null" }),
    phone: text("phone").notNull().default(""),
    message: text("message").notNull().default(""),
    // 'pending' | 'sent' | 'failed'
    status: text("status").notNull().default("pending"),
    sentAt: timestamp("sent_at"),
    error: text("error").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("sms_phone_idx").on(t.phone),
    index("sms_status_idx").on(t.status),
    index("sms_dealer_idx").on(t.dealerId),
    index("sms_created_idx").on(t.createdAt),
  ],
);

/* ------------------------------------------------------------------ */
/* Insurance records                                                   */
/* ------------------------------------------------------------------ */
export const insurances = pgTable(
  "insurances",
  {
    id: serial("id").primaryKey(),
    dealerId: integer("dealer_id").references(() => dealers.id, { onDelete: "set null" }),
    customerName: text("customer_name").notNull().default(""),
    phone: text("phone").notNull().default(""),
    insuranceType: text("insurance_type").notNull().default(""),
    date: date("date"),
    // 'pending' | 'active' | 'completed' | 'cancelled'
    status: text("status").notNull().default("pending"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("ins_phone_idx").on(t.phone),
    index("ins_dealer_idx").on(t.dealerId),
    index("ins_status_idx").on(t.status),
    index("ins_created_idx").on(t.createdAt),
  ],
);

/* ------------------------------------------------------------------ */
/* Telegram messages (individual + bulk send)                          */
/* ------------------------------------------------------------------ */
export const telegramMessages = pgTable(
  "telegram_messages",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
    passport: text("passport").notNull().default(""),
    birthDate: date("birth_date"),
    fullName: text("full_name").notNull().default(""),
    telegram: text("telegram").notNull().default(""),
    telegramId: text("telegram_id").notNull().default(""),
    company: text("company").notNull().default(""),
    phone: text("phone").notNull().default(""),
    idr: text("idr").notNull().default(""),
    source: text("source").notNull().default(""),
    // document snapshot used to generate the message
    hasPassport: boolean("has_passport").notNull().default(false),
    hasFatherPassport: boolean("has_father_passport").notNull().default(false),
    hasMotherPassport: boolean("has_mother_passport").notNull().default(false),
    hasConsent: boolean("has_consent").notNull().default(false),
    hasSignature: boolean("has_signature").notNull().default(false),
    message: text("message").notNull().default(""),
    // 'unsent' | 'sending' | 'sent' | 'failed'
    sendStatus: text("send_status").notNull().default("unsent"),
    sentAt: timestamp("sent_at"),
    error: text("error").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("tg_phone_idx").on(t.phone),
    index("tg_passport_idx").on(t.passport),
    index("tg_status_idx").on(t.sendStatus),
    index("tg_created_idx").on(t.createdAt),
  ],
);

/* ------------------------------------------------------------------ */
/* Daily sales records (Main Table source)                             */
/* ------------------------------------------------------------------ */
export const salesRecords = pgTable(
  "sales_records",
  {
    id: serial("id").primaryKey(),
    dealerId: integer("dealer_id")
      .notNull()
      .references(() => dealers.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    day: integer("day").notNull(),
    amount: integer("amount").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sales_dealer_day_uidx").on(t.dealerId, t.year, t.month, t.day),
    index("sales_period_idx").on(t.year, t.month),
  ],
);

export type Dealer = typeof dealers.$inferSelect;
export type NewDealer = typeof dealers.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type SmsMessage = typeof smsMessages.$inferSelect;
export type Insurance = typeof insurances.$inferSelect;
export type TelegramMessage = typeof telegramMessages.$inferSelect;
export type SalesRecord = typeof salesRecords.$inferSelect;
