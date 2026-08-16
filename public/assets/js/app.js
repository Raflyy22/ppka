import { PPKAEngine } from "/assets/js/simulator-engine.js";
const state = {
  view: "dashboard",
  user: null,
  data: null,
  simulator: {running:false, seconds:0, speed:0, punctuality:100, distance:0, status:"Standby"},
  timer: null,
  tutorialStep: 0,
  notificationOpen: false,
  profileOpen: false
};

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const esc = (v="") => String(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmtTime = sec => `${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;

async function loadJSON(path){
  const r = await fetch(path, {cache:"no-store"});
  if(!r.ok) throw new Error(`Gagal memuat ${path}`);
  return r.json();
}
function csrfToken(){return decodeURIComponent((document.cookie.match(/(?:^|;\s*)ppka_csrf=([^;]+)/)||[])[1]||"");}
async function api(path, options={}){
  const method=(options.method||"GET").toUpperCase();
  const headers={"Content-Type":"application/json",...(options.headers||{})};
  if(!["GET","HEAD","OPTIONS"].includes(method)) headers["X-CSRF-Token"]=csrfToken();
  const r = await fetch(path, {credentials:"same-origin",headers,...options});
  const body = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(body.message || "API error");
  return body;
}
function toast(message, type="success"){
  const el=document.createElement("div"); el.className=`toast ${type}`; el.textContent=message;
  $("#toast-root").append(el); setTimeout(()=>el.remove(),3200);
}
function openModal(title, body){
  const modal=$("#modal");
  modal.innerHTML=`<div class="modal-body"><div class="modal-head"><h3>${title}</h3><button class="close" data-action="close-modal">×</button></div>${body}</div>`;
  modal.showModal();
}
function closeModal(){ $("#modal").close(); }

const views = {
  dashboard(){
    const u=state.user, d=state.data;
    const xp=Math.min(100,Math.round((u.score%1000)/10));
    const next=Math.ceil(u.score/1000)*1000;
    return `
      <div class="page-head">
        <div><div class="eyebrow">Operational center</div><h1>Selamat datang, ${esc(u.name.split(" ")[0])} 👋</h1><p>Kelola latihan dan pantau performa perjalanan Anda.</p></div>
        <div class="welcome-actions"><button class="btn" data-action="tutorial">?</button><button class="btn primary" data-view="simulator">▶ Mulai Simulasi</button></div>
      </div>
      <div class="grid grid-4">
        <div class="card stat interactive"><div class="stat-top"><span class="stat-label">Perjalanan Aktif</span><span class="kpi-icon">🚆</span></div><div class="stat-value">${d.stats.activeTrips}</div><div class="stat-meta">▲ ${d.stats.activeTrend}% hari ini</div></div>
        <div class="card stat interactive"><div class="stat-top"><span class="stat-label">Kereta Beroperasi</span><span class="kpi-icon">⚡</span></div><div class="stat-value">${d.stats.operatingTrains}</div><div class="stat-meta">${d.stats.totalTrains} total armada</div></div>
        <div class="card stat interactive"><div class="stat-top"><span class="stat-label">Ketepatan Waktu</span><span class="kpi-icon">◷</span></div><div class="stat-value">${d.stats.onTime}%</div><div class="stat-meta">▲ ${d.stats.onTimeTrend}% vs kemarin</div></div>
        <div class="card stat interactive"><div class="stat-top"><span class="stat-label">Skor PPKA</span><span class="kpi-icon">♛</span></div><div class="stat-value">${u.score}</div><div class="level-badge">LEVEL ${u.level}</div><div class="xp-wrap"><div class="xp-row"><span>Progress XP</span><span>${u.score%1000}/${1000}</span></div><div class="progress"><i style="width:${xp}%"></i></div></div></div>
      </div>

      <div class="card hero" style="margin-top:16px">
        <div><div class="eyebrow">Train operation simulator</div><h2>Siap meningkatkan kemampuan operasional?</h2><p>Pilih skenario, jalankan perjalanan, respons terhadap sinyal dan gangguan, lalu raih XP berdasarkan keputusan Anda.</p><div class="welcome-actions"><button class="btn primary" data-view="simulator">Mulai Latihan →</button><button class="btn" data-action="tutorial">Pelajari Simulator</button></div></div><div class="hero-train">🚆</div>
      </div>

      <div class="section-title"><h3>Quick actions</h3></div>
      <div class="quick-grid">
        <button class="card quick-action interactive" data-view="simulator"><span class="qa-icon">▶</span><span><strong>Simulasi Baru</strong><small>Mulai perjalanan</small></span></button>
        <button class="card quick-action interactive" data-action="tutorial"><span class="qa-icon">▣</span><span><strong>Training</strong><small>Pelajari prosedur</small></span></button>
        <button class="card quick-action interactive" data-view="leaderboard"><span class="qa-icon">♛</span><span><strong>Leaderboard</strong><small>Lihat peringkat</small></span></button>
        <button class="card quick-action interactive" data-action="profile"><span class="qa-icon">●</span><span><strong>Profil Saya</strong><small>Statistik akun</small></span></button>
      </div>

      <div class="grid grid-2">
        <div><div class="section-title"><h3>Perjalanan terbaru</h3><button class="btn ghost" data-view="schedules">Lihat semua</button></div>
          <div class="card table-wrap"><table class="table"><thead><tr><th>KA</th><th>Relasi</th><th>Status</th><th>Berangkat</th><th>Ketepatan</th></tr></thead><tbody>
          ${d.schedules.slice(0,4).map(x=>`<tr><td><strong>${esc(x.code)}</strong><br><span class="muted">${esc(x.name)}</span></td><td>${esc(x.from)} → ${esc(x.to)}</td><td><span class="badge ${x.statusClass}">${esc(x.status)}</span></td><td>${esc(x.departure)}</td><td>${esc(x.punctuality)}%</td></tr>`).join("")}
          </tbody></table></div>
        </div>
        <div><div class="section-title"><h3>Achievement terbaru</h3><button class="btn ghost" data-action="achievements">Semua</button></div>
          <div class="card grid">${d.achievements.slice(0,3).map(a=>`<div class="achievement ${a.locked?'locked':''}"><div class="achievement-icon">${a.icon}</div><div><strong>${esc(a.name)}</strong><p class="muted" style="margin:3px 0">${esc(a.description)}</p></div></div>`).join("")}</div>
        </div>
      </div>`;
  },
  simulator(){
    const sc=state.data.scenarios?.[0] || {id:"S001",name:"Demo",routeId:"GMR-BD",events:[]};
    const route=state.data.routes?.find(x=>x.id===sc.routeId) || state.data.routes?.[0];
    return `<div class="page-head"><div><div class="eyebrow">Operations training</div><h1>PPKA Simulator</h1><p>Simulasi perjalanan berbasis blok, sinyal, batas kecepatan, headway, dan scoring keselamatan.</p></div>
      <div class="welcome-actions"><select id="scenario-select" class="input">${(state.data.scenarios||[]).map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("")}</select><button class="btn" data-action="sim-reset">↻ Reset</button><button class="btn primary" data-action="sim-start">▶ Mulai</button></div></div>
      <div class="grid grid-4">
        <div class="card stat"><div class="stat-label">Kecepatan</div><div class="stat-value"><span id="sim-speed">0</span><small style="font-size:14px"> km/j</small></div><div class="stat-meta">Batas <span id="sim-limit">0</span> km/j</div></div>
        <div class="card stat"><div class="stat-label">Progress</div><div class="stat-value" id="sim-progress">0%</div><div class="progress"><i id="sim-progress-bar" style="width:0%"></i></div></div>
        <div class="card stat"><div class="stat-label">Jarak</div><div class="stat-value"><span id="sim-distance">0</span><small style="font-size:14px"> km</small></div><div class="stat-meta">Tujuan <span id="sim-next">—</span></div></div>
        <div class="card stat"><div class="stat-label">Skor</div><div class="stat-value" id="sim-score">1000</div><div class="stat-meta">Delay <span id="sim-delay">0</span> menit</div></div>
      </div>
      <div class="grid grid-2" style="margin-top:16px">
        <div class="card">
          <div class="section-title"><h3>Kontrol perjalanan</h3><span id="sim-signal" class="badge success">GREEN</span></div>
          <div class="sim-track" style="padding:25px 8px">
            <div class="track-line"><i id="train-marker" style="left:0%"></i></div>
            <div class="track-stations">${(route?.segments||[]).map((x,i)=>`<span style="left:${((i)/(route.segments.length))*100}%"><b>${esc(x.from)}</b><small>${i===0?"Start":"Block"}</small></span>`).join("")}<span style="left:100%"><b>${esc(route?.segments?.at(-1)?.to||"BD")}</b><small>Finish</small></span></div>
          </div>
          <div class="grid grid-2">
            <button class="btn" data-action="speed-down">− Kurangi</button><button class="btn" data-action="speed-up">＋ Tambah</button>
            <button class="btn warning" data-action="sim-brake">🛑 Emergency Brake</button><button class="btn primary" data-action="sim-pause">Ⅱ Pause</button>
          </div>
          <div class="card" style="margin-top:12px;background:var(--surface-2)"><div class="mini-stat"><span>Target speed</span><strong id="sim-target">0 km/j</strong></div><div class="mini-stat"><span>Blok aktif</span><strong id="sim-block">—</strong></div><div class="mini-stat"><span>Status</span><strong id="sim-status">Standby</strong></div></div>
        </div>
        <div class="card">
          <div class="section-title"><h3>Event log</h3><button class="btn ghost" data-action="clear-sim-log">Clear</button></div>
          <div id="sim-log" class="log-list" style="max-height:370px;overflow:auto"><div class="empty">Simulator siap. Pilih skenario lalu mulai.</div></div>
        </div>
      </div>
      <div class="grid grid-2" style="margin-top:16px">
        <div class="card"><div class="section-title"><h3>Route & Block</h3><span class="muted">${esc(route?.name||"—")}</span></div>
          <div id="block-list">${(route?.segments||[]).map((x,i)=>`<div class="mini-stat" data-block="${i}"><span>${esc(x.from)} → ${esc(x.to)}</span><strong>${x.length} km · ${x.maxSpeed} km/j</strong></div>`).join("")}</div>
        </div>
        <div class="card"><div class="section-title"><h3>Score breakdown</h3></div>
          ${["safety","signal","speed","station","conflict","onTime"].map(k=>`<div class="mini-stat"><span>${k==="onTime"?"On Time":k[0].toUpperCase()+k.slice(1)}</span><strong id="score-${k}">—</strong></div>`).join("")}
        </div>
      </div>`;
  },
  schedules(){
    const rows=state.data.schedules;
    return `<div class="page-head"><div><div class="eyebrow">Timetable</div><h1>Jadwal Kereta</h1><p>Daftar perjalanan dan status operasional.</p></div>${state.user.role==="Administrator"?'<button class="btn primary" data-action="new-schedule">＋ Tambah Jadwal</button>':''}</div>
    <div class="card table-wrap"><table class="table"><thead><tr><th>KA</th><th>Relasi</th><th>Berangkat</th><th>Tiba</th><th>Platform</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows.map(x=>`<tr><td><strong>${esc(x.code)}</strong><br><small class="muted">${esc(x.name)}</small></td><td>${esc(x.from)} → ${esc(x.to)}</td><td>${esc(x.departure)}</td><td>${esc(x.arrival)}</td><td>${esc(x.platform)}</td><td><span class="badge ${x.statusClass}">${esc(x.status)}</span></td><td>${state.user.role==="Administrator"?`<button class="btn" data-action="edit-schedule" data-id="${esc(x.id)}">Edit</button>`:'<span class="muted">Read only</span>'}</td></tr>`).join("")}</tbody></table></div>`;
  },
  trains(){
    return `<div class="page-head"><div><div class="eyebrow">Rolling stock</div><h1>Armada Kereta</h1><p>Monitoring unit, kelas layanan, dan kesiapan armada.</p></div></div>
    <div class="grid grid-3">${state.data.trains.map(t=>`<div class="card"><div style="display:flex;justify-content:space-between;gap:10px"><strong>${esc(t.code)}</strong><span class="badge ${t.statusClass}">${esc(t.status)}</span></div><h3 style="margin:16px 0 4px">${esc(t.name)}</h3><p class="muted">${esc(t.series)} · ${esc(t.coaches)} kereta</p><div class="section-title"><span class="muted">Kesiapan</span><strong>${t.readiness}%</strong></div><div class="progress"><i style="width:${t.readiness}%"></i></div></div>`).join("")}</div>`;
  },
  stations(){
    return `<div class="page-head"><div><div class="eyebrow">Rail network</div><h1>Stasiun</h1><p>Stasiun latihan yang tersedia pada simulator.</p></div></div>
    <div class="grid grid-3">${state.data.stations.map(s=>`<div class="card"><span class="badge info">${esc(s.code)}</span><h3>${esc(s.name)}</h3><p class="muted">${esc(s.city)}</p><div class="section-title"><span>Peron</span><strong>${esc(s.platforms)}</strong></div><div class="section-title"><span>Status</span><span class="badge ${s.statusClass}">${esc(s.status)}</span></div></div>`).join("")}</div>`;
  },
  leaderboard(){
    return `<div class="page-head"><div><div class="eyebrow">Competition</div><h1>Leaderboard</h1><p>Peringkat skor simulator.</p></div></div>
    <div class="card table-wrap"><table class="table"><thead><tr><th>#</th><th>Operator</th><th>Level</th><th>Perjalanan</th><th>Ketepatan</th><th>Skor</th></tr></thead><tbody>${state.data.leaderboard.map((x,i)=>`<tr><td><strong>${i+1}</strong></td><td>${esc(x.name)}</td><td>${esc(x.level)}</td><td>${x.trips}</td><td>${x.accuracy}%</td><td><strong>${x.score}</strong></td></tr>`).join("")}</tbody></table></div>`;
  },
  profile(){
    const u=state.user, d=state.data;
    return `<div class="page-head"><div><div class="eyebrow">My account</div><h1>Profil Saya</h1><p>Ringkasan identitas, level, dan progres latihan.</p></div><button class="btn" data-action="edit-profile">Edit Profil</button></div>
      <div class="grid grid-3">
        <div class="card" style="grid-column:span 2"><div style="display:flex;gap:16px;align-items:center"><div class="avatar" style="width:68px;height:68px;font-size:24px">${esc(u.name[0])}</div><div><h2 style="margin:0;font-family:'Space Grotesk'">${esc(u.name)}</h2><p class="muted" style="margin:5px 0">${esc(u.email)}</p><span class="badge info">${esc(u.role)}</span></div></div>
        <div class="section-title"><h3>Level ${u.level}</h3><span class="level-badge">${u.score} XP</span></div><div class="progress"><i style="width:${(u.score%1000)/10}%"></i></div><p class="muted">Sisa ${1000-(u.score%1000)} XP menuju level berikutnya.</p></div>
        <div class="card"><div class="stat-label">Statistik pribadi</div><div class="mini-stat"><span>Perjalanan</span><strong>${d.leaderboard.find(x=>x.name===u.name)?.trips||0}</strong></div><div class="mini-stat"><span>Akurasi</span><strong>${d.leaderboard.find(x=>x.name===u.name)?.accuracy||100}%</strong></div><div class="mini-stat"><span>Skor</span><strong>${u.score}</strong></div></div>
      </div>
      <div class="section-title"><h3>Achievement</h3></div><div class="grid grid-3">${d.achievements.map(a=>`<div class="card achievement ${a.locked?'locked':''}"><div class="achievement-icon">${a.icon}</div><div><strong>${esc(a.name)}</strong><p class="muted" style="margin:3px 0">${esc(a.description)}</p><small class="muted">${a.locked?'Belum terbuka':'Terbuka'}</small></div></div>`).join("")}</div>`;
  },
  activity(){
    return `<div class="page-head"><div><div class="eyebrow">Audit trail</div><h1>Aktivitas</h1><p>Riwayat interaksi akun dan simulator.</p></div></div>
    <div class="card activity">${state.data.activities.map(a=>`<div class="activity-item"><div class="activity-dot"></div><div><strong>${esc(a.title)}</strong><p class="muted" style="margin:4px 0">${esc(a.description)}</p><small class="muted">${esc(a.time)}</small></div></div>`).join("")}</div>`;
  }
};

function render(){
  const root=$("#view-root");
  root.innerHTML=views[state.view]();
  $("#page-title").textContent=state.view[0].toUpperCase()+state.view.slice(1);
  $$(".nav-item[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===state.view));
  bindViewEvents();
}
function bindViewEvents(){
  $$("[data-view]").forEach(b=>b.onclick=()=>{state.view=b.dataset.view; $("#sidebar").classList.remove("open"); render();});
  const range=$("#speed-range"); if(range) range.oninput=e=>{state.simulator.speed=+e.target.value; render();};
}
function simEvent(text){
  const log=$("#sim-log"); if(!log)return;
  if(log.querySelector(".empty")) log.innerHTML="";
  const el=document.createElement("div"); el.className="activity-item"; el.innerHTML=`<div class="activity-dot"></div><div><strong>${esc(text)}</strong><small class="muted" style="display:block">${new Date().toLocaleTimeString("id-ID")}</small></div>`; log.prepend(el);
}
function toggleSimulation(){
  state.simulator.running=!state.simulator.running;
  state.simulator.status=state.simulator.running?"Running":"Paused";
  if(state.simulator.running){
    simEvent("Simulasi perjalanan dimulai.");
    clearInterval(state.timer);
    state.timer=setInterval(()=>{
      state.simulator.seconds++;
      state.simulator.distance += state.simulator.speed/3600;
      if(state.simulator.speed>state.data.simulation.speedLimit) state.simulator.punctuality=Math.max(0,state.simulator.punctuality-.4);
      else if(state.simulator.speed>20) state.simulator.punctuality=Math.min(100,state.simulator.punctuality+.05);
      if(state.simulator.seconds%15===0) simEvent(`Posisi diperbarui — ${state.simulator.distance.toFixed(1)} km.`);
      render();
    },1000);
  }else{ clearInterval(state.timer); simEvent("Simulasi dijeda."); }
  render();
}
function resetSimulation(){clearInterval(state.timer);state.simulator={running:false,seconds:0,speed:0,punctuality:100,distance:0,status:"Standby"};render();toast("Simulasi direset");}

function scheduleForm(item={}){
  return `<form id="schedule-form" class="form-grid">
    <div class="field"><label>Kode KA</label><input name="code" required value="${esc(item.code||"KA-001")}"></div>
    <div class="field"><label>Nama Kereta</label><input name="name" required value="${esc(item.name||"Argo Simulator")}"></div>
    <div class="field"><label>Stasiun Asal</label><input name="from" required value="${esc(item.from||"Gambir")}"></div>
    <div class="field"><label>Stasiun Tujuan</label><input name="to" required value="${esc(item.to||"Bandung")}"></div>
    <div class="field"><label>Berangkat</label><input type="time" name="departure" required value="${esc(item.departure||"08:00")}"></div>
    <div class="field"><label>Tiba</label><input type="time" name="arrival" required value="${esc(item.arrival||"10:45")}"></div>
    <div class="field"><label>Peron</label><input name="platform" value="${esc(item.platform||"1")}"></div>
    <div class="field"><label>Status</label><select name="status"><option>Terjadwal</option><option>Berangkat</option><option>Tiba</option><option>Ditunda</option></select></div>
    <div class="field full"><button class="btn primary" type="submit">Simpan Jadwal</button></div>
  </form>`;
}
function openSchedule(item={}){
  openModal(item.id?"Edit Jadwal":"Tambah Jadwal",scheduleForm(item));
  $("#schedule-form").onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target), payload=Object.fromEntries(f);
    payload.id=item.id||crypto.randomUUID(); payload.statusClass=payload.status==="Ditunda"?"danger":"info"; payload.punctuality=100;
    try{
      const result=await api("/api/schedules",{method:item.id?"PUT":"POST",body:JSON.stringify(payload)});
      if(result.schedule) state.data.schedules=state.data.schedules.map(x=>x.id===result.schedule.id?result.schedule:x);
      else state.data.schedules.push(payload);
      closeModal(); render(); toast("Jadwal berhasil disimpan");
    }catch(err){ toast(err.message,"error"); }
  };
}


function showTutorial(){
  state.tutorialStep=0;
  const steps=[
    ["01","Kenali Dashboard","Pantau perjalanan aktif, ketepatan waktu, armada, XP, dan aktivitas Anda dari satu halaman."],
    ["02","Mulai Simulasi","Masuk ke Simulator untuk memilih perjalanan dan mengontrol kecepatan secara real-time."],
    ["03","Perhatikan Sinyal","Gunakan informasi sinyal dan batas kecepatan untuk menjaga keselamatan serta ketepatan waktu."],
    ["04","Raih XP","Selesaikan perjalanan dengan keputusan yang tepat untuk meningkatkan skor, level, dan achievement."]
  ];
  const draw=()=>{
    const x=steps[state.tutorialStep];
    openModal("Training PPKA",`<div class="tutorial"><div class="tutorial-number">${x[0]}</div><div><h3 style="margin-top:0">${x[1]}</h3><p class="muted" style="line-height:1.7">${x[2]}</p></div></div><div class="step-dots">${steps.map((_,i)=>`<span class="step-dot ${i===state.tutorialStep?'active':''}"></span>`).join("")}</div><div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn" data-action="tutorial-prev" ${state.tutorialStep===0?'disabled':''}>← Kembali</button><button class="btn primary" data-action="tutorial-next">${state.tutorialStep===steps.length-1?"Selesai":"Lanjut →"}</button></div>`);
  };
  draw();
}
function showNotifications(){
  const old=$(".notification-panel"); if(old){old.remove();return}
  const items=state.data.notifications||[];
  const el=document.createElement("div");el.className="notification-panel";
  el.innerHTML=`<header><strong>Notifikasi</strong><button class="close" data-action="close-notifications">×</button></header>${items.length?items.map(n=>`<div class="notification-item ${n.unread?'unread':''}"><div class="notif-icon">${n.icon}</div><div><strong>${esc(n.title)}</strong><p class="muted" style="margin:3px 0;font-size:11px">${esc(n.description)}</p><small class="muted">${esc(n.time)}</small></div></div>`).join(""):`<div class="empty">Tidak ada notifikasi.</div>`}`;
  document.body.append(el);
}
function showProfileMenu(){
  const old=$(".profile-menu");if(old){old.remove();return}
  const el=document.createElement("div");el.className="profile-menu";
  el.innerHTML=`<button data-action="profile">● Profil Saya</button><button data-action="achievements">♛ Achievement</button><button data-action="tutorial">▣ Tutorial</button><button data-action="logout">↪ Keluar</button>`;
  document.body.append(el);
}
function showAchievements(){
  openModal("Achievement",`<div class="grid">${state.data.achievements.map(a=>`<div class="card achievement ${a.locked?'locked':''}"><div class="achievement-icon">${a.icon}</div><div><strong>${esc(a.name)}</strong><p class="muted" style="margin:3px 0">${esc(a.description)}</p><span class="badge ${a.locked?'':'success'}">${a.locked?'Terkunci':'Terbuka'}</span></div></div>`).join("")}</div>`);
}

let simEngine=null, simInterval=null;
function currentScenario(){
  const id=$("#scenario-select")?.value || state.data.scenarios?.[0]?.id;
  return state.data.scenarios?.find(x=>x.id===id) || state.data.scenarios?.[0];
}
function initSimulator(){
  clearInterval(simInterval); simInterval=null;
  const sc=currentScenario(), route=state.data.routes?.find(x=>x.id===sc?.routeId)||state.data.routes?.[0];
  if(!sc||!route)return;
  simEngine=new PPKAEngine({route,scenario:sc,onUpdate:updateSimulatorUI,onEvent:addSimLog,onFinish:async summary=>{
    try{ const r=await api("/api/simulator",{method:"POST",body:JSON.stringify({action:"finish",...summary})}); if(r.user){state.user.score=r.user.score;state.user.level=r.user.level;} toast(`Perjalanan selesai — skor ${summary.score}`,"success"); }catch(err){toast(`Perjalanan selesai, tetapi skor gagal disimpan: ${err.message}`,"error");}
  }});
  $("#scenario-select")?.addEventListener("change",initSimulator);
}
function updateSimulatorUI(x){
  const set=(id,v)=>{const el=$("#"+id);if(el)el.textContent=v};
  set("sim-speed",x.speed);set("sim-limit",x.speedLimit);set("sim-progress",`${x.progress}%`);
  set("sim-distance",x.distance);set("sim-next",x.nextStation||"—");set("sim-score",x.score);
  set("sim-delay",x.delay);set("sim-target",`${x.targetSpeed} km/j`);
  set("sim-block",x.segment?`${x.segment.from} → ${x.segment.to}`:"Selesai");
  set("sim-status",x.finished?"Selesai":x.running?"Berjalan":x.dwell>0?"Dwell":"Standby");
  const bar=$("#sim-progress-bar");if(bar)bar.style.width=`${x.progress}%`;
  const marker=$("#train-marker");if(marker)marker.style.left=`${x.progress}%`;
  const sig=$("#sim-signal");if(sig){sig.textContent=String(x.signal).toUpperCase();sig.className=`badge ${x.signal==="green"?"success":x.signal==="yellow"?"warning":"danger"}`}
  Object.entries(x.breakdown||{}).forEach(([k,v])=>set(`score-${k}`,v));
}
function addSimLog(ev){
  const box=$("#sim-log");if(!box)return;
  if(box.querySelector(".empty"))box.innerHTML="";
  const el=document.createElement("div");el.className=`log-entry ${ev.level||"info"}`;
  el.textContent=`[${new Date().toLocaleTimeString("id-ID")}] ${ev.message}`;
  box.prepend(el);
}
function startSimulator(){
  if(!simEngine)initSimulator();
  if(!simEngine)return;
  simEngine.start();
  clearInterval(simInterval);
  simInterval=setInterval(()=>simEngine.tickOnce(),1000);
}
function stopSimulator(){
  clearInterval(simInterval);simInterval=null;
}
document.addEventListener("click", async e=>{
  const b=e.target.closest("[data-action]"); if(!b)return;
  const a=b.dataset.action;
  if(a==="theme"){document.documentElement.dataset.theme=document.documentElement.dataset.theme==="light"?"":"light";toast("Tema diperbarui");}
  if(a==="logout"){
    try{await api("/api/auth/logout",{method:"POST"});}catch{}
    location.href="/login.html";
  }
  if(a==="notifications"){showNotifications();}
  if(a==="close-notifications"){$(".notification-panel")?.remove();}
  if(a==="profile"){showProfileMenu();}
  if(a==="tutorial"){showTutorial();}
  if(a==="tutorial-next"){if(state.tutorialStep<3){state.tutorialStep++;showTutorial();}else closeModal();}
  if(a==="tutorial-prev"){if(state.tutorialStep>0){state.tutorialStep--;showTutorial();}}
  if(a==="achievements"){showAchievements();}
  if(a==="edit-profile"){toast("Editor profil akan diperdalam pada fase akun/database.","success");}
  if(a==="sim-start"){startSimulator();}
  if(a==="sim-pause"){simEngine?.pause();stopSimulator();}
  if(a==="sim-reset"){stopSimulator();initSimulator();addSimLog({level:"info",message:"Simulator di-reset."});}
  if(a==="speed-up"){simEngine?.setSpeed((simEngine.targetSpeed||0)+10);}
  if(a==="speed-down"){simEngine?.setSpeed((simEngine.targetSpeed||0)-10);}
  if(a==="sim-brake"){simEngine?.emergencyBrake();}
  if(a==="clear-sim-log"){$("#sim-log").innerHTML='<div class="empty">Log dibersihkan.</div>';}
  if(a==="close-modal") closeModal();
  if(a==="sim-toggle") toggleSimulation();
  if(a==="sim-reset") resetSimulation();
  if(a==="new-schedule") openSchedule();
  if(a==="edit-schedule"){const x=state.data.schedules.find(s=>s.id===b.dataset.id);openSchedule(x);}
});
$("#menu-toggle").onclick=()=>$("#sidebar").classList.toggle("open");

async function boot(){
  try{
    const me=await api("/api/auth/me");
    if(!me.authenticated){ location.href="/login.html"; return; }
    state.user=me.user;
    const appPayload=await api("/api/app");
    state.data=appPayload.data;
    $("#user-name").textContent=state.user.name; $("#user-role").textContent=state.user.role; $("#user-avatar").textContent=state.user.name[0].toUpperCase();
    if(state.user.role==="Administrator"){
      const side=document.querySelector("#main-nav");
      if(side && !side.querySelector("[data-admin-link]")){
        const a=document.createElement("a");a.href="/admin.html";a.className="nav-item";a.dataset.adminLink="1";a.innerHTML="⚙<span>Admin Center</span>";side.append(a);
      }
    }
    render();
  }catch(e){ $("#view-root").innerHTML=`<div class="card"><h2>Gagal memuat aplikasi</h2><p class="muted">${esc(e.message)}</p></div>`; }
  setTimeout(()=>$("#app-loader").remove(),350);
}
boot();

document.addEventListener("click",e=>{
  if(!e.target.closest(".profile,.profile-menu,[data-action='profile']")) $(".profile-menu")?.remove();
  if(!e.target.closest(".notification-panel,[data-action='notifications']")) $(".notification-panel")?.remove();
});
