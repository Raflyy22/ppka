import { db, saveDb, json, requireAuth, originOk, cookies, newId, hashPassword, randomToken } from "./_security.mjs";
function csrf(req){const c=cookies(req);return Boolean(c.ppka_csrf && req.headers.get("x-csrf-token")===c.ppka_csrf)}
function clean(s,n=120){return String(s??"").trim().slice(0,n)}
function validate(kind,b){
 if(kind==="users"){if(!clean(b.name,80)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(b.email,160)))return "Nama/email tidak valid";if(!["PPKA Trainee","Administrator"].includes(b.role))return "Role tidak valid";if(b.password && (String(b.password).length<8||String(b.password).length>128))return "Password tidak valid"}
 if(kind==="schedules"){for(const k of ["code","name","from","to","departure","arrival","platform"])if(!clean(b[k]))return `${k} wajib diisi`}
 if(kind==="stations"){if(!clean(b.name)||!clean(b.code)||!Number.isFinite(+b.km))return "Data stasiun tidak valid"}
 if(kind==="trains"){if(!clean(b.code)||!clean(b.name)||!Number.isFinite(+b.maxSpeed))return "Data armada tidak valid"}
 if(kind==="scenarios"){if(!clean(b.name)||!clean(b.train)||!clean(b.routeId))return "Data skenario tidak valid"}
 return null;
}
export default async req=>{
 if(!originOk(req))return json({ok:false,message:"Invalid origin"},403);
 const auth=await requireAuth(req,{admin:true});if(auth.error)return auth.error;
 const d=await db();
 if(req.method==="GET")return json({ok:true,admin:{id:auth.session.sub,name:auth.session.name,role:auth.session.role},stats:{users:d.users?.length||0,schedules:d.schedules?.length||0,stations:d.stations?.length||0,runs:d.simulationRuns?.length||0},health:[{name:"Authentication",status:"Operational"},{name:"Persistent data",status:"Operational"},{name:"Simulator API",status:"Operational"},{name:"Netlify Functions",status:"Operational"}],users:d.users||[],schedules:d.schedules||[],stations:d.stations||[],trains:d.trains||[],scenarios:d.scenarios||[],audit:d.audit||[]},200,{"Cache-Control":"private,no-store"});
 if(req.method!=="POST")return json({ok:false,message:"Method Not Allowed"},405);
 if(!csrf(req))return json({ok:false,message:"CSRF validation failed"},403);
 const b=await req.json().catch(()=>({})),kind=b.kind, body=b.body||{}, err=validate(kind,body);if(err)return json({ok:false,message:err},400);
 if(!["users","schedules","stations","trains","scenarios"].includes(kind))return json({ok:false,message:"Resource tidak valid"},400);
 const list=d[kind]||[];let id=b.id||newId(kind.slice(0,-1)||"item");let item={...body,id};
 if(kind==="users"){
   const email=clean(body.email,160).toLowerCase();
   if(list.some(x=>x.email.toLowerCase()===email&&x.id!==id))return json({ok:false,message:"Email sudah digunakan"},409);
   const old=list.find(x=>x.id===id);item={...(old||{level:1,score:0}),...item,email,role:body.role};
   if(body.password){const salt=randomToken(16);item.passwordSalt=salt;item.passwordHash=hashPassword(body.password,salt,d.auth.iterations)}else if(old){item.passwordSalt=old.passwordSalt;item.passwordHash=old.passwordHash}else{return json({ok:false,message:"Password wajib untuk user baru"},400)}
 }
 if(kind==="stations")item={...item,km:+body.km,dwell:+body.dwell||2,platforms:String(body.platforms||"1,2").split(",").map(x=>Number(x.trim())).filter(Number.isFinite)};
 if(kind==="trains")item={...item,maxSpeed:+body.maxSpeed};
 if(kind==="scenarios")item={...item,startingDelay:+body.startingDelay||0,events:item.events||[]};
 const index=list.findIndex(x=>x.id===id);if(index>=0)list[index]=item;else list.push(item);d[kind]=list;
 d.audit=(d.audit||[]);d.audit.unshift({time:new Date().toISOString(),actor:auth.session.name,action:index>=0?`UPDATE_${kind.toUpperCase()}`:`CREATE_${kind.toUpperCase()}`,target:id,level:"info"});
 await saveDb(d);
 return json({ok:true,item,message:"Perubahan tersimpan"},200,{"Cache-Control":"no-store"});
};
