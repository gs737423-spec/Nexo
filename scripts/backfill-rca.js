"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { parseInvoiceFile } = require("../invoice-parser");

async function main() {
  const dataFile = process.argv[2] || path.join(__dirname, "..", "data", "store.json");
  const store = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  let scanned = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const invoice of store.invoices || []) {
    if (invoice.rca || !invoice.document || !invoice.document.content) {
      skipped += 1;
      continue;
    }

    scanned += 1;
    try {
      const match = /^data:application\/(pdf|xml);base64,(.+)$/i.exec(invoice.document.content);
      if (!match) throw new Error("documento em formato inválido");
      const draft = await parseInvoiceFile({ fileName: invoice.document.name, base64: match[2] });
      if (!draft.rca) continue;
      invoice.rca = draft.rca;
      updated += 1;
    } catch (error) {
      failed += 1;
      console.error(`NF ${invoice.nf}: ${error.message}`);
    }
  }

  if (updated > 0) {
    const temporaryFile = `${dataFile}.rca-backfill.tmp`;
    fs.writeFileSync(temporaryFile, `${JSON.stringify(store, null, 2)}\n`);
    fs.renameSync(temporaryFile, dataFile);
  }

  console.log(JSON.stringify({ dataFile, scanned, updated, skipped, failed }));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
