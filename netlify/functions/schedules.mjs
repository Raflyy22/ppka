import {json,body} from "./lib/http.mjs";
import {currentUser,requirePermission} from "./lib/auth.mjs";
import {listCollection,getCollectionItem,putCollectionItem,deleteCollectionItem} from "./lib/store.mjs";
import {randomId} from "./lib/security.mjs";
const COLLECTION="schedules";
function clean(x){const o={...x};delete o.password;delete o.passwordHash;delete o.role;delete o.permissions;return o}
export default async request=>{
 const user=await currentUser(request);if(!user)return json({ok:false,message:"Unauthorized."},401);
 const parts=new URL(request.url).pathname.split("/").filter(Boolean);const id=parts.at(-1);
 const itemPath=id&&id!==COLLECTION;
 if(request.method==="GET"){if(itemPath){const x=await getCollectionItem(COLLECTION,id);return x?json({ok:true,data:x}):json({ok:false,message:"Data tidak ditemukan."},404)}return json({ok:true,data:await listCollection(COLLECTION)})}
 if(!requirePermission(user,"system.manage"))return json({ok:false,message:"Forbidden."},403);
 if(request.method==="POST"){const x=clean(await body(request));if(!x.name&&!x.code)return json({ok:false,message:"Field utama diperlukan."},400);const item={...x,id:x.id||randomId(COLLECTION.slice(0,-1)),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};await putCollectionItem(COLLECTION,item);return json({ok:true,data:item},201)}
 if(request.method==="PUT"&&itemPath){const old=await getCollectionItem(COLLECTION,id);if(!old)return json({ok:false,message:"Data tidak ditemukan."},404);const item={...old,...clean(await body(request)),id,updatedAt:new Date().toISOString()};await putCollectionItem(COLLECTION,item);return json({ok:true,data:item})}
 if(request.method==="DELETE"&&itemPath){await deleteCollectionItem(COLLECTION,id);return json({ok:true})}
 return json({ok:false,message:"Method tidak didukung."},405)
};
