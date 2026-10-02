import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createDatabase } = require("../../db");
const { createDatabaseAuthService } = require("../../auth-db");

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
});

export async function POST(request) {
  try {
    if (!(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL)) return json({ error: "Banco de dados não configurado." }, 503);
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    if (!email || !password) return json({ error: "E-mail e senha são obrigatórios." }, 422);

    const database = createDatabase();
    await database.initialize();
    const auth = createDatabaseAuthService({ database });
    const result = await auth.login({ email, password });
    return result ? json(result) : json({ error: "E-mail ou senha inválidos." }, 401);
  } catch (error) {
    console.error("Login failure", error);
    return json({ error: "Não foi possível concluir o login." }, 500);
  }
}
