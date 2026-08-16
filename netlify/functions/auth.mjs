import {
  USERS, SESSIONS, META, hashPassword, verifyPassword, sha256,
  normalizeEmail, normalizeUsername, validUsername, validEmail, validPassword,
  json, getCookie, setSessionCookie, clearSessionCookie, createSession,
  currentUser, publicUser
} from "./_lib/security.mjs";

async function ensureMeta(){
  const store=META();
  const existing=await store.get("config",{type:"json"});
  if(existing)return existing;
  const config={registration:true,maintenance:false};
  await store.setJSON("config",config);
  return config;
}

export default async (request) => {
  const url=new URL(request.url);
  const action=url.pathname.split("/").filter(Boolean).at(-1);

  if(request.method==="GET" && action==="me"){
    const user=await currentUser(request);
    return json({ok:true,user:publicUser(user)});
  }

  if(request.method==="POST" && action==="register"){
    const body=await request.json().catch(()=>null);
    if(!body)return json({ok:false,message:"Body tidak valid."},400);
    const username=String(body.username||"").trim();
    const email=normalizeEmail(body.email);
    const password=String(body.password||"");
    const config=await ensureMeta();
    if(!config.registration)return json({ok:false,message:"Pendaftaran sedang ditutup."},403);
    if(!validUsername(username))return json({ok:false,message:"Username 3–30 karakter: huruf, angka, underscore."},400);
    if(!validEmail(email))return json({ok:false,message:"Email tidak valid."},400);
    if(!validPassword(password))return json({ok:false,message:"Password minimal 8 karakter."},400);

    const users=USERS();
    if(await users.get(`username:${normalizeUsername(username)}`,{type:"json"}))
      return json({ok:false,message:"Username sudah digunakan."},409);
    if(await users.get(`email:${email}`,{type:"json"}))
      return json({ok:false,message:"Email sudah digunakan."},409);

    const id="usr_"+crypto.randomUUID();
    const pw=await hashPassword(password);
    const user={id,username,email,role:"user",permissions:[],level:1,xp:0,score:0,createdAt:new Date().toISOString(),passwordSalt:pw.salt,passwordHash:pw.hash};
    await users.setJSON(id,user);
    await users.setJSON(`username:${normalizeUsername(username)}`,{id});
    await users.setJSON(`email:${email}`,{id});

    const token=await createSession(user);
    return json({ok:true,user:publicUser(user)},{headers:{"set-cookie":setSessionCookie(token)}});
  }

  if(request.method==="POST" && action==="login"){
    const body=await request.json().catch(()=>null);
    const identity=String(body?.identity||"").trim();
    const password=String(body?.password||"");
    const users=USERS();
    const key=identity.includes("@") ? `email:${normalizeEmail(identity)}` : `username:${normalizeUsername(identity)}`;
    const ref=await users.get(key,{type:"json"});
    if(!ref)return json({ok:false,message:"Identitas atau password salah."},401);
    const user=await users.get(ref.id,{type:"json"});
    if(!user || !(await verifyPassword(password,user.passwordSalt,user.passwordHash)))
      return json({ok:false,message:"Identitas atau password salah."},401);
    const token=await createSession(user);
    return json({ok:true,user:publicUser(user)},{headers:{"set-cookie":setSessionCookie(token)}});
  }

  if(request.method==="POST" && action==="logout"){
    const raw=getCookie(request,"ppka_session");
    if(raw) await SESSIONS().delete(await sha256(raw));
    return json({ok:true},{headers:{"set-cookie":clearSessionCookie()}});
  }

  return json({ok:false,message:"Auth endpoint tidak ditemukan."},404);
};