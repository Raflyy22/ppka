/**
 * PPKA Simulator Engine v3
 * Deterministic client-side simulation model.
 * It does not replace server-side authorization/security.
 */
export class PPKAEngine {
  constructor({route, scenario, onUpdate = ()=>{}, onEvent = ()=>{}, onFinish = ()=>{}}) {
    this.route = structuredClone(route);
    this.scenario = structuredClone(scenario);
    this.onUpdate = onUpdate;
    this.onEvent = onEvent;
    this.onFinish = onFinish;
    this.reset();
  }

  reset() {
    this.running = false;
    this.finished = false;
    this.tick = 0;
    this.elapsed = 0;
    this.distance = 0;
    this.speed = 0;
    this.targetSpeed = 0;
    this.delay = Number(this.scenario.startingDelay || 0);
    this.score = { safety: 250, signal: 150, speed: 150, station: 150, conflict: 200, onTime: 100 };
    this.penalties = [];
    this.eventsSeen = new Set();
    this.currentSegmentIndex = 0;
    this.segmentDistance = 0;
    this.dwell = 0;
    this.lastSignal = "green";
    this.lastEvent = "Simulator siap.";
    this.emergency = false;
    this.timeScale = 1;
    this.update();
  }

  get segment() { return this.route.segments[this.currentSegmentIndex] || null; }
  get progress() { return Math.min(100, this.distance / this.route.distance * 100); }

  get nextStation() {
    const s = this.segment;
    if (!s) return null;
    return this.scenario.routeId === this.route.id ? s.to : null;
  }

  start() {
    if (this.finished) this.reset();
    this.running = true;
    this.lastEvent = "Perjalanan dimulai.";
    this.onEvent({level:"info", message:this.lastEvent});
    this.update();
  }

  pause() {
    this.running = false;
    this.lastEvent = "Simulator dijeda.";
    this.onEvent({level:"info", message:this.lastEvent});
    this.update();
  }

  setSpeed(kmh) {
    this.targetSpeed = Math.max(0, Math.min(160, Number(kmh) || 0));
    this.update();
  }

  emergencyBrake() {
    this.emergency = true;
    this.targetSpeed = 0;
    this.speed = Math.max(0, this.speed - 35);
    this.score.safety = Math.max(0, this.score.safety - 8);
    this.onEvent({level:"warning", message:"Emergency brake diaktifkan."});
    this.update();
  }

  getSpeedLimit() {
    const seg = this.segment;
    if (!seg) return 0;
    let limit = Number(seg.maxSpeed || this.route.maxSpeed);
    if (this.lastSignal === "yellow") limit = Math.min(limit, 60);
    if (this.lastSignal === "red") limit = 0;
    return limit;
  }

  processScheduledEvents() {
    for (const ev of this.scenario.events || []) {
      if (this.eventsSeen.has(ev.at) || this.tick < ev.at) continue;
      this.eventsSeen.add(ev.at);
      if (ev.type === "signal") {
        this.lastSignal = ev.aspect || "yellow";
        this.score.signal = Math.max(0, this.score.signal - 4);
        this.onEvent({level:"warning", message:ev.message || `Sinyal ${this.lastSignal}`});
      } else if (ev.type === "traffic") {
        this.score.conflict = Math.max(0, this.score.conflict - 3);
        this.targetSpeed = Math.min(this.targetSpeed, 60);
        this.onEvent({level:"warning", message:ev.message || "Headway diperketat."});
      } else if (ev.type === "incident") {
        this.delay += 2;
        this.score.safety = Math.max(0, this.score.safety - 5);
        this.onEvent({level:"danger", message:ev.message || "Gangguan perjalanan."});
      } else {
        this.onEvent({level:"info", message:ev.message || "Event operasional."});
      }
    }
  }

  tickOnce() {
    if (!this.running || this.finished) return;
    this.tick++;
    this.elapsed += 1;
    this.processScheduledEvents();

    const limit = this.getSpeedLimit();
    const acceleration = this.targetSpeed > this.speed ? 6 : 10;
    if (this.speed < this.targetSpeed) this.speed = Math.min(this.targetSpeed, this.speed + acceleration);
    if (this.speed > this.targetSpeed) this.speed = Math.max(this.targetSpeed, this.speed - acceleration);

    if (this.speed > limit + 2) {
      this.score.speed = Math.max(0, this.score.speed - 2);
      if (this.tick % 5 === 0) this.onEvent({level:"warning", message:`Overspeed: ${Math.round(this.speed)} km/jam (batas ${limit}).`});
    }

    if (this.lastSignal === "red" && this.speed > 2) {
      this.score.signal = Math.max(0, this.score.signal - 10);
      this.onEvent({level:"danger", message:"Pelanggaran sinyal merah."});
      this.speed = 0;
    }

    // km/h -> km/sec, with 1 engine tick representing one simulation second.
    const kmPerTick = this.speed / 3600;
    this.segmentDistance += kmPerTick;
    this.distance += kmPerTick;

    if (this.segment && this.segmentDistance >= this.segment.length) {
      this.distance += this.segment.length - this.segmentDistance;
      this.segmentDistance = 0;
      this.lastSignal = "green";
      this.currentSegmentIndex++;
      this.dwell = this.currentSegmentIndex < this.route.segments.length ? 2 : 0;
      if (this.currentSegmentIndex < this.route.segments.length) {
        this.onEvent({level:"success", message:`Masuk blok ${this.route.segments[this.currentSegmentIndex].from} → ${this.route.segments[this.currentSegmentIndex].to}.`});
      }
    }

    if (this.dwell > 0) {
      this.dwell--;
      this.speed = 0;
      this.targetSpeed = 0;
      if (this.dwell === 0) this.onEvent({level:"info", message:"Dwell selesai, siap berangkat."});
    }

    if (this.distance >= this.route.distance - 0.01 || this.currentSegmentIndex >= this.route.segments.length) {
      this.distance = this.route.distance;
      this.speed = 0;
      this.targetSpeed = 0;
      this.running = false;
      this.finished = true;
      const targetSeconds = this.timeToSeconds(this.scenario.targetArrival, this.scenario.departure);
      const onTime = Math.max(0, 100 - Math.max(0, this.elapsed - targetSeconds) * 2);
      this.score.onTime = Math.round(onTime);
      this.lastEvent = "Perjalanan selesai.";
      this.onEvent({level:"success", message:`Perjalanan selesai. Skor akhir ${this.totalScore()}.`});
      this.onFinish(this.summary());
    }
    this.update();
  }

  timeToSeconds(time, departure) {
    const [h,m] = String(time || "00:00").split(":").map(Number);
    const [dh,dm] = String(departure || "00:00").split(":").map(Number);
    return Math.max(1, ((h*60+m)-(dh*60+dm))*60);
  }

  totalScore() {
    const values = Object.values(this.score);
    return Math.round(values.reduce((a,b)=>a+b,0));
  }

  summary() {
    return {
      scenarioId:this.scenario.id,
      routeId:this.route.id,
      distance:+this.distance.toFixed(2),
      elapsed:this.elapsed,
      delay:+this.delay.toFixed(1),
      score:this.totalScore(),
      breakdown:{...this.score},
      finished:this.finished
    };
  }

  update() {
    this.onUpdate({
      running:this.running, finished:this.finished, tick:this.tick, elapsed:this.elapsed,
      distance:+this.distance.toFixed(2), progress:+this.progress.toFixed(1),
      speed:Math.round(this.speed), targetSpeed:Math.round(this.targetSpeed),
      speedLimit:this.getSpeedLimit(), segment:this.segment,
      segmentIndex:this.currentSegmentIndex, dwell:this.dwell, signal:this.lastSignal,
      delay:+this.delay.toFixed(1), score:this.totalScore(), breakdown:{...this.score},
      nextStation:this.nextStation, lastEvent:this.lastEvent
    });
  }
}
