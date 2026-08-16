import { db, saveDb, json, requireAuth, originOk, cookies, newId } from "./_security.mjs";
function validate(body) {
  const fields = ["code","name","from","to","departure","arrival","platform"];
  for (const f of fields) if (typeof body[f] !== "string" || !body[f].trim()) return `${f} wajib diisi`;
  if (!/^\d{2}:\d{2}$/.test(body.departure) || !/^\d{2}:\d{2}$/.test(body.arrival)) return "Format waktu tidak valid";
  if (body.code.length > 30 || body.name.length > 100 || body.from.length > 80 || body.to.length > 80) return "Input terlalu panjang";
  return null;
}
function csrf(req) { const c = cookies(req); return Boolean(req.headers.get("x-csrf-token") && c.ppka_csrf && req.headers.get("x-csrf-token") === c.ppka_csrf); }
export default async req => {
  if (!originOk(req)) return json({ ok:false, message:"Invalid origin" },403,{"Cache-Control":"no-store"});
  const auth = await requireAuth(req); if (auth.error) return auth.error;
  const data = await db();
  if (req.method === "GET") return json({ ok:true, schedules:data.schedules || [] },200,{"Cache-Control":"private,no-store"});
  if (!req.method || !["POST","PUT","DELETE"].includes(req.method)) return json({ok:false,message:"Method Not Allowed"},405);
  const admin = await requireAuth(req,{admin:true}); if(admin.error) return admin.error;
  if(!csrf(req)) return json({ok:false,message:"CSRF validation failed"},403);
  if(req.method === "DELETE"){
    const body=await req.json().catch(()=>({}));
    if(!body.id)return json({ok:false,message:"ID wajib diisi"},400);
    data.schedules=(data.schedules||[]).filter(x=>x.id!==body.id); await saveDb(data);
    return json({ok:true},200,{"Cache-Control":"no-store"});
  }
  const body=await req.json().catch(()=>({})), error=validate(body); if(error)return json({ok:false,message:error},400);
  const schedule={...body,id:body.id||newId("sch"),statusClass:body.status==="Ditunda"?"danger":body.status==="Berangkat"?"success":"info",punctuality:Number.isFinite(+body.punctuality)?+body.punctuality:100};
  const index=(data.schedules||[]).findIndex(x=>x.id===schedule.id);
  if(index>=0)data.schedules[index]=schedule; else data.schedules.push(schedule);
  data.audit=(data.audit||[]); data.audit.unshift({time:new Date().toISOString(),actor:admin.session.name,action:index>=0?"UPDATE_SCHEDULE":"CREATE_SCHEDULE",target:schedule.id,level:"info"});
  await saveDb(data);
  return json({ok:true,schedule},200,{"Cache-Control":"no-store"});
};
