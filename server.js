"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");
const seed = require("./data/seed.json");
const { InvoiceParseError, parseInvoiceFile } = require("./invoice-parser");
const { createAuthService } = require("./auth");
const { createDatabaseAuthService } = require("./auth-db");
const { createDatabase } = require("./db");
const { carrierProfileFor, createTrackingService, providerForCarrier } = require("./tracking-service");

const JSON_LIMIT_BYTES = 15 * 1024 * 1024;
const DEFAULT_PORT = 3000;
const MANUAL_STATUSES = new Map([
  ["AGUARDANDO_COLETA", "Aguardando coleta"], ["COLETADO", "Coletado"], ["EM_TRANSITO", "Em trânsito"],
  ["UNIDADE_DESTINO", "Na unidade de destino"], ["SAIU_PARA_ENTREGA", "Saiu para entrega"], ["ENTREGUE", "Entregue"],
  ["ATRASADO", "Atrasado"], ["OCORRENCIA", "Problema na entrega"], ["CANCELADO", "Cancelado"], ["SEM_INFORMACAO", "Sem informação"],
]);

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sendError(response, error) {
  const status = error instanceof ApiError ? error.status : 500;
  const message = error instanceof ApiError ? error.message : "Erro interno do servidor.";
  if (status === 500) console.error(error);
  sendJson(response, status, { error: message });
}

function bearerToken(request) {
  const authorization = typeof request.headers?.get === "function"
    ? request.headers.get("authorization")
    : request.headers?.authorization;
  const match = /^Bearer\s+(.+)$/i.exec(authorization || "");
  return match ? match[1] : "";
}

function readJsonBody(request) {
  // Vercel Functions hand us a Web Request, whereas local Node uses an
  // IncomingMessage stream. Supporting both preserves the same API contract.
  if (typeof request.json === "function" && typeof request.on !== "function") {
    return request.json().catch(() => {
      throw new ApiError(400, "JSON inválido.");
    });
  }
  return new Promise((resolve, reject) => {
    let received = 0;
    const chunks = [];

    request.on("data", (chunk) => {
      received += chunk.length;
      if (received > JSON_LIMIT_BYTES) {
        reject(new ApiError(413, "Corpo da solicitação excede o limite de 15 MB."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new ApiError(400, "JSON inválido."));
      }
    });
    request.on("error", reject);
  });
}

function ensureStore(dataFile) {
  if (fs.existsSync(dataFile)) return;
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(seed, null, 2) + "\n", "utf8");
}

function readStore(dataFile) {
  ensureStore(dataFile);
  return JSON.parse(fs.readFileSync(dataFile, "utf8"));
}

function writeStore(dataFile, data) {
  const temporaryFile = `${dataFile}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(data, null, 2) + "\n", "utf8");
  fs.renameSync(temporaryFile, dataFile);
}

function requiredText(value, label, maxLength) {
  if (typeof value !== "string") throw new ApiError(422, `${label} é obrigatório.`);
  const normalized = value.trim();
  if (!normalized) throw new ApiError(422, `${label} é obrigatório.`);
  if (normalized.length > maxLength) throw new ApiError(422, `${label} excede ${maxLength} caracteres.`);
  return normalized;
}

function optionalText(value, maxLength) {
  if (value == null) return "";
  if (typeof value !== "string") throw new ApiError(422, "Formato de dado inválido.");
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new ApiError(422, `Texto excede ${maxLength} caracteres.`);
  return normalized;
}

function optionalMoney(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new ApiError(422, "Valor da nota inválido.");
  return Math.round(value * 100) / 100;
}

function invoiceDocument(body) {
  const fileName = optionalText(body.documentName, 255);
  const rawContent = optionalText(body.documentContent, 14 * 1024 * 1024);
  if (!fileName && !rawContent) return null;
  const extension = /\.xml$/i.test(fileName) ? "xml" : "pdf";
  if (!/\.(pdf|xml)$/i.test(fileName) || !/^[A-Za-z0-9+/=]+$/.test(rawContent)) {
    throw new ApiError(422, "O arquivo da nota fiscal é inválido.");
  }
  return { name: fileName, content: `data:application/${extension};base64,${rawContent}`, uploadedAt: new Date().toISOString() };
}

function invoiceItems(value) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 200) throw new ApiError(422, "Itens da nota inválidos.");
  return value.map((item) => {
    if (!item || typeof item !== "object") throw new ApiError(422, "Item da nota inválido.");
    const description = requiredText(item.description, "Descrição do item", 300);
    const quantity = optionalMoney(item.quantity);
    const unitValue = optionalMoney(item.unitValue);
    const total = optionalMoney(item.total);
    if (quantity == null || total == null) throw new ApiError(422, "Quantidade e total do item são obrigatórios.");
    if (unitValue != null && Math.abs((quantity * unitValue) - total) > 0.02) {
      throw new ApiError(422, "O total do item não confere com quantidade e valor unitário.");
    }
    return { code: optionalText(item.code, 64), description, unit: optionalText(item.unit, 16), quantity, unitValue, total };
  });
}

function createReport(store, body, user) {
  const screenshot = optionalText(body.screenshot, 12 * 1024 * 1024);
  if (screenshot && !/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+$/i.test(screenshot)) throw new ApiError(422, "A captura de tela é inválida.");
  if (!Array.isArray(body.selections) || !body.selections.length || body.selections.length > 20) throw new ApiError(422, "Selecione pelo menos uma área da tela.");
  const selections = body.selections.map((selection) => {
    if (!selection || typeof selection !== "object") throw new ApiError(422, "Seleção inválida.");
    const normalized = {};
    for (const key of ["x", "y", "width", "height"]) {
      const value = selection[key];
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) throw new ApiError(422, "Seleção inválida.");
      normalized[key] = value;
    }
    if (!normalized.width || !normalized.height) throw new ApiError(422, "Seleção inválida.");
    normalized.kind = optionalText(selection.kind, 16) || "ERRO";
    if (!new Set(["ERRO", "SUGESTAO"]).has(normalized.kind)) throw new ApiError(422, "Tipo de report inválido.");
    normalized.legend = requiredText(selection.legend, "Legenda da área", 300);
    return normalized;
  });
  const now = new Date().toISOString();
  const reports = store.reports || (store.reports = []);
  return {
    id: reports.reduce((highest, report) => Math.max(highest, report.id || 0), 0) + 1,
    title: optionalText(body.title, 120) || "Erro reportado na tela",
    description: optionalText(body.description, 2000),
    screenshot,
    selections,
    screen: optionalText(body.screen, 40),
    createdAt: now,
    by: user.name,
  };
}

function toIsoDate(value) {
  if (typeof value !== "string") return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function dateOnly(isoDate) {
  return isoDate.slice(0, 10);
}

function withCarrierProfile(carrier) {
  const profile = carrierProfileFor(carrier.name);
  if (providerForCarrier(carrier.name)) {
    return { ...carrier, ...profile };
  }
  return {
    ...carrier,
    website: carrier.website || profile.website,
    phone: carrier.phone || profile.phone,
    email: carrier.email || profile.email,
  };
}

function createInvoice(store, body, user) {
  const nf = requiredText(body.nf, "Número da NF", 32);
  const recipient = requiredText(body.recipient, "Destinatário", 120);
  const recipientDoc = optionalText(body.recipientDoc, 32);
  const order = optionalText(body.order, 64);
  const rca = optionalText(body.rca, 80);
  const etaInput = optionalText(body.eta, 16);
  const eta = etaInput ? toIsoDate(etaInput) : "";
  if (etaInput && !eta) throw new ApiError(422, "Data prevista inválida.");
  const tracking = optionalText(body.tracking, 80) || nf;
  const cte = optionalText(body.cte, 48);
  const issuer = optionalText(body.issuer, 120);
  const value = optionalMoney(body.value);
  const items = invoiceItems(body.items);
  const document = invoiceDocument(body);
  const city = requiredText(body.city, "Cidade", 80);
  const state = requiredText(body.state, "UF", 2).toUpperCase();
  const carrierName = requiredText(body.carrier, "Transportadora", 80);
  let carrier = store.carriers.find((item) => item.name.toLowerCase() === carrierName.toLowerCase());
  if (!carrier) {
    const carrierId = store.carriers.reduce((highest, item) => Math.max(highest, item.id), 0) + 1;
    carrier = { id: carrierId, name: carrierName, ...carrierProfileFor(carrierName) };
    store.carriers.push(carrier);
  }

  const now = new Date().toISOString();
  const id = store.invoices.reduce((highest, item) => Math.max(highest, item.id), 0) + 1;
  const issued = toIsoDate(body.date) || dateOnly(now);

  return {
    id,
    nf,
    series: "1",
    order,
    rca,
    issued,
    eta,
    issuer,
    recipient,
    recipientDoc,
    city,
    state,
    value,
    items,
    document,
    carrierId: carrier.id,
    status: "AGUARDANDO_COLETA",
    tracking,
    cte,
    lastCheck: now,
    by: user.name,
    uploadedBy: user.name,
    uploadedAt: now,
    events: [{ s: "NOTA_CADASTRADA", l: "Nota cadastrada", d: now, loc: "" }],
  };
}

function createNexoServer(options = {}) {
  const dataFile = options.dataFile || path.join(__dirname, "data", "store.json");
  const indexFile = options.indexFile || path.join(__dirname, "index.html");
  const database = options.database || (process.env.DATABASE_URL ? createDatabase() : null);
  const localAuth = createAuthService({ dataDirectory: path.dirname(dataFile) });
  const auth = options.authService || (database ? createDatabaseAuthService({ database }) : localAuth);
  const tracking = options.trackingService || createTrackingService();
  const reportsOwnerEmail = String(options.reportsOwnerEmail || process.env.NEXO_REPORTS_OWNER_EMAIL || "gs737423@gmail.com").trim().toLowerCase();
  const canViewReports = (user) => Boolean(user && user.email === reportsOwnerEmail);
  const loadStore = async () => {
    if (!database) return readStore(dataFile);
    await database.initialize();
    const store = await database.read("store");
    if (store) return store;
    const initial = clone(seed); await database.write("store", initial); return initial;
  };
  const saveStore = async (store) => database ? database.write("store", store) : writeStore(dataFile, store);

  return http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url, "http://localhost");
      const pathname = requestUrl.pathname;

      if (request.method === "GET" && (pathname === "/" || pathname === "/index.html")) {
        response.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        });
        fs.createReadStream(indexFile).pipe(response);
        return;
      }

      if (request.method === "GET" && pathname === "/api/health") {
        sendJson(response, 200, { status: "ok", authConfigured: await auth.hasUsers() });
        return;
      }

      if (request.method === "POST" && pathname === "/api/auth/login") {
        const body = await readJsonBody(request);
        const email = requiredText(body.email, "E-mail", 160);
        const result = await auth.login({ email, password: body.password, ip: request.socket?.remoteAddress || "unknown" });
        if (!result) throw new ApiError(401, "E-mail ou senha inválidos.");
        sendJson(response, 200, result);
        return;
      }

      if (pathname.startsWith("/api/")) {
        const token = bearerToken(request);
        const user = await auth.authenticate(token);
        if (!user) throw new ApiError(401, "Sua sessão expirou ou não é válida.");

        if (request.method === "POST" && pathname === "/api/auth/logout") {
          await auth.logout(token, user);
          sendJson(response, 200, { ok: true });
          return;
        }
        if (request.method === "GET" && pathname === "/api/auth/me") {
          sendJson(response, 200, { user });
          return;
        }
        if (request.method === "GET" && pathname === "/api/admin/users") {
          if (!auth.requireRole(user, ["admin", "manager"])) throw new ApiError(403, "Você não possui permissão para esta área.");
          sendJson(response, 200, { users: await auth.listUsers() });
          return;
        }
        if (request.method === "GET" && pathname === "/api/tracking/providers") {
          sendJson(response, 200, { providers: tracking.providers() });
          return;
        }

      if (request.method === "GET" && pathname === "/api/bootstrap") {
        const store = await loadStore();
        const { reports, ...bootstrapStore } = clone(store);
        // Document content is fetched only on demand. Keeping base64 PDFs out of
        // the bootstrap response avoids leaking large files to every screen and
        // keeps the initial load fast.
        bootstrapStore.invoices = (bootstrapStore.invoices || []).map(({ document, ...invoice }) => invoice);
        sendJson(response, 200, { ...bootstrapStore, carriers: store.carriers.map(withCarrierProfile), user: { ...user, reportsAccess: canViewReports(user) } });
        return;
      }

      if (request.method === "GET" && pathname === "/api/reports") {
        if (!canViewReports(user)) throw new ApiError(403, "Você não possui permissão para visualizar os reports.");
        const store = await loadStore();
        sendJson(response, 200, { reports: clone(store.reports || []) });
        return;
      }

      if (request.method === "POST" && pathname === "/api/uploads/parse") {
        const body = await readJsonBody(request);
        const fileName = requiredText(body.fileName, "Arquivo", 255);
        try {
          const draft = await parseInvoiceFile({ fileName, base64: body.fileContent });
          await auth.audit({ userId: user.id, action: "INVOICE_PARSED", resource: "invoice" });
          sendJson(response, 200, { draft });
        } catch (error) {
          if (error instanceof InvoiceParseError) throw new ApiError(422, error.message);
          throw error;
        }
        return;
      }

      if (request.method === "POST" && pathname === "/api/reports") {
        const body = await readJsonBody(request);
        const store = await loadStore();
        const report = createReport(store, body, user);
        store.reports.push(report);
        await saveStore(store);
        await auth.audit({ userId: user.id, action: "BUG_REPORTED", resource: `report:${report.id}` });
        sendJson(response, 201, { id: report.id, createdAt: report.createdAt });
        return;
      }

      if (request.method === "POST" && pathname === "/api/invoices") {
        const body = await readJsonBody(request);
        const store = await loadStore();
        const nf = String(body.nf || "").trim();
        const recipientDoc = String(body.recipientDoc || "").trim();
        const recipient = String(body.recipient || "").trim().toLowerCase();
        const existing = store.invoices.find((item) => {
          if (item.nf !== nf) return false;
          if (recipientDoc && item.recipientDoc) return item.recipientDoc === recipientDoc;
          return !recipientDoc && !item.recipientDoc && String(item.recipient || "").trim().toLowerCase() === recipient;
        });
        if (existing) {
          if (!body.documentContent) throw new ApiError(409, "Esta NF já está cadastrada. Abra a nota existente para editá-la ou anexe o PDF original nela.");
          existing.document = invoiceDocument(body);
          existing.uploadedBy = user.name;
          existing.uploadedAt = new Date().toISOString();
          await saveStore(store);
          await auth.audit({ userId: user.id, action: "INVOICE_DOCUMENT_UPDATED", resource: `invoice:${existing.id}` });
          sendJson(response, 200, existing);
          return;
        }
        const invoice = createInvoice(store, body, user);
        store.invoices.unshift(invoice);
        await saveStore(store);
        await auth.audit({ userId: user.id, action: "INVOICE_CREATED", resource: `invoice:${invoice.id}` });
        sendJson(response, 201, invoice);
        return;
      }

      const invoiceRoute = /^\/api\/invoices\/(\d+)(?:\/(refresh|status|details|document))?$/.exec(pathname);
      if (invoiceRoute) {
        const invoiceId = Number(invoiceRoute[1]);
        const store = await loadStore();
        const invoice = store.invoices.find((item) => item.id === invoiceId);
        if (!invoice) throw new ApiError(404, "Nota fiscal não encontrada.");

        if (request.method === "GET" && !invoiceRoute[2]) {
          const { document, ...safeInvoice } = invoice;
          sendJson(response, 200, safeInvoice);
          return;
        }
        if (request.method === "GET" && pathname.endsWith("/document")) {
          if (!invoice.document) throw new ApiError(404, "Esta nota não possui o arquivo original salvo.");
          const match = /^data:application\/(pdf|xml);base64,(.+)$/i.exec(invoice.document.content);
          if (!match) throw new ApiError(500, "Arquivo da nota inválido.");
          response.writeHead(200, { "Content-Type": match[1].toLowerCase() === "pdf" ? "application/pdf" : "application/xml", "Content-Disposition": `inline; filename=\"${invoice.document.name.replace(/[^a-z0-9_.-]/gi, "_")}\"`, "Cache-Control": "private, no-store" });
          response.end(Buffer.from(match[2], "base64"));
          return;
        }

        if (request.method === "DELETE" && !invoiceRoute[2]) {
          if (!auth.requireRole(user, ["admin", "manager"])) throw new ApiError(403, "Você não possui permissão para excluir notas fiscais.");
          store.invoices = store.invoices.filter((item) => item.id !== invoice.id);
          await saveStore(store);
          await auth.audit({ userId: user.id, action: "INVOICE_DELETED", resource: `invoice:${invoice.id}` });
          sendJson(response, 200, { ok: true, id: invoice.id });
          return;
        }

        if (request.method === "POST" && invoiceRoute[2] === "refresh") {
          const carrier = store.carriers.find((item) => item.id === invoice.carrierId);
          const result = await tracking.refresh({ invoice, carrier });
          if (!result.ok) throw new ApiError(424, result.message);
          invoice.lastCheck = new Date().toISOString();
          await saveStore(store);
          await auth.audit({ userId: user.id, action: "TRACKING_REFRESHED", resource: `invoice:${invoice.id}` });
          sendJson(response, 200, invoice);
          return;
        }

        if (request.method === "POST" && invoiceRoute[2] === "status") {
          const body = await readJsonBody(request);
          const status = requiredText(body.status, "Etapa", 40);
          if (!MANUAL_STATUSES.has(status)) throw new ApiError(422, "Etapa de entrega inválida.");
          const note = optionalText(body.note, 300);
          const now = new Date().toISOString();
          invoice.status = status;
          invoice.lastCheck = now;
          invoice.by = user.name;
          invoice.events = invoice.events || [];
          invoice.events.push({ s: status, l: note || MANUAL_STATUSES.get(status), d: now, loc: "Atualização manual" });
          await saveStore(store);
          await auth.audit({ userId: user.id, action: "INVOICE_STATUS_UPDATED", resource: `invoice:${invoice.id}` });
          sendJson(response, 200, invoice);
          return;
        }

        if (request.method === "POST" && invoiceRoute[2] === "details") {
          const body = await readJsonBody(request);
          invoice.rca = optionalText(body.rca, 80);
          const etaInput = optionalText(body.eta, 16);
          if (etaInput && !toIsoDate(etaInput)) throw new ApiError(422, "Data prevista inválida.");
          invoice.eta = etaInput ? toIsoDate(etaInput) : "";
          await saveStore(store);
          await auth.audit({ userId: user.id, action: "INVOICE_DETAILS_UPDATED", resource: `invoice:${invoice.id}` });
          sendJson(response, 200, invoice);
          return;
        }
      }

      sendJson(response, 404, { error: "Rota não encontrada." });
      }
    } catch (error) {
      sendError(response, error);
    }
  });
}

const application = createNexoServer();

if (require.main === module) {
  const configuredPort = Number(process.env.PORT || DEFAULT_PORT);
  const port = Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : DEFAULT_PORT;
  application.listen(port, () => {
    console.log(`NEXO disponível em http://localhost:${port}`);
  });
}

module.exports = application;
module.exports.createNexoServer = createNexoServer;
