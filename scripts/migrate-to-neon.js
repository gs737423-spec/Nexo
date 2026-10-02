"use strict";

require("dotenv").config({ path: ".env.local" });
const fs = require("node:fs");
const path = require("node:path");
const { createDatabase } = require("../db");

function readJson(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
}

async function main() {
  const dataDirectory = path.join(__dirname, "..", "data");
  const database = createDatabase();
  await database.initialize();
  const store = readJson(path.join(dataDirectory, "store.json"), readJson(path.join(dataDirectory, "seed.json"), {}));
  await database.write("store", store);
  await database.write("users", readJson(path.join(dataDirectory, "users.json"), []));
  await database.write("audit", readJson(path.join(dataDirectory, "audit.json"), []));
  console.log("Dados locais copiados para o banco compartilhado.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
