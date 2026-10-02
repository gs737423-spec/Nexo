"use strict";

const path = require("node:path");
const { createAuthService } = require("../auth");

const [name, email, password] = process.argv.slice(2);
if (!name || !email || !password) {
  console.error("Uso: node scripts/provision-admin.js \"Nome\" email@empresa.com \"senha-segura\"");
  process.exit(1);
}
try {
  const auth = createAuthService({ dataDirectory: path.join(__dirname, "..", "data") });
  const user = auth.provisionAdmin({ name, email, password });
  console.log(`Administrador provisionado: ${user.email}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
