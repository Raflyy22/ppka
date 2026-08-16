import {db,hashPassword,safeEqual,signSession,verifySession,cookies,secret,randomToken,cookie,json,originOk} from "./_security.mjs";

const WINDOW=15*60*1000, LIMIT=8;
const attempts=new Map();
function key(req){return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";}
function rateLimited(req){
  const k=key(req), now=Date.now(), x=attempts.get(k)||{start:now,count:0};
  if(now-x.start>WINDOW){x.start=now;x.count=0;}
  x.count++;attempts.set(k,x);
  return x.count>LIMIT;
}
function commonHeaders(){
  return {"Cache-Control":"no-store","Pragma":"no-cache"};
}

export default async req=>{
  const url=new URL(req.url), action=url.pathname.split("/").filter(Boolean).pop();
  if(!originOk(req)) return json({ok:false,message:"Invalid origin"},403);
  if(req.method==="POST" && action==="login"){
    if(rateLimited(req)) return json({ok:false,message:"Terlalu banyak percobaan login. Coba lagi nanti."},429,commonHeaders());
    const body=await req.json().catch(()=>({})), email=String(body.email||"").trim().toLowerCase(), password=String(body.password||"");
    if(!email||password.length<8) return json({ok:false,message:"Email dan password wajib valid."},400,commonHeaders());
    const data=await db(), user=data.users.find(x=>x.email.toLowerCase()===email);
    // Constant-ish work for unknown users.
    const fakeSalt=data.users[0].passwordSalt, fakeHash=hashPassword(password,fakeSalt,data.auth.iterations);
    if(!user){safeEqual(fakeHash,data.users[0].passwordHash);return json({ok:false,message:"Email atau password salah."},401,commonHeaders());}
    const candidate=hashPassword(password,user.passwordSalt,data.auth.iterations);
    if(!safeEqual(candidate,user.passwordHash)) return json({ok:false,message:"Email atau password salah."},401,commonHeaders());

    const now=Date.now(), csrf=randomToken(24);
    const session=signSession({sub:user.id,role:user.role,name:user.name,iat:now,exp:now+8*60*60*1000},secret());
    return json({ok:true,user:{id:user.id,name:user.name,role:user.role}},200,{
      ...commonHeaders(),
      "Set-Cookie":[cookie("ppka_session",session,8*60*60,{httpOnly:true,sameSite:"Lax",secure:true}),cookie("ppka_csrf",csrf,8*60*60,{httpOnly:false,sameSite:"Lax",secure:true})]
    });
  }
  if(action==="me"){
    const c=cookies(req), s=verifySession(c.ppka_session,secret());
    if(!s)return json({ok:true,authenticated:false},200,commonHeaders());
    return json({ok:true,authenticated:true,user:{id:s.sub,name:s.name,role:s.role}},200,commonHeaders());
  }
  if(req.method==="POST" && action==="logout"){
    const c=cookies(req), s=verifySession(c.ppka_session,secret());
    if(s){
      const token=req.headers.get("x-csrf-token")||"";
      if(!token || token!==c.ppka_csrf) return json({ok:false,message:"CSRF validation failed"},403,commonHeaders());
    }
    return json({ok:true},200,{
      ...commonHeaders(),
      "Set-Cookie":[cookie("ppka_session","",0,{httpOnly:true,sameSite:"Lax",secure:true}),cookie("ppka_csrf","",0,{httpOnly:false,sameSite:"Lax",secure:true})]
    });
  }
  return json({ok:false,message:"Not found"},404,commonHeaders());
};
