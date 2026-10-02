"use strict";

const path = require("node:path");
const pdf = require("pdf-parse");
const { providerForCarrier } = require("./tracking-service");

class InvoiceParseError extends Error {}

function text(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function firstMatch(source, patterns) {
  for (const pattern of patterns) {
    const match = pattern.exec(source);
    if (match && match[1]) return text(match[1]);
  }
  return "";
}

function section(source, startPattern, maxLength = 700) {
  const match = startPattern.exec(source);
  return match ? source.slice(match.index, match.index + maxLength) : "";
}

function carrierFromTransportSection(source) {
  const normalized = text(source).replace(/\n ?/g, "\n");
  const labeled = firstMatch(normalized, [
    /(?:RAZ[ÃA]O\s+SOCIAL|NOME\/?RAZ[ÃA]O\s+SOCIAL)\s*[:.-]?\s*(?:\n\s*)?([^\n]+?)(?=\s*(?:\n|\s)(?:FRETE\s+POR\s+CONTA|C[ÓO]DIGO\s+ANTT|PLACA(?:\s+DO\s+VE[IÍ]CULO)?|CNPJ\/?CPF|UF)\b)/i,
  ]);
  if (labeled && providerForCarrier(labeled)) return labeled;

  const lines = normalized.split("\n").map(text).filter(Boolean);
  for (const line of lines) {
    if (/^(?:TRANSPORT(?:ADOR|ADORA|E)|RAZ[ÃA]O\s+SOCIAL|NOME\/?RAZ[ÃA]O\s+SOCIAL|FRETE\s+POR\s+CONTA|C[ÓO]DIGO\s+ANTT|PLACA\b|CNPJ\/?CPF\b)/i.test(line)) continue;
    if (providerForCarrier(line)) return line;
  }
  if (labeled) return labeled;
  for (const line of lines) {
    if (/^(?:TRANSPORT(?:ADOR|ADORA|E)|RAZ[ÃA]O\s+SOCIAL|NOME\/?RAZ[ÃA]O\s+SOCIAL|FRETE\s+POR\s+CONTA|C[ÓO]DIGO\s+ANTT|PLACA\b|CNPJ\/?CPF\b)/i.test(line)) continue;
    if (/\b(?:LTDA|S\.?A\.?|ME|EPP|TRANSPORTES?|LOG[IÍ]STICA|EXPRESS|CARGAS)\b/i.test(line)) return line;
  }
  return "";
}

function xmlTag(source, tag, scope = source) {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i").exec(scope);
  return match ? text(match[1].replace(/<[^>]+>/g, " ")) : "";
}

function xmlBlock(source, tag) {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i").exec(source);
  return match ? match[1] : "";
}

function formatNf(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length <= 9 ? digits.padStart(9, "0") : digits;
}

function formatDate(value) {
  const normalized = text(value);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(normalized);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const brazilian = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(normalized);
  return brazilian ? `${brazilian[1]}/${brazilian[2]}/${brazilian[3]}` : "";
}

function formatDocument(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 14) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  if (digits.length === 11) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  return text(value);
}

function decimal(value) {
  const raw = text(value);
  if (!raw) return null;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function xmlBlocks(source, tag) {
  return [...String(source || "").matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "ig"))].map((match) => match[1]);
}

function itemFromProduct({ code, description, unit, quantity, unitValue, total }) {
  const parsedQuantity = decimal(quantity);
  let parsedUnitValue = decimal(unitValue);
  let parsedTotal = decimal(total);
  // Some DANFE renderers concatenate the 4-decimal unit price and the
  // 2-decimal total (e.g. `1.306,29001.306,29`). For a single unit the two
  // amounts must agree; recover the intended cents value instead of silently
  // accepting a truncated total.
  if (parsedQuantity === 1 && parsedUnitValue != null && parsedTotal != null && parsedUnitValue - parsedTotal > 500) {
    parsedUnitValue = Math.round(parsedUnitValue * 100) / 100;
    parsedTotal = parsedUnitValue;
  }
  if (!description || parsedQuantity == null || parsedTotal == null) return null;
  return { code: text(code), description: text(description), unit: text(unit), quantity: parsedQuantity, unitValue: parsedUnitValue, total: parsedTotal };
}

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function financialCheck(value, items) {
  const itemTotal = money(items.reduce((sum, item) => sum + Number(item.total || 0), 0));
  const inconsistentItems = items.reduce((count, item) => {
    if (item.unitValue == null || item.quantity == null || item.total == null) return count;
    return count + (Math.abs((item.quantity * item.unitValue) - item.total) > 0.02 ? 1 : 0);
  }, 0);
  return {
    checkedItems: items.filter((item) => item.unitValue != null).length,
    inconsistentItems,
    productsTotal: itemTotal,
    invoiceTotal: value,
    totalDifference: value == null || !items.length ? null : money(value - itemTotal),
  };
}

function baseDraft() {
  return { nf: "", carrier: "", recipient: "", doc: "", date: "", order: "", city: "", state: "", issuer: "", value: null, items: [] };
}

function parseNFeXml(source) {
  const destination = xmlBlock(source, "dest");
  const transport = xmlBlock(source, "transporta");
  const ide = xmlBlock(source, "ide");
  const draft = baseDraft();

  draft.nf = formatNf(xmlTag(source, "nNF", ide));
  draft.carrier = xmlTag(source, "xNome", transport);
  draft.recipient = xmlTag(source, "xNome", destination);
  draft.doc = formatDocument(xmlTag(source, "CNPJ", destination) || xmlTag(source, "CPF", destination));
  draft.date = formatDate(xmlTag(source, "dhEmi", ide) || xmlTag(source, "dEmi", ide));
  draft.order = xmlTag(source, "xPed");
  draft.city = xmlTag(source, "xMun", destination);
  draft.state = xmlTag(source, "UF", destination).toUpperCase();
  draft.issuer = xmlTag(source, "xNome", xmlBlock(source, "emit"));
  draft.value = decimal(xmlTag(source, "vNF", xmlBlock(source, "ICMSTot")));
  draft.items = xmlBlocks(source, "det").map((detail) => itemFromProduct({
    code: xmlTag(detail, "cProd"), description: xmlTag(detail, "xProd"), unit: xmlTag(detail, "uCom"),
    quantity: xmlTag(detail, "qCom"), unitValue: xmlTag(detail, "vUnCom"), total: xmlTag(detail, "vProd"),
  })).filter(Boolean);
  draft.financialCheck = financialCheck(draft.value, draft.items);
  return draft;
}

function parsePdfItems(source) {
  const items = [];
  const pattern = /(?:^|\n)\s*(\d{3,20})(.+?)(\d{8})(\d{3})(\d{4})([A-Z]{1,5})(\d[\d.]*,\d{4})([\d.]+,\d{4})([\d.]+,\d{2})/gmi;
  for (const match of source.matchAll(pattern)) {
    const item = itemFromProduct({
      code: match[1], description: text(match[2]),
      unit: match[6], quantity: match[7], unitValue: match[8], total: match[9],
    });
    if (item) items.push(item);
  }
  return items;
}

function parseNFeText(source) {
  const documentText = text(source).replace(/\n ?/g, "\n");
  const destination = section(documentText, /DESTINAT[^\n]*\n?REMETENTE/i);
  const transport = section(documentText, /(?:TRANSPORT(?:ADOR|ADORA|E)|RAZ[ÃA]O\s+SOCIAL)\s*\/?\s*(?:VOLUMES?\s+TRANSPORTADOS?)?/i, 1100);
  const draft = baseDraft();

  draft.nf = formatNf(firstMatch(documentText, [
    /(?:NF-?E\s*)?N[.º°]\s*0*(\d{4,})\b/i,
    /(?:NF-?E\s*)?N[ÚU]MERO\s*(?:DA\s*NF)?\s*[:.-]?\s*0*(\d{4,})\b/i,
  ]));
  draft.recipient = firstMatch(destination, [
    /NOME\/?RAZ[^\n]*\n\s*([^\n]+)/i,
  ]);
  draft.doc = firstMatch(destination, [
    /(?:CNPJ|CPF)\s*[:.-]?\s*\n?\s*(\d{2}\.?\d{3}\.?\d{3}\/?\d{0,4}-?\d{0,2}|\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/i,
  ]);
  draft.doc = formatDocument(draft.doc);
  draft.date = formatDate(firstMatch(destination, [
    /DATA DE EMISS[ÃA]O\s*[:.-]?\s*(\d{2}\/\d{2}\/\d{4})/i,
  ]) || firstMatch(documentText, [
    /DATA DE EMISS[ÃA]O\s*[:.-]?\s*(\d{2}\/\d{2}\/\d{4})/i,
  ]));
  draft.carrier = carrierFromTransportSection(transport);
  draft.city = firstMatch(destination, [
    /MUNIC[^\n]*\n\s*([^\n]+)/i,
  ]);
  draft.state = firstMatch(destination, [
    /\bUF\s*[:.-]?\s*([A-Z]{2})\b/i,
  ]).toUpperCase();
  draft.order = firstMatch(documentText, [
    /(?:N[ÚU]MERO DO )?PEDIDO\s*[:.-]?\s*([A-Z0-9-]{3,})\b/i,
    /\bXPED\s*[:.-]?\s*([A-Z0-9-]{3,})\b/i,
  ]);
  draft.issuer = firstMatch(documentText, [
    /IDENTIFICA[CÇ][ÃA]O\s+DO\s+EMITENTE\s*\n\s*([^\n]+)/i,
  ]);
  draft.value = decimal(firstMatch(documentText, [
    /VALOR\s+TOTAL\s+DA\s+NOTA\s*[:\n ]+([\d.]+,\d{2})/i,
  ]));
  draft.items = parsePdfItems(documentText);
  draft.financialCheck = financialCheck(draft.value, draft.items);
  return draft;
}

async function parseInvoiceFile({ fileName, base64 }) {
  if (typeof base64 !== "string" || !base64) {
    throw new InvoiceParseError("O conteúdo do arquivo não foi recebido.");
  }

  const extension = path.extname(fileName || "").toLowerCase();
  if (extension !== ".pdf" && extension !== ".xml") {
    throw new InvoiceParseError("Envie uma nota em PDF ou XML.");
  }

  const file = Buffer.from(base64, "base64");
  if (!file.length) throw new InvoiceParseError("O arquivo enviado está vazio.");

  const draft = extension === ".xml"
    ? parseNFeXml(file.toString("utf8"))
    : parseNFeText((await pdf(file)).text);

  if (!draft.nf) {
    throw new InvoiceParseError("Não foi possível identificar o número da NF. Tente o XML da NF-e ou confira o PDF.");
  }
  return draft;
}

module.exports = { InvoiceParseError, parseInvoiceFile, parseNFeText, parseNFeXml };
