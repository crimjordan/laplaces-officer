/* GENESIS SOVEREIGN release tests. Node-only; no packages or network needed.
   Run: node scripts/test-sovereign.cjs */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,".."),read=x=>fs.readFileSync(path.join(root,x),"utf8");
const scripts=["sovereign-engine.js","sovereign-view.js","sovereign-report.js","sovereign-app.js"];
for(const file of scripts)assert.doesNotThrow(()=>new vm.Script(read(file),{filename:file}),"Script syntax: "+file);
const html=read("sovereign.html");
for(const f of [...scripts,"sovereign.css","sovereign-model-card.html"])
 assert(html.includes(f),"SOVEREIGN page has no link to "+f);
assert(read("index.html").includes('href="sovereign.html"'),"Homepage missing SOVEREIGN link");
assert(read("genesis.html").includes('href="sovereign.html"'),"GENESIS missing SOVEREIGN link");
const win={};
const ctx=vm.createContext({window:win,Date,Math,Uint16Array,Uint8Array,Float32Array,Float64Array,console});
for(const file of ["sovereign-engine.js","sovereign-report.js"])vm.runInContext(read(file),ctx,{filename:file});
const E=win.GenesisSovereign,R=win.SovereignReport;
assert.equal(E.VERSION,"sovereign-v1.0");
assert.equal(E.OFFENSES.length,10);
assert(Object.keys(E.PROGRAMS).length>=7);
const expected=[["state",1320,9,6,200],["country",2688,16,12,200],["federation",4368,24,19,120]];
for(const [mode,count,provinces,cities,horizon] of expected){
 const geo=E.terrain(47121,mode);
 assert.equal(geo.size,count);assert.equal(geo.provinces.length,provinces);
 assert.equal(geo.cities.length,cities);assert.equal(geo.maxYears,horizon);
 assert.equal(geo.cells.length,count);
 const zones=new Set(geo.cells.map(c=>c.zone));
 for(const id of [0,1,2,3,4,5,6])assert(zones.has(id),mode+" missing land-use category "+id);
 assert(geo.cells.every(c=>c.province>=0&&c.province<provinces));
 assert(geo.cells.every(c=>c.city>=0&&c.city<cities));
 const same=E.terrain(47121,mode);
 assert.equal(geo.initialPopulation,same.initialPopulation);
 assert.equal(JSON.stringify(geo.cities),JSON.stringify(same.cities));
}
const geo=E.terrain(99831,"state");
const a=E.createWorld(geo,{national:"none",budget:16},99831),b=E.createWorld(geo,{national:"none",budget:16},99831);
const history=[];
for(let t=0;t<12;t++){
 const x=E.step(a),y=E.step(b);
 assert.deepEqual(JSON.parse(JSON.stringify(x)),JSON.parse(JSON.stringify(y)),"Matched worlds differ in year "+(t+1));
 assert.equal(x.offenses.reduce((s,z)=>s+z,0),x.underlying,"Health events included as criminal incident");
 assert(x.recorded<=x.underlying,"Recorded incidents exceed underlying");
 assert(x.recordedOffenses.every((v,k)=>v<=x.offenses[k]),"Recorded category exceeds underlying");
 assert(x.population>0&&x.population<100000000,"Population unstable");
 assert(x.trust>=0&&x.trust<=1,"Out of bounds trust");
 assert.equal(x.provinceTotals.length,9);
 assert.equal(E.snapshot(a,t+1).trueTypes.length,geo.size*10);
 history.push(JSON.stringify(x));
}
E.seek(a,4);assert.equal(a.year,4);assert.equal(a.history.length,4);
assert.equal(JSON.stringify(E.step(a)),history[4],"Replayed year 5 diverged");
const alt=E.createWorld(geo,{national:"finland",budget:16,intensity:85},99831);
for(let i=0;i<12;i++)E.step(alt);
assert(alt.history[11].homeless<b.history[11].homeless,"Housing First program failed to reach modeled housing state");
const portugal=E.createWorld(geo,{national:"portugal",budget:16,intensity:85},99831);
for(let i=0;i<12;i++)E.step(portugal);
assert(portugal.history[11].drugPossessionProcessed<b.history[11].drugPossessionProcessed,"Drug processing did not change");
assert(portugal.history[11].healthReferrals>b.history[11].healthReferrals,"Health referrals did not respond");
// A province-only policy must apply to its intended province, leaving others
// governed by the national default. Historical application is logged annually.
const targeted=E.createWorld(geo,{national:"none",provincePolicies:{"3":"finland"}},99831);
const result=E.step(targeted);
assert(result.policyUsage.finland>0);assert(result.policyUsage.none>0);
const province=E.provinceReport(targeted,1,3);
assert(province.population>0&&Number.isFinite(province.trust));
const rural=E.zoneReport(targeted,1,5);assert(rural.cells>0);
const report=R.build(geo,b,alt,12,0,[]);
assert.equal(report.year,12);
assert(report.html.includes("The Fate of a Nation"));
assert(report.html.includes("INTERNATIONAL EVIDENCE REGISTER"));
assert(report.html.includes("GENESIS SOVEREIGN"));
assert(report.html.includes("PRINT / SAVE PDF"));
assert(report.html.includes("Country")||report.html.includes("STATE"));
assert(!/\bNaN\b/.test(report.html));
assert(!report.html.includes("undefined"));
const ids=[...new Set([...read("sovereign-app.js").matchAll(/\$\("([a-zA-Z0-9]+)"\)/g)].map(m=>m[1]))];
const dynamic=/^(education|housing|health|employment|patrol|surveillance)(A|B)(Out)?$/;
for(const id of ids){if(dynamic.test(id))continue;assert(html.includes('id="'+id+'"'),"SOVEREIGN missing page element "+id)}
for(const value of ["recession","flood","epidemic","migration"])assert(html.includes('data-shock="'+value+'"'));
console.log("GENESIS SOVEREIGN TESTS PASSED");
console.log("✓ Three deterministic hierarchical geographic scales and seven land-use zones");
console.log("✓ Identical seed negative control, category observation boundaries, historic replay");
console.log("✓ Finland/Portugal pathways and province-only policy rollout");
console.log("✓ National report with evidence register and PDF export");
console.log("✓ Browser-script syntax and DOM-control contracts");
