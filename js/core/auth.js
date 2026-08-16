import { api } from "./api.js";
import { store } from "./state.js";

export const auth = {
  async me() {
    try {
      const result = await api("/api/auth/me");
      store.set({user: result.user || null}, false);
      return result.user || null;
    } catch {
      store.set({user:null}, false);
      return null;
    }
  },
  async login(identity, password) {
    const result = await api("/api/auth/login", {
      method:"POST",
      body:JSON.stringify({identity,password})
    });
    store.set({user:result.user || null});
    return result;
  },
  async register(username, email, password) {
    const result = await api("/api/auth/register", {
      method:"POST",
      body:JSON.stringify({username,email,password})
    });
    store.set({user:result.user || null});
    return result;
  },
  async logout() {
    await api("/api/auth/logout", {method:"POST"});
    store.set({user:null});
  }
};