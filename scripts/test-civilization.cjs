/* Civilization II scientific/regression tests. No npm dependencies. */
"use strict";
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path"),assert=require("node:assert/strict");
const dir=path.resolve(__dirname,".."),read=file=>fs.readFileSync(path.join(dir,file),"utf8");
const paths=["sovereign-engine.js","civilization-engine.js","civilization-report.js",
 "civilization-experiments.js","civilization-experiment-worker.js","civilization-app.js"];
for(const name of paths)assert.doesNotThrow(()=>new vm.Script(read(name),{filename:name}),"JS parse failed: "+name);
const win={},ctx=vm.createContext({window:win,Math,Date,Uint8Array,Uint16Array,Float32Array,Float64Array,console});
for(const name of paths.slice(0,4))vm.runInContext(read(name),ctx,{filename:name});
const E=win.GenesisCivilization,R=win.CivilizationReport,X=win.CivilizationExperiments;
assert.equal(E.VERSION,"civilization-v2.0");
assert.equal(E.OFFENSES.length,10);
for(const [mode,expected,provinces,horizon]of [
 ["state",1320,9,200],["country",2688,16,200],["federation",4368,24,120]]){
 const geo=E.terrain(31111,mode),compare=E.terrain(31111,mode);
 assert.equal(geo.size,expected);assert.equal(geo.provinces.length,provinces);
 assert.equal(geo.maxYears,horizon);
 assert.equal(new Set(geo.provinces.map(p=>p.name)).size,provinces,"Province collision: "+mode);
 assert.equal(new Set(geo.provinces.map(p=>p.code)).size,provinces);
 assert.equal(new Set(geo.cities.map(p=>p.name)).size,geo.cities.length);
 assert.equal(geo.initialPopulation,compare.initialPopulation);
 const states=new Set(geo.cells.map(c=>c.zone));
 for(const id of [0,1,2,3,4,5,6])assert(states.has(id),"Land use missing "+id+" in "+mode);
}
const geo=E.terrain(303030,"state"),a=E.createWorld(geo,{national:"none"}),b=E.createWorld(geo,{national:"none"});
let oldPop=geo.initialPopulation;
const snapshots=[];
for(let year=1;year<=12;year++){
 const left=E.step(a),right=E.step(b);
 assert.deepEqual(JSON.parse(JSON.stringify(left)),JSON.parse(JSON.stringify(right)),"Identical worlds diverged");
 const change=oldPop+left.births-left.deaths+left.netExternalMigration;
 assert(Math.abs(change-left.population)<1e-6,"Demographic population identity fails year "+year);
 assert.equal(left.underlying,left.offenses.reduce((s,v)=>s+v,0));
 assert(left.recorded<=left.underlying);
 assert(left.recordedOffenses.every((x,i)=>x<=left.offenses[i]));
 assert(left.debt>=0 && left.debtGDP>=0);
 assert(left.effectiveBudget<=left.spending+1e-7,"Delivered exceeds appropriations");
 assert(left.wastedBudget>=0);
 assert(left.taxRevenue>=0 && left.gdp>0);
 assert(Number.isFinite(left.trust)&&left.trust>=0&&left.trust<=1);
 assert(left.implementationFailures>=0);
 const fr=E.snapshot(a,year);
 assert.equal(fr.trueTypes.length,geo.size*10);
 assert.equal(fr.recordedTypes.length,geo.size*10);
 const state=fr.arrays;
 for(let i=0;i<geo.size;i+=29)if(geo.cells[i].basePopulation>0){
  const co=state.children[i]+state.young[i]+state.middle[i]+state.elderly[i];
  assert(Math.abs(co-state.population[i])<1e-7,"Cell-level cohorts not balanced");
 }
 snapshots.push(JSON.stringify(left));oldPop=left.population;
}
E.seek(a,4);assert.equal(a.year,4);assert.equal(a.history.length,4);
assert.equal(JSON.stringify(E.step(a)),snapshots[4],"Historical replay is not deterministic");
const alt=E.createWorld(geo,{national:"integrated",priorities:{housing:30,health:28,policing:5}});
for(let i=0;i<12;i++)E.step(alt);
const last=b.history.at(-1),after=alt.history.at(-1);
assert.notEqual(last.population,after.population,"World populations never differ under different policies");
assert.notEqual(last.unhoused,after.unhoused,"Housing capacity did not respond to investment");
assert.notEqual(last.underlying,after.underlying,"Offense outcomes did not respond to scenario");
assert.notEqual(last.sectorSpending.housing,after.sectorSpending.housing);
const fiscalExperiment=E.createWorld(geo,{taxRate:5,targetSpending:40,maxDebtGDP:0});
for(let i=0;i<6;i++)E.step(fiscalExperiment);
assert(fiscalExperiment.history.every(r=>r.debt<.0000001),"Zero borrowing should not create new debt with revenue funding");
assert(fiscalExperiment.history.every(r=>r.fiscalConstraint<1),"Fiscal cap did not constrain appropriations");
const province=E.provinceReport(alt,12,4),zone=E.zoneReport(alt,12,5);
assert(province.population>0&&Number.isFinite(province.employment));assert(zone.cells>0);
const report=R.build(geo,b,alt,12);
assert(report.html.length>5000);assert(report.html.includes("10 / INTERPRETATION LIMITS"));
assert(report.html.includes("PRINT / SAVE PDF"));assert(report.html.includes("Heller"));
assert(report.html.includes("UN"));assert(!/NaN|undefined/.test(report.html));
const plan=X.plan({seed:4881,scale:"state",years:2,reps:2,configA:{national:"none"},configB:{national:"finland"}});
const pairA=X.runPair(plan,0),pairB=X.runPair(plan,1);
assert.deepEqual(JSON.parse(JSON.stringify(pairA)),JSON.parse(JSON.stringify(X.runPair(plan,0))));
const study=X.analyze(plan,[pairA,pairB]);
assert.equal(study.effects.underlying.n,2);
assert(Number.isFinite(study.effects.unhoused.mean));
assert.equal(X.csv(study).split("\n").length,3);
const html=read("civilization.html");
for(const name of ["sovereign-engine.js","civilization-engine.js","sovereign-view.js",
 "civilization-report.js","civilization-experiments.js","civilization-app.js","civilization.css","civilization-model-card.html"]){
 assert(html.includes(name),"HTML missing asset "+name);
}
const controls=[...new Set([...read("civilization-app.js").matchAll(/\$\("([a-zA-Z0-9]+)"\)/g)].map(m=>m[1]))];
const dynamic=/^(taxRate|targetSpending|maxDebtGDP|programScale|implementation|immigration|fertility|surveillance|patrolDeterrence|redistribution|priority_(education|health|housing|jobs|policing|climate))(A|B)(Out)?$/;
for(const id of controls){
 if(dynamic.test(id))continue;
 assert(html.includes('id="'+id+'"'),"Missing page element "+id);
}
for(const shock of ["recession","flood","epidemic","migration","institutional","automation"])
 assert(html.includes('data-shock="'+shock+'"'),"Shock control "+shock+" missing");
assert(read("index.html").includes('href="civilization.html"'),"Home missing CIVILIZATION link");
assert(read("sovereign.html").includes('href="civilization.html"'),"SOVEREIGN v1 missing v2 link");
console.log("CIVILIZATION ENGINE TESTS PASSED");
console.log("✓ Deterministic hierarchical world, distinct province names and seven land-use types");
console.log("✓ Four-cohort demographic accounting, same-seed negative control and historical replay");
console.log("✓ Borrowing constraint, housing capacity, crime categories and service delivery");
console.log("✓ Full research report, matched-seed study and DOM/asset integrity");
