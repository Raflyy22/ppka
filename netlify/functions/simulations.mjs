import {json,body} from "./lib/http.mjs";
import {currentUser} from "./lib/auth.mjs";
import {getData,setData} from "./lib/store.mjs";
import {randomId} from "./lib/security.mjs";
export default async request=>{
 const u=await currentUser(request);if(!u)return json({ok:false,message:"Unauthorized."},401);
 const listKey=`simulations/${u.id}.json`;
 if(request.method==="GET")return json({ok:true,data:await getData(listKey,[])});
 if(request.method==="POST"){
  const x=await body(request);const list=await getData(listKey,[]);
  const sim={id:x.id||randomId("sim"),userId:u.id,state:x.state||{},status:x.status||"saved",createdAt:x.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  const idx=list.findIndex(v=>v.id===sim.id);if(idx>=0)list[idx]=sim;else list.unshift(sim);
  await setData(listKey,list.slice(0,50));return json({ok:true,data:sim},201);
 }
 return json({ok:false,message:"Method tidak didukung."},405);
};