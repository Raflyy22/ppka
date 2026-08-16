import { readFile } from "node:fs/promises";
import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

const DB_URL = new URL("../../data/db.json", import.meta.url);
const STORE_NAME = "ppka-simulator-data";
const DB_KEY = "database";
let cachedDb = null;
let cachedEtag = null;

function localDev() {
  return process.env.CONTEXT === "dev" || process.env.NETLIFY_DEV === "true";
}

async function seedDb() {
  return JSON.parse(await readFile(DB_URL, "utf8"));
}

export async function db({ fresh = false } = {}) {
  if (cachedDb && !fresh) return cachedDb;
  try {
    const store = getStore(STORE_NAME);
    const entry = await store.getWithMetadata(DB_KEY, { type: "json" });
    if (entry?.data) {
      cachedDb = entry.data;
      cachedEtag = entry.metadata?.etag || null;
      return cachedDb;
    }
    const seed = await seedDb();
    const saved = await store.setJSON(DB_KEY, seed, { onlyIfNew: true });
    cachedDb = seed;
    cachedEtag = saved?.etag || null;
    return cachedDb;
  } catch (err) {
    if (!localDev()) throw err;
    // Netlify Dev can still run without a connected Blobs store.
    cachedDb = await seedDb();
    cachedEtag = null;
    return cachedDb;
  }
}

export async function saveDb(data) {
  try {
    const store = getStore(STORE_NAME);
    const opts = cachedEtag ? { onlyIfMatch: cachedEtag } : {};
    const saved = await store.setJSON(DB_KEY, data, opts);
    cachedDb = data;
    cachedEtag = saved?.etag || cachedEtag;
    return data;
  } catch (err) {
    if (localDev()) {
      cachedDb = data;
      return data;
    }
    throw err;
  }
}

export function b64url(buf) { return Buffer.from(buf).toString("base64url"); }
export function fromB64(s) { return Buffer.from(s, "base64url"); }
export function randomToken(bytes = 32) { return b64url(crypto.randomBytes(bytes)); }
export function hashPassword(password, salt, iterations = 210000) {
  return crypto.pbkdf2Sync(password, fromB64(salt), iterations, 32, "sha256").toString("base64url");
}
export function safeEqual(a, b) {
  const aa = Buffer.from(a || "", "utf8"), bb = Buffer.from(b || "", "utf8");
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
export function hmac(value, secret) { return b64url(crypto.createHmac("sha256", secret).update(value).digest()); }
export function signSession(payload, secret) {
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return `${body}.${hmac(body, secret)}`;
}
export function verifySession(token, secret) {
  try {
    const [body, sig] = String(token || "").split(".");
    if (!body || !sig || !safeEqual(hmac(body, secret), sig)) return null;
    const payload = JSON.parse(fromB64(body).toString("utf8"));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}
export function cookies(req) {
  return Object.fromEntries((req.headers.get("cookie") || "").split(";").filter(Boolean).map(x => {
    const i = x.indexOf("=");
    return [x.slice(0, i).trim(), decodeURIComponent(x.slice(i + 1).trim())];
  }));
}
export function cookie(name, value, maxAge, { httpOnly = true, sameSite = "Lax", secure = true, path = "/" } = {}) {
  return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=${path}; SameSite=${sameSite}${secure ? "; Secure" : ""}${httpOnly ? "; HttpOnly" : ""}`;
}
export function json(data, status = 200, extra = {}) {
  const headers = new Headers();
  headers.set("Content-Type", "application/json; charset=utf-8");
  for (const [key, value] of Object.entries(extra)) {
    if (Array.isArray(value)) value.forEach(v => headers.append(key, v));
    else headers.set(key, value);
  }
  return new Response(JSON.stringify(data), { status, headers });
}
export function secret() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (localDev()) return "local-development-only-ppka-session-secret-2026-change-me";
  throw new Error("SESSION_SECRET belum diset. Tambahkan sebagai Netlify Environment Variable dengan scope Functions.");
}
export async function requireAuth(req, { admin = false } = {}) {
  try {
    const c = cookies(req), session = verifySession(c.ppka_session, secret());
    if (!session) return { error: json({ ok: false, message: "Unauthorized" }, 401) };
    if (admin && session.role !== "Administrator") return { error: json({ ok: false, message: "Forbidden" }, 403) };
    return { session };
  } catch (err) {
    return { error: json({ ok: false, message: err.message || "Authentication unavailable" }, 500) };
  }
}
export function originOk(req) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("host") || new URL(req.url).host;
  try { return new URL(origin).host === host; } catch { return false; }
}
export function newId(prefix = "id") { return `${prefix}-${crypto.randomUUID()}`; }
