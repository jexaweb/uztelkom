const bcrypt = require("bcryptjs");
const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  const login = "admin";
  const password = "admin12345";
  const passwordHash = await bcrypt.hash(password, 12);

  await client.query(
    `
    INSERT INTO users (
      full_name,
      login,
      password_hash,
      role,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (login)
    DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      role = EXCLUDED.role,
      is_active = EXCLUDED.is_active
    `,
    [
      "Administrator",
      login,
      passwordHash,
      "admin",
      true,
    ],
  );

  console.log("================================");
  console.log("ADMIN YARATILDI");
  console.log("Login: admin");
  console.log("Parol: admin12345");
  console.log("Rol: admin");
  console.log("================================");

  await client.end();
}

main().catch((error) => {
  console.error("XATOLIK:", error);
  process.exit(1);
});