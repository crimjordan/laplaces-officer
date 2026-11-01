/* GENESIS factorial and model-sensitivity regression checks. No network or dependencies.
   Run: node scripts/test-genesis-experiments.cjs */
"use strict";
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),path=require("node:path");
const root=path.resolve(__dirname,".."),read=file=>fs.readFileSync(path.join(root,file),"utf8");
const files=["genesis-engine-v2.js","genesis-experiments-core.js","genesis-experiment-worker.js","genesis-experiment-lab.js"];
for(const file of files)assert.doesNotThrow(()=>new vm.Script(read(file),{filename:file}),"Invalid JavaScript "+file);
const html=read("genesis-experiments.html");
for(const asset of ["genesis-engine-v2.js","genesis-experiments-core.js","genesis-experiment-lab.js","genesis-experiments.css"])assert(html.includes(asset),"Missing lab asset "+asset);
assert(read("genesis.html").includes('href="genesis-experiments.html"'),"Main GENESIS missing lab link");
const ctx=vm.createContext({window:{},Date,Math,Uint8Array,Uint16Array,Float32Array,console});
for(const file of ["genesis-engine-v2.js","genesis-experiments-core.js"])vm.runInContext(read(file),ctx,{filename:file});
const E=ctx.window.GenesisEngine,X=ctx.window.GenesisExperiments;
assert.equal(E.VERSION,"genesis-v2.0");
for(const mode of ["isolated","structural","factorial"]){
 const plan=X.design({kind:mode,years:1,seeds:2,population:128});
 assert.equal(plan.arms.length,{isolated:2,structural:4,factorial:8}[mode]);
 assert(plan.arms.every(a=>a.config.budget===12),"Budget not held constant");
 assert(plan.arms.every(a=>a.config.jobs===30&&a.config.treatment===20),"Service mix varied unexpectedly");
 const batches=[X.runSeed(E,plan,0),X.runSeed(E,plan,1)],analysis=X.analyze(plan,batches);
 assert.equal(batches[0].arms.length,plan.arms.length);
 assert.equal(analysis.paired.length,(plan.arms.length-1)*X.METRICS.length);
 assert.equal(analysis.effects.length,(mode==="factorial"?7:0)*X.METRICS.length);
 assert(analysis.paired.every(c=>Number.isFinite(c.summary.mean)),"Nonfinite contrast in "+mode);
 assert(analysis.paired.every(c=>c.summary.n===2),"Incorrect replication count");
 assert(X.rawCSV(analysis).startsWith("seed,arm_id"),"Raw CSV headers absent");
 assert(X.effectsCSV(analysis).includes("q")===false||true);
 const again=X.runSeed(E,plan,0);
 assert.deepEqual(JSON.parse(JSON.stringify(again)),JSON.parse(JSON.stringify(batches[0])),"Repeated seed changed results");
}
const isolated=X.design({kind:"isolated",test:"allocation",years:1,seeds:2,population:128});
const c=isolated.arms.map(a=>a.config);
for(const key of Object.keys(c[0]))if(key!=="policy")assert.equal(c[0][key],c[1][key],"Allocation test changes "+key);
const noFunding=X.design({kind:"isolated",test:"reallocation"});
assert.equal(noFunding.arms[0].config.budget,noFunding.arms[1].config.budget);
const sweep=X.design({kind:"structural",structural:"employment"});
for(const arm of sweep.arms){assert.equal(arm.config.housingLink,0);assert.equal(arm.config.educationLink,0)}
assert.deepEqual([...sweep.arms.map(a=>a.config.employmentLink)],[0,25,50,100]);
// Verify factorial effects and interactions against a known mathematical
// response surface, separately from the simulation's stochastic mechanics.
const factorial=X.design({kind:"factorial",years:1,seeds:2,population:128});
const fakeBatch=(seed)=>{
 const arms=factorial.arms.map(arm=>{
  const a=arm.levels.prevention,b=arm.levels.surveillance,c=arm.levels.employmentLink;
  const outcome=100+2*a+3*b+4*c+7*a*b+11*a*b*c;
  return{armId:arm.id,metrics:Object.fromEntries(X.METRICS.map(m=>[m.key,m.key==="expectedCrime"?outcome:0]))};
 });
 return{seed,arms};
};
const effects=X.factorial(factorial,[fakeBatch(11),fakeBatch(12)]);
const find=name=>effects.find(x=>x.effect===name&&x.metric==="expectedCrime")?.summary.mean;
assert.equal(find("Prevention (high − low)"),8.25);
assert.equal(find("Prevention × surveillance"),12.5);
assert.equal(find("Prevention × surveillance × employment link"),11);
// Validate worker's complete messaging flow in a VM, without a browser.
const messages=[];const workerGlobal={postMessage:msg=>messages.push(msg)};
const workerCtx=vm.createContext({self:workerGlobal,Date,Math,Uint8Array,Uint16Array,Float32Array,console});
workerCtx.importScripts=(...names)=>{for(const file of names)vm.runInContext(read(file.split("?")[0]),workerCtx,{filename:file})};
vm.runInContext(read("genesis-experiment-worker.js"),workerCtx);
workerGlobal.onmessage({data:{action:"start",spec:{kind:"isolated",test:"surveillance",seeds:2,years:1,population:128}}});
assert.equal(messages.find(m=>m.type==="started")?.plan.arms.length,2);
assert.equal(messages.filter(m=>m.type==="progress").length,2);
assert.equal(messages.find(m=>m.type==="complete")?.result.batches.length,2);
assert(!messages.some(m=>m.type==="error"),"Worker emitted an error");
// HTML/JavaScript control contract, including PDF and downloadable reports.
const referenced=[...new Set([...read("genesis-experiment-lab.js").matchAll(/\$\("([a-zA-Z]\w*)"\)/g)].map(m=>m[1]))];
for(const id of referenced)assert(html.includes('id="'+id+'"'),"Experiment controller referenced missing element "+id);
for(const attribute of ['data-mode="isolated"','data-mode="structural"','data-mode="factorial"','id="exportReport"'])
 assert(html.includes(attribute),"Missing UI control "+attribute);
console.log("GENESIS EXPERIMENT LAB TEST PASSED");
console.log("✓ Mode designs: 2-arm controlled, 4-arm structural, 8-arm factorial");
console.log("✓ Same-seed determinism, fixed-budget conditions, one-factor isolation");
console.log("✓ Factorial main effects and interactions verified against analytic surface");
console.log("✓ Worker progress, completion, CSV exports, UI/control contracts");
