import { json } from "./_lib/security.mjs";
export default async () => json({ok:true,service:"ppka-api",phase:2,time:new Date().toISOString()});