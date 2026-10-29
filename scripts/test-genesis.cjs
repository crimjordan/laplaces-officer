/* GENESIS repository smoke tests; node scripts/test-genesis.cjs
   No network or package install is required. CI must fail if data integrity,
   determinism, or static release references regress. */
"use strict";
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const get=file=>fs.readFileSync(path.join(root,file),"utf8");
const sourceFiles=["genesis-evidence.js","genesis-engine.js","genesis-3d.js","genesis-report.js","genesis-app.js"];
for(const file of sourceFiles)assert.doesNotThrow(()=>new vm.Script(get(file),{filename:file}),"Syntax: "+file);
const html=get("genesis.html");
for(const file of ["genesis.css",...sourceFiles])assert(html.includes(file),"Missing page asset "+file);
assert(get("index.html").includes('href="genesis.html"'),"Home page missing GENESIS navigation");
const ids=[...get("genesis-app.js").matchAll(/\$\("([a-zA-Z][a-zA-Z0-9]*)"\)/g)].map(m=>m[1]);
for(const id of new Set(ids))assert(html.includes('id="'+id+'"'),"GENESIS HTML missing DOM control "+id);
const context=vm.createContext({window:{},console,Date,Math,Uint8Array,Uint16Array});
for(const file of ["genesis-evidence.js","genesis-engine.js","genesis-report.js"])vm.runInContext(get(file),context,{filename:file});
const E=context.window.GenesisEngine,R=context.window.GenesisReport,evidence=context.window.GenesisEvidence;
assert.equal(E.TYPES.length,12);
assert.equal(E.TYPES.filter(x=>x.health).length,1);
assert.equal(evidence.length>=7,true);
const args={seed:709213,population:384,track:true};
const A=E.create(args.seed,E.PRESETS.balanced,args.population,{track:true});
const B=E.create(args.seed,E.PRESETS.balanced,args.population,{track:true});
assert.equal(A.initialCity.reduce((s,d)=>s+d.residents,0),args.population);
assert.equal(E.stateOf(A,12,0).home,A.people[12].initial);
for(let month=0;month<48;month++){
 const a=E.shift(A,{}),b=E.shift(B,{});
 assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),"Identical-world negative control at "+month);
 assert.equal(a.totalCrime,E.sum(a.trueByType.slice(0,11)),"Overdose incorrectly included in crime");
 assert(a.trueByType.every((n,i)=>n>=a.recordedByType[i]),"Observed incident count exceeds underlying");
 assert(a.overdoseDeaths<=a.overdoses,"Overdose fatalities exceed emergency incidents");
 assert(a.alive<=A.population&&a.alive>=0,"Impossible population");
 assert(a.trust<=1&&a.trust>=0,"Impossible trust index");
}
const replay=E.rerunTo(A,19);
assert.equal(replay.month,19);
assert.deepEqual(JSON.parse(JSON.stringify(replay.history[18])),JSON.parse(JSON.stringify(A.history[18])),"Rewind not reproducible");
assert.equal(E.stateOf(A,12,0).home,A.people[12].initial,"Time zero was modified");
assert.equal(E.stateOf(A,12,18).month,18,"Life history snapshot unavailable");
const modified=E.create(args.seed,E.PRESETS.prevent,args.population,{track:true});
for(let month=0;month<48;month++)E.shift(modified,{});
const report=R.build({A,B:modified,types:E.TYPES,evidence,months:32,selected:12,shocks:[]});
assert(report.html.includes("Print / Save PDF"),"Printable report unavailable");
assert(report.html.includes("EVIDENCE REGISTER"),"Report omitted evidence provenance");
assert(report.html.includes("Overdose emergencies"),"Report omitted noncriminal overdose indicator");
assert.equal(report.months,32,"Wrong report timeline cutoff");
assert(!/\bNaN\b/.test(report.html),"Invalid number in report");
assert(!report.html.includes("undefined"),"Missing value in report");
assert.doesNotThrow(()=>new vm.Script(report.html.match(/<script>([\s\S]*?)<\/script>/)?.[1]||"",{filename:"report-inline.js"}));
const checkpoints=[{k:"identical-world control",status:"PASS"},{k:"monthly offense measurement",status:"PASS"},{k:"historical branch reconstruction",status:"PASS"},{k:"person lifecourse snapshots",status:"PASS"},{k:"report generation and caveats",status:"PASS"},{k:"page asset/DOM links",status:"PASS"}];
console.log("GENESIS RELEASE SMOKE TEST PASSED");
for(const c of checkpoints)console.log("✓ "+c.k);
console.log("48 paired synthetic months, 384 agents per world; report includes 32 months.");