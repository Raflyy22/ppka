import { auth } from "../core/auth.js";

export function render() {
  return `<main class="page auth-page">
    <section class="card">
      <div class="brand auth-brand"><img class="brand-icon" src="/assets/icons/logo.svg" alt=""><strong>PPKA Simulator</strong></div>
      <div class="eyebrow">Akun</div>
      <h1 class="title">Masuk</h1>
      <p class="subtitle">Gunakan akun operator Anda.</p>
      <div style="height:20px"></div>
      <form class="form" id="login-form">
        <div class="field"><label>Username / Email</label><input name="identity" autocomplete="username" required></div>
        <div class="field"><label>Password</label><input type="password" name="password" autocomplete="current-password" required></div>
        <button class="btn btn-primary btn-block">Masuk</button>
        <p id="form-error" class="muted" role="alert"></p>
      </form>
      <div class="divider"></div>
      <button class="btn btn-secondary btn-block" data-route="/register">Buat akun</button>
    </section>
  </main>`;
}

export function mount() {
  document.querySelector("#login-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const form=e.currentTarget, error=document.querySelector("#form-error");
    error.textContent="Memproses…";
    try {
      await auth.login(form.identity.value.trim(), form.password.value);
      location.hash="/home";
    } catch(err) {
      error.textContent=err.message;
    }
  });
}