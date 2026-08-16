import { db, json, requireAuth, originOk } from "./_security.mjs";
export default async req=>{
  if(!originOk(req))return json({ok:false,message:"Invalid origin"},403);
  const auth=await requireAuth(req);if(auth.error)return auth.error;
  if(req.method!=="GET")return json({ok:false,message:"Method Not Allowed"},405);
  const d=await db();
  const user=d.users.find(x=>x.id===auth.session.sub);
  const safeUsers=(d.users||[]).map(({passwordSalt,passwordHash,...u})=>u);
  const leaderboard=(d.leaderboard||[]).slice().sort((a,b)=>(b.score||0)-(a.score||0));
  const data={
    stats:d.stats||{activeTrips:0,activeTrend:0,operatingTrains:0,totalTrains:0,onTime:0,onTimeTrend:0},
    schedules:d.schedules||[],trains:d.trains||[],stations:d.stations||[],leaderboard,
    activities:d.activities||[],simulation:d.simulation||{},notifications:d.notifications||[],achievements:d.achievements||[],
    simulationEngine:d.simulationEngine||{},routes:d.routes||[],scenarios:d.scenarios||[],
    me:user?{id:user.id,name:user.name,role:user.role,level:user.level,score:user.score}:null,
    users:auth.session.role==="Administrator"?safeUsers:[]
  };
  return json({ok:true,data},200,{"Cache-Control":"private,no-store"});
};
