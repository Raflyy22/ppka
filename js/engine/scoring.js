export function calculateScore(state){
 const delay=Number(state.delayMinutes||0);
 const major=(state.events||[]).filter(e=>e.severity==="major").length;
 const minor=(state.events||[]).filter(e=>e.severity==="warning").length;
 return Math.max(0,1000-delay*10-major*100-minor*25);
}
export function xpFromScore(score){return Math.max(0,Math.floor(Number(score||0)/10));}