import { getStore } from "@netlify/blobs";

export const USERS = () => getStore({name:"ppka-users", consistency:"strong"});
export const SESSIONS = () => getStore({name:"ppka-sessions", consistency:"strong"});
export const META = () => getStore({name:"ppka-meta", consistency:"strong"});

const encoder = new TextEncoder();

function bytesToBase64(bytes){
  let s="";
  for(const b of bytes) s+=String.fromCharCode(b);
  return btoa(s);
}
function base64ToBytes(value){
  const s=atob(value);
  return Uint8Array.from(s,c=>c.charCodeAt(0));
}

export async function hashPassword(password, saltBytes){
  const salt = saltBytes || crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:150000,hash:"SHA-256"},material,256);
  return {salt:bytesToBase64(salt), hash:bytesToBase64(new Uint8Array(bits))};
}

export async function verifyPassword(password, salt, expected){
  const result=await hashPassword(password,base64ToBytes(salt));
  return result.hash===expected;
}

export async function sha256(value){
  const bits=await crypto.subtle.digest("SHA-256",encoder.encode(value));
  return bytesToBase64(new Uint8Array(bits));
}

export function randomToken(){
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  return bytesToBase64(bytes).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
}

export function normalizeEmail(value){return String(value||"").trim().toLowerCase();}
export function normalizeUsername(value){return String(value||"").trim().toLowerCase();}

export function validUsername(value){return /^[a-zA-Z0-9_]{3,30}$/.test(value);}
export function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);}
export function validPassword(value){return typeof value==="string" && value.length>=8 && value.length<=128;}

export function json(data,status=200,headers={}){
  return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...headers}});
}

export function getCookie(request,name){
  const raw=request.headers.get("cookie")||"";
  const pair=raw.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="));
  return pair ? decodeURIComponent(pair.slice(name.length+1)) : null;
}

export function setSessionCookie(token){
  return `ppka_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`;
}
export function clearSessionCookie(){
  return "ppka_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

export async function createSession(user){
  const raw=randomToken(), key=await sha256(raw);
  await SESSIONS().setJSON(key,{userId:user.id,createdAt:Date.now(),expiresAt:Date.now()+7*86400000});
  return raw;
}

export async function currentUser(request){
  const raw=getCookie(request,"ppka_session");
  if(!raw)return null;
  const key=await sha256(raw);
  const session=await SESSIONS().get(key,{type:"json"});
  if(!session || session.expiresAt<Date.now()) return null;
  return await USERS().get(session.userId,{type:"json"});
}

export function publicUser(user){
  if(!user)return null;
  const {passwordHash,passwordSalt,...safe}=user;
  return safe;
}