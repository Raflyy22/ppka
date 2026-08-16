import {db,json,requireAuth,originOk,cookies} from "./_security.mjs";

function validate(body){
  const fields=["code","name","from","to","departure","arrival","platform"];
  for(const f of fields) if(typeof body[f]!=="string" || !body[f].trim()) return `${f} wajib diisi`;
  if(!/^\d{2}:\d{2}$/.test(body.departure)||!/^\d{2}:\d{2}$/.test(body.arrival)) return "Format waktu tidak valid";
  if(body.code.length>30||body.name.length>100||body.from.length>80||body.to.length>80) return "Input terlalu panjang";
  return null;
}
function csrf(req){
  const c=cookies(req), token=req.headers.get("x-csrf-token");
  return Boolean(token && c.ppka_csrf && token===c.ppka_csrf);
}
export default async req=>{
  if(!originOk(req))return json({ok:false,message:"Invalid origin"},403,{"Cache-Control":"no-store"});
  if(req.method==="GET"){
    const auth=await requireAuth(req); if(auth.error)return auth.error;
    const data=await db(); return json({ok:true,schedules:data.schedules},200,{"Cache-Control":"private,no-store"});
  }
  if(!["POST","PUT","DELETE"].includes(req.method))return json({ok:false,message:"Method Not Allowed"},405);
  const auth=await requireAuth(req,{admin:true}); if(auth.error)return auth.error;
  if(!csrf(req))return json({ok:false,message:"CSRF validation failed"},403);
  const body=await req.json().catch(()=>({})), error=validate(body);
  if(error)return json({ok:false,message:error},400);
  const schedule={...body,id:body.id||crypto.randomUUID(),statusClass:body.status==="Ditunda"?"danger":"info",punctuality:Number.isFinite(+body.punctuality)?+body.punctuality:100};
  return json({ok:true,schedule,message:"Validated admin operation. Persist to production DB here."},200,{"Cache-Control":"no-store"});
};
