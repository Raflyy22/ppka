import {db,json,requireAuth} from "./_security.mjs";
export default async req=>{
  const auth=await requireAuth(req);
  if(auth.error)return auth.error;
  const d=await db();
  return json({
    ok:true,
    engine:d.simulationEngine,
    routes:d.routes||[],
    scenarios:d.scenarios||[],
    stations:d.stations||[]
  },200,{"Cache-Control":"private,no-store"});
};
