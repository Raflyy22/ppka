export function buildDemoScenario(){
  return {
    id:"local_demo",name:"Operasi Pagi",difficulty:"easy",
    startMinutes:360,endMinutes:390,durationMinutes:30
  };
}
export function buildDemoTrains(){
  return [
    {id:"sim_trn_001",code:"KA101",name:"Argo Simulator",status:"scheduled",departureMinutes:362,speed:80,progress:0},
    {id:"sim_trn_002",code:"KA202",name:"Lokal Simulator",status:"scheduled",departureMinutes:366,speed:65,progress:0}
  ];
}