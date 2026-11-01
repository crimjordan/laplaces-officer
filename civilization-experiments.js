/* CIVILIZATION 2 / national replication and Monte Carlo descriptive contrasts.
   The distributions are simulated seed variation, not uncertainty intervals
   for empirical treatment effects. Runs are deterministic for a given seed.
*/
(function(root){"use strict";
const E=root.GenesisCivilization;if(!E)throw Error("Load civilization-engine.js first");
const METRICS=["population","gdp","gdpPerCapita","debtGDP","debt","spending","underlying","crimePer100k","recorded","recordedPer100k",
 "overdoseDeaths","overdoseDeathRate","violentArrests","unhoused","unhousedRate","employment","trust","adminQuality",
 "births","deaths","netExternalMigration","housingBuild","youthOffers","medicationMonths",
 "careUnmet","wastedBudget","implementationFailures"];
const LABELS=Object.fromEntries(E.metricNames);
function plan(input={}){
 const o={...input},seed=Math.max(1,Math.floor(+o.seed||303030)),
  scale=Object.hasOwn(E.MODES,o.scale)?o.scale:"state";
 const years=Math.max(1,Math.min(E.MODES[scale].horizon,Math.round(+o.years||15))),
  reps=Math.max(2,Math.min(40,Math.round(+o.reps||8)));
 const configA=E.config(o.configA||{}),configB=E.config(o.configB||{});
 const shocksA=Array.isArray(o.shocksA)?o.shocksA.map(x=>({...x})):[];
 const shocksB=Array.isArray(o.shocksB)?o.shocksB.map(x=>({...x})):[];
 return{seed,scale,years,reps,configA,configB,shocksA,shocksB};
}
function runPair(spec,index){
 const base=(spec.seed+index*104729)>>>0,geo=E.terrain(base,spec.scale);
 const a=E.createWorld(geo,spec.configA,base),b=E.createWorld(geo,spec.configB,base);
 a.shocks=spec.shocksA.map(x=>({...x}));b.shocks=spec.shocksB.map(x=>({...x}));
 for(let year=0;year<spec.years;year++){E.step(a);E.step(b)}
 const A=a.history.at(-1),B=b.history.at(-1);
 const cumulative={};
 for(const metric of ["underlying","recorded","overdoseDeaths","youthOffers","housingBuild","births","deaths","netExternalMigration"]){
  cumulative[metric+"A"]=a.history.reduce((s,r)=>s+(r[metric]||0),0);
  cumulative[metric+"B"]=b.history.reduce((s,r)=>s+(r[metric]||0),0);
 }
 const final={};for(const key of METRICS){final[key+"A"]=A[key];final[key+"B"]=B[key]}
 return{seed:base,index,final,cumulative};
}
function quantile(sorted,p){if(!sorted.length)return NaN;const i=p*(sorted.length-1),a=Math.floor(i),b=Math.ceil(i);return sorted[a]+(sorted[b]-sorted[a])*(i-a)}
function stats(data){
 const count=data.length;if(!count)return null;
 const mean=data.reduce((s,v)=>s+v,0)/count,
  sd=Math.sqrt(data.reduce((s,v)=>s+(v-mean)**2,0)/Math.max(1,count-1)),
  x=[...data].sort((a,b)=>a-b);
 return{n:count,mean,sd,min:x[0],q05:quantile(x,.05),q50:quantile(x,.5),q95:quantile(x,.95),
  max:x.at(-1),positive:data.filter(v=>v>0).length,negative:data.filter(v=>v<0).length,values:data};
}
function analyze(spec,pairs){
 if(!pairs.length)throw Error("No replicate pairs were completed");
 const effects={};for(const key of METRICS){
  effects[key]=stats(pairs.map(pair=>pair.final[key+"B"]-pair.final[key+"A"]));
 }
 for(const key of ["underlying","recorded","overdoseDeaths","youthOffers","housingBuild","births","deaths","netExternalMigration"]){
  effects["cumulative_"+key]=stats(pairs.map(pair=>pair.cumulative[key+"B"]-pair.cumulative[key+"A"]));
 }
 return{version:"civilization-experiments-v1",modelVersion:E.VERSION,study:spec,pairs,effects,
  description:"Matched synthetic national histories; differences calculated B minus A. Results conditional on uncalibrated model equations, not estimates of real policy outcomes.",
  limitations:["All regions, age structures, baseline rates and most policy coefficients are invented.",
   "The 5th to 95th percentile range summarizes variation over simulated seeds, not confidence about actual policy effectiveness.",
   "Both arms share a seed but may diverge due to prior outcomes; this is not an empirical randomized trial.",
   "Current policy settings begin at year zero for each fresh replication; previous interactive policy histories are not replayed.",
   "National-scale social interventions are not calibrated to outcomes measured in other countries.",
   "Fiscal values are model-generated constant-2027-dollar equivalents, not real national accounts."]};
}
function csv(result){
 const keys=METRICS,columns=["replication","seed",...keys.flatMap(k=>[k+"_A",k+"_B",k+"_B_minus_A"])];
 const out=[columns];
 for(const pair of result.pairs){
  out.push([pair.index+1,pair.seed,...keys.flatMap(k=>[pair.final[k+"A"],pair.final[k+"B"],
   pair.final[k+"B"]-pair.final[k+"A"]])]);
 }
 return out.map(r=>r.join(",")).join("\n");
}
root.CivilizationExperiments={METRICS,LABELS,plan,runPair,stats,analyze,csv};
})(typeof window!=="undefined"?window:self);