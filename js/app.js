import { router } from "./router.js";
import { store } from "./core/state.js";
import { auth } from "./core/auth.js";

const app = document.querySelector("#app");

const routes = {
  "/": () => import("./pages/home.js"),
  "/home": () => import("./pages/home.js"),
  "/login": () => import("./pages/login.js"),
  "/register": () => import("./pages/register.js"),
  "/simulator": () => import("./pages/simulator.js"),
  "/profile": () => import("./pages/profile.js"),
  "/settings": () => import("./pages/settings.js")
};

async function render() {
  const path = router.path();
  const loader = routes[path] || routes["/home"];
  const module = await loader();
  app.innerHTML = await module.render({store, auth, navigate:router.navigate});
  module.mount?.();

  document.querySelectorAll("[data-route]").forEach(el =>
    el.addEventListener("click", () => router.navigate(el.dataset.route))
  );
}

window.addEventListener("hashchange", render);

window.addEventListener("load", async () => {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>{});
  await store.init();
  await auth.me();
  await render();
});