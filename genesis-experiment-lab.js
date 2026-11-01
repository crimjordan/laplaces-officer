/* LAPLACE / GENESIS controlled research laboratory */
(function(){"use strict";
const E=window.GenesisEngine,X=window.GenesisExperiments;if(!E||!X)throw Error("GENESIS experiment engine missing");
const $=id=>document.getElementById(id),escape=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),
 colors=["#65f3d0","#ffc48d","#a5b9ff","#f6a6b8","#c7e4ff","#e7b4f6","#a1fcc2"];
let mode="isolated",activeWorker=null,running=false,generation=0,currentPlan=null,results=null;
const metricName=key=>X.METRICS.find(m=>m.key===key)?.label||key;
const fmt=(v,key)=>Number.isFinite(v)?Number(v).toLocaleString("en-US",{minimumFractionDigits:key==="trust"?4:2,maximumFractionDigits:key==="trust"?4:2}):"N/A";
const signed=(v,k)=>(v>0?"+":"")+fmt(v,k);
function add(parent,tag,txt,cls){const e=document.createElement(tag);if(txt!=null)e.textContent=String(txt);if(cls)e.className=cls;parent.append(e);return e}
function spec(){
 return{kind:mode,test:$("isolatedTest").value,structural:$("structuralTest").value,
  seeds:+$("seedCount").value,years:+$("simYears").value,population:+$("simPop").value,seedBase:+$("seedBase").value,
  base:{policy:$("basePolicy").value,prevention:+$("basePrevention").value,surveillance:+$("baseSurveillance").value,
    patrolEffect:+$("basePatrolEffect").value,budget:+$("baseBudget").value,procedure:$("baseProcedure").value,
    jobs:30,school:20,treatment:20,housing:20,reentry:10,employmentLink:0,housingLink:0,educationLink:0}};
}
function updateDesign(){
 let plan;try{plan=X.design(spec())}catch(e){$("designCaution").textContent=e.message;return}
 $("isolatedControl").hidden=mode!=="isolated";$("structuralControl").hidden=mode!=="structural";$("factorialControl").hidden=mode!=="factorial";
 document.querySelectorAll("[data-mode]").forEach(b=>{const active=b.dataset.mode===mode;b.classList.toggle("selected",active);b.setAttribute("aria-pressed",String(active))});
 $("metricDesign").textContent=mode==="isolated"?"CONTROLLED PAIR":mode==="structural"?"SENSITIVITY":"FULL FACTORIAL";
 $("metricArms").textContent=String(plan.arms.length);$("metricSeeds").textContent=String(plan.spec.seeds);$("metricYears").textContent=String(plan.spec.years);
 $("designTitle").textContent=plan.title;$("designDescription").textContent=plan.description;
 const pane=$("armPreview");pane.replaceChildren();
 plan.arms.forEach((a,i)=>{const card=add(pane,"div",null,"armCard");add(card,"span","ARM "+String(i+1).padStart(2,"0")+" / "+a.id.toUpperCase(),"armNumber");
  add(card,"strong",a.label);add(card,"small","Budget $"+a.config.budget+"M · "+plan.spec.population+" agents · "+plan.spec.years+" years")});
 $("parameterMatrix").replaceChildren();add($("parameterMatrix"),"pre",JSON.stringify({
  design:plan.title,seeds:plan.spec.seeds,years:plan.spec.years,firstSeed:plan.spec.seedBase,population:plan.spec.population,
  arms:plan.arms.map(a=>({id:a.id,config:a.config}))
 },null,2));
 $("designCaution").textContent=results?"Inputs may have changed since the last completed experiment. The exported results keep their original recorded settings.":"The exact parameter values above govern the next matched experiment.";
}
function restoreURL(){
 const q=new URLSearchParams(location.search);if(["isolated","structural","factorial"].includes(q.get("kind")))mode=q.get("kind");
 const keys={test:"isolatedTest",structural:"structuralTest",seeds:"seedCount",years:"simYears",population:"simPop",seedBase:"seedBase",
   b_policy:"basePolicy",b_prevention:"basePrevention",b_surveillance:"baseSurveillance",b_patrolEffect:"basePatrolEffect",b_budget:"baseBudget",b_procedure:"baseProcedure"};
 for(const [p,id]of Object.entries(keys))if(q.has(p))$(id).value=q.get(p);
}
function share(){
 const s=X.normalize(spec()),url=new URL(location.href);url.search="";
 const fields={kind:s.kind,test:s.test,structural:s.structural,seeds:s.seeds,years:s.years,population:s.population,seedBase:s.seedBase};
 for(const [k,v] of Object.entries(s.base))fields["b_"+k]=v;
 for(const [k,v]of Object.entries(fields))url.searchParams.set(k,String(v));
 const str=url.toString();
 if(navigator.clipboard?.writeText)navigator.clipboard.writeText(str).then(()=>$("designCaution").textContent="Design link copied. It restores configuration, not generated data.").catch(()=>window.prompt("Copy link",str));
 else window.prompt("Copy link",str);
}
function setWorking(state){running=state;$("runExperiment").disabled=state;$("cancelExperiment").disabled=!state;$("metricStatus").textContent=state?"RUNNING":results?"COMPLETE":"READY"}
function progress(done,total){$("labProgressBar").style.width=(done/total*100).toFixed(1)+"%";$("progressText").textContent="Completed "+done+"/"+total+" matched seeds, "+(currentPlan?.arms.length||0)+" policy arms per seed."}
function cancel(){activeWorker?.terminate();activeWorker=null;generation++;setWorking(false);$("metricStatus").textContent="CANCELLED";$("progressText").textContent="Cancelled. Existing finished results, if any, were not altered."}
function fail(error){activeWorker?.terminate();activeWorker=null;setWorking(false);$("metricStatus").textContent="ERROR";$("progressText").textContent="Experiment error: "+String(error?.message||error);console.error(error)}
function finish(result){
 activeWorker?.terminate();activeWorker=null;results=result;setWorking(false);$("metricStatus").textContent="COMPLETE";
 $("resultsTag").classList.add("complete");$("resultsTag").textContent=result.batches.length+" MATCHED SEEDS";
 $("labProgressBar").style.width="100%";$("progressText").textContent="Completed "+result.batches.length+" matched seeds × "+result.plan.arms.length+" arms. All results are synthetic.";
 $("resultsEmpty").hidden=true;$("resultsContent").hidden=false;
 for(const key of ["exportRaw","exportEffects","exportJSON","exportReport"])$(key).disabled=false;
 render();updateDesign();
}
async function fallback(plan,session){
 const batches=[];for(let i=0;i<plan.spec.seeds;i++){
  if(generation!==session)return;batches.push(X.runSeed(E,plan,i));progress(i+1,plan.spec.seeds);
  await new Promise(resolve=>setTimeout(resolve,0));
 }
 if(generation===session)finish(X.analyze(plan,batches));
}
function run(){
 if(running)return;
 let plan;try{plan=X.design(spec())}catch(err){fail(err);return}
 currentPlan=plan;const session=++generation;setWorking(true);$("metricStatus").textContent="RUNNING";
 $("labProgressBar").style.width="0%";$("progressText").textContent="Preparing "+plan.spec.seeds+" matched experiments.";
 if(typeof Worker==="undefined"){fallback(plan,session).catch(fail);return}
 try{
  activeWorker=new Worker("genesis-experiment-worker.js?v=experiments1");
  activeWorker.onmessage=function(event){if(session!==generation)return;const d=event.data||{};
   if(d.type==="progress")progress(d.done,d.total);
   else if(d.type==="complete")finish(d.result);
   else if(d.type==="error")fail(Error(d.message||"Unknown experiment error"));
  };
  activeWorker.onerror=function(e){if(session!==generation)return;activeWorker?.terminate();activeWorker=null;
   $("progressText").textContent="Worker unavailable; running locally.";fallback(plan,session).catch(fail)};
  activeWorker.postMessage({action:"start",spec:plan.spec});
 }catch(e){activeWorker?.terminate();activeWorker=null;fallback(plan,session).catch(fail)}
}
function effects(){if(!results)return[];const k=$("outcomeSelect").value;return(results.plan.spec.kind==="factorial"?results.effects:results.paired).filter(e=>e.metric===k)}
function allPairs(){return results?results.paired.filter(e=>e.metric===$("outcomeSelect").value):[]}
function metricsCards(items){
 const p=$("resultKpis");p.replaceChildren();if(!items.length)return;const s=items[0].summary,k=$("outcomeSelect").value;
 const info=[["MEAN MODEL CONTRAST",signed(s.mean,k),"Alternative − baseline, or factorial contrast"],
 ["5TH PERCENTILE",fmt(s.q05,k),"Within-model variation"],["95TH PERCENTILE",fmt(s.q95,k),"NOT an empirical interval"],
 ["REPLICATION PAIRS",String(s.n),s.negative+" negative; "+s.positive+" positive"]];
 for(const [head,num,foot]of info){const card=add(p,"div");add(card,"small",head);add(card,"strong",num);add(card,"em",foot)}
}
function renderChart(items){
 const canvas=$("contrastCanvas"),ctx=canvas.getContext("2d");if(!ctx)return;
 const w=canvas.width,h=canvas.height;
 ctx.fillStyle="#081c2a";ctx.fillRect(0,0,w,h);if(!items.length)return;
 const k=$("outcomeSelect").value,left=285,right=1065,top=40,bottom=307;
 const abs=Math.max(1e-6,...items.flatMap(a=>[Math.abs(a.summary.q05),Math.abs(a.summary.q95),Math.abs(a.summary.mean)]))*1.25;
 const x=v=>left+(v+abs)/(2*abs)*(right-left);
 for(let tick=-2;tick<=2;tick++){
  const xx=x(tick*abs/2);ctx.beginPath();ctx.strokeStyle=tick===0?"#9bd3d4":"#265061";
  ctx.setLineDash(tick===0?[4,4]:[]);ctx.moveTo(xx,top);ctx.lineTo(xx,bottom);ctx.stroke();
  ctx.textAlign="center";ctx.font="10px ui-monospace,monospace";ctx.fillStyle="#abc8d2";
  ctx.fillText(signed(tick*abs/2,k),xx,bottom+20);
 }ctx.setLineDash([]);
 items.forEach((item,i)=>{
  const y=top+23+(bottom-top-45)*(i+.5)/items.length,s=item.summary,col=colors[i%colors.length];
  ctx.textAlign="right";ctx.fillStyle="#def6f0";ctx.font="bold 11px system-ui";
  const label=item.effect.length>35?item.effect.slice(0,32)+"…":item.effect;
  ctx.fillText(label,left-13,y+4);
  ctx.fillStyle=col;ctx.globalAlpha=.24;
  item.values.forEach((v,j)=>{ctx.beginPath();ctx.arc(x(v),y+Math.sin(j*17.3+i)*6,2.6,0,Math.PI*2);ctx.fill()});
  ctx.globalAlpha=1;ctx.strokeStyle=col;ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(x(s.q05),y);ctx.lineTo(x(s.q95),y);ctx.stroke();
  for(const v of [s.q05,s.q95]){ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x(v),y-7);ctx.lineTo(x(v),y+7);ctx.stroke()}
  ctx.fillStyle=col;ctx.beginPath();ctx.arc(x(s.mean),y,6,0,Math.PI*2);ctx.fill();
 });
 ctx.fillStyle="#b0d1d3";ctx.textAlign="center";ctx.font="11px system-ui";
 ctx.fillText("Paired model differences · points = individual seeds · line = synthetic 5th–95th percentiles",w/2,18);
}
function table(parent,rows,captionText){
 parent.replaceChildren();if(!rows.length)return;const t=add(parent,"table");add(t,"caption",captionText);const head=add(t,"thead"),tr=add(head,"tr");
 for(const s of ["Contrast","Mean Δ","5th percentile","95th percentile","Negative / N","Positive / N"])add(tr,"th",s);
 const body=add(t,"tbody");
 for(const item of rows){const row=add(body,"tr"),s=item.summary,k=item.metric;
  for(const v of [item.effect,signed(s.mean,k),fmt(s.q05,k),fmt(s.q95,k),s.negative+"/"+s.n,s.positive+"/"+s.n])add(row,"td",v)}
}
function render(){
 if(!results)return;
 const k=$("outcomeSelect").value,chosen=effects();metricsCards(chosen);renderChart(chosen);
 table($("resultTable"),allPairs(),"Alternative − registered baseline across seeds");
 table($("factorialTable"),results.effects.filter(e=>e.metric===k),"Full-factorial main effects and interactions");
 $("chartCaption").textContent=(results.plan.spec.kind==="factorial"?
  "Factorial main effects and interactions. ":
  "A positive difference means the alternative model arm produced more of the outcome. ")+
  "Dots are replicated seed contrasts. The bars show model-seed 5th–95th percentiles, NOT real-world confidence intervals.";
}
function download(name,str,type){
 const blob=new Blob([str],{type}),u=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1600);
 $("exportFeedback").textContent="Saved "+name+" (model-generated, not real data).";
}
function htmlTable(head,rows){
 return"<table><thead><tr>"+head.map(s=>"<th>"+escape(s)+"</th>").join("")+"</tr></thead><tbody>"+
 rows.map(row=>"<tr>"+row.map(s=>"<td>"+escape(s)+"</td>").join("")+"</tr>").join("")+"</tbody></table>";
}
function report(result){
 const k=$("outcomeSelect").value,s=result.plan.spec;
 const cfg=result.plan.arms.map(a=>[a.id,a.label,a.config.policy,a.config.budget,a.config.prevention,a.config.surveillance,
   a.config.patrolEffect,a.config.procedure,a.config.employmentLink,a.config.housingLink,a.config.educationLink]);
 const rows=list=>list.filter(x=>x.metric===k).map(x=>[x.effect,signed(x.summary.mean,k),fmt(x.summary.q05,k),fmt(x.summary.q95,k),x.summary.negative+"/"+x.summary.n]);
 const styles=[
 "@page{size:A4;margin:14mm}*{box-sizing:border-box}html{background:#e8eeee}body{background:#fff;max-width:980px;padding:46px 54px;margin:25px auto;color:#1b3440;font:12px/1.55 system-ui,Arial;box-shadow:0 18px 40px #132e3a27}",
 "h1{font-size:36px;letter-spacing:-.055em;margin:9px 0}h2{font-size:20px;margin:8px 0}h3{font-size:14px;margin:8px 0}",
 ".eyebrow{color:#098b7c;letter-spacing:.13em;font-size:10px;font-weight:900}.section{margin:25px 0}.fine{font-size:10px;color:#66828b}",
 ".bar{position:sticky;top:0;background:#173645;color:#fff;display:flex;justify-content:space-between;align-items:center;margin:-46px -54px 25px;padding:13px}",
 ".bar button{border:0;border-radius:5px;background:#b0f4e1;color:#07372e;padding:9px;font-weight:800;cursor:pointer}",
 ".hero{border-bottom:3px solid #173e45;padding:10px 0 25px}.hero p{font-size:15px;color:#526e7a}",
 ".warning{padding:13px;border:1px solid #d5b58c;background:#fff6ea;color:#71492b;margin:21px 0}",
 "table{width:100%;border-collapse:collapse;font-size:10px;margin:12px 0}th{text-align:left;background:#eaf1f2;padding:8px 6px;border-bottom:1px solid #d3dfe1}td{padding:7px;border-bottom:1px solid #e2eaec}tr{break-inside:avoid}tbody tr:nth-child(even){background:#f7fafb}",
 ".highlight{background:#eef8f5;border-left:3px solid #079588;padding:12px}.source{font-size:10px;margin:6px 0}.source a{color:#008e7d}",
 "pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f0f5f6;padding:12px;font-size:9px}footer{border-top:2px solid #153a44;padding-top:12px;font-size:10px;color:#66808a;margin-top:32px}",
 "@media print{html{background:white}body{margin:0;padding:0;box-shadow:none;max-width:none}.bar{display:none}.warning,.highlight,th{print-color-adjust:exact;-webkit-print-color-adjust:exact}}"
 ].join("\n");
 const description=[["Design",result.plan.title],["Question",result.plan.description],["Outcome analyzed",metricName(k)],
  ["Replications",s.seeds],["Years simulated",s.years],["Residents per arm",s.population],["First seed",s.seedBase],
  ["Model version",result.modelVersion],["Generated",result.createdAt]];
 const sources=[
 ["Summer jobs / violent arrests","Heller (2014)","https://doi.org/10.1126/science.1257809"],
 ["MOUD / overdose mortality","Larochelle et al. (2018)","https://doi.org/10.7326/M17-3107"],
 ["Correctional education / recidivism","RAND (2013)","https://www.rand.org/pubs/research_reports/RR266.html"],
 ["Prediction feedback","Ensign et al. (2018)","https://proceedings.mlr.press/v81/ensign18a.html"]
 ];
 const payload=JSON.stringify(result).replace(/</g,"\\u003c");
 return"<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"+
  "<title>GENESIS Controlled Experiment Report</title><style>"+styles+"</style></head><body>"+
  "<div class='bar'><strong>LAPLACE // GENESIS · EXPERIMENT REPORT</strong><div><button onclick='window.print()'>Print / Save PDF</button> <button id='dataBtn'>Download embedded JSON</button></div></div>"+
  "<div class='hero'><div class='eyebrow'>REPLICATED SYNTHETIC RESEARCH</div><h1>The Mechanism Experiment</h1><p>"+escape(result.plan.title)+"</p><small>"+escape(result.createdAt)+" · "+escape(result.modelVersion)+" · "+s.seeds+" seeds × "+result.plan.arms.length+" arms</small></div>"+
  "<div class='warning'><strong>NOT A REAL-WORLD CAUSAL ESTIMATE.</strong> This is an uncalibrated fictional agent-based model. Synthetic 5th–95th percentiles do not measure uncertainty about effects in real jurisdictions.</div>"+
  "<section class='section'><div class='eyebrow'>01 / REGISTRATION</div><h2>Design and study question</h2>"+htmlTable(["Parameter","Setting"],description)+"</section>"+
  "<section class='section'><div class='eyebrow'>02 / HELD-CONSTANT DESIGN</div><h2>Exact arm configurations</h2>"+
  htmlTable(["Arm","Label","Policy","Budget $M","Prevention %","Surveillance %","Patrol assumption %","Encounters","Employment link %","Housing link %","Education link %"],cfg)+
  "<p class='fine'>Service mix held constant (normalized weights): youth jobs 30, schools 20, treatment 20, housing 20, correctional education 10.</p></section>"+
  "<section class='section'><div class='eyebrow'>03 / PAIRED CONTRASTS</div><h2>"+escape(metricName(k))+"</h2>"+
  htmlTable(["Alternative − baseline","Mean Δ","5th percentile","95th percentile","Negative pairs / N"],rows(result.paired))+
  "<p class='fine'>Pairing uses exactly the same initial population and random seed in every arm, not identical subsequent life paths. This is an in-model comparison.</p></section>"+
  "<section class='section'><div class='eyebrow'>04 / FACTORIAL DECOMPOSITION</div><h2>Main effects and interactions</h2>"+
  (result.effects.length?htmlTable(["Contrast","Mean Δ","5th percentile","95th percentile","Negative pairs / N"],rows(result.effects)):"<p>No factorial contrasts were requested.</p>")+
  "<p class='fine'>Interactions test additivity within the simulator. No model interaction demonstrates real-world policy synergy.</p></section>"+
  "<section class='section'><div class='eyebrow'>05 / EMPIRICAL EVIDENCE AND ASSUMPTIONS</div><h2>What research actually informs</h2>"+
  "<p>The numerical evidence anchors are limited to selected-youth violent arrests, observational mortality during medication treatment after overdose, and correctional-education recidivism odds. Most crime, housing, employment, surveillance, trust and patrol equations remain synthetic assumptions. The nonzero employment link is a sensitivity parameter, not an empirical estimate.</p>"+
  sources.map(a=>"<p class='source'><strong>"+escape(a[0])+":</strong> "+escape(a[1])+" — <a href='"+a[2]+"'>"+a[2]+"</a></p>").join("")+"</section>"+
  "<section class='section'><div class='eyebrow'>06 / INTERPRETATION BOUNDARIES</div><h2>Limits on inference</h2><ul>"+
  result.limitations.map(item=>"<li>"+escape(item)+"</li>").join("")+"</ul></section>"+
  "<section class='section'><div class='eyebrow'>07 / REPLICATION PARAMETERS</div><h2>Reproduce the synthetic study</h2><pre>"+
  escape(JSON.stringify({version:result.modelVersion,seedBase:s.seedBase,seedIncrement:7919,years:s.years,population:s.population,arms:result.plan.arms},null,2))+"</pre></section>"+
  "<footer>GENESIS · SYNTHETIC MODEL ONLY · Seed-by-arm raw results are embedded in this HTML file.</footer>"+
  "<script id='payload' type='application/json'>"+payload+"</script>"+
  "<script>document.getElementById('dataBtn').onclick=function(){var s=document.getElementById('payload').textContent,b=new Blob([s],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='genesis-controlled-data.json';a.click();setTimeout(function(){URL.revokeObjectURL(u)},1500)};</script></body></html>";
}
function openReport(){
 if(!results)return;
 const str=report(results);let tab=null;try{tab=window.open("about:blank","_blank")}catch(e){}
 if(tab){tab.document.open();tab.document.write(str);tab.document.close();try{tab.opener=null}catch(e){}
  $("exportFeedback").textContent="Report opened. Use Print / Save PDF or download embedded data.";return}
 download("genesis-controlled-report.html",str,"text/html;charset=utf-8");
}
function init(){
 restoreURL();
 for(const m of X.METRICS){const opt=document.createElement("option");opt.value=m.key;opt.textContent=m.label;$("outcomeSelect").append(opt)}
 $("outcomeSelect").value="expectedCrime";
 document.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>{mode=b.dataset.mode;updateDesign()}));
 for(const id of ["isolatedTest","structuralTest","baseBudget","basePolicy","basePrevention","baseSurveillance","basePatrolEffect","baseProcedure",
  "seedCount","simYears","simPop","seedBase"]){$(id).addEventListener("input",updateDesign);$(id).addEventListener("change",updateDesign)}
 $("copyConfig").addEventListener("click",share);
 $("runExperiment").addEventListener("click",run);$("cancelExperiment").addEventListener("click",cancel);
 $("outcomeSelect").addEventListener("change",render);
 $("exportRaw").addEventListener("click",()=>results&&download("genesis-seed-arm-results.csv",X.rawCSV(results),"text/csv"));
 $("exportEffects").addEventListener("click",()=>results&&download("genesis-model-contrasts.csv",X.effectsCSV(results),"text/csv"));
 $("exportJSON").addEventListener("click",()=>results&&download("genesis-controlled-study.json",JSON.stringify(results,null,2),"application/json"));
 $("exportReport").addEventListener("click",openReport);
 updateDesign();
}
init();
})();