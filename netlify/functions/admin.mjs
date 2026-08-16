import {db,json,requireAuth,originOk,cookies,randomToken} from "./_security.mjs";
function csrf(req){const c=cookies(req);return c.ppka_csrf && req.headers.get("x-csrf-token")===c.ppka_csrf}
function clean(s,n=120){return String(s??"").trim().slice(0,n)}
function validate(kind,b){
 if(kind==="users"){if(!clean(b.name,100)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(b.email,150)))return "Nama/email tidak valid";if(!["User","Administrator"].includes(b.role))return "Role tidak valid"}
 if(kind==="schedules"){for(const k of ["code","name","from","to","departure","arrival","platform"])if(!clean(b[k]))return `${k} wajib diisi`}
 if(kind==="stations"){if(!clean(b.name)||!clean(b.code)||!Number.isFinite(+b.km))return "Data stasiun tidak valid"}
 if(kind==="trains"){if(!clean(b.code)||!clean(b.name)||!Number.isFinite(+b.maxSpeed))return "Data armada tidak valid"}
 if(kind==="scenarios"){if(!clean(b.name)||!clean(b.train)||!clean(b.routeId))return "Data skenario tidak valid"}
 return null
}
export default async req=>{
 if(!originOk(req))return json({ok:false,message:"Invalid origin"},403);
 const auth=await requireAuth(req,{admin:true});if(auth.error)return auth.error;
 const d=await db();
 if(req.method==="GET"){
  return json({ok:true,admin:{id:auth.session.sub,name:auth.session.name,role:auth.session.role},
   stats:{users:d.users?.length||0,schedules:d.schedules?.length||0,stations:d.stations?.length||0,runs:d.simulationRuns?.length||0},
   health:[{name:"Authentication",status:"Operational"},{name:"Simulator API",status:"Operational"},{name:"Netlify Functions",status:"Operational"},{name:"Seed DB",status:"Read-only"}],
   users:d.users||[],schedules:d.schedules||[],stations:d.stations||[],trains:d.trains||[],scenarios:d.scenarios||[],audit:d.audit||[]
  },200,{"Cache-Control":"private,no-store"});
 }
 if(req.method==="POST"){
  if(!csrf(req))return json({ok:false,message:"CSRF validation failed"},403);
  const b=await req.json().catch(()=>({})),kind=b.kind,err=validate(kind,b.body||{});if(err)return json({ok:false,message:err},400);
  // This seed project deliberately validates admin mutations but does not pretend Netlify's deployed filesystem is persistent.
  return json({ok:true,message:`${kind} mutation tervalidasi. Hubungkan persistence ke database persisten pada Phase 5.`,audit:{actor:auth.session.name,action:b.action,target:b.id||"new"}},200,{"Cache-Control":"no-store"});
 }
 return json({ok:false,message:"Method Not Allowed"},405);
};
