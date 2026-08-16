const AUTH_API="/api/auth";

const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function toast(msg,type="success"){
  const root=$("#toast-root")||document.body, el=document.createElement("div");
  el.className=`toast ${type}`;el.textContent=msg;root.append(el);setTimeout(()=>el.remove(),3500);
}
function csrf(){
  return decodeURIComponent((document.cookie.match(/(?:^|;\s*)ppka_csrf=([^;]+)/)||[])[1]||"");
}
async function api(url, options={}){
  const method=(options.method||"GET").toUpperCase();
  const headers={"Content-Type":"application/json",...(options.headers||{})};
  if(!["GET","HEAD","OPTIONS"].includes(method)) headers["X-CSRF-Token"]=csrf();
  const r=await fetch(url,{credentials:"same-origin",...options,headers});
  const body=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(body.message||"Request gagal");
  return body;
}

async function bootAuth(){
  const form=$("#login-form");
  if(!form)return;
  try{
    const me=await api(`${AUTH_API}/me`);
    if(me.authenticated){ location.href="/"; return; }
  }catch{}
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const btn=form.querySelector("button[type=submit]");btn.disabled=true;
    try{
      const body=Object.fromEntries(new FormData(form));
      const result=await api(`${AUTH_API}/login`,{method:"POST",body:JSON.stringify(body)});
      toast("Login berhasil. Mengarahkan...");
      setTimeout(()=>location.href="/",250);
    }catch(err){toast(err.message,"error");}
    finally{btn.disabled=false;}
  });
}
bootAuth();
