import { currentUser, publicUser, json, USERS } from "./_lib/security.mjs";

export default async (request) => {
  const user=await currentUser(request);
  if(!user)return json({ok:false,message:"Unauthorized."},401);

  const url=new URL(request.url);
  const tail=url.pathname.split("/").filter(Boolean).at(-1);

  if(request.method==="GET" && tail==="me")
    return json({ok:true,user:publicUser(user)});

  if(request.method==="PATCH" && tail==="me"){
    const body=await request.json().catch(()=>null);
    if(!body)return json({ok:false,message:"Body tidak valid."},400);
    const patch={};
    if(typeof body.displayName==="string")patch.displayName=body.displayName.trim().slice(0,50);
    const updated={...user,...patch,updatedAt:new Date().toISOString()};
    await USERS().setJSON(user.id,updated);
    return json({ok:true,user:publicUser(updated)});
  }

  return json({ok:false,message:"Users endpoint tidak ditemukan."},404);
};