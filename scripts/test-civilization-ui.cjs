/* Civilization II browser UI smoke test without third-party dependencies. */
"use strict";
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const dir=path.resolve(__dirname,".."),read=f=>fs.readFileSync(path.join(dir,f),"utf8");
const html=read("civilization.html"),globalWindow={},ctx=vm.createContext({window:globalWindow,
 Math,Date,Uint8Array,Uint16Array,Float32Array,Float64Array,console});
for(const f of ["sovereign-engine.js","civilization-engine.js","civilization-report.js","civilization-experiments.js"]){
 vm.runInContext(read(f),ctx,{filename:f});
}
const E=globalWindow.GenesisCivilization,X=globalWindow.CivilizationExperiments,R=globalWindow.CivilizationReport;
let idCounter=0,viewUpdates=0,reports=0,downloads=0,workerMessages=0;
const els=new Map(),shocks=["recession","flood","epidemic","migration","institutional","automation"].map(k=>make("button",null,{shock:k}));
function make(tag="div",forcedId=null,data={}){
 let id="auto-"+(++idCounter);
 const children=[],handlers={},el={
  tagName:tag.toUpperCase(),value:"",textContent:"",children,handlers,disabled:false,hidden:false,
  style:{},dataset:data,
  classList:{toggle(){},add(){},remove(){}},
  append(...x){this.children.push(...x);if(this.tagName==="SELECT"&&x.length&&this.value==="")this.value=x[0].value||""},
  replaceChildren(...x){this.children.length=0;this.children.push(...x);if(this.tagName==="SELECT")this.value="" },
  addEventListener(event,fn){this.handlers[event]=fn},
  setAttribute(){},click(){this.handlers.click?.({target:this})},
  remove(){},getBoundingClientRect(){return{left:0,width:1150,top:0,height:330}},
  getContext(){return new Proxy({},{get(_t,k){return()=>{}},set(){return true}})}
 };
 Object.defineProperty(el,"id",{get(){return id},set(v){els.delete(id);id=String(v);els.set(id,el)}});
 els.set(id,el);if(forcedId)el.id=forcedId;return el;
}
for(const m of html.matchAll(/\bid="([^"]+)"/g))make("div",m[1]);
const val=(id,x)=>{const el=els.get(id);assert(el,"Missing "+id);el.value=String(x)};
for(const [k,v]of Object.entries({scale:"state",seed:303030,timeline:0,layer:"zoning",offense:0,chartMetric:"underlying",
 fiscalMetric:"debtGDP",matrixMetric:"population",speed:850,shockScope:-1,shockWorld:"both",localPolicy:"finland",
 replicationCount:3,replicationYears:5,labOutcome:"unhoused"}))val(k,v);
const document={
 createElement:tag=>make(tag),getElementById:id=>els.get(id)||null,
 createTextNode:t=>({textContent:t}),
 querySelectorAll:q=>q==="[data-shock]"?shocks:[],
 addEventListener() {},body:make("body")
};
const browser={
 GenesisSovereign:E,GenesisCivilization:E,
 CivilizationReport:{open(...args){reports++;const result=R.build(...args);return{...result,method:"tab"}}},
 CivilizationExperiments:X,
 SovereignView:{LAYERS:{zoning:{label:"Land use"},offense:{label:"Offense"}},async create(){
  return{type:"canvas",update(){viewUpdates++},setCamera(){},dispose(){},capture(){return"data:image/png;base64,AAAB"}};
 }}
};
const fakeURL={createObjectURL(){downloads++;return"blob:fake"},revokeObjectURL(){}};
class FakeWorker{
 constructor(path){this.path=path;this.onmessage=null;this.onerror=null;this.terminated=false}
 postMessage(message){
  const config=X.plan({...message.plan,years:1,reps:2,scale:"state"}),pairs=[X.runPair(config,0),X.runPair(config,1)];
  if(this.terminated)return;
  this.onmessage?.({data:{type:"progress",done:1,total:2,seed:pairs[0].seed}});
  this.onmessage?.({data:{type:"complete",result:X.analyze(config,pairs)}});
 }
 terminate(){this.terminated=true}
}
const run=vm.createContext({window:browser,document,Blob,URL:fakeURL,Worker:FakeWorker,
 Math,Date,Number,Uint8Array,Uint16Array,Float32Array,Float64Array,console,
 setTimeout,clearTimeout,setInterval,clearInterval});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 vm.runInContext(read("civilization-app.js"),run,{filename:"civilization-app.js"});
 await wait(15);
 assert.equal(els.get("heroYear").textContent,"2027");
 assert.equal(els.get("zoneLegend").children.length,7);
 assert.equal(els.get("provinceSelect").children.length,9);
 assert.equal(els.get("headlineStats").children.length,7);
 assert.equal(els.get("evidenceCards").children.length,5);
 assert(viewUpdates>=1,"No initial 3D/isometric map update");
 els.get("step").click();
 for(let i=0;i<25&&els.get("heroYear").textContent!=="2028";i++)await wait(75);
 assert.equal(els.get("heroYear").textContent,"2028","Single-year simulation failed");
 assert.equal(els.get("exportReport").disabled,false);
 assert.equal(els.get("fiscalTiles").children.length,5);
 assert.equal(els.get("agePyramid").children.length,4);
 assert(els.get("regionalTable").children.length>0);
 assert(els.get("spendingBars").children.length===2);
 els.get("showB").click();
 els.get("provinceSelect").value="3";
 els.get("provinceSelect").handlers.change({target:{value:"3"}});
 els.get("localPolicy").value="portugal";els.get("applyB").click();
 assert(els.get("rolloutList").children.length>=1,"Province rollout missing");
 shocks[0].click();assert(els.get("eventLog").children.length>1);
 els.get("exportReport").click();assert.equal(reports,1,"Report action not wired");
 els.get("exportCSV").click();assert(downloads>=1,"CSV export not wired");
 els.get("zoneView").click();els.get("provinceView").click();
 assert(els.get("regionalTable").children.length>0);
 els.get("timeline").handlers.input({target:{value:"0"}});
 assert.equal(els.get("heroYear").textContent,"2027");
 els.get("branch").click();
 els.get("runNationalExperiment").click();
 assert.equal(els.get("exportNationalExperiment").disabled,false,"National experiment export not enabled");
 assert(els.get("labResults").children.length>0,"National experiment results not rendered");
 els.get("exportNationalExperiment").click();
 assert(downloads>=2,"National experiment CSV not downloadable");
 console.log("CIVILIZATION II UI SMOKE TEST PASSED");
 console.log("✓ Live cockpit, generated geography, fiscal and cohort dashboards");
 console.log("✓ Year-step, timeline branching, country policies and shocks");
 console.log("✓ National report, raw national CSV and matched-experiment CSV");
})().catch(e=>{console.error(e);process.exitCode=1});
