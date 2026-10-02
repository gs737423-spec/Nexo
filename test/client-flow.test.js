"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function response(status, payload) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

test("após confirmar uma NF, a tela recarrega a transportadora criada pelo backend", async () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const script = /<script>\s*"use strict";([\s\S]*?)<\/script>\s*<\/body>/i.exec(html);
  assert.ok(script, "script da aplicação não encontrado");

  const fields = {
    f_nf: { value: "000022350" }, f_carrier: { value: "TRILOG EXPRESS LTDA" },
    f_recipient: { value: "CLIENTE DE TESTE" }, f_doc: { value: "123.456.789-09" },
    f_date: { value: "26/09/2025" }, f_order: { value: "" }, f_dest: { value: "SAO PAULO / SP" },
  };
  const root = { innerHTML: "" };
  const calls = [];
  const invoice = { id: 77, nf: "000022350", carrierId: 5, recipient: "CLIENTE DE TESTE", recipientDoc: "123.456.789-09", issued: "2025-09-26", order: "", city: "SAO PAULO", state: "SP", status: "AGUARDANDO_COLETA", events: [], lastCheck: "2026-09-10T14:17:00.000Z", eta: "", tracking: "", value: 0, series: "1" };
  const sandbox = {
    console, Date, JSON, String, Number, Math, Promise, setTimeout, clearTimeout,
    document: { getElementById: (id) => id === "root" ? root : fields[id] || null, querySelector: () => null, activeElement: null },
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (url === "/api/invoices") return response(201, invoice);
      if (url === "/api/bootstrap") return response(200, { carriers: [{ id: 5, name: "TRILOG EXPRESS LTDA", phone: "", email: "", website: "" }], invoices: [invoice] });
      throw new Error(`requisição inesperada: ${url}`);
    },
  };
  sandbox.window = sandbox;
  vm.runInNewContext(`"use strict";${script[1]}`, sandbox);
  sandbox.state.loggedIn = true;
  sandbox.state.screen = "upload";
  sandbox.state.uploadStep = "confirming";
  sandbox.state.uploadData = { nf: "000022350", carrier: "TRILOG EXPRESS LTDA", recipient: "CLIENTE DE TESTE", doc: "123.456.789-09", date: "26/09/2025", order: "", city: "SAO PAULO", state: "SP" };

  await sandbox.confirmUploadUI();

  assert.deepEqual(calls.map((call) => call.url), ["/api/invoices", "/api/bootstrap"]);
  assert.equal(sandbox.state.screen, "detail");
  assert.equal(sandbox.state.selectedId, 77);
  assert.equal(sandbox.carriers[0].name, "TRILOG EXPRESS LTDA");
  assert.match(root.innerHTML, /TRILOG EXPRESS LTDA/);
});
