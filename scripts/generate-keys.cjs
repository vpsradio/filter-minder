#!/usr/bin/env node
// Genera ANON_KEY y SERVICE_ROLE_KEY a partir de un JWT_SECRET
// Uso: JWT_SECRET=tu-secret node scripts/generate-keys.js

const crypto = require("crypto");
const secret = process.env.JWT_SECRET;
if (!secret) { console.error("Falta JWT_SECRET"); process.exit(1); }

function makeJWT(role) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: "supabase", ref: "local", role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 315360000,
  })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

console.log(`ANON_KEY=${makeJWT("anon")}`);
console.log(`SERVICE_ROLE_KEY=${makeJWT("service_role")}`);
