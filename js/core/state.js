const defaults = {user:null, theme:"system", initialized:false};

export const store = {
  state: {...defaults},
  async init() {
    try {
      const saved = JSON.parse(localStorage.getItem("ppka-ui") || "{}");
      this.state = {...defaults, ...saved};
    } catch {}
    this.state.initialized = true;
    this.applyTheme();
  },
  save() {
    localStorage.setItem("ppka-ui", JSON.stringify({
      theme:this.state.theme
    }));
  },
  set(patch, persist=true) {
    this.state = {...this.state, ...patch};
    if (persist) this.save();
    this.applyTheme();
  },
  applyTheme() {
    const dark = this.state.theme === "dark" ||
      (this.state.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }
};