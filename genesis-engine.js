/* LAPLACE // GENESIS — deterministic, synthetic agent-based research sandbox
   This is NOT a fitted crime model. Findings from Heller (2014), RAND (2013),
   Larochelle (2018), and Ensign et al. (2018) are narrowly adapted and
   explicitly separated from hypothetical city mechanics in genesis-evidence.js.
*/
(function(root){"use strict";
const N=12,D=N*N,POP=1152,HORIZON=240;
const TYPES=[
{id:"theft",name:"Theft / larceny",color:"#ffc869",base:.013,reported:.52,detected:.08,deterrence:.10},
{id:"burglary",name:"Burglary",color:"#b8a0ff",base:.0047,reported:.62,detected:.08,deterrence:.11},
{id:"vehicle",name:"Vehicle theft",color:"#71d9f3",base:.0044,reported:.76,detected:.07,deterrence:.09},
{id:"robbery",name:"Robbery",color:"#f885a6",base:.0021,reported:.61,detected:.08,deterrence:.08},
{id:"assault",name:"Aggravated assault",color:"#ff9475",base:.005,reported:.54,detected:.05,deterrence:.06},
{id:"gun",name:"Gun violence",color:"#ff6479",base:.0012,reported:.65,detected:.05,deterrence:.06},
{id:"homicide",name:"Homicide",color:"#ec5981",base:.00014,reported:.96,detected:.03,deterrence:.04},
{id:"sexual",name:"Sexual assault",color:"#d1a5ff",base:.0020,reported:.31,detected:.02,deterrence:.02},
{id:"fraud",name:"Fraud",color:"#66e6da",base:.006,reported:.34,detected:.02,deterrence:.01},
{id:"drug",name:"Drug-market offenses",color:"#a893ff",base:.0065,reported:.12,detected:.52,deterrence:.035},
{id:"disorder",name:"Disorder complaints",color:"#83b9ff",base:.009,reported:.39,detected:.35,deterrence:.04},
{id:"overdose",name:"Overdose emergencies · noncriminal",color:"#80f2b4",base:.0019,reported:.88,detected:.02,deterrence:0,health:true}
];
const DEFAULTS=Object.freeze({
policy:"predictive",prevention:20,patrolEffect:35,surveillance:55,procedure:"intensive",budget:12,
jobs:30,school:20,treatment:20,housing:20,reentry:10,calibration:"bounded"
});
const PRESETS={
patrol:{...DEFAULTS,policy:"predictive",prevention:12,surveillance:80,procedure:"intensive"},
prevent:{...DEFAULTS,policy:"needs",prevention:78,surveillance:25,procedure:"procedural",jobs:35,school:20,treatment:22,housing:15,reentry:8},
balanced:{...DEFAULTS,policy:"problem",prevention:48,surveillance:42,procedure:"procedural"},
equal:{...DEFAULTS,policy:"equal",prevention:20,surveillance:40,procedure:"procedural"},
random:{...DEFAULTS,policy:"random",prevention:20,surveillance:40,procedure:"procedural"}
};
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const sum=a=>a.reduce((s,v)=>s+(Number.isFinite(v)?v:0),0);
const avg=a=>a.length?sum(a)/a.length:0;
function hash(x){x=(x+0x9e3779b9)|0;x=Math.imul(x^(x>>>16),0x85ebca6b);x=Math.imul(x^(x>>>13),0xc2b2ae35);return(x^(x>>>16))>>>0}
function u(seed,month,id,channel){return(hash(hash(hash((seed|0)^Math.imul(month+101,747796405))^Math.imul(id+31,2891336453))^Math.imul(channel+73,277803737))+.5)/4294967296}
function prob(p){return clamp(p,0,.999999)}
function scalar(seed,id,c){return u(seed,0,id,c)}
function initialDistrict(id,seed){
 const x=id%N,y=Math.floor(id/N);
 const gauss=(a,b,r)=>Math.exp(-((x-a)**2+(y-b)**2)/(r*r));
 const center=gauss(5.7,5.6,3.6),suburb=gauss(3.2,8.6,3.3),industrial=gauss(9.0,3.1,2.6);
 return{id,x,y,opportunity:clamp(.34+.40*center+.11*scalar(seed,id,44)-.22*suburb,.12,.94),
    need:clamp(.24+.5*suburb+.13*scalar(seed,id,45)-.20*center,.10,.93),
    commerce:clamp(.15+.72*center+.21*industrial,.05,.98),
    schoolQuality:clamp(.36+.30*center+.15*scalar(seed,id,46),.18,.9),
    clinic:clamp(.15+.39*center+.18*scalar(seed,id,47),.1,.8),
    development:clamp(.15+.66*center+.18*scalar(seed,id,48),.1,.98),
    trust:.66,patrol:0,score:4+center*4,reported:Array(12).fill(0),underlying:Array(12).fill(0),
    residents:0,intervention:0,schoolInvestment:0,jobInvestment:0,treatmentInvestment:0,housingInvestment:0,reentryInvestment:0,
    resources:0,events:0};
}
const FIRST=["Avery","Quinn","Morgan","Alex","Sky","Casey","Noor","River","Emery","Rowan","Taylor","Sage","Robin","Jules","Mika","Hayden","Jordan","Eli","Cameron","Riley","Iris","Sam","Drew","Toni"];
const LAST=["Vale","Parker","Reed","Carter","Brooks","Hale","Stone","Gray","Ellis","Miller","Santos","Bennett","Nguyen","Shaw","Rivera","Quill","Khan","Price","Howard","Watts"];
function resident(id,seed){
 const d=Math.floor(scalar(seed,id,1)*D),age=8+Math.floor(scalar(seed,id,2)*43),op=scalar(seed,id,3);
 return{id,name:FIRST[hash(id*7+seed)%FIRST.length]+" "+LAST[hash(id*19+seed*3)%LAST.length],
  household:Math.floor(id/3),birthAgeMonths:age*12+Math.floor(scalar(seed,id,4)*12),initial:d,friendIds:[],
  schoolAptitude:clamp(.25+scalar(seed,id,5)*.65,0,1),
  healthBaseline:scalar(seed,id,6),personalExposure:scalar(seed,id,7),
  initialEmployment:age>=19&&age<=64&&op<(.58+(.5-scalar(seed,id,8))*.13),
  initialEducation:clamp(18+age*1.25+scalar(seed,id,9)*22,5,100),
  startingTrust:clamp(.58+scalar(seed,id,10)*.25,.2,.92)};
}
function newState(p){return{id:p.id,home:p.initial,education:p.initialEducation,employed:p.initialEmployment,wealth:.27+.35*p.schoolAptitude,
  housing:.57,healthRisk:clamp(.10+p.healthBaseline*.65,0,.98),trust:p.startingTrust,graduated:p.birthAgeMonths>=18*12&&p.initialEducation>=50,
  programUntil:0,programOffered:0,treatmentUntil:0,overdoseSurvivor:false,incarcerated:0,completedCorrection:false,
  reentryRemaining:0,recidivated:false,arrests:0,violentArrests:0,recidivism:0,encounters:0,victimizations:0,overdoses:0,alive:true,
  moved:0,educatedInCustody:false,lastFlags:0,schoolExperience:0,socialCapital:.42,activeSummerJob:0,monthsEmployed:0,
  housingSupported:0};
}
function create(seed=314159,config={},population=POP,{track=true}={}){
 population=clamp(Math.round(population),64,POP);
 const people=Array.from({length:population},(_,id)=>resident(id,seed));
 // Households share an initial address; peer links include kin and nearby neighbors.
 for(let i=0;i<population;i++){
  const leader=Math.floor(i/3)*3,base=people[leader].initial;
  people[i].initial=base;
  const peers=[leader,leader+1,leader+2,(i+13)%population,(i+97)%population].filter(j=>j!==i&&j<population);
  people[i].friendIds=[...new Set(peers)];
 }
 const state=people.map(newState);
 const city=Array.from({length:D},(_,id)=>initialDistrict(id,seed));
 return{seed,month:0,config:{...DEFAULTS,...config},people,state,city,history:[],lifeFrames:[],events:[],
   track,population,policyHistory:[],shockHistory:[]};
}
const exposures=(config)=>{
 const weights={jobs:Math.max(0,config.jobs),school:Math.max(0,config.school),treatment:Math.max(0,config.treatment),housing:Math.max(0,config.housing),reentry:Math.max(0,config.reentry)};
 const total=Math.max(1,sum(Object.values(weights)));
 for(const k of Object.keys(weights))weights[k]/=total;
 return weights;
};
function cellPolicies(world,month){
 const cfg=world.config,city=world.city,weights=exposures(cfg),funding=clamp(cfg.prevention/100,0,1);
 const count=Math.round(clamp((1-funding)*.38*Math.sqrt(cfg.budget/12),.05,.45)*D);
 const ids=city.map(d=>d.id);
 if(cfg.policy==="predictive")ids.sort((a,b)=>city[b].score-city[a].score||a-b);
 else if(cfg.policy==="needs")ids.sort((a,b)=>city[b].need-city[a].need||a-b);
 else if(cfg.policy==="problem")ids.sort((a,b)=>(city[b].score*.4+city[b].need*8)-(city[a].score*.4+city[a].need*8)||a-b);
 else if(cfg.policy==="equal")ids.sort((a,b)=>((a-month*11+D*300)%D)-((b-month*11+D*300)%D));
 else if(cfg.policy==="random")ids.sort((a,b)=>u(world.seed,month,a,915)-u(world.seed,month,b,915));
 else if(cfg.policy==="oracle")ids.sort((a,b)=>city[b].commerce+city[b].need-city[a].commerce-city[a].need||a-b);
 city.forEach(d=>{d.patrol=0;d.residents=0;d.underlying.fill(0);d.reported.fill(0);d.events=0});
 for(const id of ids.slice(0,count))city[id].patrol=1;
 city.forEach(d=>{
  // Local public-service accessibility and redevelopment are invented policy functions.
  const targeting=.55+1.1*d.need;
  const invest=clamp(funding*targeting*Math.sqrt(cfg.budget/12),0,1.4);
  d.intervention=invest;
  d.jobInvestment=invest*weights.jobs;d.schoolInvestment=invest*weights.school;
  d.treatmentInvestment=invest*weights.treatment;d.housingInvestment=invest*weights.housing;d.reentryInvestment=invest*weights.reentry;
  d.schoolQuality=clamp(d.schoolQuality*.997+(d.schoolQuality*.003)+d.schoolInvestment*.0025,.1,.99);
  d.development=clamp(d.development*.9995+d.housingInvestment*.00065+d.jobInvestment*.00055,.06,1);
  d.clinic=clamp(d.clinic*.999+d.treatmentInvestment*.002,.07,.99);
 });
 return count;
}
const CRIME_NAMES=TYPES.map(t=>t.name);
const BIT={VICTIM:1,ARREST:2,OVERDOSE:4,ENCOUNTER:8,MOVED:16,SUPPORT:32,EDU:64,DEATH:128};
function flagsLabel(flags){return Object.entries(BIT).filter(([k,b])=>flags&b).map(([k])=>k)}
function event(world,p,kind,label){if(world.track){world.events.push({month:world.month+1,id:p.id,kind,label});}}
function snapshot(world){const persons=world.state,n=persons.length;
 const columns={home:new Uint8Array(n),education:new Uint8Array(n),employed:new Uint8Array(n),trust:new Uint8Array(n),
 housing:new Uint8Array(n),health:new Uint8Array(n),graduated:new Uint8Array(n),alive:new Uint8Array(n),
 treatment:new Uint8Array(n),custody:new Uint8Array(n),program:new Uint8Array(n),flags:new Uint8Array(n),
 arrests:new Uint8Array(n),encounters:new Uint16Array(n),victimizations:new Uint16Array(n),overdoses:new Uint16Array(n),
 wealth:new Uint8Array(n)};
 for(let i=0;i<n;i++){const p=persons[i];columns.home[i]=p.home;columns.education[i]=Math.round(clamp(p.education,0,100));columns.employed[i]=p.employed?1:0;
 columns.trust[i]=Math.round(clamp(p.trust*100,0,100));columns.housing[i]=Math.round(clamp(p.housing*100,0,100));
 columns.health[i]=Math.round(clamp(p.healthRisk*100,0,100));columns.graduated[i]=p.graduated?1:0;columns.alive[i]=p.alive?1:0;
 columns.treatment[i]=p.treatmentUntil>world.month?1:0;columns.custody[i]=p.incarcerated>0?1:0;columns.program[i]=p.programUntil>world.month?1:0;
 columns.flags[i]=p.lastFlags;columns.arrests[i]=Math.min(255,p.arrests);columns.encounters[i]=p.encounters;
 columns.victimizations[i]=p.victimizations;columns.overdoses[i]=p.overdoses;columns.wealth[i]=Math.round(clamp(p.wealth*100,0,100));
 }
 const districts=world.city.map(d=>({
  id:d.id,development:d.development,schoolQuality:d.schoolQuality,clinic:d.clinic,need:d.need,opportunity:d.opportunity,
  trust:d.trust,patrol:d.patrol,score:d.score,intervention:d.intervention,
  true:d.underlying.slice(),recorded:d.reported.slice(),residents:d.residents,
  jobs:d.jobInvestment,school:d.schoolInvestment,treatment:d.treatmentInvestment,housing:d.housingInvestment
 }));
 return{month:world.month,people:columns,districts};
}
function stateOf(world,id,month){
 if(month<1){const s=world.state[id];return{...s,age:Math.floor(world.people[id].birthAgeMonths/12),month:0}};
 const frame=world.lifeFrames[Math.min(month,world.month)-1];if(!frame)return null;const a=frame.people;
 return{id,month:frame.month,home:a.home[id],education:a.education[id],employed:!!a.employed[id],trust:a.trust[id]/100,
 housing:a.housing[id]/100,healthRisk:a.health[id]/100,graduated:!!a.graduated[id],alive:!!a.alive[id],
 treatment:!!a.treatment[id],custody:!!a.custody[id],program:!!a.program[id],flags:a.flags[id],
 arrests:a.arrests[id],encounters:a.encounters[id],victimizations:a.victimizations[id],overdoses:a.overdoses[id],
 wealth:a.wealth[id]/100,age:Math.floor((world.people[id].birthAgeMonths+frame.month)/12)};
}
function shift(world,options={}){
 if(world.month>=HORIZON)return null;
 const t=world.month,cfg=world.config,seed=world.seed,pop=world.population,people=world.people,state=world.state,city=world.city,shock=(options.shocks||[]).filter(s=>t>=s.start&&t<s.start+s.duration);
 const climate={economic:shock.some(s=>s.type==="recession")?1:0,festival:shock.some(s=>s.type==="festival")?1:0,opioid:shock.some(s=>s.type==="opioid")?1:0,reporting:shock.some(s=>s.type==="outage")?1:0};
 const patrolCount=cellPolicies(world,t),typesT=Array(12).fill(0),typesR=Array(12).fill(0);
 const copyPrev=state.map(p=>({home:p.home,employed:p.employed,education:p.education,healthRisk:p.healthRisk,alive:p.alive}));
 let employed=0,students=0,graduated=0,treatment=0,offeredJobs=0,newArrests=0,recidivism=0,encounters=0,victims=0,nonfatalOverdose=0,overdoseDeaths=0,ageEligible=0,aliveCount=0,moves=0,trustSum=0,custody=0;
 const baseReport=[.52,.62,.76,.61,.54,.65,.96,.31,.34,.12,.39,.88];
 for(let id=0;id<pop;id++){
  const person=people[id],p=state[id];p.lastFlags=0;
  if(!p.alive)continue;
  const age=(person.birthAgeMonths+t)/12,d=city[p.home],prior=copyPrev[id];
  const friendIds=person.friendIds,peerEmployed=friendIds.length?friendIds.reduce((acc,j)=>acc+(copyPrev[j]?.employed?1:0),0)/friendIds.length:.5;
  const need=d.need,jobAccess=d.opportunity*.5+d.jobInvestment*.55;
  if(p.incarcerated>0){
    p.incarcerated--;
    if(d.reentryInvestment>.02&&u(seed,t,id,110)<d.reentryInvestment*.13){
      if(!p.educatedInCustody){p.educatedInCustody=true;event(world,p,"education","Participated in simulated correctional education while in custody.");p.lastFlags|=BIT.EDU}
    }
    if(p.incarcerated===0){p.reentryRemaining=36;p.completedCorrection=p.educatedInCustody;p.recidivated=false;event(world,p,"reentry","Returned from a simulated custody period.");}
  }
  if(p.reentryRemaining>0)p.reentryRemaining--;
  if(age>=8&&age<18){
    students++;
    p.schoolExperience+=d.schoolQuality*.008;
    p.education=clamp(p.education+.10+.045*d.schoolQuality+.065*d.schoolInvestment+.03*(peerEmployed-.5),0,100);
    if(age>=17.99&&!p.graduated&&p.education>=48&&u(seed,t,id,120)<.35){
      p.graduated=true;event(world,p,"graduation","Completed secondary education.");p.lastFlags|=BIT.EDU;
    }
  }else if(age>=18&&age<20&&!p.graduated&&p.education>=55&&u(seed,t,id,121)<.025){
    p.graduated=true;event(world,p,"graduation","Completed secondary education later.");p.lastFlags|=BIT.EDU;
  }
  if(age>=14&&age<22&&t%12===5){
    ageEligible++;
    const offerChance=clamp(.04+d.jobInvestment*.35,0,.75);
    if(u(seed,t,id,130)<offerChance){
      p.programUntil=t+16;p.programOffered++;p.activeSummerJob=2;
      offeredJobs++;p.lastFlags|=BIT.SUPPORT;event(world,p,"youth-jobs","Offered a synthetic summer-jobs program. Study anchor concerns 16-month violent-arrest outcomes; no assumed permanent employment effect.");
    }
  }
  if(p.activeSummerJob>0)p.activeSummerJob--;
  if(age>=18&&age<67&&p.incarcerated===0){
    if(p.employed){
      if(u(seed,t,id,140)<prob(.010+climate.economic*.024+need*.006))p.employed=false;
    }else{
      const hire=clamp(.013+.018*jobAccess+.003*(peerEmployed-.5)+.003*(p.graduated?1:0)-climate.economic*.011,.003,.08);
      if(u(seed,t,id,141)<hire){p.employed=true;if(world.track&&u(seed,t,id,142)<.23)event(world,p,"work","Started a synthetic paid job.");}
    }
  }else if(age<18||age>=67||p.incarcerated>0)p.employed=false;
  if(p.employed){employed++;p.monthsEmployed++;p.wealth=clamp(p.wealth+.006*(.6+d.opportunity),0,1)}
  else p.wealth=clamp(p.wealth-.0017,0,1);
  if(age>=18&&p.housing<.95&&u(seed,t,id,150)<.08*d.housingInvestment){
    p.housing=clamp(p.housing+.04,0,1);p.housingSupported++;if(world.track&&u(seed,t,id,151)<.2)event(world,p,"housing","Received modeled housing assistance.");p.lastFlags|=BIT.SUPPORT;
  }else p.housing=clamp(p.housing+.0005*(.55-p.housing)-climate.economic*.001,0,1);
  const encounterP=.0008+d.patrol*(cfg.procedure==="intensive"?.028:.013);
  if(u(seed,t,id,160)<encounterP){
    p.encounters++;encounters++;p.lastFlags|=BIT.ENCOUNTER;
    p.trust=clamp(p.trust+(cfg.procedure==="intensive"?-.032:.006),.12,.97);
    if(world.track&&u(seed,t,id,161)<.25)event(world,p,"police","Experienced a synthetic police encounter; interpretation depends on the modeled enforcement style.");
  }
  p.trust=clamp(p.trust*.995+.005*(.60+.10*d.intervention),.15,.97);
  // Individual offense exposure affects simulated victimization; no person is assigned a
  // deterministic criminal identity, and GENESIS never turns a score into legal grounds.
  let anyVictim=false,overdosed=false;
  for(let k=0;k<TYPES.length;k++){
    const type=TYPES[k];let chance=type.base;
    chance*=clamp(.72+.35*need+.25*d.commerce+.17*person.personalExposure,.40,1.65);
    if([0,1,2,8].includes(k))chance*=1+climate.economic*.25;
    if([0,3,4,10].includes(k))chance*=1+climate.festival*.25;
    if(k===11){
      chance*=clamp(.12+p.healthRisk*.85+climate.opioid*.65,.02,2);
    }else if(k===5||k===6||k===3||k===4){chance*=clamp(1-.07*d.schoolInvestment-.04*d.housingInvestment,.72,1.1)}
    else if(k===0||k===1||k===2)chance*=clamp(1-.08*d.housingInvestment,.76,1.1);
    chance*=1-d.patrol*(cfg.patrolEffect/100)*type.deterrence;
    if(u(seed,t,id,200+k)<prob(chance)){
      d.underlying[k]++;typesT[k]++;
      if(k===11){
        p.overdoses++;nonfatalOverdose++;overdosed=true;p.lastFlags|=BIT.OVERDOSE;p.overdoseSurvivor=true;
        if(world.track)event(world,p,"overdose","Survived a synthetic nonfatal overdose emergency.");
        // Mortality association only applies to overdose death, never overdose event rates.
        const baseDeath=.02;
        const isTreated=t<p.treatmentUntil;
        if(u(seed,t,id,290)<baseDeath*(isTreated?.41:1)){
          p.alive=false;overdoseDeaths++;p.lastFlags|=BIT.DEATH;
          if(world.track)event(world,p,"death","Synthetic opioid-overdose death (an outcome of the mortality scenario, not an individual prediction).");
        }
      }else if(k!==9){p.victimizations++;anyVictim=true;p.lastFlags|=BIT.VICTIM;
        if(world.track&&u(seed,t,id,300+k)<.50)event(world,p,"victim","Experienced a synthetic "+type.name.toLowerCase()+" incident.");
      }
      let detect=type.reported+(p.trust-.6)*.15+cfg.surveillance/100*type.detected*.12+d.patrol*type.detected*.56;
      if(k===11)detect=type.reported;
      if(climate.reporting)detect*=.32;
      if(u(seed,t,id,400+k)<prob(detect)){d.reported[k]++;typesR[k]++}
    }
  }
  if(anyVictim)victims++;
  if(overdosed){
    // Eligibility restricted to survivors with a recorded overdose event.
    const uptake=clamp(.02+d.treatmentInvestment*.36,0,.75);
    if(p.alive&&u(seed,t,id,440)<uptake&&t>=p.treatmentUntil){
      p.treatmentUntil=t+6;event(world,p,"treatment","Entered modeled medication treatment after a nonfatal overdose.");p.lastFlags|=BIT.SUPPORT;
    }
  }
  if(age>=14&&age<70&&p.incarcerated===0){
    const baselineArrest=prob(.0018+.0014*d.patrol+(age<22?.0012:0)+need*.0009);
    // Heller RCT anchor: 43% lower VIOLENT-CRIME ARREST intensity during a
    // 16-month post-offer period among program-offered youth. This does NOT alter
    // underlying violent incident generation or permanent employment.
    const arrestChance=baselineArrest*(age>=14&&age<22&&t<p.programUntil?.57:1);
    if(u(seed,t,id,450)<arrestChance){
      newArrests++;p.violentArrests++;p.arrests++;p.lastFlags|=BIT.ARREST;
      if(world.track)event(world,p,"arrest","Experienced a synthetic violent-crime arrest. This is a justice-system outcome, not an identified underlying offense.");
      if(age>=18&&u(seed,t,id,451)<.17){p.incarcerated=6+Math.floor(u(seed,t,id,452)*9);p.employed=false;p.educatedInCustody=false;event(world,p,"custody","Entered a simulated custody period after justice-system processing.");}
    }
  }
  if(p.reentryRemaining>0&&!p.recidivated&&p.incarcerated===0){
    const base36=.40; // illustrative baseline three-year probability, not RAND's estimate.
    const oddsTreated=.57*base36/(1-base36+.57*base36);
    const annual=p.completedCorrection?oddsTreated:base36;
    const monthP=1-Math.pow(1-annual,1/36);
    if(u(seed,t,id,460)<monthP){
      p.recidivated=true;p.recidivism++;recidivism++;
      if(world.track)event(world,p,"recidivism","Modeled post-release recidivism event (correctional-education odds ratio applied to hypothetical baseline).");
    }
  }
  if(p.alive&&p.overdoseSurvivor&&t>=p.treatmentUntil&&age>=18&&u(seed,t,id,470)<d.treatmentInvestment*.008){
    p.treatmentUntil=t+6;event(world,p,"treatment","Re-entered synthetic medication treatment.");
  }
  if(p.alive&&t%12===11&&age>=18&&u(seed,t,id,480)<.008+.014*(1-p.housing)){
    // Individual mobility is hypothetical; no real geographic exposure denominators.
    const dx=Math.floor(u(seed,t,id,481)*3)-1,dy=Math.floor(u(seed,t,id,482)*3)-1;
    const x=clamp(p.home%N+dx,0,N-1),y=clamp(Math.floor(p.home/N)+dy,0,N-1),nextHome=y*N+x;
    if(nextHome!==p.home){p.home=nextHome;p.moved++;moves++;p.lastFlags|=BIT.MOVED;
     if(world.track)event(world,p,"move","Moved to a neighboring fictional district.");}
  }
  if(age>=18&&p.alive&&p.treatmentUntil>t)treatment++;
  if(p.incarcerated>0)custody++;
  if(p.graduated)graduated++;
  if(p.alive){trustSum+=p.trust;aliveCount++;city[p.home].residents++}
 }
 city.forEach(d=>{
   const policeDiscover=d.reported[9]+d.reported[10];
   d.score=clamp(.70*d.score+.30*(sum(d.reported.slice(0,11))+.5*policeDiscover),0,200);
   const residentTrust=state.reduce((s,p)=>s+(p.alive&&p.home===d.id?p.trust:0),0);
   d.trust=d.residents?residentTrust/d.residents:d.trust;
 });
 world.month++;
 const crime=sum(typesT.slice(0,11)),recorded=sum(typesR.slice(0,11));
 const metric={month:world.month,year:2027+Math.floor((world.month-1)/12),totalCrime:crime,recordedCrime:recorded,
   trueByType:typesT.slice(),recordedByType:typesR.slice(),
   overdoses:typesT[11],overdoseDeaths,violentArrests:newArrests,recidivism,
   employed,students,graduated,alive:aliveCount,trust:aliveCount?trustSum/aliveCount:0,
   treatment,offeredJobs,patrolCount,custody,moves,victims,encounters,
   investment:cfg.prevention,budget:cfg.budget,
   policy:cfg.policy,observation:crime?recorded/crime:0,
   policiesUsed:{...cfg},activeShocks:shock.map(s=>s.type)};
 world.history.push(metric);
 if(world.track)world.lifeFrames.push(snapshot(world));
 world.policyHistory.push({...cfg});
 world.shockHistory.push((options.shocks||[]).map(s=>({...s})));
 return metric;
}
function historyOf(world,id,through=world.month){
 return world.events.filter(e=>e.id===id&&e.month<=through).sort((a,b)=>a.month-b.month);
}
function rerunTo(world,target){
 const fresh=create(world.seed,world.config,world.population,{track:world.track});
 const count=clamp(Math.floor(target),0,world.month);
 for(let i=0;i<count;i++){
  fresh.config={...world.policyHistory[i]};
  shift(fresh,{shocks:world.shockHistory[i]});
 }
 fresh.config={...world.config};
 return fresh;
}
function yearlyLife(world,id,through){
 const n=Math.min(world.month,through);const out=[];
 for(let m=1;m<=n;m++)if(m%12===0||m===n){
  const st=stateOf(world,id,m);if(st)out.push(st)
 }
 return out;
}
root.GenesisEngine={N,D,POP,HORIZON,TYPES,DEFAULTS,PRESETS,BIT,create,shift,stateOf,historyOf,rerunTo,yearlyLife,
 clamp,avg,sum,u,exposures};
})(window);