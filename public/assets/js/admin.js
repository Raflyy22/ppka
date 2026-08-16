import { api, esc, toast } from "/assets/js/admin-utils.js";

const $=(s,r=document)=>r.querySelector(s);
let state={tab:"overview",data:null};

async function load(){
  try{
    const r=await api("/api/admin");
    state.data=r;
    render();
  }catch(e){
    toast(e.message,"error");
    if(e.message.includes("Unauthorized")||e.message.includes("Forbidden")) setTimeout(()=>location.href="/",600);
  }
}
function render(){
  const d=state.data;
  $("#admin-name").textContent=d.admin.name;
  $("#admin-role").textContent=d.admin.role;
  $("#admin-avatar").textContent=d.admin.name[0].toUpperCase();
  $("#admin-content").innerHTML=views[state.tab](d);
  document.querySelectorAll(".admin-tab").forEach(x=>x.classList.toggle("active",x.dataset.tab===state.tab));
}
const views={
overview(d){
 return `<div class="page-head"><div><div class="eyebrow">Administration</div><h1>Admin Control Center</h1><p>Kelola operasi, simulator, pengguna, dan data master dari satu panel.</p></div><div class="admin-live"><i></i> System Online</div></div>
 <div class="grid grid-4">
 ${[
 ["👥","Users",d.stats.users,"Total akun"],
 ["🚆","Schedules",d.stats.schedules,"Jadwal aktif"],
 ["🗺️","Stations",d.stats.stations,"Stasiun"],
 ["🎮","Runs",d.stats.runs,"Simulation runs"]
 ].map(x=>`<div class="card stat interactive"><div class="stat-top"><span class="stat-label">${x[1]}</span><span class="kpi-icon">${x[0]}</span></div><div class="stat-value">${x[2]}</div><div class="stat-meta">${x[3]}</div></div>`).join("")}</div>
 <div class="grid grid-2" style="margin-top:16px">
 <div class="card"><div class="section-title"><h3>System health</h3><span class="badge success">Healthy</span></div>${d.health.map(h=>`<div class="mini-stat"><span>${esc(h.name)}</span><strong>${esc(h.status)}</strong></div>`).join("")}</div>
 <div class="card"><div class="section-title"><h3>Recent audit activity</h3><button class="btn ghost" data-tab="audit">View all</button></div>${d.audit.slice(0,5).map(a=>`<div class="admin-activity"><span class="activity-dot ${a.level||"info"}"></span><div><strong>${esc(a.action)}</strong><small>${esc(a.actor)} · ${esc(a.time)}</small></div></div>`).join("")}</div>
 </div>
 <div class="section-title"><h3>Quick management</h3></div><div class="quick-grid">
 ${[["users","👥","Users","Kelola akun"],["schedules","🗓️","Schedules","Kelola perjalanan"],["stations","🚉","Stations","Master stasiun"],["scenarios","🎮","Scenarios","Skenario simulator"]].map(x=>`<button class="card quick-action interactive" data-tab="${x[0]}"><span class="qa-icon">${x[1]}</span><span><strong>${x[2]}</strong><small>${x[3]}</small></span></button>`).join("")}</div>`;
},
users(d){
 return `<div class="page-head"><div><div class="eyebrow">Management</div><h1>Users</h1><p>Kelola akun dan role pengguna.</p></div><button class="btn primary" data-action="new-user">＋ Tambah User</button></div>
 <div class="card table-wrap"><table class="table"><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Score</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${d.users.map(u=>`<tr><td><strong>${esc(u.name)}</strong></td><td>${esc(u.email)}</td><td><span class="badge ${u.role==="Administrator"?"warning":"info"}">${esc(u.role)}</span></td><td>${u.score}</td><td><span class="badge success">Aktif</span></td><td><button class="btn" data-action="edit-user" data-id="${esc(u.id)}">Edit</button></td></tr>`).join("")}</tbody></table></div>`;
},
schedules(d){
 return `<div class="page-head"><div><div class="eyebrow">Operations</div><h1>Schedules</h1><p>Jadwal perjalanan yang digunakan simulator.</p></div><button class="btn primary" data-action="new-schedule">＋ Tambah Jadwal</button></div>
 <div class="card table-wrap"><table class="table"><thead><tr><th>KA</th><th>Relasi</th><th>Berangkat</th><th>Tiba</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${d.schedules.map(s=>`<tr><td><strong>${esc(s.code)}</strong><br><span class="muted">${esc(s.name)}</span></td><td>${esc(s.from)} → ${esc(s.to)}</td><td>${esc(s.departure)}</td><td>${esc(s.arrival)}</td><td><span class="badge ${s.statusClass||"info"}">${esc(s.status)}</span></td><td><button class="btn" data-action="edit-schedule" data-id="${esc(s.id)}">Edit</button></td></tr>`).join("")}</tbody></table></div>`;
},
stations(d){
 return `<div class="page-head"><div><div class="eyebrow">Master data</div><h1>Stations</h1><p>Master stasiun dan peron.</p></div><button class="btn primary" data-action="new-station">＋ Tambah Stasiun</button></div>
 <div class="card table-wrap"><table class="table"><thead><tr><th>Kode</th><th>Stasiun</th><th>KM</th><th>Peron</th><th>Dwell</th><th>Aksi</th></tr></thead><tbody>${d.stations.map(s=>`<tr><td><strong>${esc(s.code)}</strong></td><td>${esc(s.name)}</td><td>${s.km}</td><td>${s.platforms.join(", ")}</td><td>${s.dwell} menit</td><td><button class="btn" data-action="edit-station" data-id="${esc(s.id)}">Edit</button></td></tr>`).join("")}</tbody></table></div>`;
},
trains(d){
 return `<div class="page-head"><div><div class="eyebrow">Master data</div><h1>Trains</h1><p>Armada yang tersedia untuk simulator.</p></div><button class="btn primary" data-action="new-train">＋ Tambah Armada</button></div>
 <div class="grid grid-3">${d.trains.map(t=>`<div class="card"><div class="stat-top"><div><span class="eyebrow">${esc(t.type)}</span><h3>${esc(t.code)}</h3></div><span class="kpi-icon">🚆</span></div><div class="mini-stat"><span>Nama</span><strong>${esc(t.name)}</strong></div><div class="mini-stat"><span>Max speed</span><strong>${t.maxSpeed} km/j</strong></div><div class="mini-stat"><span>Status</span><strong>${esc(t.status)}</strong></div><button class="btn" data-action="edit-train" data-id="${esc(t.id)}">Edit Armada</button></div>`).join("")}</div>`;
},
scenarios(d){
 return `<div class="page-head"><div><div class="eyebrow">Simulator</div><h1>Scenarios</h1><p>Kelola skenario latihan dan event operasional.</p></div><button class="btn primary" data-action="new-scenario">＋ Skenario Baru</button></div>
 <div class="grid grid-2">${d.scenarios.map(s=>`<div class="card"><div class="section-title"><h3>${esc(s.name)}</h3><span class="badge ${s.difficulty==="Sulit"?"danger":"info"}">${esc(s.difficulty)}</span></div><p class="muted">${esc(s.train)} · ${esc(s.departure)} → ${esc(s.targetArrival)}</p><div class="mini-stat"><span>Route</span><strong>${esc(s.routeId)}</strong></div><div class="mini-stat"><span>Events</span><strong>${s.events.length}</strong></div><button class="btn" data-action="edit-scenario" data-id="${esc(s.id)}">Edit Scenario</button></div>`).join("")}</div>`;
},
audit(d){
 return `<div class="page-head"><div><div class="eyebrow">Security</div><h1>Audit Log</h1><p>Catatan aktivitas administratif dan perubahan data.</p></div><button class="btn" data-action="export-audit">Export JSON</button></div>
 <div class="card table-wrap"><table class="table"><thead><tr><th>Waktu</th><th>Actor</th><th>Action</th><th>Target</th><th>Level</th></tr></thead><tbody>${d.audit.map(a=>`<tr><td>${esc(a.time)}</td><td>${esc(a.actor)}</td><td>${esc(a.action)}</td><td>${esc(a.target||"-")}</td><td><span class="badge ${a.level==="danger"?"danger":a.level==="warning"?"warning":"info"}">${esc(a.level||"info")}</span></td></tr>`).join("")}</tbody></table></div>`;
}
};

document.addEventListener("click",async e=>{
 const tab=e.target.closest("[data-tab]")?.dataset.tab;
 if(tab){state.tab=tab;render();return}
 const a=e.target.closest("[data-action]")?.dataset.action;
 if(!a)return;
 if(a==="logout"){try{await api("/api/auth/logout",{method:"POST"})}catch{}location.href="/login.html";return}
 if(["new-user","edit-user","new-schedule","edit-schedule","new-station","edit-station","new-train","edit-train","new-scenario","edit-scenario"].includes(a)){openEditor(a,e.target.closest("[data-id]")?.dataset.id);return}
 if(a==="export-audit"){download("audit-log.json",JSON.stringify(state.data.audit,null,2));}
});
function openEditor(action,id){
 const d=state.data;
 let title=action.replaceAll("-"," ");
 let html="";
 if(action.includes("user")){
  const u=d.users.find(x=>x.id===id)||{name:"",email:"",role:"PPKA Trainee"};
  html=`<form id="editor-form" class="grid"><div class="field"><label>Nama</label><input name="name" required value="${esc(u.name)}"></div><div class="field"><label>Email</label><input name="email" type="email" required value="${esc(u.email)}"></div><div class="field"><label>Role</label><select name="role"><option ${u.role==="PPKA Trainee"?"selected":""}>PPKA Trainee</option><option ${u.role==="Administrator"?"selected":""}>Administrator</option></select></div>${id?"":"<div class=\"field\"><label>Password</label><input name=\"password\" type=\"password\" minlength=\"8\" required></div>"}<button class="btn primary">Simpan</button></form>`;
 }else if(action.includes("schedule")){
  const s=d.schedules.find(x=>x.id===id)||{code:"",name:"",from:"",to:"",departure:"07:00",arrival:"10:00",platform:"1",status:"Berjalan",punctuality:100};
  html=`<form id="editor-form" class="grid"><input type="hidden" name="id" value="${esc(s.id||"")}">${["code","name","from","to","departure","arrival","platform"].map(k=>`<div class="field"><label>${k}</label><input name="${k}" required value="${esc(s[k]||"")}"></div>`).join("")}<div class="field"><label>Status</label><select name="status"><option>Berjalan</option><option>Terjadwal</option><option>Ditunda</option></select></div><button class="btn primary">Simpan</button></form>`;
 }else if(action.includes("station")){
  const s=d.stations.find(x=>x.id===id)||{id:"",name:"",code:"",km:0,platforms:[1,2],dwell:2};
  html=`<form id="editor-form" class="grid"><input type="hidden" name="id" value="${esc(s.id)}">${["name","code","km","dwell"].map(k=>`<div class="field"><label>${k}</label><input name="${k}" required value="${esc(s[k]??"")}"></div>`).join("")}<div class="field"><label>Platforms</label><input name="platforms" required value="${esc(s.platforms.join(","))}"></div><button class="btn primary">Simpan</button></form>`;
 }else if(action.includes("train")){
  const t=d.trains.find(x=>x.id===id)||{id:"",code:"",name:"",type:"Electric",maxSpeed:120,status:"Available"};
  html=`<form id="editor-form" class="grid"><input type="hidden" name="id" value="${esc(t.id)}">${["code","name","type","maxSpeed","status"].map(k=>`<div class="field"><label>${k}</label><input name="${k}" required value="${esc(t[k]??"")}"></div>`).join("")}<button class="btn primary">Simpan</button></form>`;
 }else{
  const s=d.scenarios.find(x=>x.id===id)||{id:"",name:"",train:"",departure:"07:00",targetArrival:"10:00",difficulty:"Normal",routeId:"GMR-BD",startingDelay:0};
  html=`<form id="editor-form" class="grid"><input type="hidden" name="id" value="${esc(s.id)}">${["name","train","departure","targetArrival","routeId","startingDelay"].map(k=>`<div class="field"><label>${k}</label><input name="${k}" required value="${esc(s[k]??"")}"></div>`).join("")}<div class="field"><label>Difficulty</label><select name="difficulty"><option>Normal</option><option>Sulit</option></select></div><button class="btn primary">Simpan</button></form>`;
 }
 openModal(title,html);
 $("#editor-form")?.addEventListener("submit",async ev=>{
   ev.preventDefault();
   try{
     const body=Object.fromEntries(new FormData(ev.currentTarget));
     const kind=action.includes("user")?"users":action.includes("schedule")?"schedules":action.includes("station")?"stations":action.includes("train")?"trains":"scenarios";
     await api("/api/admin",{method:"POST",body:JSON.stringify({kind,action,id,body})});
     closeModal();toast("Perubahan tersimpan.","success");await load();
   }catch(err){toast(err.message,"error")}
 });
}
function download(name,text){
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:"application/json"}));a.download=name;a.click();URL.revokeObjectURL(a.href);
}
load();
