import { db, saveDb, hashPassword, safeEqual, signSession, verifySession, cookies, secret, randomToken, cookie, json, originOk, newId } from "./_security.mjs";

const WINDOW = 15 * 60 * 1000;
const LOGIN_LIMIT = 8;
const REGISTER_LIMIT = 4;
const attempts = new Map();

function key(req) { return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"; }
function rateLimited(req, limit = LOGIN_LIMIT) {
  const k = `${limit}:${key(req)}`, now = Date.now(), x = attempts.get(k) || { start: now, count: 0 };
  if (now - x.start > WINDOW) { x.start = now; x.count = 0; }
  x.count++; attempts.set(k, x); return x.count > limit;
}
function commonHeaders() { return { "Cache-Control": "no-store", "Pragma": "no-cache" }; }
function validPassword(p) { return typeof p === "string" && p.length >= 8 && p.length <= 128; }
function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 160; }
function csrfValid(req) { const c = cookies(req); return Boolean(c.ppka_csrf && req.headers.get("x-csrf-token") === c.ppka_csrf); }
function sessionResponse(user, req) {
  const now = Date.now(), csrf = randomToken(24);
  const session = signSession({ sub: user.id, role: user.role, name: user.name, iat: now, exp: now + 8 * 60 * 60 * 1000 }, secret());
  return json({ ok: true, user: { id: user.id, name: user.name, role: user.role, level: user.level, score: user.score } }, 200, {
    ...commonHeaders(),
    "Set-Cookie": [
      cookie("ppka_session", session, 8 * 60 * 60, { httpOnly: true, sameSite: "Lax", secure: new URL(req.url).protocol === "https:" }),
      cookie("ppka_csrf", csrf, 8 * 60 * 60, { httpOnly: false, sameSite: "Lax", secure: new URL(req.url).protocol === "https:" })
    ]
  });
}

export default async req => {
  const url = new URL(req.url), action = url.pathname.split("/").filter(Boolean).pop();
  if (!originOk(req)) return json({ ok: false, message: "Invalid origin" }, 403);

  if (req.method === "POST" && action === "login") {
    if (rateLimited(req)) return json({ ok: false, message: "Terlalu banyak percobaan login. Coba lagi nanti." }, 429, commonHeaders());
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase(), password = String(body.password || "");
    if (!validEmail(email) || !validPassword(password)) return json({ ok: false, message: "Email atau password tidak valid." }, 400, commonHeaders());
    const data = await db();
    const fallback = data.users[0];
    const user = data.users.find(x => String(x.email).toLowerCase() === email);
    const fakeHash = hashPassword(password, fallback.passwordSalt, data.auth.iterations);
    if (!user) { safeEqual(fakeHash, fallback.passwordHash); return json({ ok: false, message: "Email atau password salah." }, 401, commonHeaders()); }
    const candidate = hashPassword(password, user.passwordSalt, data.auth.iterations);
    if (!safeEqual(candidate, user.passwordHash)) return json({ ok: false, message: "Email atau password salah." }, 401, commonHeaders());
    return sessionResponse(user, req);
  }

  if (req.method === "POST" && action === "register") {
    if (rateLimited(req, REGISTER_LIMIT)) return json({ ok: false, message: "Terlalu banyak pendaftaran dari jaringan ini. Coba lagi nanti." }, 429, commonHeaders());
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim(), email = String(body.email || "").trim().toLowerCase(), password = String(body.password || ""), confirmation = String(body.confirmPassword || body.passwordConfirmation || "");
    if (name.length < 2 || name.length > 80) return json({ ok: false, message: "Nama harus 2–80 karakter." }, 400, commonHeaders());
    if (!validEmail(email)) return json({ ok: false, message: "Format email tidak valid." }, 400, commonHeaders());
    if (!validPassword(password)) return json({ ok: false, message: "Password harus 8–128 karakter." }, 400, commonHeaders());
    if (confirmation !== password) return json({ ok: false, message: "Konfirmasi password tidak sama." }, 400, commonHeaders());
    const data = await db({ fresh: true });
    if (data.users.some(x => String(x.email).toLowerCase() === email)) return json({ ok: false, message: "Email sudah terdaftar." }, 409, commonHeaders());
    const salt = randomToken(16);
    const user = { id: newId("u"), name, email, role: "PPKA Trainee", level: 1, score: 0, passwordSalt: salt, passwordHash: hashPassword(password, salt, data.auth.iterations), createdAt: new Date().toISOString() };
    data.users.push(user);
    data.leaderboard = data.leaderboard || [];
    data.activities = data.activities || [];
    data.activities.unshift({ title: "Akun dibuat", description: `${name} mendaftar ke PPKA Simulator.`, time: "Baru saja" });
    await saveDb(data);
    return sessionResponse(user, req);
  }

  if (action === "me") {
    const c = cookies(req), s = verifySession(c.ppka_session, secret());
    if (!s) return json({ ok: true, authenticated: false }, 200, commonHeaders());
    const data = await db();
    const user = data.users.find(x => x.id === s.sub);
    if (!user) return json({ ok: true, authenticated: false }, 200, commonHeaders());
    return json({ ok: true, authenticated: true, user: { id: user.id, name: user.name, role: user.role, level: user.level, score: user.score } }, 200, commonHeaders());
  }

  if (req.method === "POST" && action === "logout") {
    const c = cookies(req), s = verifySession(c.ppka_session, secret());
    if (s && !csrfValid(req)) return json({ ok: false, message: "CSRF validation failed" }, 403, commonHeaders());
    return json({ ok: true }, 200, { ...commonHeaders(), "Set-Cookie": [cookie("ppka_session", "", 0, { httpOnly: true, sameSite: "Lax", secure: new URL(req.url).protocol === "https:" }), cookie("ppka_csrf", "", 0, { httpOnly: false, sameSite: "Lax", secure: new URL(req.url).protocol === "https:" })] });
  }
  return json({ ok: false, message: "Not found" }, 404, commonHeaders());
};
