import { getStore } from "@netlify/blobs";
const authStore=()=>getStore("ppka-auth",{consistency:"strong"});
const dataStore=()=>getStore("ppka-data",{consistency:"strong"});
export async function getJson(store,key,fallback=null){return (await store.get(key,{type:"json"})) ?? fallback}
export async function setJson(store,key,value){await store.setJSON(key,value)}
export const stores={auth:authStore,data:dataStore};
export async function getUserById(id){return getJson(authStore(),`users/${id}.json`)}
export async function getUserByIdentity(identity){const i=await getJson(authStore(),"indexes/identity.json",{});const id=i[String(identity).toLowerCase()];return id?getUserById(id):null}
export async function putUser(user){await setJson(authStore(),`users/${user.id}.json`,user);const i=await getJson(authStore(),"indexes/identity.json",{});i[user.username]=user.id;i[user.email]=user.id;await setJson(authStore(),"indexes/identity.json",i)}
export async function putSession(s){await setJson(authStore(),`sessions/${s.id}.json`,s)}
export async function getSession(id){return getJson(authStore(),`sessions/${id}.json`)}
export async function deleteSession(id){await authStore().delete(`sessions/${id}.json`)}
export async function appendAudit(e){const k="audit/log.json";const a=await getJson(authStore(),k,[]);a.unshift(e);await setJson(authStore(),k,a.slice(0,1000))}
export async function getData(k,f){return getJson(dataStore(),k,f)}
export async function setData(k,v){return setJson(dataStore(),k,v)}
export async function listCollection(c){const s=dataStore();const {blobs}=await s.list({prefix:`${c}/`});const out=[];for(const b of blobs){const v=await s.get(b.key,{type:"json"});if(v)out.push(v)}return out}
export async function getCollectionItem(c,id){return getJson(dataStore(),`${c}/${id}.json`)}
export async function putCollectionItem(c,item){return setJson(dataStore(),`${c}/${item.id}.json`,item)}
export async function deleteCollectionItem(c,id){return dataStore().delete(`${c}/${id}.json`)}
