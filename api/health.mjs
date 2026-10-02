import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createDatabase } = require("../db");
const { createDatabaseAuthService } = require("../auth-db");

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
});

export async function GET() {
  if (!(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL)) return json({ status: "ok", databaseConfigured: false, authConfigured: false });
  try {
    const database = createDatabase();
    await database.initialize();
    const auth = createDatabaseAuthService({ database });
    return json({ status: "ok", databaseConfigured: true, authConfigured: await auth.hasUsers() });
  } catch {
    return json({ status: "error", databaseConfigured: false, authConfigured: false }, 503);
  }
}
