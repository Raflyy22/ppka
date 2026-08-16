# PPKA Simulator — Netlify Starter

Website simulator PPKA bergaya modern/minimalis dengan HTML, CSS, JavaScript, JSON, dan Netlify Functions.

## Struktur

- `index.html` — shell aplikasi
- `assets/css/app.css` — UI responsive, dark dashboard, animation
- `assets/js/app.js` — routing view, simulator, modal, interaksi
- `data/db.json` — seed/demo data
- `netlify/functions/` — API serverless
- `netlify.toml` — routing, functions, security headers
- `_redirects` — placeholder routing

## Penting tentang db.json

`db.json` cocok sebagai data seed/demo dan development lokal. Pada hosting Netlify, jangan mengandalkan penulisan ke file `db.json` sebagai database permanen karena deployment/static filesystem bukan database persisten.

Untuk production, pertahankan `db.json` sebagai seed awal, lalu pindahkan data yang berubah (akun, jadwal, skor, log, komentar, admin actions) ke database/Netlify Blobs. Frontend tetap HTML/CSS/JS/JSON dan API tetap Netlify Functions.

## Menjalankan

Buka folder ini melalui server lokal, bukan `file://`, agar `fetch('/data/db.json')` bekerja.

Contoh:

```bash
npx serve .
```

Untuk Netlify CLI:

```bash
npm install -g netlify-cli
netlify dev
```

## Modul yang disiapkan

- Dashboard operasional
- Simulator perjalanan real-time sederhana
- Kontrol speed + punctuality
- Signal/event log
- Jadwal kereta CRUD demo
- Monitoring armada
- Daftar stasiun
- Leaderboard
- Activity/audit UI
- Responsive mobile sidebar
- Dark modern interface
- Security headers dasar
- Netlify Functions API

## Tahap berikutnya untuk versi production

1. Auth nyata + role `user/admin`
2. Database persisten
3. Admin dashboard
4. CRUD user/stasiun/kereta/jadwal
5. Validasi server-side
6. Rate limiting
7. Audit log immutable
8. Engine simulasi lebih realistis
9. Peta jalur/interlocking
10. WebSocket/realtime jika diperlukan


## Phase 1 — Security

Phase 1 menambahkan:

- Login server-side melalui Netlify Function.
- Password tidak disimpan plaintext; seed menggunakan PBKDF2-SHA256 + salt.
- Session ditandatangani HMAC dan disimpan pada `HttpOnly; Secure; SameSite=Lax` cookie.
- CSRF token untuk operasi state-changing.
- Role authorization server-side (`Administrator` untuk mutasi jadwal).
- Origin validation.
- Rate limiting dasar pada login.
- Validasi panjang/format input di server.
- Generic login error agar tidak mudah melakukan user enumeration.
- `Cache-Control: no-store` untuk endpoint sensitif.
- Security headers dasar melalui `netlify.toml`.
- Frontend tidak lagi mempercayai `localStorage` untuk identitas login.
- Logout menghapus session dan CSRF cookie.

### Environment variable wajib

Di Netlify Site configuration → Environment variables, buat:

`SESSION_SECRET` = random secret minimal 32 karakter.

Contoh membuat secret dengan Node:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Jangan masukkan `SESSION_SECRET` ke Git, `db.json`, HTML, atau JavaScript frontend.

### Demo login

User:

`raka@example.com`  
`Demo@12345`

Admin:

`admin@example.com`  
`Admin@12345!`

**Ganti kredensial demo sebelum production.**

### Catatan persistence

Phase 1 sengaja tidak mengklaim `db.json` sebagai database writable. Netlify deployment filesystem bukan tempat penyimpanan database permanen. Function `schedules.mjs` sudah melakukan authentication, authorization, CSRF, dan validation; bagian persistence tinggal diarahkan ke database persisten pada fase database.

### Threat model yang sudah ditangani

- XSS dasar → output UI di-escape dan security headers disiapkan.
- CSRF → token untuk mutation.
- Session theft → HttpOnly + Secure + SameSite.
- Brute-force login → rate limit per IP instance.
- Privilege escalation → role dicek server-side.
- User enumeration → error login dibuat generik.
- Invalid input → server-side validation.
- Cache leakage → no-store pada auth/API.

### Batasan Phase 1

Rate limiting in-memory dapat reset ketika function instance berganti. Untuk production traffic tinggi, pindahkan rate-limit counter ke storage persisten/edge provider.


## Phase 2 — User Experience

Phase 2 menambahkan:

- Dashboard personal yang lebih informatif.
- Quick Actions.
- XP progress + level.
- Achievement system.
- Notification center.
- Profile view.
- Profile quick menu.
- Interactive tutorial/training modal 4 langkah.
- Responsive mobile UX.
- Keyboard focus states.
- Hover/micro-interactions.
- Improved cards and CTA hierarchy.
- Personal greeting.
- Improved empty states and feedback.
- Demo notification + achievement data di `db.json`.

Phase 2 tetap menjaga prinsip bahwa permission/security harus diputuskan oleh backend; UX hanya mempermudah pengguna, bukan menggantikan authorization.


## Phase 3 — PPKA Simulator Engine

Phase 3 mengubah simulator menjadi engine operasional:

- Route + block model.
- Station model.
- Per-segment maximum speed.
- Signal aspect (`green`, `yellow`, `red`).
- Headway/traffic events.
- Incident events.
- Dwell simulation.
- Speed control + acceleration/deceleration.
- Emergency brake.
- Overspeed penalty.
- Signal violation penalty.
- Delay tracking.
- Progress, distance, active block, next station.
- Real-time event log.
- Score breakdown: safety, signal, speed, station, conflict, on-time.
- Scenario selector.
- Reset / pause / start.
- Route visualization.
- Authenticated simulator data endpoint.

### Catatan simulasi

Engine ini adalah **simulator game/edukasi**, bukan sistem interlocking atau sistem operasi kereta api nyata. Model jalur, sinyal, headway, dan scoring dibuat untuk gameplay dan dapat diperluas pada fase berikutnya.


## Phase 4 — Admin Panel

Phase 4 menambahkan Admin Control Center terpisah:

- Overview/system health.
- User management.
- Schedule management.
- Station management.
- Train/fleet management.
- Scenario management.
- Audit log viewer.
- Admin-only server endpoint.
- Server-side admin authorization.
- CSRF pada mutation.
- Server-side validation.
- Responsive admin layout.
- Quick management cards.
- Export audit JSON dari UI.

**Persistence note:** admin mutation endpoint saat ini melakukan validation + authorization tetapi tidak menulis ke `db.json` production. Ini disengaja agar aplikasi tidak memberi kesan palsu bahwa filesystem Netlify adalah database persisten. Phase 5 akan memindahkan data mutable ke database persisten.

## Phase 4.5 — Reliability & Production Readiness

Perbaikan penting sebelum dipakai publik:

- Frontend tidak lagi membaca `data/db.json` secara langsung.
- Password hash dan data internal seed tidak dipublish sebagai static asset.
- Static site dipindahkan ke `public/`; Functions tetap berada di `netlify/functions`.
- `data/db.json` menjadi seed/server-only data dan dimasukkan ke bundle Functions melalui `included_files`.
- Data mutable disimpan dengan Netlify Blobs (`@netlify/blobs`) agar perubahan user/admin tetap persisten antar-deploy.
- Register user baru sudah tersedia.
- Login / logout / session / CSRF diperbaiki.
- Admin CRUD benar-benar menulis data persisten.
- Schedule CRUD benar-benar menulis data persisten.
- Hasil simulator dapat disimpan ke `simulationRuns` dan menambah score user.
- API `/api/app` mengirim data yang sudah disanitasi tanpa password hash.
- Error demo-local fallback pada schedule dihapus agar kegagalan API tidak disamarkan.
- `SESSION_SECRET` wajib untuk production dan harus dibuat sebagai Netlify Environment Variable dengan Functions scope.

### Production environment

Set:

`SESSION_SECRET=<random secret minimal 32 karakter>`

Netlify Functions membaca environment variable runtime dari konfigurasi environment Netlify; perubahan environment variable memerlukan deploy ulang. Jangan memasukkan secret ke repository atau `netlify.toml`.
