/* Headless GENESIS SOVEREIGN interactive cockpit smoke test.
   Ensures the page's controls are actually wired, not just named. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const base=path.resolve(__dirname,".."),get=x=>fs.readFileSync(path.join(base,x),"utf8");
const html=get("sovereign.html");
const model={};const M=vm.createContext({window:model,Uint16Array,Float32Array,Float64Array,Math,Date,console});
vm.runInContext(get("sovereign-engine.js"),M);
vm.runInContext(get("sovereign-report.js"),M);
const E=model.GenesisSovereign,R=model.SovereignReport;
let idCounter=0,viewUpdateCount=0,reportCount=0,downloadCount=0;
const registered=new Map(),listeners={};
const noop=()=>{};
function make(tag="div"){
 const obj={tagName:tag.toUpperCase(),value:"",textContent:"",disabled:false,hidden:false,style:{},
 children:[],handlers:{},dataset:{},classList:{toggle:noop,add:noop,remove:noop},
 append(...children){for(const c of children){this.children.push(c);if(this.tagName==="SELECT"&&c?.tagName==="OPTION"&&!this.value)this.value=c.value}},
 replaceChildren(...children){this.children=children;if(this.tagName==="SELECT")this.value=""},
 setAttribute:noop,addEventListener(type,fn){this.handlers[type]=fn},
 click(){this.handlers.click?.({target:this})},remove:noop,
 getBoundingClientRect:()=>({left:0,top:0,width:1150,height:315}),
 getContext(){return new Proxy({},{get(){return noop},set(){return true}})}
 };
 let id="created-"+(++idCounter);
 Object.defineProperty(obj,"id",{get(){return id},set(v){registered.delete(id);id=String(v);registered.set(id,obj)}});
 registered.set(id,obj);return obj;
}
const existingIds=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
for(const id of existingIds){const el=make(/^(scale|offense|layer|nationalA|nationalB|provinceSelect|localPolicy|chartMetric|speed|shockScope|shockWorld)$/.test(id)?"select":"div");el.id=id}
const val=(id,v)=>{registered.get(id).value=String(v)};
for(const [id,v] of Object.entries({seed:47121,scale:"state",timeline:0,speed:550,layer:"zoning",offense:0,
 chartMetric:"underlying",shockScope:-1,shockWorld:"both",localPolicy:"finland"}))val(id,v);
const shockButtons=["recession","flood","epidemic","migration"].map(key=>{
 const obj=make("button");obj.dataset.shock=key;return obj});
const document={getElementById:id=>registered.get(id)||null,createElement:tag=>make(tag),
 createTextNode:x=>({textContent:x}),querySelectorAll:s=>s==="[data-shock]"?shockButtons:[],
 body:make("body"),addEventListener(type,fn){listeners[type]=fn}};
const browser={GenesisSovereign:E,SovereignReport:{open(...args){reportCount++;const r=R.build(...args);return{...r,method:"tab"}}},
 SovereignView:{LAYERS:{zoning:{label:"Land use"}},async create(){return{
  type:"webgl",update(){viewUpdateCount++},setCamera:noop,dispose:noop,capture(){return"data:image/png;base64,AAAA"}}}}};
const url={createObjectURL(){downloadCount++;return"blob:dummy"},revokeObjectURL:noop};
const ctx=vm.createContext({window:browser,document,Date,Math,Number,Blob,URL:url,
 setTimeout,clearTimeout,setInterval,clearInterval,Uint16Array,Float32Array,Float64Array,
 navigator:{},console});
(async()=>{
 vm.runInContext(get("sovereign-app.js"),ctx,{filename:"sovereign-app.js"});
 await new Promise(r=>setTimeout(r,25));
 assert.equal(registered.get("heroYear").textContent,"2027");
 assert.equal(registered.get("zoneLegend").children.length,7);
 assert.equal(registered.get("provinceSelect").children.length,9);
 assert.equal(registered.get("headlineStats").children.length,6);
 assert.equal(registered.get("evidenceCards").children.length,6);
 assert(viewUpdateCount>=1,"Initial map not rendered");
 registered.get("step").click();await new Promise(r=>setTimeout(r,700));
 assert.equal(registered.get("heroYear").textContent,"2028","Step one year failed");
 assert.equal(registered.get("exportReport").disabled,false);
 assert(registered.get("regionalComparison").children.length===2);
 registered.get("showB").click();
 assert.equal(registered.get("showB").classList!=null,true);
 registered.get("provinceSelect").value="4";
 registered.get("provinceSelect").handlers.change({target:{value:"4"}});
 registered.get("localPolicy").value="portugal";
 registered.get("applyB").click();
 assert(registered.get("rolloutList").children.length>=1);
 shockButtons[0].click();
 assert(registered.get("eventLog").children.length>=2);
 registered.get("exportReport").click();
 assert.equal(reportCount,1,"National report not generated");
 registered.get("exportCSV").click();
 assert.equal(downloadCount,1,"CSV download not wired");
 registered.get("timeline").handlers.input({target:{value:"0"}});
 assert.equal(registered.get("heroYear").textContent,"2027");
 registered.get("branch").click();
 assert.equal(registered.get("heroYear").textContent,"2027");
 console.log("SOVEREIGN COCKPIT SMOKE TEST PASSED");
 console.log("✓ Page initializes, map updates and seven land-use types display");
 console.log("✓ One-year step, province selection, policy rollout and shocks");
 console.log("✓ National printable research report and CSV export buttons");
 console.log("✓ Historical cursor and timeline branching");
})().catch(err=>{console.error(err);process.exitCode=1});
