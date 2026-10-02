"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createNexoServer } = require("../server");
const { createAuthService } = require("../auth");

let server;
let baseUrl;
let temporaryDirectory;
let accessToken;

test.before(async () => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "nexo-test-"));
  const auth = createAuthService({ dataDirectory: temporaryDirectory });
  auth.provisionAdmin({ name: "Administrador de Teste", email: "admin@empresa.com", password: "SenhaSegura123!" });
  accessToken = auth.login({ email: "admin@empresa.com", password: "SenhaSegura123!", ip: "test" }).token;
  server = createNexoServer({
    dataFile: path.join(temporaryDirectory, "store.json"),
    authService: auth,
    reportsOwnerEmail: "admin@empresa.com",
    trackingService: {
      providers: () => [{ key: "teste", name: "Transportadora de Teste", configured: true }],
      refresh: async () => ({ ok: true }),
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

async function request(pathname, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!pathname.startsWith("/auth/login") && !pathname.startsWith("/health")) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(`${baseUrl}${pathname}`, { ...options, headers });
  return { response, body: await response.json() };
}

test("protege os dados e aceita uma sessão autenticada", async () => {
  const page = await fetch(baseUrl);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Bem-vindo à/);

  const bootstrap = await request("/api/bootstrap");
  assert.equal(bootstrap.response.status, 200);
  assert.equal(bootstrap.body.carriers.length, 4);
  assert.equal(bootstrap.body.invoices.length, 15);
  assert.equal(bootstrap.body.carriers[0].phone, "(11) 2121-6161");
  assert.equal(bootstrap.body.carriers[0].email, "");
  assert.equal(bootstrap.body.carriers[0].contactSource, "Canal oficial");
  assert.equal(bootstrap.body.user.reportsAccess, true);

  const providers = await request("/api/tracking/providers");
  assert.equal(providers.response.status, 200);
  assert.equal(providers.body.providers[0].key, "teste");

  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@empresa.com", password: "SenhaSegura123!" }),
  });
  assert.equal(login.response.status, 200);
  assert.equal(login.body.user.email, "admin@empresa.com");
  assert.match(login.body.token, /^[A-Za-z0-9_-]{20,}$/);

  const unauthorized = await fetch(`${baseUrl}/api/bootstrap`);
  assert.equal(unauthorized.status, 401);
});

test("cria a transportadora identificada na NF, persiste a nota e registra atualização", async () => {
  const created = await request("/api/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nf: "105201",
      carrier: "TRILOG EXPRESS LTDA",
      recipient: "Distribuidora Central",
      recipientDoc: "45.678.901/0001-23",
      date: "10/09/2026",
      order: "PED-9102",
      rca: "RCA-482",
      eta: "20/09/2026",
      tracking: "ABC-123",
      cte: "CTE-987654",
      issuer: "ClimaRio",
      value: 998.99,
      items: [{ code: "43814", description: "FREEZ H 99L", unit: "UN", quantity: 1, unitValue: 1051.57, total: 1051.57 }],
      city: "Curitiba",
      state: "PR",
    }),
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.status, "AGUARDANDO_COLETA");
  assert.equal(created.body.tracking, "ABC-123");
  assert.equal(created.body.cte, "CTE-987654");
  assert.equal(created.body.issuer, "ClimaRio");
  assert.equal(created.body.value, 998.99);
  assert.equal(created.body.items.length, 1);
  assert.equal(created.body.rca, "RCA-482");
  assert.equal(created.body.eta, "2026-09-20");
  const details = await request(`/api/invoices/${created.body.id}/details`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rca: "105604", eta: "2026-09-25" }),
  });
  assert.equal(details.response.status, 200);
  assert.equal(details.body.rca, "105604");
  assert.equal(details.body.eta, "2026-09-25");
  assert.equal(created.body.uploadedBy, "Administrador de Teste");
  assert.match(created.body.uploadedAt, /^\d{4}-\d{2}-\d{2}T/);

  const refresh = await request(`/api/invoices/${created.body.id}/refresh`, { method: "POST" });
  assert.equal(refresh.response.status, 200);
  assert.equal(refresh.body.id, created.body.id);

  const bootstrap = await request("/api/bootstrap");
  assert.equal(bootstrap.body.invoices[0].id, created.body.id);
  assert.equal(bootstrap.body.invoices[0].carrierId, 5);
  assert.equal(bootstrap.body.carriers.length, 5);
  assert.equal(bootstrap.body.carriers[4].name, "TRILOG EXPRESS LTDA");
  assert.equal(bootstrap.body.carriers[4].website, "https://cliente.trilogccmexpress.com.br/rastreamento");
});

test("permite que um administrador exclua uma nota com registro de auditoria", async () => {
  const created = await request("/api/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nf: "105203", carrier: "Braspress", recipient: "Cliente", date: "10/09/2026", city: "Curitiba", state: "PR", rca: "RCA-9" }),
  });
  const removed = await request(`/api/invoices/${created.body.id}`, { method: "DELETE" });
  assert.equal(removed.response.status, 200);
  assert.deepEqual(removed.body, { ok: true, id: created.body.id });
  const missing = await request(`/api/invoices/${created.body.id}`);
  assert.equal(missing.response.status, 404);
});

test("recusa item cujo preço unitário não fecha com quantidade e total", async () => {
  const created = await request("/api/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nf: "105202", carrier: "Braspress", recipient: "Cliente", date: "10/09/2026", city: "Curitiba", state: "PR",
      items: [{ description: "Produto com total inconsistente", unit: "UN", quantity: 2, unitValue: 10, total: 25 }],
    }),
  });
  assert.equal(created.response.status, 422);
  assert.match(created.body.error, /não confere/);
});

test("usa o número da NF como rastreio quando não houver código separado", async () => {
  const created = await request("/api/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nf: "000492847", carrier: "REDIVIX TRANSPORTES LTDA", recipient: "Cliente de Teste",
      date: "04/09/2026", city: "Rio de Janeiro", state: "RJ",
    }),
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.tracking, "000492847");
});

test("permite que a equipe atualize manualmente a etapa da entrega", async () => {
  const created = await request("/api/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nf: "123456789", carrier: "Braspress", recipient: "Cliente", date: "11/09/2026", city: "São Paulo", state: "SP" }),
  });
  const updated = await request(`/api/invoices/${created.body.id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "EM_TRANSITO", note: "Conferido no portal da transportadora" }),
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.status, "EM_TRANSITO");
  assert.equal(updated.body.events.at(-1).l, "Conferido no portal da transportadora");
  assert.equal(updated.body.events.at(-1).loc, "Atualização manual");
});

test("registra report com captura e múltiplas áreas selecionadas", async () => {
  const report = await request("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      screenshot: "data:image/png;base64,aGVsbG8=", title: "Preço incorreto", description: "O valor não confere.", screen: "detail",
      selections: [{ x: 0.1, y: 0.2, width: 0.3, height: 0.1, kind: "ERRO", legend: "Preço incorreto" }, { x: 0.5, y: 0.4, width: 0.2, height: 0.2, kind: "SUGESTAO", legend: "Adicionar contato" }],
    }),
  });
  assert.equal(report.response.status, 201);
  assert.equal(report.body.id, 1);

  const reports = await request("/api/reports");
  assert.equal(reports.response.status, 200);
  assert.equal(reports.body.reports.length, 1);
  assert.equal(reports.body.reports[0].selections[1].legend, "Adicionar contato");
});

test("recebe o conteúdo de um XML e devolve dados extraídos da NF-e", async () => {
  const xml = `<NFe><infNFe><ide><nNF>492847</nNF><dhEmi>2026-09-04T09:27:00-03:00</dhEmi></ide><dest><xNome>SÔNIA LOPES LUCIO</xNome><CNPJ>32811183000111</CNPJ><xMun>DUQUE DE CAXIAS</xMun><UF>RJ</UF></dest><transp><transporta><xNome>REDVICK TRANSPORTES LTDA</xNome></transporta></transp></infNFe></NFe>`;
  const parsed = await request("/api/uploads/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: "nota-fiscal.xml",
      fileContent: Buffer.from(xml).toString("base64"),
    }),
  });

  assert.equal(parsed.response.status, 200);
  assert.equal(parsed.body.draft.nf, "000492847");
  assert.equal(parsed.body.draft.recipient, "SÔNIA LOPES LUCIO");
  assert.equal(parsed.body.draft.carrier, "REDVICK TRANSPORTES LTDA");
});
