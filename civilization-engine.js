/* LAPLACE // GENESIS CIVILIZATION ENGINE 2.0
   An intentionally uncalibrated synthetic spatial systems model. Everything
   geographic is fictitious; source studies only inform explicitly marked narrow
   outcomes. Never use these results to forecast or allocate policing resources.
   v2 adds demographic accounting, real fiscal constraints, housing capacity,
   institutional delivery, migration, sector budgets and stochastic policy failure.
*/
(function(root){"use strict";
const BASE=root.GenesisSovereign;
if(!BASE)throw Error("Load sovereign-engine.js before civilization-engine.js");
const VERSION="civilization-v2.0";
const ZONES=BASE.ZONES,OFFENSES=BASE.OFFENSES,PROGRAMS=BASE.PROGRAMS,MODES=BASE.MODES;
const COLORS={education:0x9db2ff,health:0x70eec9,housing:0xffc98e,jobs:0xb5ffb9,
 policing:0xf4a9c9,climate:0x82cbe6};
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const sum=a=>a.reduce((x,y)=>x+(Number(y)||0),0);
const noise=BASE.hash;
const categories=["education","health","housing","jobs","policing","climate"];
const DEFAULT={
 national:"none",provincePolicies:{},taxRate:23,targetSpending:25,maxDebtGDP:90,
 priorities:{education:23,health:23,housing:17,jobs:13,policing:17,climate:7},
 surveillance:45,patrolDeterrence:30,programScale:65,implementation:75,redistribution:45,
 fertility:100,immigration:30,mobility:55,carbonResilience:45,reentry:40,
 researchStrength:35,scenario:"steady"
};
const STATE_KEYS=[
 "population","children","young","middle","elderly","housingUnits","jobs","workforce","wage",
 "employment","education","health","housing","trust","deprivation","development","score",
 "underlying","recorded","survivors","costIndex","adminQuality","serviceAccess","climateRisk",
 "births","deaths","migrationIn","migrationOut","under18","workingAge","over65"
];
const metricNames=[
 ["population","Synthetic population"],["gdp","Real GDP (2027 $B)"],["gdpPerCapita","GDP per person (2027 $)"],
 ["taxRevenue","Tax receipts ($B)"],["spending","Public spending ($B)"],["debt","Government debt ($B)"],
 ["debtGDP","Debt-to-GDP ratio"],["deficit","Annual fiscal deficit ($B)"],
 ["births","Births"],["deaths","Deaths"],["netExternalMigration","Net external migration"],
 ["under18","Residents aged 0–17"],["workingAge","Residents aged 18–64"],["over65","Residents aged 65+"],
 ["underlying","Underlying incidents"],["crimePer100k","Underlying crimes per 100,000"],["recorded","Police-recorded incidents"],["recordedPer100k","Recorded crimes per 100,000"],
 ["homicide","Homicides"],["overdoses","Nonfatal overdose events"],["overdoseDeaths","Opioid-overdose deaths"],["overdoseDeathRate","Opioid-overdose deaths per 100,000"],
 ["violentArrests","Violent-crime arrests"],["recidivism","Post-release recidivism events"],
 ["unhoused","Housing need / unstable housing"],["housingStock","Housing units"],
 ["employment","Working-age employment rate"],["trust","Hypothetical institutional trust"],
 ["adminQuality","Policy implementation quality"],["youthOffers","Youth job offers"],
 ["medicationMonths","Medication exposure person-years"],["housingBuild","New public/private housing units"],
 ["schoolServed","School students served"],["careServed","Health-care encounters"],
 ["careUnmet","Unmet treatment need"],["effectiveBudget","Delivered program spending ($B)"],
 ["wastedBudget","Failed delivery / unused allocation ($B)"],["climateDamage","Annual hypothetical climate damage ($B)"]
];
const MIL={interest:.028,infant:.00065,young:.0016,middle:.0055,elderly:.039,
 fertilityPerYoung:.057,baseMigration:.0045,jobProductivity:45500,
 averageHousehold:2.40,housingUnitCost:205000,schoolCost:8900,
 careCost:6700,treatmentCost:9600,employmentProgramCost:9400};
const names=[
 ["Alder","Alto","Amber","Arbor","Archer","Ash","Bell","Birch","Bloom","Blue","Briar",
 "Cape","Cedar","Cliff","Cobalt","Coral","Crown","Dawn","Delta","Echo","Elm","Ever",
 "Fern","Flint","Gale","Glass","Gold","Granite","Harbor","Hearth","Indigo","Iron",
 "Jade","Juniper","Kestrel","Larch","Marble","Mesa","Moss","North","Oak","Opal","Pearl",
 "Pine","Quartz","Reed","River","Sable","Sage","Silver","Slate","Sol","Stone","Vale",
 "Violet","West","Willow","Wind","Winter"],
 ["borough","bridge","brook","crest","field","ford","gate","haven","hold","land",
 "mere","mouth","port","reach","ridge","shore","stead","ton","vale","view","wick"]
];
function uniqueLabels(items,seed,label){const used=new Set();items.forEach((p,i)=>{
 const a=names[0][Math.floor(noise(seed,i,112)*names[0].length)],b=names[1][Math.floor(noise(seed,i,113)*names[1].length)];
 let name=a+b+(label?" Region":"");
 if(used.has(name))name=a+b+" "+String(i+1).padStart(2,"0")+(label?" Region":"");
 used.add(name);p.name=name;p.code=(label?"PR-":"CT-")+String(i+1).padStart(2,"0");
});}
function terrain(seed=47121,mode="country"){
 const geo=BASE.terrain(seed,mode);uniqueLabels(geo.provinces,seed+191,true);
 uniqueLabels(geo.cities,seed+1911,false);
 geo.version=VERSION;return geo;
}
function config(input={}){
 const c={...DEFAULT,...input,priorities:{...DEFAULT.priorities,...(input.priorities||{})},
  provincePolicies:{...(input.provincePolicies||{})}};
 if(!PROGRAMS[c.national])c.national="none";
 for(const [id,policy]of Object.entries(c.provincePolicies))if(!PROGRAMS[policy])delete c.provincePolicies[id];
 for(const key of ["taxRate","targetSpending","maxDebtGDP","surveillance","patrolDeterrence",
  "programScale","implementation","redistribution","fertility","immigration","mobility","carbonResilience",
  "reentry","researchStrength"]){
  if(!Number.isFinite(+c[key]))c[key]=DEFAULT[key];
 }
 c.taxRate=clamp(c.taxRate,0,60);c.targetSpending=clamp(c.targetSpending,1,65);
 c.maxDebtGDP=clamp(c.maxDebtGDP,0,250);
 for(const k of ["surveillance","patrolDeterrence","programScale","implementation","redistribution",
  "fertility","immigration","mobility","carbonResilience","reentry","researchStrength"])c[k]=clamp(c[k],0,100);
 for(const k of categories)c.priorities[k]=clamp(Number(c.priorities[k])||0,0,100);
 return c;
}
function initState(geo){
 const state=Object.fromEntries(STATE_KEYS.map(k=>[k,new Float64Array(geo.size)]));
 for(const d of geo.cells){const i=d.id,p=d.basePopulation;if(p<=0)continue;
  const child=clamp(.19+(noise(geo.seed,i,10)-.5)*.075,.10,.27),young=clamp(.235+(noise(geo.seed,i,11)-.5)*.065,.15,.31),
   older=clamp(.15+(noise(geo.seed,i,12)-.5)*.09,.08,.25),middle=1-child-young-older;
  state.population[i]=p;state.children[i]=p*child;state.young[i]=p*young;
  state.middle[i]=p*middle;state.elderly[i]=p*older;
  state.workforce[i]=p*(young+middle);
  const housingBase=clamp(d.baseHousing,.20,.95);
  state.housingUnits[i]=Math.max(1,p/MIL.averageHousehold*(.79+.21*housingBase));
  state.jobs[i]=p*(young+middle)*clamp(d.baseEmployment,.2,.98);
  state.wage[i]=MIL.jobProductivity*(.70+.58*d.commerce+.13*d.alt);
  state.employment[i]=d.baseEmployment;state.education[i]=d.baseEducation;
  state.health[i]=d.baseHealth;state.housing[i]=housingBase;
  state.trust[i]=d.initialTrust;state.deprivation[i]=d.baseDeprivation;
  state.development[i]=clamp(.22+.50*d.commerce+.18*d.alt,.06,.95);
  state.score[i]=.16+.30*noise(geo.seed,i,15);
  state.survivors[i]=p*.0024;state.costIndex[i]=.86+.3*d.commerce+.18*noise(geo.seed,i,16);
  state.adminQuality[i]=clamp(.60+.25*noise(geo.seed,i,17),.38,.84);
  state.serviceAccess[i]=clamp(.42+.30*d.commerce+.13*noise(geo.seed,i,18),.14,.87);
  state.climateRisk[i]=clamp(.12+.20*(d.river?1:0)+.21*(d.zone===5?1:0)+.20*(1-d.alt),.05,.88);
  state.under18[i]=state.children[i];state.workingAge[i]=state.young[i]+state.middle[i];state.over65[i]=state.elderly[i];
 }
 return state;
}
function cloneState(st){return Object.fromEntries(STATE_KEYS.map(k=>[k,st[k].slice()]))}
function createWorld(geo,options={},seed=geo.seed){
 const initial=initState(geo),state=cloneState(initial);
 return{version:VERSION,geo,seed,year:0,config:config(options),state,initial,
   history:[],frames:[],shocks:[],fiscal:{debt:0,capital:0,backlog:0},
   fiscalHistory:[],capitalEvents:[],policyLog:[],note:"All population stocks, geography and coefficients are synthetic and uncalibrated."};
}
function sumField(state,k){return sum(state[k])}
function pctPart(state,k,pop){return pop>0?sumField(state,k)/pop:0}
function frameFor(w,year){if(!year)return{year:0,arrays:w.initial};return w.frames[year-1]||null}
function snapshot(w,year){return frameFor(w,clamp(Math.floor(year),0,w.year))}
function seek(w,at){
 const y=clamp(Math.floor(at),0,w.year);
 w.state=cloneState(y?w.frames[y-1].arrays:w.initial);
 w.fiscal=y?{...w.fiscalHistory[y-1]}:{debt:0,capital:0,backlog:0};
 w.history.length=y;w.frames.length=y;w.fiscalHistory.length=y;w.year=y;
 // Preserve scheduled future policies/shocks so branching does not erase intent.
 return y;
}
function provinceReport(w,y,id){
 if(y<1||y>w.year)return null;
 const p=w.history[y-1].provinces[id];if(!p)return null;
 return{...p,employment:p.workingAge?p.employed/p.workingAge:0,trust:p.population?p.trustSum/p.population:0,
  housing:p.population?p.housed/p.population:0,adminQuality:p.population?p.adminSum/p.population:0};
}
function zoneReport(w,y,zone){
 const frame=snapshot(w,y);if(!frame)return null;
 const s=frame.arrays,g=w.geo;let pop=0,crime=0,recorded=0,trust=0,n=0;
 for(const d of g.cells)if(d.zone===zone){n++;const i=d.id,p=s.population[i];pop+=p;crime+=s.underlying[i];
  recorded+=s.recorded[i];trust+=s.trust[i]*p}
 return{cells:n,population:pop,crime,recorded,trust:pop?trust/pop:0};
}
function policyFor(cfg,province){const candidate=cfg.provincePolicies[province]||cfg.national;return PROGRAMS[candidate]?candidate:"none"}
function shockFor(w,year,province,zone){
 const effect={economy:0,climate:0,health:0,migration:0,politics:0};
 for(const e of w.shocks){
  if(year<e.from||year>=e.from+e.duration||e.province>=0&&e.province!==province)continue;
  const factor=clamp(e.strength||1,0,5);
  if(e.type==="recession")effect.economy+=factor*.19;
  if(e.type==="flood")effect.climate+=factor*.26*(zone===5||zone===4?1.2:.7);
  if(e.type==="epidemic")effect.health+=factor*.28;
  if(e.type==="migration")effect.migration+=factor*.018;
  if(e.type==="institutional")effect.politics+=factor*.34;
  if(e.type==="automation")effect.economy+=factor*.07;
 }
 return effect;
}
function stableValue(expect,seed,year,id,k){
 if(!Number.isFinite(expect)||expect<=0)return 0;
 return BASE.stableCount(expect,seed,year,id,k);
}
function computeFiscal(w,prev){
 const c=w.config,geo=w.geo;let gdp=0,pop=0;
 for(const d of geo.cells){const i=d.id,p=prev.population[i];if(!p)continue;
  const workforce=prev.young[i]+prev.middle[i];
  gdp+=Math.min(prev.jobs[i],workforce*.92)*prev.wage[i];
  pop+=p;
 }
 gdp/=1e9;
 const revenue=gdp*c.taxRate/100,interest=w.fiscal.debt*MIL.interest,goal=gdp*c.targetSpending/100;
 const debtLimit=gdp*c.maxDebtGDP/100,
  capacity=Math.max(0,Math.min(gdp*.055,debtLimit-w.fiscal.debt));
 const available=Math.max(0,revenue+capacity-interest);
 const spending=Math.min(goal,available);
 const debtChange=spending+interest-revenue;
 const debt=Math.max(0,w.fiscal.debt+debtChange);
 const sharesTotal=sum(Object.values(c.priorities));
 const shares=Object.fromEntries(categories.map(k=>[k,sharesTotal?c.priorities[k]/sharesTotal:1/categories.length]));
 const sectors=Object.fromEntries(categories.map(k=>[k,spending*shares[k]]));
 const capPressure=goal>0?spending/goal:1;
 return{gdp,revenue,interest,goal,spending,deficit:debtChange,debt,debtGDP:gdp?debt/gdp:0,
  sectors,capPressure,shares,shortfall:Math.max(0,goal-spending),pop,
  capacity,gdpPerCapita:pop?gdp*1e9/pop:0};
}
function moveCohorts(st,i,j,amount,flow){
 const old=st.population[i];if(old<=0||amount<=0)return;
 const ratio=clamp(amount/old,0,.12);
 for(const k of ["children","young","middle","elderly"]){
  const n=st[k][i]*ratio;flow[k][i]-=n;flow[k][j]+=n;
 }
 flow.migrationIn[j]+=amount;flow.migrationOut[i]+=amount;
}
function step(world){
 const year=world.year+1;if(year>world.geo.maxYears)return null;
 const geo=world.geo,prev=world.state,cfg=config(world.config);world.config=cfg;
 const cur=cloneState(prev),n=geo.size,dist=new Float64Array(n),fiscal=computeFiscal(world,prev);
 const q={
  population:0,children:0,young:0,middle:0,elderly:0,births:0,deaths:0,netExternalMigration:0,
  underlying:0,recorded:0,homicide:0,overdoses:0,overdoseDeaths:0,violentArrests:0,recidivism:0,
  unhoused:0,housingStock:0,housingBuild:0,schoolServed:0,careServed:0,careUnmet:0,trustSum:0,
  employed:0,employedWorking:0,workingAge:0,youthOffers:0,medicationMonths:0,
  adminSum:0,publicWaste:0,climateDamage:0,netMobility:0,treatedSurvivors:0,
  under18:0,over65:0,programEnrollments:0,programFailures:0,housingDemand:0
 };
 const province=geo.provinces.map(p=>({id:p.id,name:p.name,code:p.code,population:0,underlying:0,recorded:0,
  births:0,deaths:0,migration:0,housingDemand:0,housingStock:0,unhoused:0,employed:0,
  workingAge:0,employedCount:0,housed:0,trustSum:0,adminSum:0,incidents:0,
  youthOffers:0,housingBuild:0,overdoseDeaths:0,schoolServed:0,healthServed:0,spending:0}));
 const offenseTotals=new Float64Array(OFFENSES.length),recordedOffenses=new Float64Array(OFFENSES.length),
   typeCounts=new Uint16Array(n*OFFENSES.length),typeRecorded=new Uint16Array(n*OFFENSES.length),
   zoneStats=ZONES.map(z=>({id:z.id,label:z.label,population:0,underlying:0,recorded:0,unhoused:0,employment:0}));
 const policyUsage={},interventions={jobOffers:0,medication:0,housingUnits:0,educationStudents:0,
   policeContacts:0,reentryEducated:0,violenceReach:0,preventedExpectedViolentArrests:0,
   preventedExpectedOpioidDeaths:0},effectAssumptions={criminalIncidents:0,policeRecorded:0,housing:0,health:0};
 const baselineShares=new Float64Array(n);
 let baseTotal=0;
 // Fiscally equal funding by default. Higher redistribution reduces
 // geographic concentration of spending in already-developed regions.
 for(const d of geo.cells){const i=d.id,p=prev.population[i];if(p<=0)continue;
  const equity=1+cfg.redistribution/100*(prev.deprivation[i]-.4);
  baselineShares[i]=p*clamp(equity,.7,1.5);baseTotal+=baselineShares[i]}
 // All cohort transfers are recorded before applying demographic deaths/births.
 const flows=Object.fromEntries(["children","young","middle","elderly","migrationIn","migrationOut"].map(k=>[k,new Float64Array(n)]));
 for(const d of geo.cells){
  const i=d.id,p=prev.population[i];if(p<=0)continue;
  const neighbors=geo.adjacency[i]||[];
  for(const j of neighbors)if(j>i&&prev.population[j]>0){
   const attractiveness=k=>.37*prev.employment[k]+.21*prev.housing[k]+.15*prev.health[k]+
     .14*(prev.wage[k]/Math.max(10000,MIL.jobProductivity))+.13*prev.serviceAccess[k]-.14*prev.climateRisk[k];
   const delta=attractiveness(j)-attractiveness(i),source=delta>0?i:j,target=delta>0?j:i;
   const flow=Math.min(prev.population[source],prev.population[target])*.0044*
    cfg.mobility/100*clamp(Math.abs(delta),0,.8);
   moveCohorts(prev,source,target,flow,flows);
   if(d.province!==geo.cells[j].province)q.netMobility+=flow;
  }
 }
 const estimatedCountyBudget=fiscal.spending,globalPopulation=Math.max(1,fiscal.pop),
       annualCrime=new Float64Array(OFFENSES.length);
 for(const d of geo.cells){
  const i=d.id,pop0=prev.population[i];if(pop0<=0)continue;
  const policy=policyFor(cfg,d.province),sh=shockFor(world,year,d.province,d.zone);
  policyUsage[policy]=(policyUsage[policy]||0)+1;
  const p=province[d.province],cellEquity=baselineShares[i]/Math.max(1,baseTotal);
  const nominalSpend=estimatedCountyBudget*1e9*cellEquity;
  const sector=Object.fromEntries(categories.map(k=>[k,nominalSpend*fiscal.shares[k]]));
  // Institutional implementation, overload and fiscal arrears limit delivery.
  // Full delivery is never automatic; failures are defined stochastic events.
  const baseAdmin=prev.adminQuality[i],crowding=clamp((pop0/Math.max(1,prev.housingUnits[i]*MIL.averageHousehold))-1,0,1);
  const admin=clamp(baseAdmin+.008*(prev.trust[i]-.5)-.012*sh.politics-
      .011*crowding+.006*(sector.climate/Math.max(1,pop0)/600),.16,.99);
  const implementation=clamp(cfg.implementation/100*(.32+.9*admin)*
    (1-.28*sh.politics),.05,1);
  const disruption=noise(world.seed,year,i,101);
  const failed=disruption<(.09+.22*(1-admin)+.16*sh.politics);
  const delivery=failed?.34*implementation:implementation;
  const spent=Object.fromEntries(categories.map(k=>[k,sector[k]*delivery]));
  const delivered=sum(Object.values(spent)),wasted=Math.max(0,nominalSpend-delivered);
  q.publicWaste+=wasted/1e9;p.spending+=delivered/1e9;
  if(failed)q.programFailures++;
  const familyProgram=(policy==="finland"||policy==="integrated")?cfg.programScale/100:0,
    healthProgram=(policy==="portugal"||policy==="integrated")?cfg.programScale/100:0,
    youthProgram=(policy==="chicago"||policy==="integrated")?cfg.programScale/100:0,
    reentryProgram=(policy==="norway"||policy==="integrated")?cfg.programScale/100:0,
    violentProgram=(policy==="scotland"||policy==="integrated")?cfg.programScale/100:0;
  const ramp=clamp((year-1)/8+.15,.1,1);
  const slots=(spent.education/MIL.schoolCost)*(.57+.3*ramp);
  const clinicSlots=(spent.health/MIL.careCost)*(.52+.38*ramp);
  const housingPublic=spent.housing/MIL.housingUnitCost*ramp*(.58+.55*familyProgram);
  const jobsPrograms=spent.jobs/MIL.employmentProgramCost*.06*(.35+.65*youthProgram);
  const housingMarketGap=Math.max(0,pop0/MIL.averageHousehold-prev.housingUnits[i]);
  const privateBuild=Math.min(housingMarketGap*.13,Math.max(0,prev.housingUnits[i]*.0085))*
    (.55+.45*prev.employment[i])*(1-.42*sh.economy);
  const housingLoss=prev.housingUnits[i]*(.0021+.008*sh.climate*prev.climateRisk[i]);
  const newHousing=Math.max(0,housingPublic+privateBuild-housingLoss);
  const units=prev.housingUnits[i]+newHousing;
  const housed=Math.min(pop0,units*MIL.averageHousehold);
  // Housing instability is a counted capacity gap, not automatically a policy
  // success. Crowding and affordability can persist after new construction.
  const affordability=clamp(.05+.2*(prev.costIndex[i]-.85)+.19*(1-prev.employment[i]),0,.40);
  const housingNeed=Math.max(0,pop0-housed)+Math.min(pop0,housed)*affordability*.13;
  const housing=clamp((housed-housingNeed*.13)/Math.max(1,pop0),.08,.999);
  const schoolDemand=prev.children[i]*.72,schoolServed=Math.min(schoolDemand,slots+schoolDemand*.44*prev.serviceAccess[i]);
  const healthDemand=pop0*(.39+.17*sh.health),healthServed=Math.min(healthDemand,clinicSlots+healthDemand*.27*prev.serviceAccess[i]);
  const unmetHealth=Math.max(0,healthDemand-healthServed);
  const schoolCoverage=schoolDemand?schoolServed/schoolDemand:1,healthCoverage=healthDemand?healthServed/healthDemand:1;
  const education=clamp(prev.education[i]+.025*(schoolCoverage-prev.education[i])-.012*sh.economy,.05,.99);
  const health=clamp(prev.health[i]+.031*(healthCoverage-prev.health[i])-.026*sh.health-.011*sh.climate,.05,.99);
  const climatePrepared=clamp(cfg.carbonResilience/100*.55+spent.climate/Math.max(1,pop0)/2200,0,1);
  const climateDamage=pop0*310*sh.climate*(1-climatePrepared);
  q.climateDamage+=climateDamage/1e9;
  const annualWage=clamp(prev.wage[i]*(1+.0058-.029*sh.economy-.006*sh.climate),14000,280000);
  const nextJobs=Math.max(0,prev.jobs[i]*(1+.006+.006*(education-.55)-.065*sh.economy-.022*sh.climate)+
    spent.jobs/Math.max(1,annualWage)*(.12+.12*ramp));
  const employed=Math.min(prev.young[i]+prev.middle[i],nextJobs);
  const employment=clamp(employed/Math.max(1,prev.young[i]+prev.middle[i]),0,1);
  const deprivation=clamp(.34*(1-employment)+.26*(1-housing)+.21*(1-education)+.19*(1-health),.01,.96);
  const policingReach=clamp(spent.policing/Math.max(1,pop0)/1250,0,.95);
  const surveillance=cfg.surveillance/100;
  const trust=clamp(prev.trust[i]+.011*(admin-.58)+.0045*(housing-prev.housing[i])-
    .009*policingReach*surveillance-.014*sh.politics,.10,.96);
  const immigrationFactor=clamp(cfg.immigration/100,0,1);
  const netExternal=pop0*(MIL.baseMigration*immigrationFactor+
    sh.migration*.75)*(1-.32*sh.economy);
  const fertile=prev.young[i],fertilityMultiplier=clamp(cfg.fertility/100,.05,1.5);
  const births=fertile*MIL.fertilityPerYoung*fertilityMultiplier*
    clamp(.91+.14*(housing-.5)-.15*sh.economy,.6,1.12);
  // Cohort aging from stocks (0-17;18-34;35-64;65+) with mortality
  // accounted explicitly. Overdose fatalities are a subset of annual deaths.
  const survivors=prev.survivors[i],treatmentCapacity=(spent.health/MIL.treatmentCost)*.12,
    eligibleForMedication=survivors*clamp(.10+.33*healthProgram,0,.55);
  const receivingMedication=Math.min(eligibleForMedication,treatmentCapacity);
  const opioidDeathExpected=Math.max(0,(survivors-receivingMedication)*.017+
    receivingMedication*.017*.41);
  const opioidDeaths=stableValue(opioidDeathExpected,world.seed,year,i,251);
  const overdoseExpected=pop0/1000*1.65*(.82+.39*deprivation+.16*sh.health);
  const nonfatalOverdoses=stableValue(overdoseExpected,world.seed,year,i,252);
  const newSurvivors=Math.max(0,survivors*.88+nonfatalOverdoses-opioidDeaths);
  const deathFactor=clamp(1-.24*(health-.45)+.27*sh.health+.20*sh.climate,.68,2.0);
  const childDeaths=prev.children[i]*MIL.infant*deathFactor,youngDeaths=prev.young[i]*MIL.young*deathFactor,
    middleDeaths=prev.middle[i]*MIL.middle*deathFactor,
    olderDeaths=prev.elderly[i]*MIL.elderly*deathFactor;
  const aging0=prev.children[i]/18,aging1=prev.young[i]/17,aging2=prev.middle[i]/30;
  let c0=prev.children[i]-aging0-childDeaths+births+netExternal*.18+flows.children[i],
      c1=prev.young[i]+aging0-aging1-youngDeaths-opioidDeaths*.30+netExternal*.50+flows.young[i],
      c2=prev.middle[i]+aging1-aging2-middleDeaths-opioidDeaths*.66+netExternal*.29+flows.middle[i],
      c3=prev.elderly[i]+aging2-olderDeaths-opioidDeaths*.04+netExternal*.03+flows.elderly[i];
  c0=Math.max(0,c0);c1=Math.max(0,c1);c2=Math.max(0,c2);c3=Math.max(0,c3);
  const population=c0+c1+c2+c3;
  const deaths=childDeaths+youngDeaths+middleDeaths+olderDeaths+opioidDeaths;
  // Program intervention effects are *narrow*. The Heller effect pertains to
  // arrests among OFFERED selected youth, not to underlying violent incidents.
  const youthEligible=c1*.11,offered=Math.min(youthEligible,jobsPrograms);
  const baseYouthArrest=.010*youthEligible,
   expectedYouthArrest=.010*(youthEligible-offered)+.010*.57*offered;
  const reentryEligible=pop0*.0028,educatedReentry=Math.min(reentryEligible*.35*reentryProgram,
    spent.education/MIL.schoolCost*.014);
  const baseRecidivism=.31,adjustedRecidivism=baseRecidivism*.57/
    (1-baseRecidivism+baseRecidivism*.57);
  const expectedReoffense=(reentryEligible-educatedReentry)*baseRecidivism+
    educatedReentry*adjustedRecidivism;
  const recidivism=stableValue(expectedReoffense,world.seed,year,i,253);
  interventions.preventedExpectedViolentArrests+=baseYouthArrest-expectedYouthArrest;
  interventions.preventedExpectedOpioidDeaths+=receivingMedication*.017*.59;
  const incidents=[],recordings=[];
  let underlying=0,recorded=0;
  const regionBase=.69+.44*deprivation+.16*d.commerce+
    (prev.score[i]-.3)*.13;
  for(let k=0;k<OFFENSES.length;k++){
   const t=OFFENSES[k];let expected=pop0/1000*t.rate*regionBase;
   if(k<=2)expected*=clamp(.90+.35*(1-housing)+.16*sh.economy+.19*sh.climate,.75,1.7);
   if(k===3||k===4||k===5)expected*=clamp(.94+.31*(1-employment)+.22*(1-education),.80,1.65);
   if(k===6||k===7)expected*=.7+.45*d.commerce+.31*(d.zone===3?1:0);
   if(k===8)expected*=.75+.45*(d.zone===4?1:0);
   if(k===9)expected*=.83+.18*(d.zone===3?1:0)+.30*sh.economy;
   if(violentProgram&&[3,4,5].includes(k)){
    const multiplier=1-.09*violentProgram*cfg.researchStrength/100*delivery;
    effectAssumptions.criminalIncidents+=expected*(1-multiplier);expected*=multiplier}
   const patrolEffect=1-(policingReach*cfg.patrolDeterrence/100)*
      ([0,1,2,3,4,5].includes(k)?.095:.014);
   expected*=patrolEffect;
   const actual=stableValue(expected,world.seed,year,i,30+k);
   const recordChance=clamp(t.reported*(.62+.58*surveillance)*
     (.78+.34*trust)*(.84+.23*policingReach),0,.99);
   const observed=Math.min(actual,stableValue(actual*recordChance,world.seed,year,i,75+k));
   incidents[k]=actual;recordings[k]=observed;
   typeCounts[i*OFFENSES.length+k]=Math.min(65535,actual);
   typeRecorded[i*OFFENSES.length+k]=Math.min(65535,observed);
   offenseTotals[k]+=actual;recordedOffenses[k]+=observed;
   underlying+=actual;recorded+=observed;
  }
  const violentArrests=stableValue(expectedYouthArrest+
      (incidents[3]+incidents[4]+incidents[5])*.15,world.seed,year,i,254);
  const drugContacts=stableValue(pop0/1000*2.8*
     (.33+.45*surveillance+.40*policingReach)*(1-.75*healthProgram*delivery),
     world.seed,year,i,255);
  cur.children[i]=c0;cur.young[i]=c1;cur.middle[i]=c2;cur.elderly[i]=c3;
  cur.population[i]=population;cur.workingAge[i]=c1+c2;cur.under18[i]=c0;cur.over65[i]=c3;
  cur.housingUnits[i]=units;cur.jobs[i]=nextJobs;cur.workforce[i]=c1+c2;
  cur.wage[i]=annualWage;cur.employment[i]=employment;cur.education[i]=education;
  cur.health[i]=health;cur.housing[i]=housing;cur.trust[i]=trust;cur.deprivation[i]=deprivation;
  cur.development[i]=clamp(prev.development[i]+.003*(newHousing/Math.max(1,prev.housingUnits[i])),.05,.99);
  cur.score[i]=clamp(.74*prev.score[i]+.26*recorded/Math.max(1,pop0/1000*90),.02,1);
  cur.underlying[i]=underlying;cur.recorded[i]=recorded;cur.survivors[i]=newSurvivors;
  cur.costIndex[i]=clamp(prev.costIndex[i]*(1+.0015+.001*sh.economy),.5,4);
  cur.adminQuality[i]=admin;cur.serviceAccess[i]=clamp(.82*prev.serviceAccess[i]+.18*
    (.30+.7*(schoolCoverage+healthCoverage)/2),.05,1);
  cur.climateRisk[i]=clamp(prev.climateRisk[i]+.001-.0012*climatePrepared+.001*sh.climate,.03,.99);
  cur.births[i]=births;cur.deaths[i]=deaths;cur.migrationIn[i]=flows.migrationIn[i]+netExternal;
  cur.migrationOut[i]=flows.migrationOut[i];
  q.population+=population;q.children+=c0;q.young+=c1;q.middle+=c2;q.elderly+=c3;
  q.births+=births;q.deaths+=deaths;q.netExternalMigration+=netExternal;
  q.underlying+=underlying;q.recorded+=recorded;
  q.overdoses+=nonfatalOverdoses;q.overdoseDeaths+=opioidDeaths;
  q.violentArrests+=violentArrests;q.recidivism+=recidivism;
  q.unhoused+=housingNeed;q.housingStock+=units;q.housingBuild+=Math.max(0,newHousing);
  q.schoolServed+=schoolServed;q.careServed+=healthServed;q.careUnmet+=unmetHealth;
  q.trustSum+=trust*population;q.adminSum+=admin*population;
  q.employed+=employment*(c1+c2);q.workingAge+=c1+c2;
  q.youthOffers+=offered;q.medicationMonths+=receivingMedication;
  q.under18+=c0;q.over65+=c3;q.housingDemand+=population/MIL.averageHousehold;
  interventions.jobOffers+=offered;interventions.medication+=receivingMedication;
  interventions.housingUnits+=housingPublic;
  interventions.educationStudents+=schoolServed;interventions.reentryEducated+=educatedReentry;
  interventions.violenceReach+=violentProgram*pop0;
  interventions.policeContacts+=drugContacts;
  p.population+=population;p.underlying+=underlying;p.recorded+=recorded;
  p.births+=births;p.deaths+=deaths;p.migration+=netExternal;
  p.housingDemand+=population/MIL.averageHousehold;p.housingStock+=units;p.unhoused+=housingNeed;
  p.employed+=employment*(c1+c2);p.workingAge+=c1+c2;p.housed+=Math.min(population,units*MIL.averageHousehold);
  p.trustSum+=trust*population;p.adminSum+=admin*population;p.youthOffers+=offered;
  p.housingBuild+=Math.max(0,newHousing);p.overdoseDeaths+=opioidDeaths;
  p.schoolServed+=schoolServed;p.healthServed+=healthServed;
  const z=zoneStats[d.zone];z.population+=population;z.underlying+=underlying;
  z.recorded+=recorded;z.unhoused+=housingNeed;z.employment+=employment*(c1+c2);
 }
 // Validation: accounting identity MUST hold to floating-point precision.
 const previous=sumField(prev,"population"),expectedPopulation=previous+q.births-q.deaths+q.netExternalMigration;
 const relativeError=Math.abs(expectedPopulation-q.population)/Math.max(1,expectedPopulation);
 if(relativeError>1e-8)throw Error("Population accounting identity violated: "+relativeError);
 const report={
  year,calendarYear:2027+year,modelVersion:VERSION,geographicScale:geo.mode,
  population:q.population,underlying:q.underlying,recorded:q.recorded,
  crimePer100k:q.population?q.underlying/q.population*100000:0,
  recordedPer100k:q.population?q.recorded/q.population*100000:0,
  offenses:Array.from(offenseTotals),recordedOffenses:Array.from(recordedOffenses),
  births:q.births,deaths:q.deaths,netExternalMigration:q.netExternalMigration,
  internalMigration:q.netMobility,under18:q.under18,workingAge:q.workingAge,over65:q.over65,
  employment:q.workingAge?q.employed/q.workingAge:0,
  gdp:fiscal.gdp,gdpPerCapita:fiscal.gdpPerCapita,taxRevenue:fiscal.revenue,spending:fiscal.spending,
  deficit:fiscal.deficit,debt:fiscal.debt,debtGDP:fiscal.debtGDP,interest:fiscal.interest,
  fiscalConstraint:fiscal.capPressure,shortfall:fiscal.shortfall,
  sectorSpending:fiscal.sectors,budgetShares:fiscal.shares,
  effectiveBudget:fiscal.spending-q.publicWaste,wastedBudget:q.publicWaste,
  housingStock:q.housingStock,housingDemand:q.housingDemand,housingBuild:q.housingBuild,
  unhoused:q.unhoused,unhousedRate:q.population?q.unhoused/q.population:0,
  careServed:q.careServed,careUnmet:q.careUnmet,schoolServed:q.schoolServed,
  adminQuality:q.population?q.adminSum/q.population:0,
  trust:q.population?q.trustSum/q.population:0,
  overdoseDeaths:q.overdoseDeaths,overdoses:q.overdoses,
  overdoseDeathRate:q.population?q.overdoseDeaths/q.population*100000:0,
  homicide:offenseTotals[5],violentArrests:q.violentArrests,recidivism:q.recidivism,
  youthOffers:q.youthOffers,medicationMonths:q.medicationMonths,climateDamage:q.climateDamage,
  provinces:province,zones:zoneStats,interventions,
  interventionEffects:effectAssumptions,
  implementationFailures:q.programFailures,
  policyUsage,policyApplied:{...cfg,provincePolicies:{...cfg.provincePolicies},
    priorities:{...cfg.priorities}},
  diagnostics:{populationAccountingError:expectedPopulation-q.population,
    expendituresAppropriated:fiscal.spending,deliveredSpending:fiscal.spending-q.publicWaste,
    unspentSpending:q.publicWaste,interest:fiscal.interest,debtCapGDP:cfg.maxDebtGDP/100,
    demographicProvenance:"Birth, death and migration assumptions are uncalibrated; no census projection."}
 };
 world.year=year;world.state=cur;world.fiscal={debt:fiscal.debt,capital:world.fiscal.capital,
  backlog:world.fiscal.backlog+fiscal.shortfall};
 world.history.push(report);world.frames.push({year,arrays:cloneState(cur),trueTypes:typeCounts,recordedTypes:typeRecorded});
 world.fiscalHistory.push({...world.fiscal});
 return report;
}
root.GenesisCivilization={VERSION,MODES,ZONES,OFFENSES,PROGRAMS,DEFAULT,STATE_KEYS,
 terrain,config,initState,createWorld,step,seek,snapshot,provinceReport,zoneReport,
 metricNames,colors:COLORS,MIL,computeFiscal};
})(typeof window!=="undefined"?window:self);