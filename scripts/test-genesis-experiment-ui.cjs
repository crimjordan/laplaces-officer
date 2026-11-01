/* Browser-controller smoke test for GENESIS factorial lab.
   Node-only fake DOM; verifies controls, completed experiment rendering and
   standalone report generation without network, npm or a real browser. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const root=path.resolve(__dirname,".."),read=file=>fs.readFileSync(path.join(root,file),"utf8");
const globals=vm.createContext({window:{},Math,Date,Uint8Array,Uint16Array,Float32Array,console});
vm.runInContext(read("genesis-engine-v2.js"),globals);
vm.runInContext(read("genesis-experiments-core.js"),globals);
const events={},nodes=new Map(),modeButtons=["isolated","structural","factorial"].map(mode=>node("mode-"+mode));
function noop(){}
function node(id){
 if(nodes.has(id))return nodes.get(id);
 const children=[];
 const el={id,value:"",disabled:false,hidden:false,textContent:"",style:{},dataset:{},
   children,handlers:{},attributes:{},
   classList:{toggle:noop,add:noop,remove:noop},
   append(...x){this.children.push(...x)},
   replaceChildren(...x){this.children.length=0;this.children.push(...x)},
   addEventListener(name,handler){this.handlers[name]=handler},
   setAttribute(key,val){this.attributes[key]=val},
   getContext(){return new Proxy({},{get:(t,k)=>typeof t[k]!=="undefined"?t[k]:noop,set(t,k,v){t[k]=v;return true}})},
   click(){this.handlers.click?.()},
   remove:noop
 };
 nodes.set(id,el);return el;
}
for(const [i,mode] of ["isolated","structural","factorial"].entries())modeButtons[i].dataset.mode=mode;
const document={
 getElementById:node,
 createElement:(()=>{let i=0;return tag=>node("new-"+tag+"-"+(++i))})(),
 querySelectorAll:selector=>selector==="[data-mode]"?modeButtons:[],
 body:node("body")
};
const inputs={
 isolatedTest:"reallocation",structuralTest:"combined",baseBudget:12,basePolicy:"problem",
 basePrevention:50,baseSurveillance:40,basePatrolEffect:35,baseProcedure:"procedural",
 seedCount:2,simYears:1,simPop:128,seedBase:33411,outcomeSelect:"expectedCrime"
};
for(const [k,v] of Object.entries(inputs))node(k).value=v;
let lastReport="",popupOpened=0;
const fakeWindow={GenesisEngine:globals.window.GenesisEngine,GenesisExperiments:globals.window.GenesisExperiments,
 open(){popupOpened++;return{document:{open:noop,write(html){lastReport=html},close:noop},opener:null}},
 prompt:noop};
const browser=vm.createContext({
 window:fakeWindow,document,location:{search:"",href:"https://example.test/genesis-experiments.html"},
 navigator:{},URL,URLSearchParams,Blob,Date,Math,console,setTimeout:fn=>{fn();return 1},clearTimeout:noop
});
(async()=>{
 vm.runInContext(read("genesis-experiment-lab.js"),browser,{filename:"genesis-experiment-lab.js"});
 assert.equal(node("armPreview").children.length,2,"Default design not displayed");
 modeButtons[2].click();
 assert.equal(node("armPreview").children.length,8,"Factorial arm preview did not update");
 assert.equal(node("metricArms").textContent,"8");
 node("runExperiment").click();
 for(let i=0;i<10;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(node("metricStatus").textContent,"COMPLETE","Study failed to finish");
 assert.equal(node("runExperiment").disabled,false,"Run button remained disabled");
 assert.equal(node("exportReport").disabled,false,"Report button remained disabled");
 assert(node("resultTable").children.length,"Paired result table empty");
 assert(node("factorialTable").children.length,"Factorial effect table empty");
 assert(node("resultKpis").children.length===4,"KPI cards did not render");
 node("exportReport").click();
 assert.equal(popupOpened,1);
 assert(lastReport.includes("Full-factorial")||lastReport.includes("factorial")||lastReport.includes("Factorial"),"Report missing factorial analysis");
 assert(lastReport.includes("Download embedded JSON"),"Report cannot export data");
 assert(lastReport.includes("genesis-v2.0"),"Report lacks version");
 assert(lastReport.includes("NOT A REAL-WORLD CAUSAL ESTIMATE"),"Report fails to disclose validity");
 node("outcomeSelect").value="recordedCrime";
 node("outcomeSelect").handlers.change();
 assert(node("resultTable").children.length,"Outcome switch cleared results");
 console.log("GENESIS EXPERIMENT UI SMOKE TEST PASSED");
 console.log("✓ Live mode switching and arm preview");
 console.log("✓ Asynchronous replicated factorial execution (2 seeds × 8 conditions)");
 console.log("✓ Paired and factorial result tables, chart and KPI output");
 console.log("✓ Downloadable standalone HTML report with model provenance and embedded JSON");
})().catch(e=>{console.error(e);process.exitCode=1});
