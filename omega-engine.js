/* Laplace's Officer | OMEGA engine v1
   Fictional city model. NOT fitted or validated against real-world crime data.
   Research sources and distinction between observed data and mechanisms are documented in omega.html. */
(function(global){
"use strict";
const SIZE=12, COUNT=SIZE*SIZE, MAX_MONTHS=240;
const TYPES=[
{id:"theft",name:"Theft / larceny",short:"THEFT",color:"#f4c35c",rate:4.6,report:.54,detect:.11,police:.085,season:.13,phase:0,harm:1},
{id:"burglary",name:"Burglary",short:"BURGLARY",color:"#df9bff",rate:1.7,report:.64,detect:.10,police:.075,season:.12,phase:1,harm:2},
{id:"vehicle",name:"Motor-vehicle theft",short:"AUTO THEFT",color:"#55d1f3",rate:1.65,report:.79,detect:.13,police:.09,season:.14,phase:2,harm:2},
{id:"robbery",name:"Robbery",short:"ROBBERY",color:"#ff7d9a",rate:.66,report:.60,detect:.09,police:.09,season:.09,phase:3,harm:5},
{id:"assault",name:"Aggravated assault",short:"ASSAULT",color:"#ff8d6b",rate:1.10,report:.49,detect:.08,police:.075,season:.17,phase:4,harm:5},
{id:"gun",name:"Firearm violence",short:"GUN VIOLENCE",color:"#ff546a",rate:.26,report:.67,detect:.07,police:.075,season:.15,phase:4,harm:9},
{id:"homicide",name:"Homicide",short:"HOMICIDE",color:"#ee547e",rate:.048,report:.96,detect:.015,police:.045,season:.18,phase:4,harm:14},
{id:"sexual",name:"Sexual assault",short:"SEXUAL ASSAULT",color:"#c09dff",rate:.36,report:.29,detect:.025,police:.035,season:.05,phase:5,harm:9},
{id:"fraud",name:"Fraud",short:"FRAUD",color:"#71e8e0",rate:1.30,report:.33,detect:.025,police:.015,season:.11,phase:1,harm:2},
{id:"drug",name:"Drug-market offenses",short:"DRUG OFFENSES",color:"#aa98ff",rate:1.75,report:.11,detect:.62,police:.055,season:.04,phase:0,harm:2,policeDiscovered:true},
{id:"disorder",name:"Disorder complaints",short:"DISORDER",color:"#77b9ff",rate:1.9,report:.38,detect:.43,police:.045,season:.15,phase:4,harm:1},
{id:"overdose",name:"Overdose emergencies (not crime)",short:"OVERDOSE HARM",color:"#7cf2b2",rate:.38,report:.87,detect:.03,police:0,season:.10,phase:0,harm:9,isHarm:true}
];
const PRESETS={
 predictive:{label:"Predictive patrol",policy:"predictive",prevention:18,budget:10,tactics:"intensive",surveillance:65},
 balanced:{label:"Balanced prevention",policy:"problem",prevention:60,budget:10,tactics:"procedural",surveillance:35},
 equal:{label:"Equal-coverage patrol",policy:"equal",prevention:18,budget:10,tactics:"procedural",surveillance:35},
 needs:{label:"Support-first",policy:"needs",prevention:80,budget:10,tactics:"procedural",surveillance:25},
 random:{label:"Randomized allocation",policy:"random",prevention:18,budget:10,tactics:"procedural",surveillance:35},
 oracle:{label:"Unobservable oracle",policy:"oracle",prevention:18,budget:10,tactics:"procedural",surveillance:35}
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function mixhash(n){n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return (n^(n>>>16))>>>0}
function hash(seed,a,b,c,d){let x=mixhash((seed|0)^Math.imul(a+1,2654435761));x=mixhash(x^Math.imul(b+5,2246822519));x=mixhash(x^Math.imul(c+9,3266489917));return mixhash(x^(d|0))}
function uniform(seed,a,b,c,d){return (hash(seed,a,b,c,d)+.5)/4294967296}
function rng(seed,a,b,c){let state=hash(seed,a,b,c,7919);return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return (state+.5)/4294967296}}
function poisson(lambda,random){lambda=clamp(lambda,0,100);if(lambda===0)return 0;
 if(lambda>22){let u1=Math.max(.00000001,random()),u2=random();return Math.max(0,Math.round(lambda+Math.sqrt(lambda)*Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2)))}
 const limit=Math.exp(-lambda);let p=1,k=0;do{k++;p*=random()}while(p>limit&&k<250);return k-1;
}
function sum(a){let s=0;for(const n of a)s+=n;return s}
function gaussian(x,y,cx,cy,r){return Math.exp(-((x-cx)**2+(y-cy)**2)/(r*r))}
function createDistrict(id,seed){
 const x=id%SIZE,y=Math.floor(id/SIZE);
 const u=(axis)=>uniform(seed,id,axis,0,0);
 const center=gaussian(x,y,5.2,5.4,3.5);
 const north=gaussian(x,y,2.8,2.4,2.3);
 const river=gaussian(x,y,9,8.3,2.9);
 const commerce=clamp(.12+center*.85+north*.28+u(1)*.22,0,1);
 const nightlife=clamp(.11+gaussian(x,y,7.9,4,2.6)*.82+u(2)*.2,0,1);
 const transit=clamp(.08+river*.7+center*.35+u(3)*.21,0,1);
 const need=clamp(.22+gaussian(x,y,3.3,8.1,3)*.56+u(4)*.35,0,1);
 const housing=clamp(.3+.55*(1-center)+u(5)*.17,0,1);
 const base=TYPES.map((type,k)=>{
  let environment=1;
  if(["theft","fraud"].includes(type.id))environment=.48+commerce*.9+transit*.38;
  else if(type.id==="vehicle")environment=.50+transit*.7+housing*.36;
  else if(["robbery","assault","gun","homicide","disorder"].includes(type.id))environment=.47+nightlife*.65+need*.47;
  else if(type.id==="burglary")environment=.52+housing*.55+need*.30;
  else if(type.id==="sexual")environment=.70+nightlife*.18+housing*.10;
  else if(type.id==="drug")environment=.62+need*.45+transit*.18;
  else if(type.id==="overdose")environment=.55+need*.55;
  return type.rate*environment*(.78+u(k+20)*.46);
 });
 return{id,x,y,commerce,nightlife,transit,need,housing,base,trust:clamp(.64+(u(66)-.5)*.14,.30,.9),
  score:base.map((v,k)=>v*TYPES[k].report*.9),patrol:0,tower:u(88)<.2,
  stock:{treat:0,educate:0,house:0,outreach:0},queue:Array(19).fill(0),
  truth:Array(TYPES.length).fill(0),recorded:Array(TYPES.length).fill(0),totalTruth:0,totalRecorded:0,prev:0};
}
function createWorld(seed,config){
 const settings={...PRESETS.balanced,...config};
 const world={seed,month:0,settings,cells:Array.from({length:COUNT},(_,i)=>createDistrict(i,seed)),history:[],snapshots:[]};
 return world;
}
function pickPatrol(world,opts){
 const w=world.cells,cfg=world.settings;
 const available=Math.min(105,Math.round((1-cfg.prevention/100)*Math.sqrt(cfg.budget/10)*70));
 const order=Array.from({length:COUNT},(_,i)=>i);
 const policy=cfg.policy;
 if(policy==="predictive")order.sort((a,b)=>w[b].score.reduce((s,v,k)=>s+v*(opts.focus<0?1:opts.focus===k?4:.18),0)-w[a].score.reduce((s,v,k)=>s+v*(opts.focus<0?1:opts.focus===k?4:.18),0)||a-b);
 else if(policy==="oracle")order.sort((a,b)=>sum(w[b].base)-sum(w[a].base)||a-b);
 else if(policy==="problem")order.sort((a,b)=>sum(w[b].score)*.6+w[b].need*4-(sum(w[a].score)*.6+w[a].need*4)||a-b);
 else if(policy==="needs")order.sort((a,b)=>w[b].need-w[a].need||a-b);
 else if(policy==="equal")order.sort((a,b)=>((a-world.month*13+COUNT*500)%COUNT)-((b-world.month*13+COUNT*500)%COUNT));
 else if(policy==="random")order.sort((a,b)=>hash(world.seed,world.month,a,4,0)-hash(world.seed,world.month,b,4,0));
 w.forEach(c=>c.patrol=0);
 order.slice(0,available).forEach((id,i)=>{w[id].patrol=clamp(.72+(available-i)/available*.24,0,1)});
 return available;
}
function neighbors(cells,id){const x=id%SIZE,y=Math.floor(id/SIZE),arr=[];if(x>0)arr.push(cells[id-1]);if(x<SIZE-1)arr.push(cells[id+1]);if(y>0)arr.push(cells[id-SIZE]);if(y<SIZE-1)arr.push(cells[id+SIZE]);return arr}
function activeShock(shocks,t,type){let value=0;for(const s of shocks){if(s.type===type&&t>=s.start&&t<s.start+s.duration)value+=s.magnitude??1}return value}
function stepWorld(world,opts={}){
 if(world.month>=MAX_MONTHS)return null;
 const t=world.month,cfg=world.settings,focus=Number.isInteger(opts.focus)?opts.focus:-1,shocks=opts.shocks||[];
 const patrolCount=pickPatrol(world,{focus});
 const mix=opts.mix||{treat:35,educate:20,house:25,outreach:20};
 const mixSum=Math.max(1,sum(Object.values(mix)));
 const marketShock=activeShock(shocks,t,"recession"),festival=activeShock(shocks,t,"festival");
 const opioid=activeShock(shocks,t,"opioid"),outage=activeShock(shocks,t,"outage");
 const procedural=cfg.tactics==="procedural";
 const totalTrue=Array(TYPES.length).fill(0),totalRecorded=Array(TYPES.length).fill(0);
 const coverage=clamp(cfg.surveillance/100,0,1);
 let trustTotal=0,programTotal=0,weightedPatrol=0;
 const spillMode=clamp((opts.spillover??-20)/100,-1,1);
 const next=[];
 for(const cell of world.cells){
  const supportReach=clamp((cfg.prevention/100)*Math.sqrt(cfg.budget/10)*(0.6+cell.need*.65),0,1.6);
  for(const program of ["treat","educate","house","outreach"]){
    const dose=clamp(supportReach*(mix[program]||0)/mixSum*2.5,0,1);
    if(program==="educate"){
      cell.queue.push(dose);
      const lagged=cell.queue.shift();
      cell.stock.educate=clamp(cell.stock.educate*.955+lagged*.045,0,1);
    }else{
      const alpha=program==="treat"?.27:program==="house"?.11:.22;
      cell.stock[program]=clamp(cell.stock[program]*(1-alpha)+dose*alpha,0,1);
    }
  }
  const prevPatrol=cell.patrol,st=cell.stock;
  const trustShock=activeShock(shocks,t,"reform");
  cell.trust=clamp(cell.trust+(0.65-cell.trust)*.017+st.outreach*.009+trustShock*.018-prevPatrol*(procedural?.002:.016),.2,.95);
  trustTotal+=cell.trust;programTotal+=supportReach;weightedPatrol+=prevPatrol;
  const neighborPressure=neighbors(world.cells,cell.id).reduce((s,c)=>s+c.patrol,0)/4;
  const trueCounts=[],recCounts=[],prevCounts=[];
  for(let k=0;k<TYPES.length;k++){
    const cat=TYPES[k],b=cell.base[k];
    const seasonal=1+cat.season*Math.sin(2*Math.PI*(t%12)/12+cat.phase);
    let shockFactor=1;
    if(marketShock)shockFactor*=1+marketShock*(["theft","burglary","vehicle","fraud"].includes(cat.id)?.22:.04);
    if(festival)shockFactor*=1+festival*(["theft","robbery","assault","disorder"].includes(cat.id)?.24:.025);
    if(opioid&&cat.id==="overdose")shockFactor*=1+opioid*.48;
    const social={
      theft:.10*st.educate+.17*st.house,
      burglary:.11*st.educate+.19*st.house,
      vehicle:.07*st.educate+.11*st.house,
      robbery:.07*st.educate+.11*st.house+.11*st.outreach,
      assault:.12*st.outreach,
      gun:.17*st.outreach,
      homicide:.17*st.outreach,
      sexual:.035*st.outreach,
      fraud:.06*st.educate,
      drug:.06*st.treat,
      disorder:.10*st.house+.06*st.outreach,
      overdose:.44*st.treat
    }[cat.id];
    // The spillover slider illustrates alternative hypotheses. Negative = diffusion, positive = displacement.
    const spill=Math.max(.75,1+neighborPressure*(spillMode>=0?.12*spillMode:-.10*-spillMode));
    const patrolEffect=cat.police*prevPatrol;
    const expectedNoIntervention=Math.max(0,b*seasonal*shockFactor);
    const lambda=Math.max(0,expectedNoIntervention*(1-social)*(1-patrolEffect)*spill);
    const draw=poisson(lambda,rng(world.seed,t,cell.id,k));
    const sensorCovered=uniform(world.seed,cell.id,99,0,0)<coverage?1:0;
    let reporting=cat.report+(cell.trust-.63)*.19+prevPatrol*cat.detect*.56+sensorCovered*cat.detect*.16;
    if(cat.isHarm)reporting=cat.report+(cell.trust-.63)*.05;
    if(outage)reporting*=Math.max(.08,1-outage*.70);
    reporting=clamp(reporting,.025,.99);
    const random=rng(world.seed,t,cell.id,k+100);
    let observed=0;for(let i=0;i<draw;i++)if(random()<reporting)observed++;
    trueCounts[k]=draw;recCounts[k]=observed;prevCounts[k]=Math.max(0,expectedNoIntervention-lambda);
    totalTrue[k]+=draw;totalRecorded[k]+=observed;
  }
  cell.truth=trueCounts;cell.recorded=recCounts;cell.totalTruth=sum(trueCounts);cell.totalRecorded=sum(recCounts);
  cell.score=cell.score.map((score,k)=>.68*score+.32*recCounts[k]);
  next.push({truth:trueCounts.slice(),recorded:recCounts.slice(),patrol:cell.patrol,trust:cell.trust,
    stock:{...cell.stock},queue:cell.queue.slice(),score:cell.score.slice(),prev:prevCounts.slice()});
 }
 const trueCrime=sum(totalTrue.slice(0,-1)),recordedCrime=sum(totalRecorded.slice(0,-1));
 const result={
   month:t+1, year:2027+Math.floor(t/12), monthInYear:t%12,
   trueCrime,recordedCrime,overdose:totalTrue.at(-1),recordedOverdose:totalRecorded.at(-1),
   trueByType:totalTrue,recordedByType:totalRecorded,
   trust:trustTotal/COUNT,patrolCount,patrolIntensity:weightedPatrol/COUNT,
   supportReach:programTotal/COUNT,budgetMillions:cfg.budget,prevention:cfg.prevention,
   preventionExpected:next.reduce((s,c)=>s+sum(c.prev),0),
   observation:sum(totalTrue)>0?sum(totalRecorded)/sum(totalTrue):0,
   category:focus,policy:cfg.policy
 };
 world.month++;
 world.history.push(result);
 world.snapshots.push(next);
 return result;
}
function restore(world,month){month=Math.floor(clamp(month,0,world.month));if(month===world.month)return;
 if(month===0){const base=createWorld(world.seed,world.settings);world.cells=base.cells;world.month=0;world.history=[];world.snapshots=[];return}
 const snap=world.snapshots[month-1];
 if(!snap)throw Error("Missing simulation snapshot for requested month");
 world.cells.forEach((c,i)=>{const s=snap[i];c.truth=s.truth.slice();c.recorded=s.recorded.slice();c.patrol=s.patrol;c.trust=s.trust;c.stock={...s.stock};c.queue=s.queue.slice();c.score=s.score.slice();c.totalTruth=sum(s.truth);c.totalRecorded=sum(s.recorded)});
 world.month=month;world.history.length=month;world.snapshots.length=month;
}
function shown(world,at){if(at<=0)return null;return world.snapshots[Math.min(at,world.month)-1]||null}
global.LaplaceOmegaEngine={SIZE,COUNT,MAX_MONTHS,TYPES,PRESETS,createWorld,stepWorld,restore,shown,clamp,sum,hash};
})(window);