/* LAPLACE OMEGA | Interactive cockpit
   Important: every number is synthetic and coefficient values are illustrative. */
"use strict";
const M=window.LaplaceOmegaEngine,V=window.OmegaView3D;
if(!M||!V)throw Error("OMEGA requires omega-engine.js and omega-3d.js");
const $=id=>document.getElementById(id),fmt=n=>Number(n||0).toLocaleString("en-US",{maximumFractionDigits:0});
const compact=n=>Number(n||0).toLocaleString("en-US",{maximumFractionDigits:1});
const MONTHS=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const cfgA={...M.PRESETS.predictive},cfgB={...M.PRESETS.balanced};let A=M.createWorld(204921,cfgA),B=M.createWorld(204921,cfgB);
let viewer=null,selectedWorld="A",selectedDistrict=65,layer="truth",focus=-2,chartMetric="trueCrime",cursor=0,loop=null,shocks=[],events=[],running=false,busy=false;
const duration={recession:12,festival:3,outage:4,opioid:9,reform:8};
const tag={recession:"Economic pressure increased",festival:"City festival began",outage:"Observation network disrupted",opioid:"Overdose pressure increased",reform:"Procedural trust reform launched"};
const layerText={
 truth:"UNDERLYING ACTIVITY",recorded:"RECORDED POLICE SIGNAL",gap:"OBSERVATION GAP",
 patrol:"PATROL DEPLOYMENTS",trust:"HYPOTHETICAL TRUST",prevention:"PREVENTION REACH",predicted:"ALGORITHM BELIEF",delta:"A − B UNDERLYING DIFFERENCE"
};
const layerDescription={
 truth:"Underlying activity is directly visible only because this is a simulation. Real incident records do not contain the complete ground truth.",
 predicted:"The predictive risk score is an exponential moving average of recorded incidents. It is not a validated forecast of crime.",
 delta:"For the chosen category, positive values mean more simulated events in A than B; negative values mean more events in B than A. The difference is synthetic.",
 recorded:"The recorded signal is influenced by reports, enforcement, camera coverage, and trust. Police data are not interchangeable with all incidents.",
 gap:"How many generated incidents were not recorded? This is visible only within the fictional simulation.",
 patrol:"Highlight districts that receive patrol resources. A predictive algorithm can reinforce its own discovery pattern.",
 trust:"Stylized neighborhood trust trajectories are model assumptions, not direct measures of actual police legitimacy.",
 prevention:"A stylized measure of locally accumulated investments in treatment, education, housing, and violence interruption."
};
const worldOf=k=>k==="A"?A:B;
const monthLabel=(month)=>{const index=Math.max(0,month-1);return MONTHS[index%12]+" "+(2027+Math.floor(index/12))};
const monthLong=month=>month===0?"BEFORE FIRST STEP · JAN 2027":monthLabel(month)+" · MONTH "+month;
function addEvent(text){events.unshift({month:A.month,text});events=events.slice(0,28);const root=$("eventLog");root.replaceChildren();events.forEach(e=>{const p=document.createElement("p"),prefix=document.createElement("span");prefix.textContent="T+"+String(e.month).padStart(3,"0")+" · ";p.append(prefix,document.createTextNode(e.text));root.append(p)})}
function configurationsFromUI(){for(const letter of ["A","B"]){const c=letter==="A"?A.settings:B.settings;
 c.policy=$("policy"+letter).value;c.prevention=+$("prevention"+letter).value;c.budget=+$("budget"+letter).value;
 c.surveillance=+$("surveillance"+letter).value;c.tactics=$("tactics"+letter).value;
 $("prevention"+letter+"Out").textContent=c.prevention+"%";
 $("budget"+letter+"Out").textContent="$"+c.budget+"M";
 $("surveillance"+letter+"Out").textContent=c.surveillance+"%";
 }}
function settingsToUI(){for(const [letter,world] of [["A",A],["B",B]])for(const key of ["policy","prevention","budget","surveillance","tactics"])$(""+key+letter).value=world.settings[key];configurationsFromUI()}
function getMix(){return{treat:+$("mixTreat").value,educate:+$("mixEducate").value,house:+$("mixHouse").value,outreach:+$("mixOutreach").value}}
function readMix(){for(const id of ["mixTreat","mixEducate","mixHouse","mixOutreach"])$(id+"Out").textContent=$(id).value;const v=+$("spillover").value;$("spilloverOut").textContent=v<0?"Diffusion "+(-v)+"%":v>0?"Displacement "+v+"%":"No spatial effect"}
function startConfig(Aconfig,Bconfig){pause();A=M.createWorld(204921,Aconfig);B=M.createWorld(204921,Bconfig);cursor=0;shocks=[];events=[];settingsToUI();addEvent("Both synthetic worlds initialized with the same underlying city and random seed.");updateAll()}
function preset(key){let a,b;
 if(key==="bias"){a={...M.PRESETS.predictive,prevention:15,surveillance:95};b={...M.PRESETS.equal,prevention:15,surveillance:5}}
 else if(key==="equity"){a={...M.PRESETS.predictive,prevention:15};b={...M.PRESETS.needs,prevention:85}}
 else if(key==="random"){a={...M.PRESETS.random,prevention:22};b={...M.PRESETS.predictive,prevention:22,tactics:"procedural"}}
 else{a={...M.PRESETS.predictive};b={...M.PRESETS.balanced}}
 startConfig(a,b);addEvent("Loaded "+({bias:"feedback-bias comparison",equity:"geographic equity comparison",random:"randomization comparison",clash:"patrol-versus-prevention comparison"}[key]||key))}
function branch(){if(cursor>=A.month){addEvent("Already at the latest simulated month.");return}pause();M.restore(A,cursor);M.restore(B,cursor);shocks=shocks.filter(s=>s.start<cursor);addEvent("Time branch created at month "+cursor+". Future histories discarded, past interventions retained.");updateAll()}
function advance(n=1){if(busy)return;busy=true;try{if(cursor<A.month)branch();configurationsFromUI();let done=0;
 const opts={focus,shocks,mix:getMix(),spillover:+$("spillover").value};
 for(let i=0;i<n&&A.month<M.MAX_MONTHS;i++){M.stepWorld(A,opts);M.stepWorld(B,opts);done++}
 cursor=A.month;
 if(done>0&&((A.month%12===0)||n>=12))addEvent("Reached "+monthLabel(A.month)+": "+fmt(A.history.at(-1)?.trueCrime)+" underlying offenses in A and "+fmt(B.history.at(-1)?.trueCrime)+" in B.");
 if(A.month>=M.MAX_MONTHS){pause();addEvent("Twenty-year horizon complete. Replay or branch the timeline to continue exploring.")}updateAll();
 }catch(error){pause();console.error(error);addEvent("Simulation paused after an internal error: "+String(error.message))}finally{busy=false}}
function pause(){if(loop!==null){clearInterval(loop);loop=null}running=false;$("play").textContent="▶ RUN"}
function play(){if(running){pause();return}if(A.month===M.MAX_MONTHS&&cursor===A.month){cursor=0;branch()}if(cursor<A.month)branch();
 const interval=[0,1500,750,360,160,65][+$("speed").value]||750;
 running=true;$("play").textContent="Ⅱ PAUSE";loop=setInterval(()=>advance(1),interval)}
function reset(){startConfig({...A.settings},{...B.settings})}
function currentSnapshot(world){return M.shown(world,cursor)}
function worldDistricts(world){const districts=currentSnapshot(world)||world.cells;if(layer!=="delta"||cursor===0)return districts;const a=currentSnapshot(A),b=currentSnapshot(B);return districts.map((d,i)=>({...d,delta:valueByFocus(a[i].truth)-valueByFocus(b[i].truth)}))}
function currentMetrics(world){return cursor>0?world.history[Math.min(cursor,world.history.length)-1]:null}
function valueByFocus(values){if(!values)return 0;if(focus>=0)return values[focus]||0;if(focus===-2)return M.sum(values.slice(0,-1));return M.sum(values)}
function selectDistrict(id){selectedDistrict=id;updateScene();updateInspector();drawMini()}
function selectWorld(letter){selectedWorld=letter;$("showA").classList.toggle("selected",letter==="A");$("showB").classList.toggle("selected",letter==="B");$("showA").setAttribute("aria-pressed",String(letter==="A"));$("showB").setAttribute("aria-pressed",String(letter==="B"));updateScene();updateCrimeList();updateInspector();drawMini();updateInsights()}
function selectLayer(name){layer=name;document.querySelectorAll("[data-layer]").forEach(b=>b.classList.toggle("chosen",b.dataset.layer===name));$("layerLabel").textContent=layerText[name];$("layerExplain").textContent=layerDescription[name];updateScene();drawMini();updateInsights()}
function selectFocus(index){focus=index;$("focusAll").classList.toggle("chosen",index===-1);$("focusCrime").classList.toggle("chosen",index===-2);$("focusHarm").classList.toggle("chosen",index===11);updateCrimeList();updateScene();updateInspector();drawMini();updateInsights();
 $("sceneMessage").textContent=index>=0?M.TYPES[index].name.toUpperCase()+" / SYNTHETIC":"SYNTHETIC // NOT A DEPLOYMENT TOOL";
}
function updateScene(){if(!viewer)return;const world=worldOf(selectedWorld),data=worldDistricts(world);viewer.update(data,layer,focus,selectedDistrict,cursor,cursor===0)}
function updateCrimeList(){const root=$("crimeList"),metrics=currentMetrics(worldOf(selectedWorld));root.replaceChildren();
 M.TYPES.forEach((t,i)=>{const b=document.createElement("button");b.type="button";b.className="crimeRow"+(t.isHarm?" harm":"")+(focus===i?" selected":"");b.title=t.name+(t.isHarm?" — NONCRIMINAL HARM":"");
 const color=document.createElement("span");color.className="color";color.style.background=t.color;
 const name=document.createElement("span");name.className="cname";name.textContent=t.name;
 const value=document.createElement("span");value.className="cvalue";value.textContent=metrics?fmt((layer==="recorded"?metrics.recordedByType:metrics.trueByType)[i]):"—";
 b.append(color,name,value);b.addEventListener("click",()=>selectFocus(i));root.append(b)})}
function drawMini(){const canvas=$("miniMap"),ctx=canvas.getContext("2d"),data=worldDistricts(worldOf(selectedWorld));if(!ctx)return;
 const v=data.map(d=>V.heatValue(d,layer,focus,cursor===0));const max=Math.max(.01,...v.map(Math.abs));ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#071521";ctx.fillRect(0,0,288,288);
 const rgb=V.palette[layer]||"#43edd5";const color=parseInt(rgb.slice(1),16),r=(color>>16)&255,g=(color>>8)&255,b=color&255;
 for(let i=0;i<144;i++){const x=i%12,y=Math.floor(i/12),val=v[i];let n=layer==="trust"?M.clamp((val-.2)/.75,0,1):layer==="prevention"?M.clamp(val/.65,0,1):layer==="patrol"?val:Math.pow(Math.abs(val)/max,.75);
 const tone=layer==="delta"&&val<0?0x43edd5:color;const rr=tone>>16&255,gg=tone>>8&255,bb=tone&255;ctx.fillStyle="rgb("+Math.round(18+n*rr*.75)+","+Math.round(33+n*gg*.68)+","+Math.round(48+n*bb*.68)+")";ctx.fillRect(x*24+1,y*24+1,22,22);
 if(i===selectedDistrict){ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.strokeRect(x*24+2,y*24+2,20,20)}
 }}
function updateInspector(){const district=worldDistricts(worldOf(selectedWorld))[selectedDistrict],base=worldOf(selectedWorld).cells[selectedDistrict],id=selectedDistrict;
 $("districtName").textContent="DISTRICT "+String.fromCharCode(65+Math.floor(id/12))+"-"+String(id%12+1).padStart(2,"0");
 $("districtInfo").textContent="Synthetic district "+(id+1)+" · land-use features: commerce "+Math.round(base.commerce*100)+"%, transit "+Math.round(base.transit*100)+"%, unmet-needs index "+Math.round(base.need*100)+"%. These characteristics are invented.";
 const arr=[["Underlying",cursor?fmt(valueByFocus(district.truth)):"—"],["Recorded",cursor?fmt(valueByFocus(district.recorded)):"—"],["Patrol",Math.round((district.patrol||0)*100)+"%"],["Trust",Math.round((district.trust||.65)*100)+"%"],["Prevention",Math.round((Object.values(district.stock||{}).reduce((a,b)=>a+b,0)/4)*100)+"%"],["View","WORLD "+selectedWorld],["A − B",cursor?fmt(valueByFocus(currentSnapshot(A)[id].truth)-valueByFocus(currentSnapshot(B)[id].truth)):"—"]];
 const root=$("districtValues");root.replaceChildren();arr.forEach(([label,value])=>{const div=document.createElement("div"),span=document.createElement("span"),strong=document.createElement("strong");span.textContent=label;strong.textContent=value;div.append(span,strong);root.append(div)})}
function updateKPIs(){const a=currentMetrics(A),b=currentMetrics(B);
 $("kpiDate").textContent=cursor?monthLabel(cursor):"JAN 2027";
 $("kpiUnderlying").textContent=a?fmt(a.trueCrime):"—";
 $("kpiRecorded").textContent=a?fmt(a.recordedCrime):"—";
 if(a&&b){const diff=a.trueCrime-b.trueCrime;$("kpiDifference").textContent=(diff>0?"+":"")+fmt(diff);$("kpiDifference").style.color=diff>0?"#ffb17b":"#43edd5"}else $("kpiDifference").textContent="—";
 $("kpiTrust").textContent=a?Math.round(a.trust*100)+"%":"—";
 $("timeline").max=String(A.month);$("timeline").value=String(cursor);
 $("timelineLabel").textContent=monthLong(cursor);
 $("timelineLatest").textContent="LATEST: "+(A.month?monthLabel(A.month):"2027")+" · "+A.month+" MONTHS";
 $("viewInfo").textContent=viewer?.type==="webgl"?"DRAG TO ORBIT · SCROLL TO ZOOM · CLICK A BLOCK":"CLICK A BLOCK · FALLBACK ISOMETRIC VIEW";
}
function drawComparison(){const canvas=$("comparisonChart"),ctx=canvas.getContext("2d");if(!ctx)return;
 const w=canvas.width,h=canvas.height,m={left:68,top:28,right:22,bottom:46};
 ctx.fillStyle="#071b28";ctx.fillRect(0,0,w,h);
 const a=A.history.map(x=>x[chartMetric]),b=B.history.map(x=>x[chartMetric]),maxCount=Math.max(1,a.length,b.length);
 let low=Math.min(0,...a,...b),high=Math.max(1,...a,...b);if(chartMetric==="trust"||chartMetric==="observation"){low=0;high=1}else high*=1.12;
 function pt(i,v){return{x:m.left+(i/maxCount)*(w-m.left-m.right),y:h-m.bottom-(v-low)/(high-low)*(h-m.top-m.bottom)}}
 ctx.strokeStyle="#26495c";ctx.lineWidth=1;ctx.fillStyle="#95b5c5";ctx.font="13px system-ui";
 for(let k=0;k<=5;k++){const v=low+(high-low)*k/5,y=pt(0,v).y;ctx.beginPath();ctx.moveTo(m.left,y);ctx.lineTo(w-m.right,y);ctx.stroke();ctx.fillText(chartMetric==="trust"||chartMetric==="observation"?(v*100).toFixed(0)+"%":fmt(v),7,y+4)}
 const line=(values,color)=>{if(!values.length)return;ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=3.5;values.forEach((v,i)=>{const p=pt(i+1,v);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y)});ctx.stroke()};
 line(a,"#43edd5");line(b,"#ffb17b");
 for(let y=0;y<=maxCount;y+=Math.max(1,Math.round(maxCount/6))){const x=pt(y,0).x;ctx.fillStyle="#95b5c5";ctx.fillText(String(y),x-5,h-20)}
 if(cursor>0){const x=pt(cursor,0).x;ctx.strokeStyle="#e6fbf9";ctx.setLineDash([4,5]);ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x,m.top);ctx.lineTo(x,h-m.bottom);ctx.stroke();ctx.setLineDash([])}
 const metricNames={trueCrime:"UNDERLYING MONTHLY OFFENSES",recordedCrime:"RECORDED MONTHLY OFFENSES",trust:"MODELED MEAN TRUST",overdose:"NONCRIMINAL OVERDOSE EMERGENCIES",observation:"RECORDED SHARE OF ALL EVENTS"};
 $("chartHint").textContent=metricNames[chartMetric]+" · Month "+cursor+" / "+A.month;
}
function updateScorecard(){const a=currentMetrics(A),b=currentMetrics(B);
 const list=[["Underlying crimes",a?.trueCrime,b?.trueCrime,"int"],["Recorded crimes",a?.recordedCrime,b?.recordedCrime,"int"],["Overdose emergencies",a?.overdose,b?.overdose,"int"],["Mean trust",a?.trust,b?.trust,"pct"],["Recorded share",a?.observation,b?.observation,"pct"],["Patrolled districts",a?.patrolCount,b?.patrolCount,"int"],["Prevention budget",a?.prevention,b?.prevention,"percent"],["Monthly budget",a?.budgetMillions,b?.budgetMillions,"money"]];
 const root=$("scorecard");root.replaceChildren();
 for(const [label,va,vb,kind] of list){const el=document.createElement("div");el.className="score";const title=document.createElement("span");title.className="label";title.textContent=label;
 const left=document.createElement("span"),right=document.createElement("span");left.className="a";right.className="b";
 const render=v=>v==null?"—":kind==="pct"?(v*100).toFixed(1)+"%":kind==="money"?"$"+v+"M":kind==="percent"?v+"%":fmt(v);
 left.textContent=render(va);right.textContent=render(vb);el.append(title,left,right);root.append(el)}}
function updateInsights(){const a=currentMetrics(A),b=currentMetrics(B);if(!a||!b){$("insightTitle").textContent="AWAITING THE FUTURE";$("insightBody").textContent="Run both worlds to reveal differences between underlying incidents, recorded signals, and police deployment. All results are generated from hypothetical mechanisms.";return}
 let title,body;
 if(a.trueCrime<b.trueCrime&&a.recordedCrime>b.recordedCrime){title="THE OBSERVATION PARADOX";body="World A generated fewer criminal incidents than World B but recorded more. The gap arises from the simulated process of detection and reporting—not necessarily from harm."}
 else if(a.recordedCrime<b.recordedCrime&&a.trueCrime>b.trueCrime){title="THE FALSE VICTORY";body="World A appears safer in police-recorded data, yet its model-generated underlying crime count is higher. A lower recorded count is not proof of less harm."}
 else if(a.trust+0.07<b.trust){title="LEGITIMACY DIVERGENCE";body="World B has higher modeled trust than World A. In this toy system, enforcement style and outreach affect trust, which feeds back into reporting. These coefficients are illustrative."}
 else if(a.overdose>b.overdose*1.2){title="HARM BEYOND CRIME";body="World A has more modeled overdose emergencies. Overdose is a health outcome, not a crime category; treatment allocation can change its separate trajectory."}
 else if(a.patrolCount>b.patrolCount+10){title="RESOURCE CONCENTRATION";body="World A concentrates more patrol resources than World B. Change the map to PATROL DEPLOYMENTS, then contrast those locations with actual simulated incidents."}
 else{title="COUNTERFACTUAL TENSION";body="Your two policy paths produce different observations and outcomes. Try switching from UNDERLYING to RECORDED to see how data collection changes the narrative."}
 $("insightTitle").textContent=title;$("insightBody").textContent=body;
}
function updateAll(){updateKPIs();updateScene();updateCrimeList();updateInspector();drawMini();drawComparison();updateScorecard();updateInsights()}
function addShock(type){if(!duration[type])return;if(cursor<A.month)branch();const item={type,start:A.month,duration:duration[type],magnitude:1};shocks.push(item);addEvent(tag[type]+" in both worlds; lasts "+duration[type]+" months.");updateAll()}
function timeTo(n){cursor=M.clamp(Math.round(n),0,A.month);updateAll()}
function exportText(file,contents,type){const url=URL.createObjectURL(new Blob([contents],{type}));const a=document.createElement("a");a.download=file;a.href=url;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1800);$("exportStatus").textContent="Prepared "+file+" (synthetic research data)."}
function exportCSV(){const header=["month","date","policy_A","policy_B","underlying_A","underlying_B","recorded_A","recorded_B","overdose_A","overdose_B","trust_A","trust_B","patrol_A","patrol_B","observation_share_A","observation_share_B"];
 for(const t of M.TYPES)header.push(t.id+"_underlying_A",t.id+"_underlying_B",t.id+"_recorded_A",t.id+"_recorded_B");
 const rows=[header];for(let i=0;i<A.month;i++){const a=A.history[i],b=B.history[i];const row=[i+1,monthLabel(i+1),a.policy,b.policy,a.trueCrime,b.trueCrime,a.recordedCrime,b.recordedCrime,a.overdose,b.overdose,a.trust.toFixed(4),b.trust.toFixed(4),a.patrolCount,b.patrolCount,a.observation.toFixed(4),b.observation.toFixed(4)];for(let j=0;j<M.TYPES.length;j++)row.push(a.trueByType[j],b.trueByType[j],a.recordedByType[j],b.recordedByType[j]);rows.push(row)}
 exportText("laplace-omega-synthetic-history.csv",rows.map(r=>r.join(",")).join("\n"),"text/csv")}
function exportJSON(){const json={title:"LAPLACE OMEGA // Synthetic simulation",synthetic:true,generated:"Client-side browser simulation",limitations:"Hypothetical coefficients, no real observations, no fitted effects, not an operational model.",seed:204921,selectedMonth:cursor,settings:{A:A.settings,B:B.settings,mix:getMix(),spillover:+$("spillover").value},shocks,crimeTypes:M.TYPES.map(t=>({id:t.id,name:t.name,isCrime:!t.isHarm})),history:{A:A.history,B:B.history}};exportText("laplace-omega-synthetic-scenario.json",JSON.stringify(json,null,2),"application/json")}
async function share(){const url=new URL(location.href);url.searchParams.set("policyA",A.settings.policy);url.searchParams.set("policyB",B.settings.policy);url.searchParams.set("preventionA",A.settings.prevention);url.searchParams.set("preventionB",B.settings.prevention);url.searchParams.set("budgetA",A.settings.budget);url.searchParams.set("budgetB",B.settings.budget);url.searchParams.set("surveillanceA",A.settings.surveillance);url.searchParams.set("surveillanceB",B.settings.surveillance);url.searchParams.set("tacticsA",A.settings.tactics);url.searchParams.set("tacticsB",B.settings.tactics);
 if(!navigator.clipboard?.writeText){$("exportStatus").textContent="Clipboard unavailable; use JSON export.";return}
 try{await navigator.clipboard.writeText(url.href);$("exportStatus").textContent="Scenario configuration link copied (not simulation history)."}catch{$("exportStatus").textContent="Clipboard access unavailable; use JSON export."}
}
function applyQuery(){const p=new URLSearchParams(location.search);for(const l of ["A","B"]){const cfg=l==="A"?A.settings:B.settings;if(["predictive","equal","problem","needs","random","oracle"].includes(p.get("policy"+l)))cfg.policy=p.get("policy"+l);if(["intensive","procedural"].includes(p.get("tactics"+l)))cfg.tactics=p.get("tactics"+l);for(const k of ["prevention","budget","surveillance"]){const raw=p.get(k+l);if(raw!=null&&raw.trim()!==""&&Number.isFinite(+raw)){const bounds=k==="budget"?[3,25]:[0,100];cfg[k]=M.clamp(+raw,...bounds)}}}}
$("play").addEventListener("click",play);$("step").addEventListener("click",()=>{pause();advance(1)});$("plusYear").addEventListener("click",()=>{pause();advance(12)});$("plusFive").addEventListener("click",()=>{pause();advance(60)});$("reset").addEventListener("click",reset);$("branch").addEventListener("click",branch);
$("speed").addEventListener("input",()=>{const levels=["","0.5×","1×","2×","4×","10×"];$("speedOut").textContent=levels[+$("speed").value];if(running){pause();play()}});
$("timeline").addEventListener("input",e=>{pause();timeTo(+e.target.value)});
for(const l of ["A","B"])for(const k of ["policy","prevention","budget","surveillance","tactics"])$(k+l).addEventListener("input",()=>{configurationsFromUI();updateAll()});
$("showA").addEventListener("click",()=>selectWorld("A"));$("showB").addEventListener("click",()=>selectWorld("B"));
for(const b of document.querySelectorAll("[data-layer]"))b.addEventListener("click",()=>selectLayer(b.dataset.layer));
$("focusAll").addEventListener("click",()=>selectFocus(-1));$("focusCrime").addEventListener("click",()=>selectFocus(-2));$("focusHarm").addEventListener("click",()=>selectFocus(11));
$("miniMap").addEventListener("click",e=>{const r=e.currentTarget.getBoundingClientRect();const x=Math.floor((e.clientX-r.left)/r.width*12),y=Math.floor((e.clientY-r.top)/r.height*12);if(x>=0&&x<12&&y>=0&&y<12)selectDistrict(y*12+x)});
for(const b of document.querySelectorAll("[data-chart]"))b.addEventListener("click",()=>{chartMetric=b.dataset.chart;document.querySelectorAll("[data-chart]").forEach(el=>el.classList.toggle("chosen",el===b));drawComparison()});
$("comparisonChart").addEventListener("click",e=>{if(!A.month)return;const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*1100,month=Math.round((x-68)/(1100-68-22)*A.month);pause();timeTo(month)});
for(const b of document.querySelectorAll("[data-shock]"))b.addEventListener("click",()=>addShock(b.dataset.shock));
for(const b of document.querySelectorAll("[data-preset]"))b.addEventListener("click",()=>preset(b.dataset.preset));
for(const id of ["mixTreat","mixEducate","mixHouse","mixOutreach","spillover"])$(id).addEventListener("input",()=>{readMix();updateAll()});
for(const [id,type] of [["camOrbit","orbit"],["camTop","top"],["camStreet","street"]])$(id).addEventListener("click",()=>viewer?.setCamera(type));
$("photo").addEventListener("click",()=>{if(!viewer)return;try{const data=viewer.capture(),a=document.createElement("a");a.href=data;a.download="laplace-omega-3d-synthetic-city.png";a.click()}catch(e){$("engineStatus").textContent="IMAGE CAPTURE UNAVAILABLE: "+e.message}});
$("exportCSV").addEventListener("click",exportCSV);$("exportJSON").addEventListener("click",exportJSON);$("shareScenario").addEventListener("click",share);
document.addEventListener("keydown",e=>{const node=e.target?.tagName;if(node==="INPUT"||node==="SELECT"||node==="TEXTAREA"||e.ctrlKey||e.altKey||e.metaKey)return;
 if(e.key===" "){e.preventDefault();play()}if(e.key==="ArrowLeft"&&cursor>0){pause();timeTo(cursor-1)}if(e.key==="ArrowRight"&&cursor<A.month){pause();timeTo(cursor+1)}if(e.key==="1")selectWorld("A");if(e.key==="2")selectWorld("B")});
applyQuery();settingsToUI();readMix();
addEvent("OMEGA is online. All persons, places, crimes, investments and effects in this environment are synthetic.");
updateAll();
V.create($("viewport"),{select:selectDistrict,status:text=>$("engineStatus").textContent=text}).then(v=>{viewer=v;updateAll();addEvent(v.type==="webgl"?"Full 3D engine initialized; orbit and inspect the city.":"Isometric fallback active; simulator functions are still available.")}).catch(error=>{console.error(error);$("engineStatus").textContent="VISUALIZATION UNAVAILABLE; SIMULATION CONTROLS REMAIN ACTIVE";addEvent("The visual engine could not be initialized: "+error.message)});
