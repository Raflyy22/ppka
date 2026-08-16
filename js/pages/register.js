import { auth } from "../core/auth.js";

export function render() {
  return `<main class="page auth-page">
    <section class="card">
      <div class="brand auth-brand"><img class="brand-icon" src="/assets/icons/logo.svg" alt=""><strong>PPKA Simulator</strong></div>
      <div class="eyebrow">Akun baru</div>
      <h1 class="title">Daftar</h1>
      <p class="subtitle">Buat akun operator.</p>
      <div style="height:20px"></div>
      <form class="form" id="register-form">
        <div class="field"><label>Username</label><input name="username" minlength="3" maxlength="30" autocomplete="username" required></div>
        <div class="field"><label>Email</label><input name="email" type="email" maxlength="120" autocomplete="email" required></div>
        <div class="field"><label>Password</label><input name="password" type="password" minlength="8" autocomplete="new-password" required></div>
        <div class="field"><label>Konfirmasi Password</label><input name="confirm" type="password" minlength="8" autocomplete="new-password" required></div>
        <button class="btn btn-primary btn-block">Daftar</button>
        <p id="form-error" class="muted" role="alert"></p>
      </form>
      <div class="divider"></div>
      <button class="btn btn-secondary btn-block" data-route="/login">Sudah punya akun</button>
    </section>
  </main>`;
}

export function mount() {
  document.querySelector("#register-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const form=e.currentTarget, error=document.querySelector("#form-error");
    if(form.password.value !== form.confirm.value){ error.textContent="Konfirmasi password tidak sama."; return; }
    error.textContent="Memproses…";
    try {
      await auth.register(form.username.value.trim(), form.email.value.trim(), form.password.value);
      location.hash="/home";
    } catch(err) { error.textContent=err.message; }
  });
}