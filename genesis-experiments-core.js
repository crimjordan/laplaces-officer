/* GENESIS controlled experiments. Synthetic model variation, not observed causal effects. */
(function(root){"use strict";
const METRICS=[
["totalCrime","Underlying offenses","sum"],["expectedCrime","Expected offenses","sum"],
["recordedCrime","Recorded offenses","sum"],["violentArrests","Violent arrests","sum"],
["expectedArrests","Expected violent arrests","sum"],["overdoseDeaths","Overdose deaths","sum"],
["expectedMortality","Expected overdose deaths","sum"],["recidivism","Recidivism events","sum"],
["employed","Mean employed residents","mean"],["trust","Mean modeled trust","mean"],
["offeredJobs","Youth job offers","sum"],["treatedPersonMonths","Treatment person-months","sum"],
["patrolCount","Patrol district-months","sum"],["housingSupportEvents","Housing support events","sum"]
].map(([key,label,agg])=>({key,label,agg}));
const BASE={policy:"problem",prevention:50,surveillance:40,patrolEffect:35,budget:12,procedure:"procedural",jobs:30,school:20,treatment:20,housing:20,reentry:10,employmentLink:0,housingLink:0,educationLink:0};
const FACTORS=[{key:"prevention",label:"Prevention share",values:[20,80]},
{key:"surveillance",label:"Surveillance coverage",values:[20,80]},
{key:"employmentLink",label:"Hypothetical employment link",values:[0,100]}];
const ONE={
reallocation:{title:"Fixed-budget patrol/prevention reallocation",key:"prevention",values:[20,80],labels:["20% prevention","80% prevention"],note:"This changes BOTH patrol resources and prevention spending, while the total budget is fixed."},
allocation:{title:"Allocation rule only",key:"policy",values:["predictive","equal"],labels:["Recorded-hotspot prediction","Rotating equal patrol"],note:"Patrol quantity, funding and all other controls are identical."},
surveillance:{title:"Observation coverage only",key:"surveillance",values:[20,80],labels:["20% surveillance","80% surveillance"],note:"Recording probability may change without an underlying-crime change."},
encounters:{title:"Police encounter style only",key:"procedure",values:["intensive","procedural"],labels:["Intensive","Procedural"],note:"Contact and trust response equations are hypothetical."},
deterrence:{title:"Hypothetical patrol deterrence sensitivity",key:"patrolEffect",values:[0,70],labels:["0% assumed patrol effect","70% assumed patrol effect"],note:"70% is a slider setting, not a 70% predicted crime reduction."}
};
const STRUCT={employment:"Employment improvements",housing:"Housing improvements",education:"Educational gains",combined:"All three pathways"};
function normalize(spec={}){
 const num=(v,d,lo,hi)=>Math.min(hi,Math.max(lo,Number.isFinite(+v)?+v:d));
 const base={...BASE,...(spec.base||{})};
 for(const key of ["prevention","surveillance","patrolEffect","employmentLink","housingLink","educationLink","jobs","school","treatment","housing","reentry"])base[key]=num(base[key],0,0,100);
 base.budget=num(base.budget,12,3,24);
 if(!["predictive","equal","problem","needs","random"].includes(base.policy))base.policy="problem";
 if(!["intensive","procedural"].includes(base.procedure))base.procedure="procedural";
 return{kind:["isolated","structural","factorial"].includes(spec.kind)?spec.kind:"isolated",
  test:Object.hasOwn(ONE,spec.test)?spec.test:"reallocation",
  structural:Object.hasOwn(STRUCT,spec.structural)?spec.structural:"combined",
  years:Math.round(num(spec.years,5,1,10)),population:Math.round(num(spec.population,384,96,1152)),
  seeds:Math.round(num(spec.seeds,40,2,100)),seedBase:Math.round(num(spec.seedBase,91371,1,2000000000)),base};
}
function design(input){
 const spec=normalize(input),b=spec.base;
 if(spec.kind==="isolated"){
  const x=ONE[spec.test];
  return{spec,title:x.title,description:x.note,baselineId:"control",
    arms:[{id:"control",label:x.labels[0],config:{...b,[x.key]:x.values[0]},levels:{[x.key]:0}},
          {id:"alternative",label:x.labels[1],config:{...b,[x.key]:x.values[1]},levels:{[x.key]:1}}]};
 }
 if(spec.kind==="structural"){
  const keys=spec.structural==="combined"?["employmentLink","housingLink","educationLink"]:[spec.structural+"Link"];
  const arms=[0,25,50,100].map(v=>{
   const config={...b,employmentLink:0,housingLink:0,educationLink:0};
   for(const key of keys)config[key]=v;
   return{id:"strength"+v,label:v+"% assumed "+STRUCT[spec.structural].toLowerCase(),config,levels:{strength:v}};
  });
  return{spec,title:"Structural sensitivity: "+STRUCT[spec.structural],baselineId:"strength0",arms,
   description:"All direct personal exposure adjustments default to zero. Nonzero sliders scale invented multipliers, NOT empirical treatment effects."};
 }
 const arms=[];
 for(let a=0;a<2;a++)for(let b0=0;b0<2;b0++)for(let c=0;c<2;c++){
  const levels={prevention:a,surveillance:b0,employmentLink:c},config={...spec.base};
  for(const f of FACTORS)config[f.key]=f.values[levels[f.key]];
  arms.push({id:"f"+a+b0+c,label:"Prevention "+config.prevention+"% · Surveillance "+config.surveillance+
   "% · Employment assumption "+config.employmentLink+"%",config,levels});
 }
 return{spec,title:"2 × 2 × 2: resource mix × surveillance × hypothetical employment link",
  baselineId:"f000",arms,
  description:"Three fully crossed binary factors, held total budget and remaining settings. Main effects and interactions are algebraic model contrasts. Prevention share also reallocates patrol."};
}
function runArm(E,seed,config,years,population){
 const w=E.create(seed,config,population,{track:false});
 for(let t=0;t<years*12;t++)E.shift(w,{});
 const out={};
 for(const m of METRICS){
  const total=w.history.reduce((acc,r)=>acc+(Number(r[m.key])||0),0);
  out[m.key]=m.agg==="mean"?total/w.history.length:total;
 }
 return out;
}
function runSeed(E,plan,rep){
 const seed=(plan.spec.seedBase+rep*7919)>>>0;
 return{seed,arms:plan.arms.map(a=>({armId:a.id,metrics:runArm(E,seed,a.config,plan.spec.years,plan.spec.population)}))};
}
function quantile(sorted,p){if(!sorted.length)return NaN;const x=p*(sorted.length-1),a=Math.floor(x),b=Math.ceil(x);return sorted[a]+(sorted[b]-sorted[a])*(x-a)}
function stats(xs){
 const n=xs.length,mean=n?xs.reduce((a,b)=>a+b,0)/n:NaN;
 const sd=n>1?Math.sqrt(xs.reduce((a,b)=>a+(b-mean)**2,0)/(n-1)):0;
 const sorted=xs.slice().sort((a,b)=>a-b);
 return{n,mean,sd,q05:quantile(sorted,.05),median:quantile(sorted,.5),q95:quantile(sorted,.95),
  negative:xs.filter(x=>x<0).length,positive:xs.filter(x=>x>0).length};
}
function paired(plan,batches){
 const out=[];
 for(const arm of plan.arms.filter(a=>a.id!==plan.baselineId))for(const m of METRICS){
  const xs=batches.map(b=>{
   const baseline=b.arms.find(a=>a.armId===plan.baselineId);
   const comparison=b.arms.find(a=>a.armId===arm.id);
   if(!baseline||!comparison)throw Error("Missing paired arm");
   return comparison.metrics[m.key]-baseline.metrics[m.key];
  });
  out.push({kind:"paired",effect:arm.label,armId:arm.id,metric:m.key,values:xs,summary:stats(xs)});
 }
 return out;
}
function factorial(plan,batches){
 if(plan.spec.kind!=="factorial")return[];
 const tests=[
  {name:"Prevention (high − low)",indices:[0],kind:"main effect"},
  {name:"Surveillance (high − low)",indices:[1],kind:"main effect"},
  {name:"Hypothetical employment link (on − off)",indices:[2],kind:"main effect"},
  {name:"Prevention × surveillance",indices:[0,1],kind:"two-way interaction"},
  {name:"Prevention × employment link",indices:[0,2],kind:"two-way interaction"},
  {name:"Surveillance × employment link",indices:[1,2],kind:"two-way interaction"},
  {name:"Prevention × surveillance × employment link",indices:[0,1,2],kind:"three-way interaction"}
 ];
 const out=[];
 for(const test of tests)for(const m of METRICS){
  const values=batches.map(batch=>{
   let signed=0;
   for(let mask=0;mask<8;mask++){
    const bits=[(mask>>2)&1,(mask>>1)&1,mask&1];
    const item=batch.arms.find(a=>a.armId==="f"+bits.join(""));
    if(!item)throw Error("Missing factorial arm "+bits.join(""));
    const sign=test.indices.reduce((v,k)=>v*(bits[k]===1?1:-1),1);
    signed+=sign*item.metrics[m.key];
   }
   return signed/Math.pow(2,3-test.indices.length);
  });
  out.push({kind:test.kind,effect:test.name,metric:m.key,values,summary:stats(values)});
 }
 return out;
}
function analyze(plan,batches){
 if(!batches.length)throw Error("No completed synthetic seed pairs");
 return{modelVersion:"genesis-v2.0",experimentVersion:"factorial-lab-v1",createdAt:new Date().toISOString(),
   plan:{title:plan.title,description:plan.description,spec:plan.spec,baselineId:plan.baselineId,arms:plan.arms},
   batches,paired:paired(plan,batches),effects:factorial(plan,batches),
   limitations:[
    "Every city incidence rate, baseline social state, budget and most dynamic coefficients are invented and uncalibrated.",
    "The differences are conditional synthetic model contrasts, NOT observed effects of real-world policies.",
    "5th–95th percentile spans synthetic random-seed variation; not confidence intervals for real-world effects.",
    "Prevention share changes both patrol allocation and social-investment funding, even when total budget is held constant.",
    "A hypothetical employment/education/housing link is not an empirical treatment effect.",
    "Repeated seeds improve model-internal comparison but cannot establish validity, causal identification or generalizability.",
    "No real-world age structure, geographic crime rate or treatment-exposure denominators are calibrated."
   ]};
}
function rawCSV(result){
 const rows=[["seed","arm_id",...METRICS.map(m=>m.key)]];
 for(const batch of result.batches)for(const arm of batch.arms)rows.push([batch.seed,arm.armId,...METRICS.map(m=>arm.metrics[m.key])]);
 return rows.map(row=>row.join(",")).join("\n");
}
function effectsCSV(result){
 const rows=[["kind","effect","arm","outcome","n","mean","sd","p05","median","p95","negative_draws","positive_draws"]];
 for(const t of [...result.paired,...result.effects]){const s=t.summary;rows.push([t.kind,t.effect,t.armId||"",t.metric,s.n,s.mean,s.sd,s.q05,s.median,s.q95,s.negative,s.positive])}
 return rows.map(row=>row.join(",")).join("\n");
}
root.GenesisExperiments={METRICS,FACTORS,ONE,STRUCT,BASE,normalize,design,runArm,runSeed,stats,paired,factorial,analyze,rawCSV,effectsCSV};
})(typeof self!=="undefined"?self:window);