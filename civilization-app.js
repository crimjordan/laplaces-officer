/* GENESIS CIVILIZATION II — browser cockpit. Fully synthetic. */
(function(){"use strict";
const E=window.GenesisCivilization,V=window.SovereignView,R=window.CivilizationReport,X=window.CivilizationExperiments;
if(!E||!V||!R||!X)throw Error("Missing civilization component");
const $=id=>document.getElementById(id),f=n=>Math.round(Number(n)||0).toLocaleString("en-US"),
 compact=n=>Number(n||0).toLocaleString("en-US",{notation:"compact",maximumFractionDigits:2}),
 d=(n,k=2)=>Number(n||0).toLocaleString("en-US",{minimumFractionDigits:k,maximumFractionDigits:k}),
 p=n=>Number.isFinite(n)?d(n*100,1)+"%":"—",sign=n=>(n>0?"+":"")+d(n,2);
const metricLabels=Object.fromEntries(E.metricNames);
const priorities=["education","health","housing","jobs","policing","climate"];
const knobs=[
 ["taxRate","TAX RATE (% OF GDP)",0,50,1,"%"],
 ["targetSpending","TARGET SPENDING (% GDP)",3,55,1,"%"],
 ["maxDebtGDP","DEBT CEILING (% GDP)",0,200,5,"%"],
 ["programScale","INTERVENTION DELIVERY SCALE",0,100,5,"%"],
 ["implementation","STATE IMPLEMENTATION QUALITY",0,100,5,"%"],
 ["immigration","EXTERNAL MIGRATION PROPENSITY",0,100,5,"%"],
 ["fertility","FERTILITY ASSUMPTION SCALER",10,150,5,"%"],
 ["surveillance","SURVEILLANCE & RECORDING",0,100,5,"%"],
 ["patrolDeterrence","HYPOTHETICAL PATROL DETERRENCE",0,100,5,"%"],
 ["redistribution","REGIONAL REDISTRIBUTION",0,100,5,"%"]
];
const shocks={recession:10,flood:8,epidemic:6,migration:10,institutional:8,automation:10};
const COLORS={A:"#74f8d9",B:"#ffcb91"};
let geo,A,B,viewer=null,viewerGeneration=0,selected="A",province=0,cell=null,
 layer="zoning",offense=0,cursor=0,timer=null,busy=false,cancelRequested=false,
 worker=null,replicateResult=null,replicateRunning=false,logs=[],matrixMode="zone";
const world=name=>name==="B"?B:A;
const node=(parent,tag,content,cls)=>{const e=document.createElement(tag);if(content!=null)e.textContent=String(content);if(cls)e.className=cls;parent.append(e);return e};
const selectOptions=(id,items)=>{
 const el=$(id);el.replaceChildren();for(const [value,label]of items){const o=document.createElement("option");o.value=String(value);o.textContent=label;el.append(o)}
};
function log(msg){
 logs.unshift({year:2027+cursor,msg});logs=logs.slice(0,50);
 const root=$("eventLog");root.replaceChildren();
 for(const item of logs.slice(0,15)){
  const el=node(root,"p"),time=node(el,"time",String(item.year));el.append(document.createTextNode(item.msg));
 }
}
function buildInputs(){
 for(const side of ["A","B"]){
  const root=$("policy"+side),items=[...knobs,...priorities.map(key=>["priority_"+key,"SPEND: "+key.toUpperCase(),0,100,5," UNITS"])];
  for(const [key,title,min,max,step,suffix]of items){
   const wrapper=node(root,"div",null,"civilInput");
   const label=node(wrapper,"label");label.setAttribute("for",key+side);
   label.append(document.createTextNode(title+" "));
   const out=node(label,"output","");out.id=key+side+"Out";
   const input=node(wrapper,"input");input.id=key+side;input.type="range";
   input.min=String(min);input.max=String(max);input.step=String(step);input.value="50";
   input.addEventListener("input",readInputs);
   input.addEventListener("change",readInputs);
  }
 }
}
function setInputs(){
 for(const side of ["A","B"]){
  const c=world(side).config;
  $("national"+side).value=c.national;
  for(const [key]of knobs)$(key+side).value=c[key];
  for(const key of priorities)$("priority_"+key+side).value=c.priorities[key];
 }
 displayInputLabels();
}
function displayInputLabels(){
 for(const side of ["A","B"]){
  for(const [key,,,,suffix]of knobs)$(key+side+"Out").textContent=$(key+side).value+suffix;
  for(const key of priorities)$("priority_"+key+side+"Out").textContent=$("priority_"+key+side).value+"";
 }
 if(A&&B){
  const a=E.PROGRAMS[A.config.national],b=E.PROGRAMS[B.config.national];
  $("policyExplanation").textContent="A / "+a.name+": "+a.limitation+" | B / "+b.name+": "+b.limitation+
   " · The tax and borrowing sliders define available resources; the priorities distribute limited appropriations.";
 }
}
function readInputs(){
 if(!A||!B)return;
 for(const side of ["A","B"]){
  const c=world(side).config;c.national=$("national"+side).value;
  for(const [key]of knobs)c[key]=+$(key+side).value;
  for(const key of priorities)c.priorities[key]=+$("priority_"+key+side).value;
 }
 displayInputLabels();
 if(cursor<A.year)$("simProgress").textContent="Older era selected; advancing will fork history with the CURRENT policy controls.";
}
function initSelects(){
 selectOptions("provinceSelect",geo.provinces.map(x=>[x.id,x.code+" · "+x.name]));
 selectOptions("shockScope",[[-1,"ENTIRE NATION"],...geo.provinces.map(x=>[x.id,x.name])]);
 selectOptions("nationalA",Object.entries(E.PROGRAMS).map(([k,v])=>[k,v.country+" · "+v.name]));
 selectOptions("nationalB",Object.entries(E.PROGRAMS).map(([k,v])=>[k,v.country+" · "+v.name]));
 selectOptions("localPolicy",Object.entries(E.PROGRAMS).filter(([k])=>k!=="none").map(([k,v])=>[k,v.country+" · "+v.name]));
 selectOptions("offense",E.OFFENSES.map((x,i)=>[i,x.label]));
 selectOptions("chartMetric",E.metricNames);
 $("chartMetric").value="underlying";
 $("provinceSelect").value=String(province);
 const legend=$("zoneLegend");legend.replaceChildren();
 for(const [i,z]of E.ZONES.entries()){
  const row=node(legend,"div",null,"zoneItem"),dot=node(row,"span");
  dot.style.background="#"+z.color.toString(16).padStart(6,"0");node(row,"span",z.label);
  node(row,"b",f(geo.cells.filter(x=>x.zone===i).length));
 }
 const evidence=$("evidenceCards");evidence.replaceChildren();
 const entries=[
  {country:"GLOBAL DEMOGRAPHY",name:"Cohort-component identity",tag:"UN / ONS method",url:"https://www.un.org/development/desa/pd/world-population-prospects-2024",
   desc:"Aging, births, deaths, and external migration enter the population accounting identity. Every actual rate is invented."},
  {country:"CHICAGO / USA",name:"Summer jobs and violent arrests",tag:"RCT / narrow estimate",url:"https://pubmed.ncbi.nlm.nih.gov/25477459/",
   desc:"A selected-youth randomized study found 43% fewer violent arrests. The model limits this multiplier to youth-program offers, not all crime."},
  {country:"MASSACHUSETTS / USA",name:"Medication and overdose mortality",tag:"Observational cohort / association",url:"https://pmc.ncbi.nlm.nih.gov/articles/PMC6387681/",
   desc:"Methadone receipt among prior overdose survivors was associated with lower overdose mortality (HR 0.41). Treatment take-up and baseline mortality are synthetic."},
  {country:"CORRECTIONAL EDUCATION",name:"Education and recidivism",tag:"Meta-analysis / contextual",url:"https://www.rand.org/pubs/research_reports/RR266.html",
   desc:"Reduced recidivism odds in RAND's meta-analysis inform a narrow synthetic reentry pathway. The national reach is fictional."},
  {country:"FINLAND, PORTUGAL, SCOTLAND, NORWAY",name:"International policy exchange",tag:"Inspiration / not calibrated",url:"civilization-model-card.html",
   desc:"These are scenario frameworks for housing, health-first diversion, violence reduction and reentry; no cross-country effect is automatically transferred."}
 ];
 for(const x of entries){
  const card=node(evidence,"article",null,"evidenceCard");node(card,"span",x.tag,"sourceClass");
  node(card,"h3",x.country+" · "+x.name);node(card,"p",x.desc);
  const link=node(card,"a","REVIEW SOURCE ↗");link.href=x.url;link.target="_blank";link.rel="noopener noreferrer";
 }
}
function pause(){
 if(timer!==null){clearInterval(timer);timer=null}
 cancelRequested=true;$("play").textContent="▶ PLAY";
}
function reset(){
 pause();if(busy)return;
 viewer?.dispose();viewer=null;viewerGeneration++;
 const scale=$("scale").value,seed=Math.max(1,Math.floor(+$("seed").value||303030));
 geo=E.terrain(seed,scale);
 A=E.createWorld(geo,{national:"none",taxRate:23,targetSpending:25,
  priorities:{education:23,health:23,housing:17,jobs:13,policing:17,climate:7}},seed);
 B=E.createWorld(geo,{national:"integrated",taxRate:23,targetSpending:25,
  priorities:{education:23,health:28,housing:27,jobs:14,policing:5,climate:3}},seed);
 selected="A";cursor=0;cell=null;logs=[];
 province=geo.provinces.reduce((best,z,i)=>z.population>geo.provinces[best].population?i:best,0);
 initSelects();setInputs();
 $("scale").value=scale;$("seed").value=String(seed);
 $("worldSize").textContent=f(geo.size)+" cells / "+geo.provinces.length+" uniquely named provinces";
 log("Generated a "+scale+" with "+geo.size+" cells, four age cohorts and two simulated treasuries.");
 render();
 const version=viewerGeneration;
 V.create($("worldViewport"),geo,onMapSelect,message=>{
  if(version!==viewerGeneration)return;
  $("renderStatus").textContent=message;
  $("mapMode").textContent=message.startsWith("WEBGL")?"WEBGL 3D":"ISOMETRIC FALLBACK";
 }).then(v=>{if(version!==viewerGeneration){v.dispose();return}viewer=v;renderScene()}).catch(e=>{
  if(version===viewerGeneration)$("renderStatus").textContent="Visual renderer unavailable: "+e.message;console.error(e);
 });
}
function onMapSelect(c){
 cell=c;province=c.province;$("provinceSelect").value=String(province);
 renderProvince();renderScene();log("Inspected "+E.ZONES[c.zone].label+" parcel "+c.id+" in "+geo.provinces[province].name+".");
}
function setProvince(value){
 province=Math.max(0,Math.min(geo.provinces.length-1,Number(value)||0));cell=null;
 $("provinceSelect").value=String(province);renderProvince();renderScene();
}
function chooseWorld(value){
 selected=value;
 $("showA").classList.toggle("active",value==="A");
 $("showB").classList.toggle("active",value==="B");render();
}
function chooseLayer(value){layer=value;$("layer").value=value;renderScene()}
function branch(){
 if(busy)return;
 pause();if(cursor>=A.year){log("Already at latest simulated year.");return}
 E.seek(A,cursor);E.seek(B,cursor);
 log("Timeline branched at "+(2027+cursor)+" with current government policy settings.");
 render();
}
async function advance(count=1){
 if(busy)return;busy=true;cancelRequested=false;
 try{
  if(cursor<A.year){E.seek(A,cursor);E.seek(B,cursor);log("Forked both histories at "+(2027+cursor)+".")}
  readInputs();
  const limit=Math.max(0,Math.min(count,geo.maxYears-A.year));
  for(let k=0;k<limit;k++){
   if(cancelRequested)break;
   E.step(A);E.step(B);cursor=A.year;
   $("simProgress").textContent="Generated "+(k+1)+"/"+limit+" years · "+
    (2027+cursor)+" · demographic accounting and fiscal constraints verified";
   // Yield the UI after each simulated year so cancellation stays responsive.
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  if(cursor>0&&cursor%10===0)log("Year "+(2027+cursor)+
   ": government A debt/GDP "+p(A.history[cursor-1].debtGDP)+
   " versus B "+p(B.history[cursor-1].debtGDP)+".");
  if(cursor>=geo.maxYears){pause();log("Reached the maximum horizon of "+geo.maxYears+" simulated years.")}
  render();
 }catch(error){
  pause();console.error(error);$("simProgress").textContent="MODEL ERROR: "+error.message;
 }finally{busy=false}
}
function togglePlay(){
 if(timer!==null){pause();return}
 cancelRequested=false;$("play").textContent="Ⅱ PAUSE";
 timer=setInterval(()=>advance(1),Math.max(100,+$("speed").value||850));
}
function scheduleShock(type){
 if(busy)return;if(cursor<A.year)branch();
 const duration=shocks[type];if(!duration)return;
 const scope=Number($("shockScope").value),target=$("shockWorld").value;
 const event={type,from:cursor+1,duration,strength:1,province:scope};
 if(target==="both"||target==="A")A.shocks.push({...event});
 if(target==="both"||target==="B")B.shocks.push({...event});
 log(type.toUpperCase()+" scheduled for "+duration+" years, starting in "+
  (2028+cursor)+", "+(scope<0?"nationally":geo.provinces[scope].name)+".");
}
function rollout(target,remove=false){
 if(busy)return;if(cursor<A.year)branch();
 const id=province,policy=$("localPolicy").value;
 for(const name of (target==="both"?["A","B"]:[target])){
  if(remove)delete world(name).config.provincePolicies[id];
  else world(name).config.provincePolicies[id]=policy;
 }
 $("rolloutStatus").textContent=(remove?"Removed overrides":"Introduced "+E.PROGRAMS[policy].name)+
  " in "+geo.provinces[id].name+" / "+target+".";
 log($("rolloutStatus").textContent);renderRollout();
}
function renderRollout(){
 const root=$("rolloutList");root.replaceChildren();
 for(const name of ["A","B"])for(const [idx,program]of Object.entries(world(name).config.provincePolicies)){
  const place=geo.provinces[+idx];if(!place)continue;
  const badge=node(root,"div",null,"rolloutBadge");node(badge,"strong","WORLD "+name+" · "+place.code);
  node(badge,"span",place.name+" · "+E.PROGRAMS[program]?.name);
 }
 if(!root.children.length)node(root,"p","No province-specific programs. National policy applies.","fine");
}
function metric(w,k){
 if(cursor<1)return 0;
 return w.history[cursor-1][k]??0;
}
function nationalStats(){
 const root=$("headlineStats");root.replaceChildren();
 const list=[
  ["POPULATION",cursor?compact(metric(A,"population")):compact(geo.initialPopulation),
   cursor?"B "+compact(metric(B,"population")):"INITIAL 2027 COHORT"],
  ["REAL GDP",cursor?"$"+d(metric(A,"gdp"),1)+"B":"—",
   cursor?"B $"+d(metric(B,"gdp"),1)+"B":"2027 $ EQUIVALENTS"],
  ["DEBT / GDP",cursor?p(metric(A,"debtGDP")):"—",
   cursor?"B "+p(metric(B,"debtGDP")):"FISCAL CONSTRAINT"],
  ["HOUSING NEED",cursor?compact(metric(A,"unhoused")):"—",
   cursor?"B "+compact(metric(B,"unhoused")):"HOUSEHOLD CAPACITY"],
  ["UNDERLYING CRIME",cursor?compact(metric(A,"underlying")):"—",
   cursor?"B "+compact(metric(B,"underlying")):"NOT POLICE RECORDINGS"],
  ["OLDER ADULTS",cursor?compact(metric(A,"over65")):"—",
   cursor?"B "+compact(metric(B,"over65")):"AGE 65+"],
  ["DELIVERY LOSSES",cursor?"$"+d(metric(A,"wastedBudget"),2)+"B":"—",
   cursor?"B $"+d(metric(B,"wastedBudget"),2)+"B":"MODEL IMPLEMENTATION"]
 ];
 for(const [title,value,note]of list){
  const box=node(root,"div");node(box,"small",title);node(box,"strong",value);node(box,"em",note);
 }
}
function tile(parent,name,value,note){
 const el=node(parent,"div");node(el,"small",name);node(el,"strong",value);node(el,"em",note);
}
function fiscalTiles(){
 const root=$("fiscalTiles");root.replaceChildren();
 if(!cursor){for(const name of ["PUBLIC REVENUE","SPENDING","DEBT","DELIVERY","FINANCE"])tile(root,name,"—","Run at least one year");return}
 for(const [name,key,kind]of [["TAX REVENUE","taxRevenue","money"],["APPROVED SPENDING","spending","money"],
  ["GOVERNMENT DEBT","debt","money"],["ACTUALLY DELIVERED","effectiveBudget","money"],["DEBT CEILING","debtGDP","percent"]]){
  const a=metric(A,key),b=metric(B,key),format=x=>kind==="money"?"$"+d(x,2)+"B":p(x);
  tile(root,name,format(a),"B: "+format(b));
 }
 const bars=$("spendingBars");bars.replaceChildren();
 for(const name of ["A","B"]){
  const container=node(bars,"div",null,"spendWorld "+name.toLowerCase());
  node(container,"strong","WORLD "+name+" · SECTOR ALLOCATIONS");
  const w=world(name),latest=w.history[cursor-1];
  for(const key of priorities){
   const value=latest.sectorSpending[key],ratio=latest.budgetShares[key]*100;
   const row=node(container,"div",null,"spendRow");node(row,"span",key.toUpperCase());
   const track=node(row,"div",null,"spendTrack"),bar=node(track,"i");bar.style.width=Math.min(100,ratio*2)+"%";
   node(row,"small","$"+d(value,1)+"B");
  }
 }
}
function ageAndFlows(){
 const pyramid=$("agePyramid"),flow=$("demographicFlow");pyramid.replaceChildren();flow.replaceChildren();
 const sa=E.snapshot(A,cursor).arrays,sb=E.snapshot(B,cursor).arrays;
 const defs=[["0–17 YEARS","children"],["18–34 YEARS","young"],["35–64 YEARS","middle"],["65+ YEARS","elderly"]],
  totals=defs.map(([name,key])=>[name,sa[key].reduce((s,v)=>s+v,0),sb[key].reduce((s,v)=>s+v,0)]),
  denom=Math.max(1,...totals.flatMap(x=>x.slice(1)));
 for(const [name,va,vb]of totals){
  const row=node(pyramid,"div",null,"cohort");node(row,"span",name);
  const bars=node(row,"div",null,"cohortBars");
  for(const [value,cl]of [[va,"a"],[vb,"b"]]){
   const track=node(bars,"div",null,"cohortTrack "+cl),bar=node(track,"i");
   bar.style.width=(value/denom*100).toFixed(1)+"%";
  }
  node(row,"em",compact(va)+" / "+compact(vb));
 }
 const flows=cursor?[
  ["BIRTHS",f(metric(A,"births")),"B "+f(metric(B,"births"))],
  ["DEATHS",f(metric(A,"deaths")),"B "+f(metric(B,"deaths"))],
  ["EXTERNAL MIGRATION",f(metric(A,"netExternalMigration")),"B "+f(metric(B,"netExternalMigration"))],
  ["ANNUAL POP. CHANGE",f(metric(A,"population")-(A.history[cursor-2]?.population??geo.initialPopulation)),
   "B "+f(metric(B,"population")-(B.history[cursor-2]?.population??geo.initialPopulation))]
 ]:[["BIRTHS","—","Not simulated yet"],["DEATHS","—","Not simulated yet"],
  ["NET MIGRATION","—","Not simulated yet"],["CENSUS BALANCE","—","Not simulated yet"]];
 for(const [label,value,note]of flows){
  const box=node(flow,"div",null,"flowBlock");node(box,"span",label);node(box,"strong",value);node(box,"small",note);
 }
}
function twoLine(canvasId,key){
 const canvas=$(canvasId),ctx=canvas.getContext("2d");if(!ctx)return;
 const W=canvas.width,H=canvas.height,left=84,right=W-32,top=31,bottom=H-39;
 ctx.fillStyle="#091b29";ctx.fillRect(0,0,W,H);
 const a=A.history.slice(0,cursor).map(r=>key==="offense"?r.offenses[offense]:Number(r[key])||0),
       b=B.history.slice(0,cursor).map(r=>key==="offense"?r.offenses[offense]:Number(r[key])||0);
 const min=Math.min(0,...a,...b),max=Math.max(1,...a,...b),range=max-min;
 const x=i=>left+i/Math.max(1,cursor-1)*(right-left),y=v=>bottom-(v-min)/range*(bottom-top);
 for(let i=0;i<=4;i++){
  const val=min+range*i/4,yy=y(val);
  ctx.strokeStyle="#2b4a57";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(right,yy);ctx.stroke();
  ctx.textAlign="right";ctx.font="11px ui-monospace,monospace";ctx.fillStyle="#a9c7c7";
  ctx.fillText(Math.abs(val)<10?d(val,2):compact(val),left-9,yy+4);
 }
 for(const [j,data]of [a,b].entries()){
  ctx.strokeStyle=j?COLORS.B:COLORS.A;ctx.lineWidth=3;ctx.beginPath();
  for(let i=0;i<data.length;i++){if(!i)ctx.moveTo(x(i),y(data[i]));else ctx.lineTo(x(i),y(data[i]))}
  ctx.stroke();
 }
 ctx.fillStyle="#aecbca";ctx.textAlign="left";ctx.font="11px ui-monospace,monospace";
 ctx.fillText("2028",left,bottom+22);ctx.textAlign="right";
 ctx.fillText(String(2027+Math.max(1,cursor)),right,bottom+22);
}
function renderHistory(){
 twoLine("historyChart",$("chartMetric").value);twoLine("fiscalChart",$("fiscalMetric").value);
 if(!cursor){$("chartSummary").textContent="Advance at least one year to generate historical trajectories.";return}
 const k=$("chartMetric").value,l=metricLabels[k]||k;
 $("chartSummary").textContent=l+": World A "+compact(metric(A,k))+" versus B "+
  compact(metric(B,k))+" in "+(2027+cursor)+" (synthetic final-year outcomes).";
}
function capacity(){
 const stats=$("housingStats"),bars=$("capacityBars");stats.replaceChildren();bars.replaceChildren();
 const final=cursor?A.history[cursor-1]:null,other=cursor?B.history[cursor-1]:null;
 for(const [name,key]of [["HOUSING UNITS","housingStock"],["HOUSEHOLDS DEMANDING","housingDemand"],
  ["ANNUAL NEW UNITS","housingBuild"],["UNMET HOUSING NEED","unhoused"]]){
  tile(stats,name,final?compact(final[key]):"—",other?"B "+compact(other[key]):"No annual result");
 }
 if(!cursor)return;
 for(const [name,r]of [["A",final],["B",other]]){
  const root=node(bars,"div",null,"capacityBox "+name.toLowerCase());
  node(root,"h3","WORLD "+name+" · REACHED / UNMET CAPACITY");
  for(const [label,served,demand]of [
   ["HEALTH",r.careServed,r.careServed+r.careUnmet],
   ["HOUSING",Math.min(r.housingStock*2.4,r.population),r.population],
   ["EDUCATION",r.schoolServed,r.under18*.72],
   ["GOVERNMENT DELIVERY",r.effectiveBudget,r.spending]
  ]){
   const line=node(root,"div",null,"capacityRow"),lab=node(line,"label",label+" · "+p(demand?Math.min(1,served/demand):0));
   const track=node(line,"div",null,"capacityTrack"),bar=node(track,"span");
   bar.style.width=(demand?Math.min(1,served/demand)*100:0)+"%";
  }
 }
}
function renderProvince(){
 const place=geo.provinces[province];$("provinceName").textContent=place.code+" · "+place.name;
 const data=E.provinceReport(world(selected),cursor,province),root=$("provinceStats");root.replaceChildren();
 for(const [title,value]of [
  ["POPULATION",data?compact(data.population):compact(place.population)],
  ["UNDERLYING OFFENSES",data?f(data.underlying):"—"],
  ["POLICE RECORDINGS",data?f(data.recorded):"—"],
  ["HOUSING NEED",data?f(data.unhoused):"—"],
  ["WORKING-AGE EMPLOYMENT",data?p(data.employment):"—"],
  ["ADMIN IMPLEMENTATION",data?p(data.adminQuality):"—"],
  ["INSTITUTIONAL TRUST",data?p(data.trust):"—"],
  ["NEW HOUSING",data?f(data.housingBuild):"—"]
 ]){
  const block=node(root,"div");node(block,"small",title);node(block,"strong",value);
 }
 $("cellInfo").textContent=cell?
  "PARCEL "+cell.id+" · "+E.ZONES[cell.zone].label+" · nearest city "+geo.cities[cell.city].name+
  " · transport "+(cell.transport?"connected":"local only")+" · all fictional.":
  place.cells+" generated parcels. Select a 3D cell to inspect land use and connectivity.";
}
function renderScene(){
 if(!geo)return;
 viewer?.update(world(selected),cursor,layer,offense,province);
 $("mapLayerName").textContent=layer==="offense"?E.OFFENSES[offense].label.toUpperCase():layer.toUpperCase();
 $("mapYear").textContent=(2027+cursor)+" · WORLD "+selected;
 $("mapPopulation").textContent="POP "+compact(cursor?metric(world(selected),"population"):geo.initialPopulation);
 $("mapProvince").textContent=geo.provinces[province].code;
 $("mapTitle").textContent=geo.mode.toUpperCase()+" / "+geo.cities.length+" CITIES / "+geo.provinces.length+" PROVINCES";
}
function regionalMatrix(){
 const target=$("regionalTable");target.replaceChildren();
 const table=node(target,"table"),thead=node(table,"thead"),tr=node(thead,"tr");
 const key=$("matrixMetric").value;
 for(const label of [matrixMode==="zone"?"LAND USE":"REGION CODE / NAME","WORLD A","WORLD B","B − A","N CELLS"])node(tr,"th",label);
 const body=node(table,"tbody");
 const entries=matrixMode==="zone"?
  E.ZONES.map((z,i)=>({id:i,label:z.label,valid:i>0,cellCount:geo.cells.filter(c=>c.zone===i).length,
   a:E.zoneReport(A,cursor,i),b:E.zoneReport(B,cursor,i)})):
  geo.provinces.map(p=>({id:p.id,label:p.code+" · "+p.name,valid:true,cellCount:p.cells,
   a:E.provinceReport(A,cursor,p.id),b:E.provinceReport(B,cursor,p.id)}));
 for(const item of entries.filter(x=>x.valid)){
  const ra=item.a,rb=item.b;
  const value=(r)=>{if(!r)return 0;
   if(key==="employment"&&matrixMode==="zone")return NaN;
   if(key==="trust")return r.trust;
   if(key==="employment")return r.employment;
   return r[key]??0};
  const aa=value(ra),bb=value(rb),format=x=>!Number.isFinite(x)?"—":
   ["employment","trust"].includes(key)?p(x):f(x);
  const row=node(body,"tr");
  for(const val of [item.label,format(aa),format(bb),
   Number.isFinite(aa)&&Number.isFinite(bb)?(["employment","trust"].includes(key)?
    d((bb-aa)*100,2)+" pp":f(bb-aa)):"—",f(item.cellCount)])node(row,"td",val);
 }
}
function render(){
 if(!geo)return;
 $("displayYear").textContent=String(2027+cursor);$("heroYear").textContent=String(2027+cursor);
 $("yearElapsed").textContent=cursor+" YEARS ELAPSED";
 $("historyCursor").textContent="VIEW "+(2027+cursor);
 $("latestYear").textContent="LATEST "+(2027+A.year);
 $("timeline").value=cursor;$("timeline").max=A.year;
 $("systemStatus").textContent=busy?"SIMULATING":"MODEL READY · SYNTHETIC";
 for(const id of ["exportReport","exportCSV","exportJSON"])$(id).disabled=cursor<1;
 $("showA").classList.toggle("active",selected==="A");$("showB").classList.toggle("active",selected==="B");
 nationalStats();fiscalTiles();ageAndFlows();renderHistory();capacity();renderProvince();
 renderScene();regionalMatrix();renderRollout();
}
function download(filename,text,contentType){
 const url=URL.createObjectURL(new Blob([text],{type:contentType})),a=document.createElement("a");
 a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1400);
 $("exportStatus").textContent="Exported "+filename+" · synthetic simulation output.";
}
function csv(){
 if(!cursor)return;
 const keys=E.metricNames.map(x=>x[0]).filter(k=>k!=="housingStock"||true);
 const all=[["model","world","year","calendar_year",...keys,...E.OFFENSES.map(t=>"underlying_"+t.id),
  ...E.OFFENSES.map(t=>"recorded_"+t.id)]];
 for(const [side,w]of [["A",A],["B",B]])for(const row of w.history.slice(0,cursor))
  all.push([E.VERSION,side,row.year,row.calendarYear,...keys.map(k=>row[k]??""),...row.offenses,...row.recordedOffenses]);
 download("genesis-civilization-annual-national.csv",all.map(row=>row.join(",")).join("\n"),"text/csv");
}
function json(){
 if(!cursor)return;
 const result={modelVersion:E.VERSION,modelType:"fictional / uncalibrated",seed:geo.seed,scale:geo.mode,
  exportedAt:new Date().toISOString(),cursor,
  provinces:geo.provinces.map(p=>({id:p.id,code:p.code,name:p.name,x:p.x,y:p.y})),
  cities:geo.cities,offenses:E.OFFENSES,
  assumptions:E.MIL,modelCard:"civilization-model-card.html",
  worlds:Object.fromEntries([["A",A],["B",B]].map(([name,w])=>[name,{
   currentConfig:w.config,shocks:w.shocks,history:w.history.slice(0,cursor)}]))};
 download("genesis-civilization-model-audit.json",JSON.stringify(result,null,2),"application/json");
}
function researchReport(){
 try{
  const result=R.open(geo,A,B,cursor);
  $("exportStatus").textContent=result.method==="tab"?
   "Research report opened. Choose Print / Save PDF in the new tab.":"Standalone HTML report downloaded for printing.";
  log("Prepared "+cursor+"-year demographic/fiscal research report.");
 }catch(e){$("exportStatus").textContent="Report error: "+e.message;console.error(e)}
}
function experimentalPlan(){
 readInputs();
 return X.plan({scale:$("scale").value,seed:geo.seed,years:+$("replicationYears").value,
  reps:+$("replicationCount").value,configA:A.config,configB:B.config,
  shocksA:A.shocks,shocksB:B.shocks});
}
function setLabBusy(v){
 replicateRunning=v;$("runNationalExperiment").disabled=v;$("cancelNationalExperiment").disabled=!v;
}
function finishLab(result){
 worker?.terminate();worker=null;replicateResult=result;setLabBusy(false);
 $("labTrackBar").style.width="100%";$("exportNationalExperiment").disabled=false;
 $("labStatus").textContent="Completed "+result.pairs.length+" seed-matched national simulations over "+
  result.study.years+" years. These are synthetic model contrasts, NOT real-world effect estimates.";
 showLab();
}
function showLab(){
 if(!replicateResult)return;
 const metric=$("labOutcome").value,s=replicateResult.effects[metric],root=$("labResults");root.replaceChildren();
 const warning=node(root,"div","All differences are World B minus A. The 5th–95th range is distribution of model seeds, not an empirical confidence interval.","labWarning");
 const table=node(root,"table"),heading=node(table,"thead"),tr=node(heading,"tr");
 for(const label of ["OUTCOME","REPLICATES","MEAN B − A","5TH PERCENTILE","95TH PERCENTILE","B HIGHER","B LOWER"])node(tr,"th",label);
 const body=node(table,"tbody"),row=node(body,"tr");
 for(const value of [X.LABELS[metric]||metric,s.n,d(s.mean,3),d(s.q05,3),d(s.q95,3),s.positive,s.negative])node(row,"td",value);
 const params=node(root,"p","Fresh histories start from the currently selected policy settings, with selected scheduled shocks applied from their recorded years. Earlier interactive changes in policy are not replayed.","fine");
}
function beginLab(){
 if(replicateRunning)return;
 const plan=experimentalPlan();replicateResult=null;
 $("exportNationalExperiment").disabled=true;$("labResults").replaceChildren();
 $("labTrackBar").style.width="0%";
 setLabBusy(true);
 $("labStatus").textContent="Preparing "+plan.reps+" seed-matched nations, "+plan.years+" years per replicate...";
 if(typeof Worker==="undefined"){
  setLabBusy(false);$("labStatus").textContent="This browser does not support Web Workers required for the national experiment. Run the normal two-world simulator instead.";
  return;
 }
 try{
  worker=new Worker("civilization-experiment-worker.js?v=2");
  worker.onmessage=e=>{
   const msg=e.data;if(msg.type==="progress"){
    $("labTrackBar").style.width=(100*msg.done/msg.total)+"%";
    $("labStatus").textContent="Completed "+msg.done+"/"+msg.total+" national replications; seed "+msg.seed+".";
   }else if(msg.type==="complete")finishLab(msg.result);
   else if(msg.type==="error"){
    $("labStatus").textContent="Experiment error: "+msg.message;
    worker?.terminate();worker=null;setLabBusy(false);
   }
  };
  worker.onerror=e=>{
   $("labStatus").textContent="Worker failed to run: "+(e.message||"unknown error");
   worker?.terminate();worker=null;setLabBusy(false);
  };
  worker.postMessage({action:"run",plan});
 }catch(e){$("labStatus").textContent="Unable to start worker: "+e.message;setLabBusy(false)}
}
function cancelLab(){
 if(worker){worker.terminate();worker=null}
 setLabBusy(false);$("labStatus").textContent="Replication cancelled; no partial result will be presented as complete.";
}
function bind(){
 $("generateWorld").addEventListener("click",reset);$("resetWorld").addEventListener("click",reset);
 $("play").addEventListener("click",togglePlay);$("pause").addEventListener("click",pause);
 for(const [id,years]of [["step",1],["decade",10],["quarter",25],["century",100]])
  $(id).addEventListener("click",()=>{pause();advance(years)});
 $("branch").addEventListener("click",branch);
 $("timeline").addEventListener("input",e=>{pause();if(busy)return;cursor=Math.max(0,Math.min(A.year,+e.target.value||0));render()});
 $("showA").addEventListener("click",()=>chooseWorld("A"));
 $("showB").addEventListener("click",()=>chooseWorld("B"));
 $("layer").addEventListener("change",e=>chooseLayer(e.target.value));
 $("offense").addEventListener("change",e=>{offense=+e.target.value||0;chooseLayer("offense")});
 $("provinceSelect").addEventListener("change",e=>setProvince(e.target.value));
 $("chartMetric").addEventListener("change",renderHistory);
 $("fiscalMetric").addEventListener("change",renderHistory);
 $("matrixMetric").addEventListener("change",regionalMatrix);
 $("zoneView").addEventListener("click",()=>{matrixMode="zone";$("zoneView").classList.add("selected");$("provinceView").classList.remove("selected");regionalMatrix()});
 $("provinceView").addEventListener("click",()=>{matrixMode="province";$("provinceView").classList.add("selected");$("zoneView").classList.remove("selected");regionalMatrix()});
 for(const name of ["A","B"])$("national"+name).addEventListener("change",readInputs);
 $("applyA").addEventListener("click",()=>rollout("A"));
 $("applyB").addEventListener("click",()=>rollout("B"));
 $("clearOverride").addEventListener("click",()=>rollout("both",true));
 for(const button of document.querySelectorAll("[data-shock]"))button.addEventListener("click",()=>scheduleShock(button.dataset.shock));
 for(const [id,mode]of [["camOrbit","orbit"],["camTop","top"],["camStreet","street"]])
  $(id).addEventListener("click",()=>viewer?.setCamera(mode));
 $("captureMap").addEventListener("click",()=>{
  try{const a=document.createElement("a");a.href=viewer.capture();a.download="civilization-map-"+(2027+cursor)+".png";
   document.body.append(a);a.click();a.remove()}
  catch(e){$("exportStatus").textContent="Map capture unavailable: "+e.message}
 });
 $("exportReport").addEventListener("click",researchReport);
 $("exportCSV").addEventListener("click",csv);
 $("exportJSON").addEventListener("click",json);
 $("runNationalExperiment").addEventListener("click",beginLab);
 $("cancelNationalExperiment").addEventListener("click",cancelLab);
 $("labOutcome").addEventListener("change",showLab);
 $("exportNationalExperiment").addEventListener("click",()=>replicateResult&&download(
  "civilization-national-matched-replicates.csv",X.csv(replicateResult),"text/csv"));
 $("historyChart").addEventListener("click",e=>{
  if(!A.year)return;const rect=e.currentTarget.getBoundingClientRect();
  cursor=Math.max(1,Math.min(A.year,Math.round(((e.clientX-rect.left)/rect.width*1150-84)/1034*(A.year-1))+1));
  pause();render();
 });
 document.addEventListener("keydown",e=>{
  if(["INPUT","SELECT","TEXTAREA","BUTTON"].includes(e.target?.tagName)||e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.key===" "){e.preventDefault();togglePlay()}
  if(e.key==="ArrowLeft"){pause();cursor=Math.max(0,cursor-1);render()}
  if(e.key==="ArrowRight"){pause();cursor=Math.min(A.year,cursor+1);render()}
 });
}
buildInputs();bind();reset();
})();