import { db, json } from "./_security.mjs";
export default async () => {
  try { const d=await db(); return json({ok:true,service:"ppka-simulator",database:"ready",users:d.users?.length||0,timestamp:new Date().toISOString()}); }
  catch(e){ return json({ok:false,service:"ppka-simulator",database:"error",message:e.message,timestamp:new Date().toISOString()},500); }
};
