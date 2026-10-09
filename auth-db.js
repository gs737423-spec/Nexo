"use strict";

const crypto = require("node:crypto");
const { hashPassword, validatePassword } = require("./auth");

const SESSION_IDLE_MS = 60 * 60 * 1000;
const roles = new Set(["admin", "manager", "assistant"]);
function publicUser(user) { return { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active !== false }; }
function verifyPassword(password, encoded) {
  const [, salt, digest] = String(encoded || "").split("$");
  if (!salt || !digest) return false;
  const candidate = crypto.scryptSync(String(password || ""), salt, 64);
  const stored = Buffer.from(digest, "hex");
  return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
}

function createDatabaseAuthService({ database }) {
  const users = async () => (await database.read("users")) || [];
  const sessions = async () => (await database.read("sessions")) || {};
  const saveSessions = (value) => database.write("sessions", value);
  const audit = async (entry) => { const items=(await database.read("audit"))||[]; items.unshift({id:crypto.randomUUID(),timestamp:new Date().toISOString(),...entry}); await database.write("audit",items.slice(0,1000)); };
  return {
    async hasUsers(){ return (await users()).length>0; },
    async provisionAdmin({name,email,password}) { if(await this.hasUsers()) throw new Error("Já existe um usuário provisionado."); if(!validatePassword(password)) throw new Error("A senha deve ter 10 a 256 caracteres, com maiúscula, minúscula, número e símbolo."); const user={id:crypto.randomUUID(),name,email:String(email).toLowerCase(),role:"admin",active:true,passwordHash:hashPassword(password),createdAt:new Date().toISOString()}; await database.write("users",[user]); await audit({userId:user.id,action:"USER_PROVISIONED",resource:"user"}); return publicUser(user); },
    async createUser({name,email,password,role="assistant"}) { if(!roles.has(role)) throw new Error("Perfil de usuário inválido."); if(!validatePassword(password)) throw new Error("A senha deve ter 10 a 256 caracteres, com maiúscula, minúscula, número e símbolo."); const all=await users(), normalized=String(email).trim().toLowerCase(); if(all.some((item)=>item.email===normalized)) throw new Error("Já existe uma conta com este e-mail."); const user={id:crypto.randomUUID(),name:String(name).trim(),email:normalized,role,active:true,passwordHash:hashPassword(password),createdAt:new Date().toISOString()}; all.push(user); await database.write("users",all); await audit({userId:user.id,action:"USER_CREATED",resource:"user"}); return publicUser(user); },
    async login({email,password}) { const user=(await users()).find((item)=>item.email===String(email||"").trim().toLowerCase()&&item.active!==false); if(!user||!verifyPassword(password,user.passwordHash)) return null; const token=crypto.randomBytes(32).toString("base64url"), all=await sessions(); all[token]={userId:user.id,lastActivity:Date.now()}; await saveSessions(all); await audit({userId:user.id,action:"LOGIN",resource:"session"}); return {token,user:publicUser(user),expiresInSeconds:SESSION_IDLE_MS/1000}; },
    async authenticate(token) { const all=await sessions(), session=all[token]; if(!session||Date.now()-session.lastActivity>SESSION_IDLE_MS){ if(session){delete all[token];await saveSessions(all);} return null;} const user=(await users()).find((item)=>item.id===session.userId&&item.active!==false); if(!user)return null; session.lastActivity=Date.now();await saveSessions(all);return publicUser(user); },
    async logout(token,user){const all=await sessions();delete all[token];await saveSessions(all);if(user)await audit({userId:user.id,action:"LOGOUT",resource:"session"});},
    requireRole(user,allowed){return user&&allowed.includes(user.role);}, audit, async listUsers(){return (await users()).map(publicUser);}, roles,
  };
}
module.exports={createDatabaseAuthService};
