"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const SESSION_IDLE_MS = 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;
const roles = new Set(["admin", "manager", "assistant"]);

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + "\n", "utf8");
  fs.renameSync(temporary, file);
}
function derive(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `scrypt$${salt}$${derive(password, salt)}`;
}
function verifyPassword(password, encoded) {
  const [, salt, digest] = String(encoded || "").split("$");
  if (!salt || !digest) return false;
  const candidate = Buffer.from(derive(password, salt), "hex");
  const stored = Buffer.from(digest, "hex");
  return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
}
function validatePassword(password) {
  return typeof password === "string" && password.length >= 10 && password.length <= 256 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active !== false };
}

function createAuthService({ dataDirectory }) {
  const usersFile = path.join(dataDirectory, "users.json");
  const auditFile = path.join(dataDirectory, "audit.json");
  const sessions = new Map();
  const attempts = new Map();
  const users = () => readJson(usersFile, []);
  const saveUsers = (value) => writeJson(usersFile, value);
  const audit = (entry) => {
    const entries = readJson(auditFile, []);
    entries.unshift({ id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...entry });
    writeJson(auditFile, entries.slice(0, 1000));
  };
  const checkAttempts = (ip) => {
    const now = Date.now();
    const history = (attempts.get(ip) || []).filter((time) => now - time < LOGIN_WINDOW_MS);
    attempts.set(ip, history);
    return history.length < LOGIN_MAX_ATTEMPTS;
  };
  const failedAttempt = (ip, email) => {
    const history = attempts.get(ip) || [];
    history.push(Date.now()); attempts.set(ip, history);
    audit({ action: "FAILED_LOGIN", resource: "session", metadata: { email } });
  };

  return {
    hasUsers: () => users().length > 0,
    provisionAdmin({ name, email, password }) {
      if (this.hasUsers()) throw new Error("Já existe um usuário provisionado.");
      if (!validatePassword(password)) throw new Error("A senha deve ter 10 a 256 caracteres, com maiúscula, minúscula, número e símbolo.");
      const user = { id: crypto.randomUUID(), name, email: email.toLowerCase(), role: "admin", active: true, passwordHash: hashPassword(password), createdAt: new Date().toISOString() };
      saveUsers([user]); audit({ userId: user.id, action: "USER_PROVISIONED", resource: "user" });
      return publicUser(user);
    },
    createUser({ name, email, password, role = "assistant" }) {
      if (!roles.has(role)) throw new Error("Perfil de usuário inválido.");
      if (!validatePassword(password)) throw new Error("A senha deve ter 10 a 256 caracteres, com maiúscula, minúscula, número e símbolo.");
      const normalized = String(email || "").trim().toLowerCase();
      if (users().some((user) => user.email === normalized)) throw new Error("Já existe uma conta com este e-mail.");
      const user = { id: crypto.randomUUID(), name: String(name || "").trim(), email: normalized, role, active: true, passwordHash: hashPassword(password), createdAt: new Date().toISOString() };
      saveUsers([...users(), user]); audit({ userId: user.id, action: "USER_CREATED", resource: "user" });
      return publicUser(user);
    },
    login({ email, password, ip }) {
      const normalized = String(email || "").trim().toLowerCase();
      if (!checkAttempts(ip)) { audit({ action: "RATE_LIMITED_LOGIN", resource: "session" }); return null; }
      const user = users().find((item) => item.email === normalized && item.active !== false);
      if (!user || !verifyPassword(String(password || ""), user.passwordHash)) { failedAttempt(ip, normalized); return null; }
      attempts.delete(ip);
      const token = crypto.randomBytes(32).toString("base64url");
      sessions.set(token, { userId: user.id, lastActivity: Date.now() });
      audit({ userId: user.id, action: "LOGIN", resource: "session" });
      return { token, user: publicUser(user), expiresInSeconds: SESSION_IDLE_MS / 1000 };
    },
    authenticate(token) {
      const session = sessions.get(token);
      if (!session || Date.now() - session.lastActivity > SESSION_IDLE_MS) { sessions.delete(token); return null; }
      const user = users().find((item) => item.id === session.userId && item.active !== false);
      if (!user) { sessions.delete(token); return null; }
      session.lastActivity = Date.now();
      return publicUser(user);
    },
    logout(token, user) { sessions.delete(token); if (user) audit({ userId: user.id, action: "LOGOUT", resource: "session" }); },
    requireRole(user, allowed) { return user && allowed.includes(user.role); },
    audit,
    listUsers() { return users().map(publicUser); },
    usersFile,
  };
}

module.exports = { createAuthService, hashPassword, validatePassword, roles };
