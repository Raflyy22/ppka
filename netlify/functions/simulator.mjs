import { db, saveDb, json, requireAuth, originOk, cookies, newId } from "./_security.mjs";
function csrf(req){const c=cookies(req);return Boolean(c.ppka_csrf&&req.headers.get("x-csrf-token")===c.ppka_csrf)}
export default async req=>{
 if(!originOk(req))return json({ok:false,message:"Invalid origin"},403);
 const auth=await requireAuth(req);if(auth.error)return auth.error;
 const d=await db();
 if(req.method==="GET")return json({ok:true,engine:d.simulationEngine,routes:d.routes||[],scenarios:d.scenarios||[],stations:d.stations||[]},200,{"Cache-Control":"private,no-store"});
 if(req.method!=="POST")return json({ok:false,message:"Method Not Allowed"},405);
 if(!csrf(req))return json({ok:false,message:"CSRF validation failed"},403);
 const body=await req.json().catch(()=>({}));
 if(body.action!=="finish")return json({ok:false,message:"Action tidak valid"},400);
 const score=Number(body.score);if(!Number.isFinite(score)||score<0||score>2000)return json({ok:false,message:"Score tidak valid"},400);
 const run={id:newId("run"),userId:auth.session.sub,scenarioId:String(body.scenarioId||""),routeId:String(body.routeId||""),score:Math.round(score),elapsed:Math.max(0,Number(body.elapsed)||0),delay:Math.max(0,Number(body.delay)||0),createdAt:new Date().toISOString()};
 d.simulationRuns=d.simulationRuns||[];d.simulationRuns.unshift(run);
 const u=d.users.find(x=>x.id===auth.session.sub);if(u){u.score=(u.score||0)+run.score;u.level=Math.max(1,Math.floor(u.score/1000)+1)}
 d.audit=(d.audit||[]);d.audit.unshift({time:run.createdAt,actor:auth.session.name,action:"FINISH_SIMULATION",target:run.id,level:"info"});
 await saveDb(d);return json({ok:true,run,user:u?{score:u.score,level:u.level}:null},200,{"Cache-Control":"no-store"});
};
