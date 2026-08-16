export class SimulationEngine {
  constructor(config={}) {
    this.config={tickMs:1000,minutesPerTick:1,maxSpeed:120,...config};
    this.state={status:"idle",clockMinutes:0,elapsedTicks:0,score:0,xp:0,delayMinutes:0,trains:[],stations:[],routes:[],events:[],actions:[]};
    this.listeners=new Set(); this.timer=null;
  }
  load(scenario,{trains=[],stations=[],routes=[],schedule=[]}={}) {
    this.state={status:"ready",clockMinutes:scenario.startMinutes??360,elapsedTicks:0,score:0,xp:0,delayMinutes:0,trains:structuredClone(trains),stations:structuredClone(stations),routes:structuredClone(routes),schedule:structuredClone(schedule),events:[],actions:[],scenario:structuredClone(scenario)};
    this.emit(); return this.state;
  }
  subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn)}
  emit(){for(const fn of this.listeners) fn(structuredClone(this.state))}
  start(){if(this.timer||!["ready","paused"].includes(this.state.status))return;this.state.status="running";this.timer=setInterval(()=>this.tick(),this.config.tickMs);this.emit()}
  pause(){if(this.state.status!=="running")return;clearInterval(this.timer);this.timer=null;this.state.status="paused";this.emit()}
  resume(){this.start()}
  stop(){clearInterval(this.timer);this.timer=null;this.state.status="finished";this.emit()}
  tick(){
    if(this.state.status!=="running")return;
    this.state.elapsedTicks++;
    this.state.clockMinutes+=this.config.minutesPerTick;
    for(const train of this.state.trains) this.updateTrain(train);
    this.state.delayMinutes=this.state.trains.reduce((a,t)=>a+Math.max(0,t.delayMinutes||0),0);
    this.state.score=Math.max(0,Math.round(1000-(this.state.delayMinutes*10)-(this.state.events.filter(e=>e.severity==="major").length*100)));
    this.state.xp=Math.max(0,Math.round(this.state.score/10));
    if(this.state.clockMinutes >= (this.state.scenario?.endMinutes??this.state.clockMinutes+1)) this.stop();
    this.emit();
  }
  updateTrain(train){
    if(train.status==="completed"||train.status==="stopped")return;
    if(train.status==="scheduled" && this.state.clockMinutes>=Number(train.departureMinutes??0)){train.status="running";this.event("departure",`${train.name||train.code} berangkat`, "info",train.id)}
    if(train.status==="running"){
      const speed=Number(train.speed||train.targetSpeed||80);
      train.progress=Math.min(100,Number(train.progress||0)+speed/360);
      if(train.progress>=100){train.progress=100;train.status="completed";this.event("arrival",`${train.name||train.code} tiba di tujuan`,"info",train.id)}
    }
  }
  action(type,payload={}){
    if(this.state.status!=="running"&&this.state.status!=="paused")return false;
    this.state.actions.push({type,payload,at:this.state.clockMinutes});
    if(type==="hold_train"){const t=this.state.trains.find(x=>x.id===payload.trainId);if(t){t.status="stopped";this.event("operator",`${t.name||t.code} ditahan operator`,"warning",t.id);}}
    if(type==="release_train"){const t=this.state.trains.find(x=>x.id===payload.trainId);if(t){t.status="running";this.event("operator",`${t.name||t.code} dilepas operator`,"info",t.id);}}
    if(type==="set_speed"){const t=this.state.trains.find(x=>x.id===payload.trainId);if(t)t.targetSpeed=Math.max(0,Math.min(this.config.maxSpeed,Number(payload.speed)||0))}
    this.emit();return true;
  }
  event(type,message,severity="info",trainId=null){this.state.events.unshift({id:`evt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,type,message,severity,trainId,clockMinutes:this.state.clockMinutes})}
  serialize(){return structuredClone(this.state)}
}