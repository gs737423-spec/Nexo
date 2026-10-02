"use strict";

const { neon } = require("@neondatabase/serverless");

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

function createDatabase() {
  const url = databaseUrl();
  if (!url) throw new Error("DATABASE_URL não está configurada.");
  const sql = neon(url);

  return {
    async initialize() {
      await sql`CREATE TABLE IF NOT EXISTS nexo_state (
        state_key TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
    },
    async read(key) {
      const rows = await sql`SELECT payload FROM nexo_state WHERE state_key = ${key}`;
      return rows.length ? rows[0].payload : null;
    },
    async write(key, payload) {
      await sql`INSERT INTO nexo_state (state_key, payload, updated_at)
        VALUES (${key}, ${JSON.stringify(payload)}::jsonb, NOW())
        ON CONFLICT (state_key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`;
    },
  };
}

module.exports = { createDatabase, databaseUrl };
