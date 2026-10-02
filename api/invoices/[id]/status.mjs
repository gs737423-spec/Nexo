import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createDatabase } = require("../../../db");
const { createDatabaseAuthService } = require("../../../auth-db");

const STATUSES = new Map([
  ["AGUARDANDO_COLETA", "Aguardando coleta"], ["COLETADO", "Coletado"],
  ["EM_TRANSITO", "Em trânsito"], ["UNIDADE_DESTINO", "Na unidade de destino"],
  ["SAIU_PARA_ENTREGA", "Saiu para entrega"], ["ENTREGUE", "Entregue"],
  ["ATRASADO", "Atrasado"], ["OCORRENCIA", "Problema na entrega"],
  ["CANCELADO", "Cancelado"], ["SEM_INFORMACAO", "Sem informação"],
]);

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
});

function bearerToken(request) {
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") || "");
  return match ? match[1] : "";
}

export async function POST(request, context) {
  try {
    if (!(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL)) {
      return json({ error: "Banco de dados não configurado." }, 503);
    }
    const params = await context.params;
    const invoiceId = Number(params.id);
    if (!Number.isInteger(invoiceId) || invoiceId < 1) return json({ error: "Nota fiscal inválida." }, 422);
    const body = await request.json().catch(() => null);
    const status = String(body?.status || "").trim();
    const note = String(body?.note || "").trim().slice(0, 300);
    if (!STATUSES.has(status)) return json({ error: "Etapa de entrega inválida." }, 422);

    const database = createDatabase();
    await database.initialize();
    const auth = createDatabaseAuthService({ database });
    const user = await auth.authenticate(bearerToken(request));
    if (!user) return json({ error: "Sua sessão expirou ou não é válida." }, 401);

    const store = await database.read("store");
    if (!store) return json({ error: "Dados da plataforma não foram inicializados." }, 503);
    const invoice = (store.invoices || []).find((item) => item.id === invoiceId);
    if (!invoice) return json({ error: "Nota fiscal não encontrada." }, 404);

    const now = new Date().toISOString();
    invoice.status = status;
    invoice.lastCheck = now;
    invoice.by = user.name;
    invoice.events = invoice.events || [];
    invoice.events.push({ s: status, l: note || STATUSES.get(status), d: now, loc: "Atualização manual" });
    await database.write("store", store);
    await auth.audit({ userId: user.id, action: "INVOICE_STATUS_UPDATED", resource: `invoice:${invoice.id}` });
    return json(invoice);
  } catch (error) {
    console.error("Status update failure", error);
    return json({ error: "Não foi possível atualizar a etapa da entrega." }, 500);
  }
}
