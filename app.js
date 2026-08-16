// Global State V4.0
const ADMIN_PIN = "1234";
let speedMultiplier = 1;
let simTime = new Date();

let state = {
  isAdmin: false,
  station: "",
  signals: [],
  switches: [],
  tracks: [],
  schedules: [],
  logs: []
};

// Initialize App
document.addEventListener("DOMContentLoaded", async () => {
  await loadDatabase();
  initClock();
  renderApp();
  setupEventListeners();
});

// Load / Save DB
async function loadDatabase() {
  const localData = localStorage.getItem("ppka_db_v4");
  if (localData) {
    state = JSON.parse(localData);
  } else {
    try {
      const res = await fetch("db.json");
      const data = await res.json();
      state = { ...state, ...data };
      saveDatabase();
    } catch (err) {
      console.error("Gagal memuat db.json", err);
    }
  }
}

function saveDatabase() {
  localStorage.setItem("ppka_db_v4", JSON.stringify(state));
}

// Clock & Speed Control
function initClock() {
  const clockEl = document.getElementById("clock");
  setInterval(() => {
    simTime = new Date(simTime.getTime() + (1000 * speedMultiplier));
    clockEl.textContent = simTime.toLocaleTimeString("id-ID") + " WIB";
  }, 1000);
}

window.setSpeed = (speed) => {
  speedMultiplier = speed;
  document.querySelectorAll(".btn-speed").forEach(b => b.classList.remove("active"));
  document.getElementById(`spd-${speed}`).classList.add("active");
  addLog(`Kecepatan waktu simulasi diubah ke ${speed}x`);
};

// Audio Synthesizer: KAI 4-Beep Chime V4.0
function playKAIChimeThenAnnounce(text) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    
    // Frekuensi Nada Chime Stasiun KAI (Sol - Do' - Mi' - Sol')
    const notes = [392.00, 523.25, 659.25, 783.99]; 
    let startTime = ctx.currentTime;

    notes.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.45);
      startTime += 0.35;
    });

    // Jalankan Announcer Suara setelah Chime Selesai
    setTimeout(() => {
      speakAnnouncer(text);
    }, 1600);
  } catch (e) {
    speakAnnouncer(text);
  }
}

function speakAnnouncer(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
}

function playAudioBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {}
}

// Render Application UI
function renderApp() {
  document.getElementById("station-name").textContent = state.station || "Stasiun Utama";
  
  const roleLabel = document.getElementById("role-label");
  const adminElements = document.querySelectorAll(".admin-only");
  
  if (state.isAdmin) {
    roleLabel.textContent = "Mode: Admin (Pengawas)";
    adminElements.forEach(el => el.style.display = "block");
  } else {
    roleLabel.textContent = "Mode: User (PPKA)";
    adminElements.forEach(el => el.style.display = "none");
  }

  renderTrackDiagram();
  renderSignals();
  renderSwitches();
  renderSchedules();
  renderLogs();
  updateRadioSelectOptions();
}

function renderTrackDiagram() {
  const switch1 = state.switches.find(w => w.id === "W1");
  const indicatorEl = document.getElementById("switch-vis-indicator");
  if (switch1 && indicatorEl) {
    indicatorEl.textContent = `WESEL W1: ${switch1.position} (${switch1.position === 'LURUS' ? 'JALUR 1' : 'JALUR 2'})`;
  }

  state.tracks.forEach(trk => {
    const visEl = document.getElementById(`vis-track-${trk.id}`);
    const badgeEl = document.getElementById(`badge-track-${trk.id}`);
    const btnBlock = document.getElementById(`btn-block-${trk.id}`);

    if (visEl && badgeEl) {
      if (trk.blocked) {
        visEl.classList.add("blocked");
        visEl.classList.remove("occupied");
        badgeEl.textContent = "DIBLOKIR / PERAWATAN";
        if (btnBlock) btnBlock.textContent = "Buka Blokir";
      } else if (trk.occupied) {
        visEl.classList.add("occupied");
        visEl.classList.remove("blocked");
        badgeEl.textContent = trk.train || "TERISI";
        if (btnBlock) btnBlock.textContent = "Blokir Jalur";
      } else {
        visEl.classList.remove("occupied", "blocked");
        badgeEl.textContent = "KOSONG";
        if (btnBlock) btnBlock.textContent = "Blokir Jalur";
      }
    }
  });
}

function renderSignals() {
  const container = document.getElementById("signals-container");
  container.innerHTML = state.signals.map(sig => `
    <div class="signal-card">
      <div>
        <strong>${sig.id} ${sig.locked ? '🔒' : ''}</strong>
        <p style="font-size:0.8rem; color:var(--text-muted);">${sig.name}</p>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <div class="signal-indicator ${sig.status}"></div>
        <button onclick="toggleSignal('${sig.id}')" class="btn-secondary" style="font-size:0.75rem;" ${sig.locked ? 'disabled' : ''}>Ubah</button>
      </div>
    </div>
  `).join('');
}

function renderSwitches() {
  const container = document.getElementById("switches-container");
  container.innerHTML = (state.switches || []).map(sw => `
    <div class="switch-card">
      <div>
        <strong>${sw.id} ${sw.locked ? '🔒' : ''}</strong>
        <p style="font-size:0.8rem; color:var(--text-muted);">${sw.name}</p>
      </div>
      <button onclick="toggleSwitch('${sw.id}')" class="btn-secondary" style="font-size:0.75rem;" ${sw.locked ? 'disabled' : ''}>
        Posisi: ${sw.position}
      </button>
    </div>
  `).join('');
}

function renderSchedules() {
  const tbody = document.getElementById("schedule-body");
  tbody.innerHTML = state.schedules.map(sch => `
    <tr>
      <td><strong>${sch.id}</strong></td>
      <td>${sch.name}</td>
      <td style="font-size:0.8rem; color:var(--text-muted);">${sch.loco || '-'} (${sch.consist || '-'})</td>
      <td>${sch.arrival}</td>
      <td>${sch.departure}</td>
      <td>Jalur ${sch.track}</td>
      <td><span class="badge">${sch.status}</span></td>
      <td>
        <button onclick="processTrain('${sch.id}')" class="btn-action">Proses Kereta</button>
      </td>
    </tr>
  `).join('');
}

function renderLogs() {
  const logContainer = document.getElementById("logs-list");
  logContainer.innerHTML = state.logs.slice().reverse().map(log => `
    <div class="log-item">
      <span class="time">[${log.time}]</span> ${log.message} ${log.delay ? `<span class="delay">(${log.delay})</span>` : ''}
    </div>
  `).join('');
}

function updateRadioSelectOptions() {
  const select = document.getElementById("radio-select-ka");
  if (!select) return;
  select.innerHTML = `<option value="">-- Pilih KA --</option>` + 
    state.schedules.map(s => `<option value="${s.id}">${s.id} - ${s.name}</option>`).join('');
}

// Track Block Feature
window.toggleTrackBlock = (trackId) => {
  const trk = state.tracks.find(t => t.id === trackId);
  if (!trk) return;

  if (trk.occupied) {
    alert("Jalur sedang terisi kereta! Tidak dapat memblokir jalur saat ini.");
    return;
  }

  trk.blocked = !trk.blocked;
  addLog(`PPKA ${trk.blocked ? 'MEMBLOKIR' : 'MEMBUKA BLOKIR'} Jalur ${trackId} untuk perawatan rel.`);
  saveDatabase();
  renderApp();
};

// Interlocking & Process Logic V4.0
window.toggleSignal = (id) => {
  const signal = state.signals.find(s => s.id === id);
  const switchEntry = state.switches.find(w => w.id === "W1");

  if (!signal || signal.locked) return;

  if (signal.status === "merah") {
    if (id === "S1" && switchEntry && switchEntry.position !== "LURUS") {
      alert("INTERLOCKING ERROR: Sinyal Masuk Jalur 1 hanya boleh HIJAU jika Wesel Masuk W1 diposisi LURUS!");
      return;
    }
    if (id === "S2" && switchEntry && switchEntry.position !== "BELOK") {
      alert("INTERLOCKING ERROR: Sinyal Masuk Jalur 2 hanya boleh HIJAU jika Wesel Masuk W1 diposisi BELOK!");
      return;
    }
    signal.status = "hijau";
  } else {
    signal.status = "merah";
  }

  playAudioBeep();
  addLog(`PPKA mengubah ${signal.name} (${signal.id}) menjadi ${signal.status.toUpperCase()}`);
  saveDatabase();
  renderApp();
};

window.toggleSwitch = (id) => {
  const sw = state.switches.find(s => s.id === id);
  if (!sw || sw.locked) return;

  sw.position = sw.position === "LURUS" ? "BELOK" : "LURUS";
  playAudioBeep();
  addLog(`PPKA memindahkan Wesel ${sw.id} ke posisi ${sw.position}`);
  saveDatabase();
  renderApp();
};

window.processTrain = (kaId) => {
  const schedule = state.schedules.find(s => s.id === kaId);
  if (!schedule) return;

  const targetTrack = state.tracks.find(t => t.id === schedule.track);
  const entrySignal = state.signals.find(s => s.id === `S${schedule.track}`);
  const switchEntry = state.switches.find(w => w.id === "W1");

  if (schedule.status === "MENUNGGU") {
    if (targetTrack && targetTrack.blocked) {
      alert(`JALUR DIBLOKIR: Jalur ${schedule.track} sedang dalam pemeliharaan rel!`);
      return;
    }
    if (entrySignal && entrySignal.status !== "hijau") {
      alert(`SAFETY VIOLATION: Sinyal Masuk (S${schedule.track}) masih MERAH!`);
      return;
    }
    if (targetTrack && targetTrack.occupied) {
      alert(`SAFETY VIOLATION: Jalur ${schedule.track} sedang terisi kereta lain!`);
      return;
    }

    schedule.status = "MASUK";
    if (targetTrack) {
      targetTrack.occupied = true;
      targetTrack.train = schedule.id;
    }

    // Auto-Drop Signal to RED (Isolasi Rel Simulation)
    if (entrySignal) {
      entrySignal.status = "merah";
      entrySignal.locked = true;
    }
    if (switchEntry) switchEntry.locked = true;

    // Delay Tracking Evaluation
    const currentClockStr = simTime.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
    let delayInfo = "";
    if (currentClockStr > schedule.arrival) {
      delayInfo = "TERLAMBAT DARI MALKA";
    }

    playAudioBeep();
    addLog(`KA ${schedule.id} (${schedule.name}) MASUK Jalur ${schedule.track} [Sinyal Auto-Reset MERAH]`, delayInfo);
    playKAIChimeThenAnnounce(`Perhatian, Kereta Api ${schedule.name} nomor ${schedule.id} segera masuk di jalur ${schedule.track}.`);

  } else if (schedule.status === "MASUK") {
    schedule.status = "BERANGKAT";
    if (targetTrack) {
      targetTrack.occupied = false;
      targetTrack.train = null;
    }

    if (entrySignal) entrySignal.locked = false;
    if (switchEntry) switchEntry.locked = false;

    playAudioBeep();
    addLog(`KA ${schedule.id} (${schedule.name}) BERANGKAT. Rute dilepas & Wesel Unlocked.`);
    playKAIChimeThenAnnounce(`Kereta Api ${schedule.name} nomor ${schedule.id} diberangkatkan dari jalur ${schedule.track}.`);

  } else {
    schedule.status = "MENUNGGU";
    addLog(`Status KA ${schedule.id} di-reset oleh PPKA`);
  }

  saveDatabase();
  renderApp();
};

// Radio Callouts Module V4.0
window.sendRadioMessage = (actionType) => {
  const kaId = document.getElementById("radio-select-ka").value;
  const radioLogs = document.getElementById("radio-logs");
  if (!kaId) {
    alert("Pilih Kereta Api terlebih dahulu pada panel radio!");
    return;
  }

  const sch = state.schedules.find(s => s.id === kaId);
  let ppkaText = "";
  let masinisText = "";

  if (actionType === 'panggil') {
    ppkaText = `PPKA: "Masinis ${sch.id} ${sch.name}, masuk frekuensi stasiun?"`;
    masinisText = `Masinis: "Masuk PPKA, ${sch.id} ${sch.name} siap menerima perintah."`;
  } else if (actionType === 'izin_masuk') {
    ppkaText = `PPKA: "${sch.id}, Sinyal Masuk Jalur ${sch.track} Aman, Dipersilakan Masuk."`;
    masinisText = `Masinis: "Diterima PPKA, ${sch.id} Masuk Jalur ${sch.track}, Sinyal Masuk Hijau!"`;
  } else if (actionType === 'izin_berangkat') {
    ppkaText = `PPKA: "${sch.id}, Semboyan 40/41 Siap, Jalur ${sch.track} Dipersilakan Berangkat."`;
    masinisText = `Masinis: "Diterima PPKA, Semboyan 41 Dibunyikan, ${sch.id} Berangkat!"`;
  }

  radioLogs.innerHTML += `<p class="radio-msg ppka">${ppkaText}</p>`;
  setTimeout(() => {
    radioLogs.innerHTML += `<p class="radio-msg masinis">${masinisText}</p>`;
    radioLogs.scrollTop = radioLogs.scrollHeight;
  }, 1000);

  radioLogs.scrollTop = radioLogs.scrollHeight;
};

// Emergency Feature
window.triggerEmergency = () => {
  if (confirm("TARIK SINYAL DARURAT: Apakah Anda yakin ingin membatalkan rute dan mengembalikan semua sinyal ke MERAH?")) {
    state.signals.forEach(s => {
      s.status = "merah";
      s.locked = false;
    });
    state.switches.forEach(w => w.locked = false);
    addLog("🚨 EMERGENSI: PPKA Membatalkan Rute dan Menarik Semua Sinyal ke MERAH!");
    saveDatabase();
    renderApp();
  }
};

// Export Log (TXT & CSV)
window.exportWAPLog = (format) => {
  if (format === 'csv') {
    let csvContent = "data:text/csv;charset=utf-8,Waktu,Keterangan,Catatan Kelambatan\n";
    state.logs.forEach(l => {
      csvContent += `"${l.time}","${l.message}","${l.delay || ''}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const a = document.createElement('a');
    a.href = encodedUri;
    a.download = `WAP_Log_${state.station.replace(/\s+/g, '_')}.csv`;
    a.click();
  } else {
    const text = state.logs.map(l => `[${l.time}] ${l.message} ${l.delay ? `(${l.delay})` : ''}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `WAP_Log_${state.station.replace(/\s+/g, '_')}.txt`;
    a.click();
  }
};

function addLog(message, delay = "") {
  const time = simTime.toLocaleTimeString("id-ID");
  state.logs.push({ time, message, delay });
}

// Modal Admin & Event Handlers
function setupEventListeners() {
  const modal = document.getElementById("modal-admin");
  const btnRole = document.getElementById("btn-toggle-role");
  const btnCancel = document.getElementById("btn-cancel-admin");
  const btnSubmit = document.getElementById("btn-submit-admin");
  const btnReset = document.getElementById("btn-reset-db");
  const formAdd = document.getElementById("form-add-schedule");

  btnRole.addEventListener("click", () => {
    if (state.isAdmin) {
      state.isAdmin = false;
      renderApp();
    } else {
      modal.classList.add("active");
    }
  });

  btnCancel.addEventListener("click", () => modal.classList.remove("active"));

  btnSubmit.addEventListener("click", () => {
    const pin = document.getElementById("admin-pin").value;
    if (pin === ADMIN_PIN) {
      state.isAdmin = true;
      modal.classList.remove("active");
      document.getElementById("admin-pin").value = "";
      renderApp();
    } else {
      alert("PIN Salah! Default PIN: 1234");
    }
  });

  formAdd?.addEventListener("submit", (e) => {
    e.preventDefault();
    const newKA = {
      id: document.getElementById("add-id").value,
      name: document.getElementById("add-name").value,
      loco: document.getElementById("add-loco").value,
      consist: document.getElementById("add-consist").value,
      arrival: document.getElementById("add-arr").value,
      departure: document.getElementById("add-dep").value,
      track: parseInt(document.getElementById("add-track").value),
      status: "MENUNGGU"
    };

    state.schedules.push(newKA);
    addLog(`ADMIN menambahkan jadwal KA baru: ${newKA.id} (${newKA.name})`);
    saveDatabase();
    renderApp();
    formAdd.reset();
  });

  document.getElementById("btn-clear-logs")?.addEventListener("click", () => {
    if (confirm("Bersihkan seluruh log WAP?")) {
      state.logs = [];
      saveDatabase();
      renderApp();
    }
  });

  btnReset?.addEventListener("click", () => {
    if (confirm("Reset ulang seluruh database ke kondisi awal?")) {
      localStorage.removeItem("ppka_db_v4");
      location.reload();
    }
  });
}
