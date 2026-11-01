/* GENESIS SOVEREIGN — two-world country simulation UI.
   All model operations are local; no data about people are retrieved. */
(function(){"use strict";
const E=window.GenesisSovereign,V=window.SovereignView,R=window.SovereignReport;
if(!E||!V||!R)throw Error("SOVEREIGN engine, visualization or reporter unavailable");
const $=id=>document.getElementById(id);
const fmt=n=>Math.round(Number(n)||0).toLocaleString("en-US");
const compact=n=>Number(n||0).toLocaleString("en-US",{notation:"compact",maximumFractionDigits:2});
const pct=n=>Number.isFinite(n)?(100*n).toFixed(1)+"%":"—";
const controls=["education","housing","health","employment","patrol","surveillance"];
const controlLabels={education:"EDUCATION",housing:"HOUSING",health:"HEALTH",employment:"EMPLOYMENT",patrol:"PATROL",surveillance:"SURVEILLANCE"};
const series=[["underlying","Underlying criminal incidents"],["recorded","Police-recorded incidents"],["expectedCrime","Conditional expected incidents"],
["population","Total fictional population"],["employment","Modeled employment"],["trust","Hypothetical trust"],["homeless","Housing instability"],
["overdoses","Nonfatal overdoses"],["overdoseDeaths","Opioid-overdose deaths"],["violentArrests","Violent-crime arrests"],
["youthOffers","Youth-job offers"],["recidivism","Recidivism events"],["healthReferrals","Care referrals"],
["drugPossessionProcessed","Processed possession contacts"],["housingSupport","Housing support"],
["schoolSeats","Education investment exposure"],["treatmentStarts","Treatment starts"],
["interprovinceMigration","Interprovince migration"],["offense","Selected offense category"]];
const shocks={recession:{duration:10,label:"Economic recession"},flood:{duration:8,label:"Climate/flood disaster"},
epidemic:{duration:6,label:"Public health emergency"},migration:{duration:10,label:"External migration wave"}};
let geo,A,B,viewer=null,selected="A",selectedProvince=0,selectedCell=null,cursor=0,layer="zoning",offense=0,
 timer=null,busy=false,cancelled=false,events=[],generation=0;
const world=name=>name==="B"?B:A;
const add=(tag,parent,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=String(text);if(cls)e.className=cls;parent.append(e);return e};
function options(id,entries){const parent=$(id);parent.replaceChildren();for(const [id,label]of entries){const opt=document.createElement("option");opt.value=String(id);opt.textContent=label;parent.append(opt)}}
function log(message){
 events.unshift({year:2027+cursor,message});events=events.slice(0,45);
 const root=$("eventLog");root.replaceChildren();
 for(const row of events.slice(0,18)){const p=add("p",root),time=add("time",p,row.year+"");
  p.append(document.createTextNode(row.message))}
}
function buildSectors(){
 for(const name of ["A","B"]){
  const outer=$("controls"+name),grid=add("div",outer,null,"sectorControls");
  for(const key of controls){const cell=add("div",grid),label=add("label",cell,controlLabels[key]+" ");
   label.setAttribute("for",key+name);const output=add("output",label,"40%");output.id=key+name+"Out";
   const input=add("input",cell);input.type="range";input.id=key+name;input.min=0;input.max=100;input.step=5;input.value=40}
 }
}
function setConfigInputs(){
 for(const name of ["A","B"]){
  const c=world(name).config;
  for(const key of ["national","intensity","budget",...controls])$(key+name).value=c[key];
 }
 labels();
}
function labels(){
 for(const name of ["A","B"]){
  $("intensity"+name+"Out").textContent=$("intensity"+name).value+"%";
  $("budget"+name+"Out").textContent="$"+$("budget"+name).value+"B · fiction";
  for(const key of controls)$(key+name+"Out").textContent=$(key+name).value+"%";
 }
 if(A&&B){
  const a=E.PROGRAMS[A.config.national],b=E.PROGRAMS[B.config.national];
  $("policyExplanation").textContent="A: "+a.name+" — "+a.limitation+" | B: "+b.name+" — "+b.limitation+
    " Controls are independent funding intensity inputs, not a balanced macroeconomic budget model.";
 }
}
function readConfig(){
 for(const name of ["A","B"]){const c=world(name).config;c.national=$("national"+name).value;
  for(const key of ["intensity","budget",...controls])c[key]=Number($(key+name).value)}
 labels();
}
function pause(){if(timer!==null){clearInterval(timer);timer=null}$("play").textContent="▶ PLAY";cancelled=true}
function reset(){
 pause();if(busy)return;
 const old=viewer;viewer=null;old?.dispose();generation++;
 const mode=$("scale").value,seed=Math.max(1,Math.floor(Number($("seed").value)||47121));
 geo=E.terrain(seed,mode);
 A=E.createWorld(geo,{national:"none",intensity:65,budget:16,patrol:50,surveillance:45},seed);
 B=E.createWorld(geo,{national:"integrated",intensity:75,budget:16,patrol:35,surveillance:35,
  housing:55,education:55,health:55,employment:55},seed);
 cursor=0;selected="A";selectedCell=null;
 selectedProvince=geo.provinces.reduce((best,p,i)=>p.population>geo.provinces[best].population?i:best,0);
 events=[];initSelectors();setConfigInputs();render();
 log("Procedural "+mode+" generated: "+fmt(geo.size)+" cells, "+geo.cities.length+" cities and "+geo.provinces.length+" provinces.");
 $("worldSize").textContent=fmt(geo.size)+" cells · "+geo.provinces.length+" provinces";
 const version=generation,container=$("worldViewport");
 V.create(container,geo,onMapSelect,message=>{
  if(generation!==version)return;
  $("renderStatus").textContent=message;$("mapMode").textContent=message.startsWith("WEBGL")?"3D WEBGL":"ISOMETRIC";
 }).then(v=>{if(generation!==version){v.dispose();return}viewer=v;renderScene()}).catch(error=>{
  if(generation===version)$("renderStatus").textContent="Visual layer unavailable: "+error.message;console.error(error)});
}
function initSelectors(){
 options("provinceSelect",geo.provinces.map(p=>[p.id,p.name]));
 options("shockScope",[[-1,"Entire nation"],...geo.provinces.map(p=>[p.id,p.name])]);
 options("nationalA",Object.entries(E.PROGRAMS).map(([k,p])=>[k,p.country+" · "+p.name]));
 options("nationalB",Object.entries(E.PROGRAMS).map(([k,p])=>[k,p.country+" · "+p.name]));
 options("localPolicy",Object.entries(E.PROGRAMS).filter(([k])=>k!=="none").map(([k,p])=>[k,p.country+" · "+p.name]));
 options("offense",E.OFFENSES.map((p,i)=>[i,p.label]));
 options("chartMetric",series);$("chartMetric").value="underlying";$("provinceSelect").value=String(selectedProvince);
 const legend=$("zoneLegend");legend.replaceChildren();const counts=new Array(E.ZONES.length).fill(0);
 for(const d of geo.cells)counts[d.zone]++;
 for(const [i,z]of E.ZONES.entries()){
  const box=add("div",legend,null,"zoneItem"),dot=add("span",box);dot.style.background="#"+z.color.toString(16).padStart(6,"0");
  add("span",box,z.label);add("b",box,fmt(counts[i]));
 }
 const evidence=$("evidenceCards");evidence.replaceChildren();
 for(const [key,p]of Object.entries(E.PROGRAMS)){
  if(key==="none")continue;const card=add("article",evidence,null,"evidenceCard");
  add("span",card,p.flag,"flag");add("span",card," "+p.class,"class");
  add("h3",card,p.country+" · "+p.name);add("p",card,p.detail);
  const details=add("details",card);add("summary",details,"STUDY DESIGN & TRANSFERABILITY");
  add("p",details,p.anchor);add("p",details,p.limitation);
  if(p.url){const link=add("a",card,"VIEW SOURCE ↗");link.href=p.url;link.target="_blank";link.rel="noopener noreferrer"}
 }
}
function onMapSelect(cell){
 selectedCell=cell;selectedProvince=cell.province;$("provinceSelect").value=String(selectedProvince);
 renderProvince();renderScene();log("Inspected "+E.ZONES[cell.zone].label+" in "+geo.provinces[selectedProvince].name+".");
}
function chooseProvince(index){
 selectedProvince=Math.max(0,Math.min(geo.provinces.length-1,+index||0));
 selectedCell=null;$("provinceSelect").value=String(selectedProvince);renderProvince();renderScene()
}
function chooseWorld(name){selected=name;$("showA").classList.toggle("active",name==="A");
 $("showB").classList.toggle("active",name==="B");render()}
function chooseLayer(name){layer=name;$("layer").value=name;renderScene()}
function branch(){
 if(busy)return;
 pause();if(cursor>=A.year){log("Already at the end of recorded history.");return}
 E.seek(A,cursor);E.seek(B,cursor);
 log("Branched both worlds at year "+(2027+cursor)+"; discarded subsequent recorded futures.");render();
}
async function advance(steps=1){
 if(busy||!geo)return;
 busy=true;cancelled=false;
 try{
  if(cursor<A.year){E.seek(A,cursor);E.seek(B,cursor);log("Created a new timeline branch from "+(2027+cursor)+".")}
  readConfig();
  const n=Math.max(0,Math.min(steps,geo.maxYears-A.year));
  if(!n){pause();return}
  for(let i=0;i<n;i++){
   if(cancelled)break;
   E.step(A);E.step(B);cursor=A.year;
   if(i%2===1||i===n-1){$("simProgress").textContent="Computing "+(2027+cursor)+
    " · "+(i+1)+"/"+n+" years of paired national outcomes";
    await new Promise(resolve=>setTimeout(resolve,0))}
  }
  if(cursor&&cursor%10===0)log("A decade elapsed: year "+(2027+cursor)+
   ". World A generated "+fmt(A.history[cursor-1].underlying)+" underlying incidents; B "+fmt(B.history[cursor-1].underlying)+".");
  if(cursor>=geo.maxYears){pause();log("Maximum "+geo.maxYears+"-year horizon reached.")}
  render();
 }catch(e){pause();console.error(e);$("simProgress").textContent="MODEL ERROR: "+e.message}
 finally{busy=false}
}
function togglePlay(){
 if(timer!==null){pause();return}
 cancelled=false;$("play").textContent="Ⅱ PAUSE";
 timer=setInterval(()=>advance(1),Math.max(100,Number($("speed").value)||550))
}
function injectShock(type){
 if(busy)return;
 if(cursor<A.year)branch();
 const item=shocks[type];if(!item)return;
 const province=Number($("shockScope").value),target=$("shockWorld").value;
 const payload={type,from:cursor+1,duration:item.duration,strength:1,province};
 if(target==="both"||target==="A")A.shocks.push({...payload});
 if(target==="both"||target==="B")B.shocks.push({...payload});
 log(item.label+" scheduled for "+item.duration+" years from "+(2028+cursor)+
  " in "+(province===-1?"all provinces":geo.provinces[province].name)+" / "+target+".");
}
function rollout(which,clear=false){
 if(busy)return;if(cursor<A.year)branch();
 const policy=$("localPolicy").value,id=selectedProvince;
 for(const name of (which==="both"?["A","B"]:[which])){
  if(clear)delete world(name).config.provincePolicies[id];else world(name).config.provincePolicies[id]=policy}
 $("rolloutStatus").textContent=(clear?"Cleared overrides":"Applied "+E.PROGRAMS[policy].name)+" · "+
 geo.provinces[id].name+" / "+which+" · effective next year.";
 log($("rolloutStatus").textContent);renderOverrides();
}
function renderOverrides(){
 const target=$("rolloutList");target.replaceChildren();
 for(const name of ["A","B"])for(const [id,key]of Object.entries(world(name).config.provincePolicies)){
  if(!geo.provinces[+id])continue;
  const box=add("div",target,null,"rolloutBadge");add("strong",box,"WORLD "+name+" · "+geo.provinces[+id].name);
  add("span",box,E.PROGRAMS[key]?.name||key);
 }
 if(!target.children.length)add("p",target,"No provincial overrides. National policies govern all provinces.","fine");
}
function renderScene(){
 if(!geo)return;
 const w=world(selected);viewer?.update(w,cursor,layer,offense,selectedProvince);
 $("mapLayerName").textContent=V.LAYERS[layer]?.label.toUpperCase()||layer;
 $("mapTitle").textContent=geo.mode.toUpperCase()+" · "+geo.cities.length+" CITIES · "+geo.provinces.length+" PROVINCES";
 $("mapYear").textContent=(2027+cursor)+" · WORLD "+selected;
 $("mapPopulation").textContent="POP "+compact(cursor?w.history[cursor-1].population:geo.initialPopulation);
 $("mapProvince").textContent=geo.provinces[selectedProvince].name.toUpperCase();
}
function renderStats(){
 const root=$("headlineStats");root.replaceChildren();
 const a=cursor?A.history[cursor-1]:null,b=cursor?B.history[cursor-1]:null;
 for(const [title,value,note]of [
  ["POPULATION",a?compact(a.population):compact(geo.initialPopulation),b?"B "+compact(b.population):"Year-zero population"],
  ["UNDERLYING INCIDENTS",a?compact(a.underlying):"—",b?"B "+compact(b.underlying):"Invented base rates"],
  ["POLICE RECORDINGS",a?compact(a.recorded):"—",b?"B "+compact(b.recorded):"Observation is incomplete"],
  ["HOUSING INSTABILITY",a?compact(a.homeless):"—",b?"B "+compact(b.homeless):"Hypothetical cases"],
  ["TRUST INDEX",a?pct(a.trust):"—",b?"B "+pct(b.trust):"Not a survey"],
  ["INTERPROVINCE MOBILITY",a?compact(a.interprovinceMigration):"—",b?"B "+compact(b.interprovinceMigration):"Modeled flows"]
 ]){
  const box=add("div",root);add("small",box,title);add("strong",box,value);add("em",box,note)
 }
}
function renderProvince(){
 const province=geo.provinces[selectedProvince],root=$("provinceStats");root.replaceChildren();
 $("provinceName").textContent=province.name;
 const data=E.provinceReport(world(selected),cursor,selectedProvince);
 for(const [label,val]of [
  ["Population",data?compact(data.population):compact(province.population)],
  ["Underlying incidents",data?fmt(data.underlying):"—"],["Recorded incidents",data?fmt(data.recorded):"—"],
  ["Employment",data?pct(data.employment):"—"],["Trust",data?pct(data.trust):"—"],
  ["Housing instability",data?fmt(data.homeless):"—"],["Health referrals",data?fmt(data.referrals):"—"],
  ["Youth program offers",data?fmt(data.youthOffers):"—"]
 ]){
  const box=add("div",root);add("small",box,label);add("strong",box,val)
 }
 $("cellInfo").textContent=selectedCell?"PARCEL #"+selectedCell.id+" · "+E.ZONES[selectedCell.zone].label+
  " · terrain index "+Math.round(selectedCell.alt*100)+"% · nearest synthetic town "+geo.cities[selectedCell.city].name+
  " · "+(selectedCell.transport?"highway-linked":"local access"):"Province contains "+fmt(province.cells)+" synthetic parcels. Select a parcel for details.";
 const compare=$("regionalComparison");compare.replaceChildren();
 for(const name of ["A","B"]){const r=E.provinceReport(world(name),cursor,selectedProvince),box=add("div",compare);
  add("strong",box,"WORLD "+name+" · "+province.name);
  add("p",box,r?"Population "+compact(r.population)+" · crime "+fmt(r.underlying)+" · trust "+pct(r.trust)+
   " · housing instability "+fmt(r.homeless):"Advance at least one year for provincial outcomes.")
 }
}
function chart(){
 const canvas=$("historyChart"),ctx=canvas.getContext("2d");if(!ctx)return;
 const width=canvas.width,height=canvas.height,left=78,right=width-29,top=30,bottom=height-42;
 ctx.fillStyle="#081b2b";ctx.fillRect(0,0,width,height);
 const key=$("chartMetric").value,n=cursor;
 const get=r=>key==="offense"?r.offenses[offense]:r[key];
 const a=A.history.slice(0,n).map(get),b=B.history.slice(0,n).map(get);
 const max=["trust","employment"].includes(key)?1:Math.max(1,...a,...b)*1.1;
 const x=i=>left+i/Math.max(1,n-1)*(right-left),y=v=>bottom-v/max*(bottom-top);
 ctx.font="11px ui-monospace,monospace";ctx.textAlign="right";
 for(let k=0;k<5;k++){const val=max*k/4,yy=y(val);
  ctx.beginPath();ctx.strokeStyle="#26485b";ctx.moveTo(left,yy);ctx.lineTo(right,yy);ctx.stroke();
  ctx.fillStyle="#9ab7bf";ctx.fillText(["trust","employment"].includes(key)?pct(val):compact(val),left-10,yy+4)}
 ctx.textAlign="center";ctx.fillStyle="#9bc0cb";
 for(let k=0;k<5;k++){const tick=n?Math.round((n-1)*k/4):0;
  ctx.fillText(String(2028+tick),x(tick),bottom+23)}
 for(const [j,data]of [a,b].entries()){
  ctx.strokeStyle=j?"#ffca90":"#72f7da";ctx.lineWidth=3;ctx.beginPath();
  for(let k=0;k<data.length;k++)if(k===0)ctx.moveTo(x(k),y(data[k]));else ctx.lineTo(x(k),y(data[k]));
  ctx.stroke()
 }
 $("chartSummary").textContent=n?"Year "+(2027+n)+": World A "+compact(a[n-1])+" versus B "+compact(b[n-1])+
  " · "+series.find(([key0])=>key0===key)?.[1]+". All trends are synthetic.":
  "Run the model to compare annual outcomes in both policy worlds.";
}
function render(){
 if(!geo)return;
 $("displayYear").textContent=String(2027+cursor);$("heroYear").textContent=String(2027+cursor);
 $("yearElapsed").textContent=cursor+" YEARS ELAPSED";$("historyCursor").textContent="SELECTED "+(2027+cursor);
 $("latestYear").textContent="LATEST "+(2027+A.year);
 $("timeline").max=A.year;$("timeline").value=cursor;
 $("exportReport").disabled=cursor<1;$("exportCSV").disabled=cursor<1;$("exportJSON").disabled=cursor<1;
 $("systemStatus").textContent=busy?"SIMULATING":"MODEL READY";
 renderStats();renderProvince();renderScene();renderOverrides();chart();
}
function download(name,data,type){
 const blob=new Blob([data],{type}),url=URL.createObjectURL(blob),link=document.createElement("a");
 link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1800);
 $("exportStatus").textContent="Exported "+name+" (synthetic research data).";
}
function exportCSV(){
 if(cursor<1)return;
 const columns=["year","calendarYear","population","underlying","recorded","expectedCrime","overdoses",
  "overdoseDeaths","employment","trust","homeless","youthOffers","violentArrests","recidivism","healthReferrals",
  "drugPossessionProcessed","housingSupport","schoolSeats","treatmentStarts","interprovinceMigration"];
 const rows=[["version","world",...columns,...E.OFFENSES.map(x=>"true_"+x.id),...E.OFFENSES.map(x=>"recorded_"+x.id)]];
 for(const [name,w]of [["A",A],["B",B]])for(const r of w.history.slice(0,cursor)){
  rows.push([E.VERSION,name,...columns.map(key=>r[key]),...r.offenses,...r.recordedOffenses])}
 download("genesis-sovereign-annual.csv",rows.map(row=>row.join(",")).join("\n"),"text/csv");
}
function exportJSON(){
 if(cursor<1)return;
 const payload={version:E.VERSION,synthetic:true,generatedAt:new Date().toISOString(),scale:geo.mode,seed:geo.seed,
   note:"Annual histories plus map structure, NOT full per-cell annual frames. Rerun engine with the same seed and recorded policies for regeneration.",
   geography:{cities:geo.cities,provinces:geo.provinces,cells:geo.cells.map(d=>({...d}))},
   evidence:E.PROGRAMS,offenses:E.OFFENSES,
   scenarios:Object.fromEntries([["A",A],["B",B]].map(([key,w])=>[key,{
    config:w.config,shocks:w.shocks,history:w.history.slice(0,cursor)}]))};
 download("genesis-sovereign-model.json",JSON.stringify(payload),"application/json");
}
function createReport(){
 if(!cursor)return;
 try{
  const result=R.open(geo,A,B,cursor,offense,events);
  $("exportStatus").textContent=result.method==="tab"?"Research report opened. Select Print / Save PDF.":
   "Your browser blocked the new tab, so the report downloaded as standalone HTML.";
  log("Created national research report for "+cursor+" simulated years.");
 }catch(e){$("exportStatus").textContent="Could not generate report: "+e.message;console.error(e)}
}
function bind(){
 $("generateWorld").addEventListener("click",reset);
 $("resetWorld").addEventListener("click",reset);
 $("play").addEventListener("click",togglePlay);
 $("pause").addEventListener("click",pause);
 $("step").addEventListener("click",()=>{pause();advance(1)});
 $("decade").addEventListener("click",()=>{pause();advance(10)});
 $("century").addEventListener("click",()=>{pause();advance(100)});
 $("branch").addEventListener("click",branch);
 $("timeline").addEventListener("input",e=>{pause();if(busy)return;cursor=Math.max(0,Math.min(A.year,+e.target.value||0));render()});
 $("showA").addEventListener("click",()=>chooseWorld("A"));
 $("showB").addEventListener("click",()=>chooseWorld("B"));
 $("layer").addEventListener("change",e=>chooseLayer(e.target.value));
 $("offense").addEventListener("change",e=>{offense=+e.target.value||0;if(layer!=="offense")chooseLayer("offense");else renderScene()});
 $("provinceSelect").addEventListener("change",e=>chooseProvince(e.target.value));
 $("chartMetric").addEventListener("change",chart);
 for(const name of ["A","B"])for(const key of ["national","intensity","budget",...controls]){
  $(key+name).addEventListener("input",readConfig);$(key+name).addEventListener("change",readConfig)}
 $("applyA").addEventListener("click",()=>rollout("A"));
 $("applyB").addEventListener("click",()=>rollout("B"));
 $("clearOverride").addEventListener("click",()=>rollout("both",true));
 for(const button of document.querySelectorAll("[data-shock]"))button.addEventListener("click",()=>injectShock(button.dataset.shock));
 for(const [id,camera]of [["camOrbit","orbit"],["camTop","top"],["camStreet","street"]]){
  $(id).addEventListener("click",()=>viewer?.setCamera(camera))}
 $("captureMap").addEventListener("click",()=>{
  try{const a=document.createElement("a");a.href=viewer.capture();a.download="sovereign-geography-"+(2027+cursor)+".png";
   document.body.append(a);a.click();a.remove()}
  catch(e){$("exportStatus").textContent="Map image unavailable: "+e.message}});
 $("exportReport").addEventListener("click",createReport);
 $("exportCSV").addEventListener("click",exportCSV);
 $("exportJSON").addEventListener("click",exportJSON);
 $("historyChart").addEventListener("click",e=>{
  if(!A.year)return;const rect=e.currentTarget.getBoundingClientRect();
  cursor=Math.max(1,Math.min(A.year,Math.round(((e.clientX-rect.left)/rect.width*1150-78)/1043*(A.year-1))+1));
  pause();render()
 });
 document.addEventListener("keydown",e=>{
  if(["INPUT","SELECT","TEXTAREA","BUTTON"].includes(e.target?.tagName)||e.ctrlKey||e.altKey||e.metaKey)return;
  if(e.key===" "){e.preventDefault();togglePlay()}
  if(e.key==="ArrowLeft"){pause();cursor=Math.max(0,cursor-1);render()}
  if(e.key==="ArrowRight"){pause();cursor=Math.min(A.year,cursor+1);render()}
 });
}
buildSectors();bind();reset();
})();