import { currentUser, json } from "./_lib/security.mjs";

export default async (request) => {
  const user=await currentUser(request);
  if(!user)return json({ok:false,message:"Unauthorized."},401);
  if(user.role!=="admin")return json({ok:false,message:"Forbidden."},403);
  return json({ok:true,message:"Admin API protected. CRUD akan ditambahkan pada Phase 3."});
};