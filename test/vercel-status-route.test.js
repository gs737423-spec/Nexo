"use strict";

const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const test = require("node:test");

test("a rota nativa de status encontra a NF pela URL sem contexto da Vercel", async () => {
  const { POST } = await import("../api/invoices/[id]/status.mjs");
  const response = await POST(new Request("https://nexo.test/api/invoices/103600/status", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "EM_TRANSITO" }),
  }));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Banco de dados não configurado." });

  const malformed = await POST(new Request("https://nexo.test/api/invoices/not-a-number/status", { method: "POST" }));
  assert.equal(malformed.status, 422);
  assert.deepEqual(await malformed.json(), { error: "Nota fiscal inválida." });
});

test("o adaptador catch-all aguarda a resposta assíncrona do servidor", async () => {
  const handler = require("../api/[...path].js");
  const request = { method: "GET", url: "/api/health", headers: {} };
  const response = new EventEmitter();
  response.writeHead = (status, headers) => { response.status = status; response.headers = headers; };
  response.end = (body) => { response.body = body; response.emit("finish"); };

  await handler(request, response);

  assert.equal(response.status, 200);
  assert.equal(JSON.parse(response.body).status, "ok");
});
