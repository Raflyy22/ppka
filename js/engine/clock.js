export function formatSimTime(minutes=0){
  const m=((Math.floor(minutes)%1440)+1440)%1440;
  return `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
}