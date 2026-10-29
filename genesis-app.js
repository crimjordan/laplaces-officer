/* GENESIS — application controller. No user data is transmitted by the simulation. */
(function(){"use strict";
const E=window.GenesisEngine,EV=window.GenesisEvidence,View=window.Genesis3D,Report=window.GenesisReport,Diagnostics=window.GenesisDiagnostics;
if(!E||!EV||!View||!Report||!Diagnostics)throw Error("GENESIS requires engine, research diagnostics, evidence, renderer and reporter scripts.");
const $=id=>document.getElementById(id);
const MONTHS=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const date=m=>m?MONTHS[(m-1)%12]+" "+(2027+Math.floor((m-1)/12)):"JAN 2027";
const fmt=x=>Math.round(Number(x)||0).toLocaleString("en-US");
const number=(x,n=1)=>Number(x||0).toFixed(n);
const pct=x=>(x*100).toFixed(1)+"%";
const sum=a=>a.reduce((s,x)=>s+(x||0),0);
const mean=a=>a.length?sum(a)/a.length:0;
const SEED=382941;
let A=E.create(SEED,E.PRESETS.patrol),B=E.create(SEED,E.PRESETS.prevent);
let viewer=null,cursor=0,selectedWorld="A",selectedPerson=50,lifeWorld="A",layer="people",focus=-1;
let chartKey="totalCrime",timer=null,running=false,busy=false,shocks=[],logs=[],replications=null,repsRunning=false;
const cinema={weather:"night",lowPower:false,traffic:true,patrol:true,signals:true,stars:true,streams:true};
const duration={recession:24,festival:3,opioid:12,outage:6};
const shockText={recession:"Economic shock: hypothetical loss of opportunity and increased property exposure",festival:"Festival: short period of increased crowding",opioid:"Overdose pressure: synthetic health emergency shock",outage:"Observation outage: recorded data temporarily attenuated"};
const explanations={
 people:"Resident lights are invented identities. Different colors indicate model states, not real attributes or live movement data.",
 crime:"Underlying simulated criminal incidents. These cannot be fully observed in real administrative data.",
 recorded:"Incidents included in the synthetic recording process. Police-discovered drug activity responds to enforcement exposure.",
 patrol:"Monthly police resource allocation. Prediction can amplify previously recorded hotspots.",
 school:"Fictional school-access index; the effect of public investment is not empirically calibrated.",
 treatment:"Fictional clinic and treatment-access index. Overdose MORTALITY associations are distinct from overdose incidence.",
 trust:"Illustrative trust dynamics. These are not observed legitimacy survey scores.",
 development:"Building height changes with an invented urban-development process, not a measured neighborhood investment effect."
};
function world(letter){return letter==="A"?A:B}
function append(tag,parent,text,cls){const el=document.createElement(tag);if(text!=null)el.textContent=String(text);if(cls)el.className=cls;parent.append(el);return el}
function log(message){logs.unshift({month:A.month,message});logs=logs.slice(0,24);const root=$("eventLog");root.replaceChildren();for(const e of logs){const p=append("p",root),span=append("span",p,"MONTH "+e.month+" · ");p.append(document.createTextNode(e.message))}}
function readConfig(letter){
 const target=world(letter).config;
 for(const key of ["policy","prevention","budget","surveillance","patrolEffect","procedure"]){
   const id=key+letter;const el=$(id);target[key]=["policy","procedure"].includes(key)?el.value:+el.value;
 }
 for(const [key,input] of [["jobs","mixJobs"],["school","mixSchool"],["treatment","mixTreatment"],["housing","mixHousing"],["reentry","mixReentry"]])target[key]=+$(input).value;
 for(const [key,id] of [["employmentLink","mechanismEmployment"],["housingLink","mechanismHousing"],["educationLink","mechanismEducation"]])target[key]=+$(id).value;
 for(const key of ["prevention","budget","surveillance","patrolEffect"])$(key+letter+"Out").textContent=key==="budget"?"$"+target[key]+"M":target[key]+"%";
}
function putConfig(){
 for(const [letter,w]of [["A",A],["B",B]])for(const key of ["policy","prevention","budget","surveillance","patrolEffect","procedure"])$(key+letter).value=w.config[key];
 for(const [key,id]of [["jobs","mixJobs"],["school","mixSchool"],["treatment","mixTreatment"],["housing","mixHousing"],["reentry","mixReentry"]])$(id).value=A.config[key];
 for(const [key,id]of [["employmentLink","mechanismEmployment"],["housingLink","mechanismHousing"],["educationLink","mechanismEducation"]])$(id).value=A.config[key]??0;
 syncControls();
}
function syncControls(){
 readConfig("A");readConfig("B");
 for(const id of ["mixJobs","mixSchool","mixTreatment","mixHousing","mixReentry"])$(id+"Out").textContent=$(id).value;
 const active=[];
 for(const [id,label] of [["mechanismEmployment","Employment"],["mechanismHousing","Housing"],["mechanismEducation","Education"]]){
  $(id+"Out").textContent=$(id).value+"%";
  if(+$(id).value>0)active.push(label+" "+$(id).value+"%");
 }
 $("assumptionStatus").textContent=active.length?
   "HYPOTHETICAL LINKS ACTIVE: "+active.join(" · ")+". These are NOT effects measured in the cited studies.":
   "Optional individual-level crime links are all OFF (0%). Other pre-existing fictional assumptions remain.";
}
function pause(){if(timer!=null){clearInterval(timer);timer=null}running=false;$("play").textContent="▶ PLAY"}
function togglePlay(){if(running){pause();return}
 if(A.month>=E.HORIZON&&cursor>=E.HORIZON){log("Twenty-year horizon reached; rewind and branch to explore another future.");return}
 running=true;$("play").textContent="Ⅱ PAUSE";
 const interval=[0,1600,850,420,220,90][+$("speed").value]||850;
 timer=setInterval(()=>advance(1),interval);
}
function reset(configs=null){pause();busy=false;A=E.create(SEED,configs?.A||{...A.config});B=E.create(SEED,configs?.B||{...B.config});
 cursor=0;shocks=[];logs=[];replications=null;renderReplications();putConfig();log("Initialized two matched worlds: 1,152 synthetic residents, 144 districts, 12 outcomes.");render()}
function preset(key){
 const map={
 clash:[E.PRESETS.patrol,E.PRESETS.prevent],
 identical:[E.PRESETS.balanced,E.PRESETS.balanced],
 feedback:[{...E.PRESETS.patrol,surveillance:95,prevention:20},{...E.PRESETS.patrol,policy:"equal",surveillance:12,prevention:20}],
 youth:[{...E.PRESETS.patrol,prevention:15,jobs:65,school:15,treatment:8,housing:8,reentry:4},
        {...E.PRESETS.prevent,prevention:85,jobs:72,school:10,treatment:8,housing:6,reentry:4}],
 care:[{...E.PRESETS.patrol,prevention:10},{...E.PRESETS.prevent,prevention:90,jobs:10,school:5,treatment:60,housing:5,reentry:20}],
 equity:[{...E.PRESETS.equal,prevention:30},{...E.PRESETS.prevent,policy:"needs",prevention:72}]
 };
 const pair=map[key]||map.clash;
 reset({A:{...pair[0]},B:{...pair[1]}});
 log("Loaded "+({clash:"patrol-versus-prevention",identical:"matched-world negative control",feedback:"recorded-signal feedback",youth:"targeted summer-jobs",care:"treatment and correctional education",equity:"equal versus needs-based"}[key]||key)+" experiment.");
}
function branch(){
 if(cursor>=A.month)return false;
 pause();
 const original=A.month;A=E.rerunTo(A,cursor);B=E.rerunTo(B,cursor);
 // Events already started during the preserved past continue. Events scheduled
 // for later branches are discarded rather than illicitly anticipating future interventions.
 shocks=shocks.filter(s=>s.start<cursor);
 // Preserve user's *current* policy inputs, not the old end-state values.
 syncControls();
 log("Branched at month "+cursor+" from previously simulated month "+original+". Matched historical states reconstructed.");
 render();return true;
}
async function advance(months=1){
 if(busy||repsRunning)return;
 busy=true;
 try{
  if(cursor<A.month)branch();
  syncControls();
  const n=Math.max(1,Math.floor(months));
  let done=0;
  for(let i=0;i<n&&A.month<E.HORIZON;i++){
   E.shift(A,{shocks});E.shift(B,{shocks});
   done++;cursor=A.month;
   // Yield control so a five-year fast-forward doesn't freeze the browser.
   if(n>4&&i%4===3){$("engineStatus").textContent="SIMULATING "+date(cursor)+" · "+Math.round(done/n*100)+"%";await new Promise(resolve=>setTimeout(resolve,0))}
  }
  if(done&&((cursor%12===0)||done>10))log("Reached "+date(cursor)+": "+fmt(A.history[cursor-1].totalCrime)+" underlying offenses (A) vs "+fmt(B.history[cursor-1].totalCrime)+" (B) this month.");
  if(cursor===E.HORIZON){pause();log("Reached the end of the 20-year simulated cohort.")}
  render();
 }catch(error){pause();console.error(error);log("Simulation paused: "+error.message)}finally{busy=false}
}
function timeTo(month){cursor=E.clamp(Math.floor(month),0,A.month);render()}
function chooseWorld(letter){
 selectedWorld=letter;$("viewA").classList.toggle("selected",letter==="A");$("viewB").classList.toggle("selected",letter==="B");
 $("viewA").setAttribute("aria-pressed",String(letter==="A"));$("viewB").setAttribute("aria-pressed",String(letter==="B"));
 renderScene();drawMini();renderDistrict();
}
function chooseLife(letter){lifeWorld=letter;$("personA").classList.toggle("chosen",letter==="A");$("personB").classList.toggle("chosen",letter==="B");renderPerson()}
function choosePerson(id){selectedPerson=E.clamp(Math.floor(Number(id)||0),0,A.population-1);$("personId").value=selectedPerson;
 const w=world(selectedWorld),frame=cursor?w.lifeFrames[cursor-1]:null;selectedDistrict=frame?frame.people.home[selectedPerson]:w.people[selectedPerson].initial;
 renderPerson();renderSocial();renderScene();$("selectionHint").textContent="FOLLOWING RESIDENT #"+selectedPerson+" · MATCHED IN BOTH WORLDS";}
function chooseDistrict(id){const w=world(selectedWorld),frame=cursor?w.lifeFrames[cursor-1]:null;selectedDistrict=E.clamp(Math.floor(id),0,E.D-1);
 const candidates=[];for(let i=0;i<w.people.length;i++){const home=frame?frame.people.home[i]:w.people[i].initial;if(home===selectedDistrict)candidates.push(i)}
 if(candidates.length)choosePerson(candidates[(Math.abs(selectedPerson)+cursor)%candidates.length]);
 renderDistrict();drawMini();}
let selectedDistrict=65;
function createCard(parent,label,value){const div=append("div",parent),small=append("span",div,label),strong=append("strong",div,value);return div}
function renderPerson(){
 const person=A.people[selectedPerson],w=world(lifeWorld),a=E.stateOf(A,selectedPerson,cursor),b=E.stateOf(B,selectedPerson,cursor),s=lifeWorld==="A"?a:b;
 $("personName").textContent=person.name;$("personSubtitle").textContent="Resident #"+selectedPerson+" · Synthetic household "+(person.household+1);
 $("avatar").textContent=person.name.split(" ").map(x=>x[0]).slice(0,2).join("");
 const grid=$("lifeStats");grid.replaceChildren();
 for(const [label,value]of [
 ["Age",s?.age??Math.floor(person.birthAgeMonths/12)],
 ["Employed",s?.employed?"YES":"NO"],
 ["Education index",s?.education??"—"],
 ["Trust",s?pct(s.trust):"—"],
 ["Victimizations",s?.victimizations??0],
 ["Police encounters",s?.encounters??0],
 ["Youth program",s?.program?"ACTIVE":"NOT ACTIVE"],
 ["Treatment",s?.treatment?"ACTIVE":"NOT ACTIVE"],
 ["Custody",s?.custody?"IN CUSTODY":"NO"],
 ["Alive",s?.alive?"YES":"NO"]
 ])createCard(grid,label,value);
 const root=$("lifeComparison");root.replaceChildren();
 for(const [letter,value]of [["A",a],["B",b]]){
  const div=append("div",root,null,letter==="B"?"b":"");
  append("strong",div,"WORLD "+letter+" · "+(value?.age??"—")+" YEARS");
  append("span",div,"District "+(value?value.home+1:"—")+" · "+(value?.employed?"Employed":"Not employed")+
   " · "+(value?value.encounters:0)+" police contacts · "+(value?value.victimizations:0)+" modeled victimization events");
 }
 const events=E.historyOf(w,selectedPerson,cursor).slice(-12).reverse(),list=$("lifeEvents");list.replaceChildren();
 if(!events.length)append("div",list,"No named events yet. Advance years or select another synthetic resident.");
 for(const e of events){const div=append("div",list),t=append("span",div,date(e.month)+" · ");div.append(document.createTextNode(e.label))}
}
function renderSocial(){
 const can=$("social"),ctx=can.getContext("2d");if(!ctx)return;const w=can.width,h=can.height;
 ctx.fillStyle="#081b2a";ctx.fillRect(0,0,w,h);
 const target=A.people[selectedPerson],ids=target.friendIds.slice(0,6),points=[{id:selectedPerson,x:w/2,y:h/2},...ids.map((id,i)=>({id,x:w/2+Math.cos(i/ids.length*Math.PI*2)*145,y:h/2+Math.sin(i/ids.length*Math.PI*2)*84}))];
 ctx.strokeStyle="#4d7d8b";ctx.lineWidth=2;for(const p of points.slice(1)){ctx.beginPath();ctx.moveTo(w/2,h/2);ctx.lineTo(p.x,p.y);ctx.stroke()}
 for(const p of points){ctx.beginPath();ctx.fillStyle=p.id===selectedPerson?"#65f3d0":"#82bde2";ctx.arc(p.x,p.y,p.id===selectedPerson?18:12,0,7);ctx.fill();ctx.fillStyle="#071b29";ctx.textAlign="center";ctx.font="bold 10px system-ui";ctx.fillText(String(p.id),p.x,p.y+4)}
 $("socialDetails").textContent="Showing synthetic links for resident "+selectedPerson+" and "+ids.length+" household/peer contacts. The modeled influence of peer employment on job access and education is hypothetical, not a finding about these fictional individuals.";
}
function frameDistricts(w){return cursor?w.lifeFrames[cursor-1]?.districts:w.initialCity}
function getMetricDistrict(d){
 return View.dimValue(d,layer,focus);
}
function drawMini(){
 const canvas=$("minimap"),ctx=canvas.getContext("2d");if(!ctx)return;const w=world(selectedWorld),data=frameDistricts(w);const values=data.map(d=>getMetricDistrict(d)),max=Math.max(1,...values);const color=parseInt((View.palettes[layer]||"#65f3d0").slice(1),16);
 ctx.clearRect(0,0,288,288);
 for(let i=0;i<E.D;i++){const x=i%12,y=Math.floor(i/12),v=values[i],norm=["crime","recorded"].includes(layer)?Math.pow(v/max,.7):layer==="people"?Math.min(v/20,1):E.clamp(v,0,1);
 ctx.fillStyle="rgb("+Math.round(14+((color>>16)&255)*norm*.8)+","+Math.round(27+((color>>8)&255)*norm*.75)+","+Math.round(43+(color&255)*norm*.7)+")";
 ctx.fillRect(x*24+1,y*24+1,22,22);
 if(i===selectedDistrict){ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.strokeRect(x*24+2,y*24+2,20,20)}
 }
}
function renderDistrict(){
 const w=world(selectedWorld),d=frameDistricts(w)[selectedDistrict],root=$("districtInfo");root.replaceChildren();
 $("districtTitle").textContent="District "+String.fromCharCode(65+Math.floor(selectedDistrict/12))+"-"+String(selectedDistrict%12+1).padStart(2,"0");
 const truth=d.true||d.underlying,observed=d.recorded||d.reported;
 const actual=focus>=0?truth[focus]:sum(truth.slice(0,11)),recorded=focus>=0?observed[focus]:sum(observed.slice(0,11));
 for(const [name,v]of [
 ["Residents",d.residents||0],["Underlying",actual],["Recorded",recorded],
 ["Patrol",d.patrol?"PRESENT":"NONE"],["School quality",Math.round(d.schoolQuality*100)+"%"],["Clinic access",Math.round(d.clinic*100)+"%"],
 ["Trust",pct(d.trust)],["Development",Math.round(d.development*100)+"%"]
 ])createCard(root,name,v);
}
function renderScene(){if(viewer)viewer.update(world(selectedWorld),cursor,selectedPerson,layer,focus)}
function syncVisualControls(){
 for(const button of document.querySelectorAll("[data-weather]")){
  const selected=button.dataset.weather===cinema.weather;
  button.classList.toggle("chosen",selected);
  button.setAttribute("aria-pressed",String(selected));
 }
 for(const button of document.querySelectorAll("[data-fx]")){
  const enabled=!!cinema[button.dataset.fx];
  button.classList.toggle("chosen",enabled);
  button.setAttribute("aria-pressed",String(enabled));
 }
 $("fxPerformance").classList.toggle("chosen",cinema.lowPower);
 $("fxPerformance").setAttribute("aria-pressed",String(cinema.lowPower));
 const fx=viewer?.effectsStatus?.();
 $("fxStatus").textContent=viewer?.type==="webgl"?
   "WEBGL ACTIVE · "+(fx?.patrolDrones??0)+" PATROL BEACONS":
   viewer?.type==="fallback"?"ISOMETRIC FALLBACK · EFFECTS ENABLED":"AWAITING RENDERER";
}
function restoreVisualSettings(){
 if(!viewer)return;
 viewer.setAtmosphere?.(cinema.weather);
 viewer.setQuality?.(cinema.lowPower);
 for(const key of ["traffic","patrol","signals","stars","streams"])viewer.setEffects?.(key,cinema[key]);
 syncVisualControls();
}
function renderDiagnostics(){
 const data=Diagnostics.render($("diagnosticSummary"),A,B,cursor);
 $("exportDiagnostics").disabled=cursor<1;
 if(cursor<1){$("diagnosticStatus").textContent="Advance at least one month to inspect eligibility, actual program reach, and expected versus realized outcomes.";return}
 $("diagnosticStatus").textContent="Through month "+cursor+", estimated within-month policy risk adjustments sum to "+
  number(data.referenceA-data.expectedA,2)+" conditional expected offenses in A and "+
  number(data.referenceB-data.expectedB,2)+" in B. These are NOT full causal effects; past interventions may already have changed the synthetic population.";
}
function exportDiagnostics(){
 if(cursor<1)return;
 download("genesis-v2-mechanism-diagnostics.csv",Diagnostics.toCSV(A,B,cursor),"text/csv");
}
function renderMetrics(){
 const a=cursor?A.history[cursor-1]:null,b=cursor?B.history[cursor-1]:null;
 $("dateMetric").textContent=cursor?date(cursor):"JAN 2027";
 $("crimeAMetric").textContent=a?fmt(a.totalCrime):"—";$("crimeBMetric").textContent=b?fmt(b.totalCrime):"—";
 $("recordAMetric").textContent=a?fmt(a.recordedCrime):"—";
 $("livingMetric").textContent=a?fmt(a.alive):fmt(A.population);$("trustMetric").textContent=a?pct(a.trust):"—";
 $("timeline").max=A.month;$("timeline").value=cursor;$("timelineLabel").textContent=(cursor?date(cursor):"JAN 2027")+" · MONTH "+cursor;
 $("latestLabel").textContent="LATEST: "+(A.month?date(A.month):"JAN 2027")+" · "+A.month+" MONTHS";
 for(const id of ["generateReport","exportCSV","exportJSON","exportDiagnostics"])$(id).disabled=cursor<1;
 $("layerExplainer").textContent=explanations[layer]+(["crime","recorded"].includes(layer)&&focus>=0?" Filtered to "+E.TYPES[focus].name+".":"");
}
function drawChart(){
 const canvas=$("chart"),ctx=canvas.getContext("2d");if(!ctx)return;const w=canvas.width,h=canvas.height;
 ctx.fillStyle="#091c2a";ctx.fillRect(0,0,w,h);
 const series=rows=>rows.map(x=>chartKey==="category"?(focus>=0?x.trueByType[focus]:x.totalCrime):x[chartKey]);
 const a=series(A.history),b=series(B.history),n=A.month;
 const max=chartKey==="trust"?1:Math.max(1,...a,...b)*1.12;
 const padding={l:65,t:29,r:24,b:43},W=w-padding.l-padding.r,H=h-padding.t-padding.b;
 const xx=i=>padding.l+(i/Math.max(1,n))*W,yy=v=>padding.t+H*(1-v/max);
 ctx.font="12px system-ui";ctx.strokeStyle="#294657";ctx.fillStyle="#a8c6d0";ctx.textAlign="right";ctx.lineWidth=1;
 for(let i=0;i<=4;i++){const v=i/4*max,y=yy(v);ctx.beginPath();ctx.moveTo(padding.l,y);ctx.lineTo(w-padding.r,y);ctx.stroke();ctx.fillText(chartKey==="trust"?Math.round(v*100)+"%":fmt(v),padding.l-10,y+4)}
 ctx.textAlign="center";for(let i=0;i<=4;i++)ctx.fillText(String(Math.round(n*i/4)),xx(n*i/4),h-17);
 function line(values,color){if(!values.length)return;ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();
  values.forEach((v,i)=>{const x=xx(i+1),y=yy(v);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.stroke()}
 line(a,"#65f3d0");line(b,"#ffc48d");
 if(cursor){ctx.strokeStyle="#e8fcf6";ctx.lineWidth=1;ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(xx(cursor),padding.t);ctx.lineTo(xx(cursor),h-padding.b);ctx.stroke();ctx.setLineDash([])}
}
function render(){renderMetrics();renderDiagnostics();renderScene();renderPerson();renderSocial();drawMini();renderDistrict();drawChart()}
function evidence(){
 const picker=$("crimeFocus");for(const [i,t]of E.TYPES.entries()){const opt=document.createElement("option");opt.value=String(i);opt.textContent=t.name+(t.health?" [HEALTH / NOT CRIME]":"");picker.append(opt)}
 const root=$("evidenceCards");root.replaceChildren();
 for(const e of EV){
  const article=append("article",root),pill=append("span",article,e.classification,"pill"),title=append("h3",article,e.title);
  append("p",article,e.finding);
  const details=append("details",article);append("summary",details,"RESEARCH DESIGN, EXACT USE & LIMITATIONS");
  append("p",details,"Design: "+e.design+". Population: "+e.population+". Outcome: "+e.outcome+".");
  append("p",details,"GENESIS use: "+e.modelUse);
  append("p",details,"Limitations: "+e.limitations);
  const link=append("a",article,"Read source ↗");link.href=e.url;link.target="_blank";link.rel="noopener noreferrer";
 }
}
function shock(type){
 if(!duration[type])return;
 if(cursor<A.month)branch();
 const record={type,start:A.month,duration:duration[type],magnitude:1};
 shocks.push(record);log(shockText[type]+" (applies to both worlds for "+duration[type]+" months).");
}
function download(filename,text,type){
 const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),link=document.createElement("a");
 link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1800);
 $("exportStatus").textContent="Exported "+filename+" (synthetic research data).";
}
function exportCSV(){
 if(cursor<1)return;
 const rows=[["month","world_A_underlying","world_B_underlying","world_A_recorded","world_B_recorded","violent_arrests_A","violent_arrests_B","overdose_emergencies_A","overdose_emergencies_B","overdose_deaths_A","overdose_deaths_B","employment_A","employment_B","trust_A","trust_B","policy_A","policy_B"]];
 for(let i=0;i<cursor;i++){const a=A.history[i],b=B.history[i];rows.push([i+1,a.totalCrime,b.totalCrime,a.recordedCrime,b.recordedCrime,a.violentArrests,b.violentArrests,a.overdoses,b.overdoses,a.overdoseDeaths,b.overdoseDeaths,a.employed,b.employed,a.trust.toFixed(5),b.trust.toFixed(5),a.policy,b.policy])}
 download("genesis-paired-synthetic-history.csv",rows.map(row=>row.join(",")).join("\n"),"text/csv");
}
function exportJSON(){
 if(cursor<1)return;
 const payload={title:"LAPLACE / GENESIS",synthetic:true,modelVersion:E.VERSION,seed:SEED,month:cursor,population:A.population,
  disclaimer:"No real people, city data or calibrated causal estimates. All baselines and most mechanisms hypothetical.",
  types:E.TYPES,sourceRegistry:EV,shocks,configurations:{A:A.config,B:B.config},
  history:{A:A.history.slice(0,cursor),B:B.history.slice(0,cursor)},
  selectedResident:{id:selectedPerson,initial:A.people[selectedPerson],life:{A:E.yearlyLife(A,selectedPerson,cursor),B:E.yearlyLife(B,selectedPerson,cursor)}},
  replications};
 download("genesis-synthetic-model-export.json",JSON.stringify(payload,null,2),"application/json");
}
function exportLife(){
 const id=selectedPerson,person=A.people[id],events={A:E.historyOf(A,id,cursor),B:E.historyOf(B,id,cursor)};
 const rows=[["world","month","age","home_district","employed","education_index","modeled_trust","arrests","police_contacts","victimizations","overdoses","treatment","alive"]];
 for(const [letter,w]of [["A",A],["B",B]])for(let m=1;m<=cursor;m++){
  const s=E.stateOf(w,id,m);
  rows.push([letter,m,s.age,s.home+1,s.employed?1:0,s.education,s.trust.toFixed(3),s.arrests,s.encounters,s.victimizations,s.overdoses,s.treatment?1:0,s.alive?1:0])
 }
 download("genesis-resident-"+id+"-synthetic-life.csv",rows.map(r=>r.join(",")).join("\n"),"text/csv");
}
function genReport(){
 if(cursor<1)return;
 pause();
 try{
  const out=Report.open({A,B,types:E.TYPES,evidence:EV,diagnostics:Diagnostics,selected:selectedPerson,months:cursor,shocks,replications});
  $("exportStatus").textContent=out.method==="tab"?"Report opened in a new tab. Use Print / Save PDF or Download HTML.":"Pop-up blocked: downloaded the standalone report HTML; open it to print or save PDF.";
  log("Generated evidence-conscious report for "+cursor+" simulated months.");
 }catch(error){console.error(error);$("exportStatus").textContent="Report generation failed: "+error.message}
}
function repResult(root,name,values,unit){
 const n=values.length,sorted=values.slice().sort((a,b)=>a-b),q=p=>sorted[Math.round((n-1)*p)],m=mean(values);
 const card=append("div",root,null,"repResult");
 append("h3",card,name);append("strong",card,(m>0?"+":"")+number(m,2)+" "+unit);
 append("p",card,"Paired model differences A−B across "+n+" seeds. Synthetic 5th–95th percentile: "+number(q(.05),2)+" to "+number(q(.95),2)+" "+unit+".");
 append("p",card,values.filter(v=>v<0).length+"/"+n+" pairs had a lower outcome count in World A. This is a within-model distribution, NOT an interval for real-world effects.");
}
function renderReplications(){
 const root=$("repResults");root.replaceChildren();
 if(!replications){$("exportReplications").disabled=true;$("repBar").style.width="0%";return}
 $("exportReplications").disabled=false;
 repResult(root,"Underlying criminal incidents",replications.map(r=>r.crimeA-r.crimeB),"events");
 repResult(root,"Violent-crime arrests",replications.map(r=>r.arrestsA-r.arrestsB),"arrests");
 repResult(root,"Overdose fatalities",replications.map(r=>r.deathsA-r.deathsB),"deaths");
 repResult(root,"Mean modeled trust",replications.map(r=>r.trustA-r.trustB),"index units");
 repResult(root,"Conditional expected crime",replications.map(r=>r.expectedCrimeA-r.expectedCrimeB),"events");
 repResult(root,"Expected overdose deaths",replications.map(r=>r.expectedDeathsA-r.expectedDeathsB),"deaths");
}
async function experiment(){
 if(repsRunning||busy)return;
 const amount=+ $("repCount").value,months=+$("repYears").value*12;
 syncControls();const cfgA={...A.config},cfgB={...B.config},inputs=shocks.map(x=>({...x}));
 const results=[];repsRunning=true;$("runReplications").disabled=true;
 $("repStatus").textContent="Running "+amount+" paired synthetic experiments · "+months+" months per pair on 384 residents.";
 $("repBar").style.width="0%";
 try{
  for(let seedIdx=0;seedIdx<amount;seedIdx++){
   const seed=92711+seedIdx*7919,a=E.create(seed,cfgA,384,{track:false}),b=E.create(seed,cfgB,384,{track:false});
   for(let month=0;month<months;month++){E.shift(a,{shocks:inputs});E.shift(b,{shocks:inputs})}
   const metric=(w,k)=>sum(w.history.map(x=>x[k]));
   results.push({seed,years:months/12,population:384,crimeA:metric(a,"totalCrime"),crimeB:metric(b,"totalCrime"),
    arrestsA:metric(a,"violentArrests"),arrestsB:metric(b,"violentArrests"),deathsA:metric(a,"overdoseDeaths"),deathsB:metric(b,"overdoseDeaths"),
    trustA:mean(a.history.map(x=>x.trust)),trustB:mean(b.history.map(x=>x.trust)),
    expectedCrimeA:metric(a,"expectedCrime"),expectedCrimeB:metric(b,"expectedCrime"),
    expectedDeathsA:metric(a,"expectedMortality"),expectedDeathsB:metric(b,"expectedMortality")});
   $("repBar").style.width=Math.round((seedIdx+1)/amount*100)+"%";
   $("repStatus").textContent="Completed "+(seedIdx+1)+" / "+amount+" paired replications.";
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  replications=results;renderReplications();
  $("repStatus").textContent="Experiment complete: "+amount+" matched pairs, "+(months/12)+" years each, 384 synthetic residents per world. These results describe MODEL variability, not empirical uncertainty.";
  log("Completed "+amount+" repeated paired city experiments.");
 }catch(error){console.error(error);$("repStatus").textContent="Experiment interrupted: "+error.message}
 finally{repsRunning=false;$("runReplications").disabled=false}
}
function exportReplications(){
 if(!replications)return;
 const keys=Object.keys(replications[0]);
 download("genesis-paired-replications.csv",[keys.join(","),...replications.map(r=>keys.map(k=>r[k]).join(","))].join("\n"),"text/csv");
}
function bind(){
 $("play").addEventListener("click",togglePlay);
 $("step").addEventListener("click",()=>{pause();advance(1)});
 $("year").addEventListener("click",()=>{pause();advance(12)});
 $("decade").addEventListener("click",()=>{pause();advance(60)});
 $("reset").addEventListener("click",()=>reset());
 $("branch").addEventListener("click",branch);
 $("speed").addEventListener("input",()=>{const names=["","½×","1×","2×","4×","10×"];$("speedValue").textContent=names[+$("speed").value];if(running){pause();togglePlay()}});
 $("timeline").addEventListener("input",e=>{pause();timeTo(+e.target.value)});
 for(const letter of ["A","B"])for(const key of ["policy","prevention","budget","surveillance","patrolEffect","procedure"]){
  $(key+letter).addEventListener("input",()=>{syncControls();render()});
 }
 for(const id of ["mixJobs","mixSchool","mixTreatment","mixHousing","mixReentry",
   "mechanismEmployment","mechanismHousing","mechanismEducation"])$(id).addEventListener("input",()=>{syncControls();render()});
 $("zeroMechanisms").addEventListener("click",()=>{for(const id of ["mechanismEmployment","mechanismHousing","mechanismEducation"])$(id).value=0;syncControls();render()});
 $("exploreMechanisms").addEventListener("click",()=>{for(const id of ["mechanismEmployment","mechanismHousing","mechanismEducation"])$(id).value=50;syncControls();render()});
 $("viewA").addEventListener("click",()=>chooseWorld("A"));$("viewB").addEventListener("click",()=>chooseWorld("B"));
 for(const button of document.querySelectorAll("[data-preset]"))button.addEventListener("click",()=>preset(button.dataset.preset));
 for(const button of document.querySelectorAll("[data-layer]"))button.addEventListener("click",()=>{
  layer=button.dataset.layer;document.querySelectorAll("[data-layer]").forEach(b=>b.classList.toggle("chosen",b===button));render()
 });
 $("crimeFocus").addEventListener("change",e=>{focus=+e.target.value;render()});
 for(const button of document.querySelectorAll("[data-chart]"))button.addEventListener("click",()=>{
  chartKey=button.dataset.chart;document.querySelectorAll("[data-chart]").forEach(b=>b.classList.toggle("chosen",b===button));drawChart()
 });
 for(const button of document.querySelectorAll("[data-shock]"))button.addEventListener("click",()=>shock(button.dataset.shock));
 $("personA").addEventListener("click",()=>chooseLife("A"));$("personB").addEventListener("click",()=>chooseLife("B"));
 $("randomPerson").addEventListener("click",()=>choosePerson(Math.floor(Math.random()*A.population)));
 $("lookupPerson").addEventListener("click",()=>choosePerson(+$("personId").value));
 $("personId").addEventListener("change",()=>choosePerson(+$("personId").value));
 $("minimap").addEventListener("click",e=>{
  const rect=e.currentTarget.getBoundingClientRect(),x=Math.floor((e.clientX-rect.left)/rect.width*12),y=Math.floor((e.clientY-rect.top)/rect.height*12);
  if(x>=0&&x<12&&y>=0&&y<12)chooseDistrict(y*12+x);
 });
 $("runReplications").addEventListener("click",experiment);
 $("exportReplications").addEventListener("click",exportReplications);
 $("generateReport").addEventListener("click",genReport);
 $("exportCSV").addEventListener("click",exportCSV);
 $("exportJSON").addEventListener("click",exportJSON);
 $("exportDiagnostics").addEventListener("click",exportDiagnostics);
 $("exportLife").addEventListener("click",exportLife);
 for(const button of document.querySelectorAll("[data-weather]"))button.addEventListener("click",()=>{
  cinema.weather=button.dataset.weather;
  viewer?.setAtmosphere?.(cinema.weather);
  syncVisualControls();
 });
 for(const button of document.querySelectorAll("[data-fx]"))button.addEventListener("click",()=>{
  const key=button.dataset.fx;cinema[key]=!cinema[key];
  viewer?.setEffects?.(key,cinema[key]);syncVisualControls();
 });
 $("fxPerformance").addEventListener("click",()=>{
  cinema.lowPower=!cinema.lowPower;
  viewer?.setQuality?.(cinema.lowPower);
  if(!cinema.lowPower)restoreVisualSettings();
  else syncVisualControls();
 });
 for(const [button,mode]of [["camOrbit","orbit"],["camTop","top"],["camStreet","street"]])$(button).addEventListener("click",()=>viewer?.setCamera(mode));
 $("autoOrbit").addEventListener("click",()=>$("autoOrbit").classList.toggle("chosen",!!viewer?.toggleOrbit()));
 $("photo").addEventListener("click",()=>{
  if(!viewer)return;
  try{const a=document.createElement("a");a.href=viewer.capture();a.download="genesis-synthetic-city.png";a.click()}catch(error){$("engineStatus").textContent="IMAGE CAPTURE UNAVAILABLE: "+error.message}
 });
 $("chart").addEventListener("click",e=>{
  if(!A.month)return;const rect=e.currentTarget.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*1100,month=Math.round((x-65)/(1100-65-24)*A.month);
  pause();timeTo(month)
 });
 document.addEventListener("keydown",e=>{
  const tag=e.target?.tagName;if(["INPUT","SELECT","TEXTAREA","BUTTON"].includes(tag)||e.ctrlKey||e.altKey||e.metaKey)return;
  if(e.key===" "){e.preventDefault();togglePlay()}else if(e.key==="ArrowLeft"){pause();timeTo(cursor-1)}else if(e.key==="ArrowRight"){pause();timeTo(cursor+1)}
 });
}
bind();evidence();putConfig();syncVisualControls();log("GENESIS created: two fictional cities with identical initial agents and documented model mechanisms.");render();
View.create($("scene3d"),{
 status:text=>$("engineStatus").textContent=text,
 selectPerson:choosePerson,
 selectDistrict:chooseDistrict
}).then(v=>{viewer=v;restoreVisualSettings();renderScene();syncVisualControls();log(v.type==="webgl"?"Restored cinematic 3D city online: traffic, patrol beacons, weather and event signals.":"Animated isometric fallback online; controls and person histories remain available.")}).catch(error=>{console.error(error);$("engineStatus").textContent="3D VIEW UNAVAILABLE; MODEL CONTROLS STILL AVAILABLE";log("Visual renderer failed: "+error.message)});
})();
