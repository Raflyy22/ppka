import {SimulationEngine} from "../engine/simulation-engine.js";
import {buildDemoScenario,buildDemoTrains} from "../engine/scenario-loader.js";
import {formatSimTime} from "../engine/clock.js";
import {api} from "../core/api.js";

let engine=null;
export function render(){
 return `<div class="app-shell simulator-shell">
 <header class="topbar"><div class="brand"><img class="brand-icon" src="/assets/icons/logo.svg" alt=""><span>PPKA Simulator</span></div><div class="sim-clock" id="sim-clock">--:--</div></header>
 <main class="page sim-page">
 <section class="card sim-status"><div><div class="eyebrow">Operasi</div><h1 class="title" id="sim-status">READY</h1></div><div class="score-box"><small>Score</small><strong id="sim-score">0</strong></div></section>
 <div class="sim-grid">
  <section class="card"><div class="row"><strong>Perjalanan Kereta</strong><span class="badge badge-success" id="train-count">0</span></div><div id="train-list" class="train-list"></div></section>
  <section class="card"><div class="row"><strong>Event Log</strong><span class="muted">Live</span></div><div id="event-log" class="event-log"></div></section>
 </div>
 <section class="card control-panel"><div class="row"><strong>Kontrol Operasi</strong><span class="muted" id="sim-delay">Delay 0 m</span></div><div class="control-grid"><button class="btn btn-primary" id="start">▶ Mulai</button><button class="btn btn-secondary" id="pause">Ⅱ Pause</button><button class="btn btn-secondary" id="resume">↻ Lanjut</button><button class="btn btn-danger" id="stop">■ Selesai</button></div></section>
 <section class="card"><div class="row"><strong>Kontrol Kereta</strong><span class="muted">Operator</span></div><div id="operator-controls"></div></section>
 </main><nav id="bottom-nav" class="bottom-nav"></nav></div>`;
}
export function mount(){
 engine=new SimulationEngine({tickMs:1000,minutesPerTick:1});
 engine.load(buildDemoScenario(),{trains:buildDemoTrains()});
 const unsub=engine.subscribe(renderState);
 window.addEventListener("hashchange",()=>unsub(),{once:true});
 document.querySelector("#start").onclick=()=>engine.start();
 document.querySelector("#pause").onclick=()=>engine.pause();
 document.querySelector("#resume").onclick=()=>engine.resume();
 document.querySelector("#stop").onclick=()=>engine.stop();
 renderState(engine.state);
}
function renderState(s){
 const clock=document.querySelector("#sim-clock"); if(!clock)return;
 clock.textContent=formatSimTime(s.clockMinutes);
 document.querySelector("#sim-status").textContent=s.status.toUpperCase();
 document.querySelector("#sim-score").textContent=s.score.toLocaleString("id-ID");
 document.querySelector("#sim-delay").textContent=`Delay ${s.delayMinutes} m`;
 document.querySelector("#train-count").textContent=s.trains.length;
 document.querySelector("#train-list").innerHTML=s.trains.map(t=>`<div class="train-row"><div class="avatar">🚆</div><div class="train-main"><strong>${esc(t.name||t.code)}</strong><span class="muted">${esc(t.status)} • ${Math.round(t.progress||0)}%</span><div class="progress"><i style="width:${Math.min(100,t.progress||0)}%"></i></div></div></div>`).join("");
 document.querySelector("#event-log").innerHTML=s.events.slice(0,8).map(e=>`<div class="event ${e.severity}"><span>${formatSimTime(e.clockMinutes)}</span><strong>${esc(e.message)}</strong></div>`).join("")||`<div class="empty">Belum ada event.</div>`;
 document.querySelector("#operator-controls").innerHTML=s.trains.map(t=>`<div class="operator-row"><strong>${esc(t.code)}</strong><button class="btn btn-secondary" data-hold="${t.id}">Tahan</button><button class="btn btn-secondary" data-release="${t.id}">Lepas</button></div>`).join("");
 document.querySelectorAll("[data-hold]").forEach(b=>b.onclick=()=>engine.action("hold_train",{trainId:b.dataset.hold}));
 document.querySelectorAll("[data-release]").forEach(b=>b.onclick=()=>engine.action("release_train",{trainId:b.dataset.release}));
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}