/* GENESIS print-ready synthetic city report (standalone HTML) */
(function(root){"use strict";
const esc=x=>String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const fmt=x=>Math.round(Number(x)||0).toLocaleString("en-US");
const fix=(x,n=1)=>Number.isFinite(x)?x.toFixed(n):"N/A";
const pct=x=>Number.isFinite(x)?(100*x).toFixed(1)+"%":"N/A";
const total=a=>a.reduce((s,v)=>s+(Number(v)||0),0);
const avg=a=>a.length?total(a)/a.length:0;
const MONTHS=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const date=m=>m?MONTHS[(m-1)%12]+" "+(2027+Math.floor((m-1)/12)):"JAN 2027";
const css=[
"@page{size:A4;margin:16mm}*{box-sizing:border-box}html{background:#e3eaeb}body{font:13px/1.55 system-ui,Arial,sans-serif;max-width:950px;padding:45px 55px;background:#fff;color:#172e3c;margin:25px auto;box-shadow:0 20px 70px #162d3f26}",
".brand{font:800 10px system-ui;letter-spacing:.16em;color:#0a8c81}h1{font-size:41px;line-height:1.06;letter-spacing:-.045em;margin:13px 0}h2{font-size:20px;margin:10px 0}h3{font-size:14px;margin:9px 0}p{margin:8px 0 12px}a{color:#087e7c;text-decoration:none}.muted{color:#647985}.fine{font-size:11px;color:#637d89}",
".toolbar{display:flex;align-items:center;justify-content:space-between;background:#102b3a;color:#fff;position:sticky;top:0;margin:-45px -55px 25px;padding:13px 18px;z-index:3}.toolbar button{border:0;background:#a5f6e5;color:#153e3c;font-weight:800;padding:9px 12px;cursor:pointer;border-radius:4px}.toolbar .brand{color:#a5f6e5}",
".cover{border-bottom:3px solid #193845;padding:6px 0 22px}.cover p{max-width:780px;color:#5a7280;font-size:15px}.tags{display:flex;gap:7px;flex-wrap:wrap;margin-top:16px}.tags span{font-size:10px;font-weight:800;border-radius:4px;background:#edf3f5;padding:6px 9px}.warning{background:#fff7ea;border:1px solid #dfbb89;color:#6a4b22;padding:14px;margin:20px 0}",
".section{margin:27px 0}.eyebrow{letter-spacing:.12em;color:#098879;font-weight:800;font-size:10px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:16px 0}.kpis>div{padding:13px;background:#f4f8f9;border:1px solid #dce8ec;border-radius:5px}.kpis small{font-size:10px;color:#607787;display:block}.kpis strong{font-size:24px;display:block;margin:5px 0}.kpis em{font-style:normal;font-size:10px;color:#617983}",
".finding{border-left:3px solid #068978;background:#eff8f6;padding:11px;margin:12px 0}.caution{border-left:3px solid #c7804b;background:#fbf3ed;padding:11px;margin:12px 0}.twocol{display:grid;grid-template-columns:1fr 1fr;gap:10px}.twocol>div{padding:13px;background:#f2f6f7;border-top:3px solid #0b907f}.twocol>div:last-child{border-top-color:#d08552}",
"table{width:100%;border-collapse:collapse;font-size:11px;margin:13px 0}thead{display:table-header-group}tr{break-inside:avoid}th{background:#e9f1f3;text-align:left;padding:9px 6px;font-size:10px}td{border-bottom:1px solid #e5ecee;padding:8px 6px}td:not(:first-child),th:not(:first-child){text-align:right}tbody tr:nth-child(even){background:#fafcfc}",
".chart{border:1px solid #dce7ea;border-radius:7px;padding:10px;margin:16px 0;break-inside:avoid}.chart svg{display:block;width:100%;height:auto}.legend{font-size:10px;color:#56717d}.legend i{display:inline-block;width:20px;height:3px;margin:0 6px 2px 10px;background:#098879}.legend .b{background:#d08552}.source{margin:12px 0;padding:11px;background:#f3f7f8;border:1px solid #e1e9ea}.source h3{margin:5px 0}.source p{font-size:11px}.source a{font-size:10px;word-break:break-word}.source .tag{color:#098879;font-size:9px;font-weight:900;text-transform:uppercase}.life li{font-size:11px;margin:6px 0}",
"footer{margin-top:30px;padding-top:13px;border-top:2px solid #244452;color:#667d86;font-size:10px}@media(max-width:650px){body{margin:0;padding:19px}.toolbar{margin:-19px -19px 15px;flex-wrap:wrap}.kpis,.twocol{grid-template-columns:1fr 1fr}h1{font-size:31px}table{font-size:9px}}",
"@media print{html{background:#fff}body{margin:0!important;padding:0!important;max-width:none!important;box-shadow:none!important;font-size:11px}.toolbar{display:none!important}.section{margin:18px 0}.finding,.caution,.warning,thead th{print-color-adjust:exact;-webkit-print-color-adjust:exact}p{orphans:3;widows:3}}"
].join("\n");
function table(head,rows){return"<table><thead><tr>"+head.map(h=>"<th>"+esc(h)+"</th>").join("")+"</tr></thead><tbody>"+rows.map(row=>"<tr>"+row.map(v=>"<td>"+esc(v)+"</td>").join("")+"</tr>").join("")+"</tbody></table>"}
function chart(a,b,key,title){
 const n=Math.min(a.length,b.length);if(!n)return"";
 const hi=key==="trust"?1:Math.max(1,...a.map(r=>r[key]),...b.map(r=>r[key]))*1.10;
 const x=i=>65+i/Math.max(1,n-1)*770,y=v=>230-200*(Number(v)||0)/hi;
 let svg="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 860 273' role='img' aria-label='"+esc(title)+"'><title>"+esc(title)+"</title>";
 for(let i=0;i<5;i++){const value=hi*i/4,yy=y(value);svg+="<path d='M65 "+yy+" H836' stroke='#e4ebed'/><text x='57' y='"+(yy+4)+"' font-size='12' text-anchor='end' fill='#55747e'>"+(key==="trust"?Math.round(value*100)+"%":fmt(value))+"</text>"}
 for(let i=0;i<5;i++){const j=Math.round((n-1)*i/4);svg+="<text x='"+x(j)+"' y='258' font-size='11' text-anchor='middle' fill='#55747e'>"+(j+1)+"</text>"}
 const line=(arr,color)=>"<polyline fill='none' stroke='"+color+"' stroke-width='3.2' stroke-linejoin='round' points='"+arr.map((r,i)=>x(i).toFixed(1)+","+y(r[key]).toFixed(1)).join(" ")+"'/>";
 svg+=line(a,"#098879")+line(b,"#d08552")+"</svg>";
 return"<div class='chart'><h3>"+esc(title)+"</h3>"+svg+"<div class='legend'><i></i> World A <i class='b'></i> World B</div></div>"
}
function metrics(rows,types){
 return{crime:total(rows.map(r=>r.totalCrime)),recorded:total(rows.map(r=>r.recordedCrime)),arrests:total(rows.map(r=>r.violentArrests)),overdoses:total(rows.map(r=>r.overdoses)),deaths:total(rows.map(r=>r.overdoseDeaths)),recidivism:total(rows.map(r=>r.recidivism)),offers:total(rows.map(r=>r.offeredJobs)),meanEmployed:avg(rows.map(r=>r.employed)),trust:avg(rows.map(r=>r.trust)),byType:types.map((_,i)=>total(rows.map(r=>r.trueByType[i]))),byRecorded:types.map((_,i)=>total(rows.map(r=>r.recordedByType[i])))}
}
function build(opts){
 const{A,B,types,evidence,months,selected=50,replications=null,shocks=[]}=opts;
 const n=Math.min(Math.floor(months||0),A?.history.length||0,B?.history.length||0);
 if(n<1)throw Error("Run at least one synthetic month before generating a report.");
 const a=A.history.slice(0,n),b=B.history.slice(0,n),va=metrics(a,types),vb=metrics(b,types);
 const generated=new Date().toISOString().slice(0,16).replace("T"," ")+" UTC";
 const s=[];
 s.push("<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>GENESIS / Research Report</title><style>"+css+"</style></head><body>");
 s.push("<div class='toolbar'><span class='brand'>LAPLACE / GENESIS RESEARCH OUTPUT</span><div><button onclick='window.print()'>Print / Save PDF</button> <button id='saveHTML'>Download HTML</button></div></div>");
 s.push("<header class='cover'><div class='brand'>LAPLACE'S OFFICER / SCIENTIFIC SIMULATOR</div><h1>The Life of a City</h1><p>Paired synthetic policy worlds, individual life histories, offense decomposition, intervention outcomes and evidence provenance.</p>");
 s.push("<div class='tags'><span>JAN 2027 – "+esc(date(n))+"</span><span>"+n+" MONTHS</span><span>"+A.population+" MATCHED SYNTHETIC RESIDENTS</span><span>144 DISTRICTS</span><span>SEED "+A.seed+"</span><span>"+esc(generated)+"</span></div></header>");
 s.push("<div class='warning'><strong>INTERPRETATION WARNING:</strong> All crime counts, individual life outcomes, investment levels and policy trajectories in this report are fictitious model outputs. They are <strong>not observed data, real-world forecasts, calibrated causal effects, or individual risk assessments</strong>. Published studies inform narrowly specified pathways; they do not validate the wider model.</div>");
 s.push("<section class='section'><div class='eyebrow'>01 / EXECUTIVE SUMMARY</div><h2>What happened in the synthetic city?</h2><div class='kpis'>");
 for(const [title,v,note]of [["Underlying crime A",fmt(va.crime),"Simulated incidents"],["Underlying crime B",fmt(vb.crime),"Simulated incidents"],["A minus B",(va.crime-vb.crime>0?"+":"")+fmt(va.crime-vb.crime),"Not a causal estimate"],["Recorded crime A",fmt(va.recorded),"Observation is incomplete"]])s.push("<div><small>"+esc(title)+"</small><strong>"+esc(v)+"</strong><em>"+esc(note)+"</em></div>");
 s.push("</div><p class='finding'>The two matched worlds generated <strong>"+fmt(va.crime)+"</strong> versus <strong>"+fmt(vb.crime)+"</strong> underlying criminal incidents. Their recording systems registered <strong>"+fmt(va.recorded)+"</strong> versus <strong>"+fmt(vb.recorded)+"</strong>. Differences reflect chosen model assumptions, stochastic event draws and policy feedback—not estimated impacts on actual crime.</p>");
 if(Math.sign(va.crime-vb.crime)!==Math.sign(va.recorded-vb.recorded))s.push("<p class='finding'><strong>Measurement reversal:</strong> comparing recorded offenses produces a different direction of A–B difference from comparing underlying simulated offenses.</p>");
 s.push("<p><strong>Violent-crime arrests:</strong> "+fmt(va.arrests)+" vs "+fmt(vb.arrests)+". <strong>Overdose emergencies:</strong> "+fmt(va.overdoses)+" vs "+fmt(vb.overdoses)+". <strong>Overdose deaths:</strong> "+fmt(va.deaths)+" vs "+fmt(vb.deaths)+". <strong>Post-release recidivism events:</strong> "+fmt(va.recidivism)+" vs "+fmt(vb.recidivism)+". These are distinct outcomes, not interchangeable measures of crime.</p></section>");
 s.push("<section class='section'><div class='eyebrow'>02 / TRAJECTORIES</div><h2>How two futures developed</h2>");
 for(const [key,title]of [["totalCrime","Figure 1 · Underlying monthly criminal incidents"],["recordedCrime","Figure 2 · Police-recorded incidents"],["violentArrests","Figure 3 · Violent-crime arrests"],["trust","Figure 4 · Hypothetical mean trust"]])s.push(chart(a,b,key,title));
 s.push("<p class='fine'>Monthly counts have no measured exposure denominators; trust is a fictitious index. None of these graphs is an empirical trend for any actual city.</p></section>");
 s.push("<section class='section'><div class='eyebrow'>03 / OFFENSE PROFILES</div><h2>Disaggregate crime and harm</h2>");
 s.push(table(["Outcome category","Underlying A","Underlying B","Recorded A","Recorded B"],types.map((t,i)=>[t.name,fmt(va.byType[i]),fmt(vb.byType[i]),fmt(va.byRecorded[i]),fmt(vb.byRecorded[i])])));
 s.push("<p class='fine'>Overdose is a noncriminal health outcome, not included in cumulative criminal totals. Drug-market offenses include enforcement-sensitive discovery. Recorded offenses are never assumed to exhaust underlying incidents.</p></section>");
 s.push("<section class='section'><div class='eyebrow'>04 / POLICY HISTORY</div><h2>Actual policy settings applied during the run</h2>");
 const policyKeys=[["Deployment","policy"],["Prevention share","prevention"],["Surveillance coverage","surveillance"],["Patrol effect (hypothetical)","patrolEffect"],["City budget (hypothetical)","budget"],["Encounter style","procedure"]];
 s.push(table(["Setting","A first","A last","B first","B last"],policyKeys.map(([name,key])=>[name,String(a[0].policiesUsed[key]),String(a.at(-1).policiesUsed[key]),String(b[0].policiesUsed[key]),String(b.at(-1).policiesUsed[key])])));
 const changes=rows=>rows.slice(1).filter((r,i)=>JSON.stringify(r.policiesUsed)!==JSON.stringify(rows[i].policiesUsed)).length;
 s.push("<p>Recorded monthly policy changes: <strong>"+changes(a)+"</strong> in A; <strong>"+changes(b)+"</strong> in B. The graphs reflect month-by-month policy histories rather than applying final settings retrospectively.</p>");
 const shocksInPeriod=shocks.filter(k=>k.start<n);
 s.push("<p>Shared scenario shocks: "+esc(shocksInPeriod.length?shocksInPeriod.map(k=>k.type+" (month "+(k.start+1)+", "+k.duration+" months)").join("; "):"None recorded")+".</p>");
 s.push("<div class='twocol'><div><h3>WORLD A</h3><p>Mean modeled trust: "+pct(va.trust)+". Average employed residents: "+fmt(va.meanEmployed)+". Youth-job offers: "+fmt(va.offers)+".</p></div><div><h3>WORLD B</h3><p>Mean modeled trust: "+pct(vb.trust)+". Average employed residents: "+fmt(vb.meanEmployed)+". Youth-job offers: "+fmt(vb.offers)+".</p></div></div></section>");
 s.push("<section class='section'><div class='eyebrow'>05 / A LIFE IN TWO WORLDS</div><h2>"+esc(A.people[selected]?.name||"Synthetic resident")+"</h2>");
 s.push("<p class='fine'>A single fictional path is an illustration, not an estimated person-level effect. Both worlds share initial conditions and individual identifiers.</p>");
 const lA=root.GenesisEngine.stateOf(A,selected,n),lB=root.GenesisEngine.stateOf(B,selected,n);
 s.push(table(["Attribute at "+date(n),"World A","World B"],[
 ["Age",lA?.age,lB?.age],["District",lA?.home+1,lB?.home+1],["Employed",lA?.employed?"Yes":"No",lB?.employed?"Yes":"No"],
 ["Education index",lA?.education,lB?.education],["Police contacts",lA?.encounters,lB?.encounters],
 ["Victimizations",lA?.victimizations,lB?.victimizations],["Trust index",pct(lA?.trust),pct(lB?.trust)],
 ["Alive in cohort",lA?.alive?"Yes":"No",lB?.alive?"Yes":"No"]
 ]));
 for(const [letter,world]of [["A",A],["B",B]]){
  const events=root.GenesisEngine.historyOf(world,selected,n).slice(0,12);
  s.push("<h3>Life events · World "+letter+"</h3><ul class='life'>");
  if(!events.length)s.push("<li>No named life events recorded in this period.</li>");
  for(const e of events)s.push("<li><strong>"+esc(date(e.month))+"</strong> — "+esc(e.label)+"</li>");
  s.push("</ul>");
 }s.push("</section>");
 s.push("<section class='section'><div class='eyebrow'>06 / STOCHASTIC EXPERIMENTATION</div><h2>Are patterns robust within the model?</h2>");
 if(replications?.length){const diff=replications.map(r=>r.crimeA-r.crimeB).sort((a,b)=>a-b),quant=p=>diff[Math.floor((diff.length-1)*p)];
 s.push("<p>"+replications.length+" paired seeds: average A−B difference "+fix(avg(diff),1)+" simulated criminal incidents. Model-run 5th–95th percentile: <strong>"+fix(quant(.05),1)+" to "+fix(quant(.95),1)+"</strong>.</p>");
 s.push("<p class='caution'>Monte Carlo percentiles represent variation within the hypothetical model, not statistical confidence intervals for actual policy effects. The experiment may have a smaller synthetic population and horizon than this report.</p>");
 }else s.push("<p>No paired-replication results supplied. Single trajectories do not quantify stochastic uncertainty. Run the Experiment Lab to generate comparable repeated seed draws.</p>");
 s.push("</section>");
 s.push("<section class='section'><div class='eyebrow'>07 / EVIDENCE REGISTER</div><h2>Empirical sources and their exact uses</h2>");
 for(const e of evidence||[]){
  s.push("<div class='source'><div class='tag'>"+esc(e.classification)+"</div><h3>"+esc(e.title)+"</h3>");
  s.push("<p><strong>Design:</strong> "+esc(e.design)+"<br><strong>Population:</strong> "+esc(e.population)+"<br><strong>Measured outcome:</strong> "+esc(e.outcome)+"</p>");
  s.push("<p><strong>Study finding:</strong> "+esc(e.finding)+"<br><strong>GENESIS adaptation:</strong> "+esc(e.modelUse)+"</p>");
  s.push("<p class='fine'><strong>Limits:</strong> "+esc(e.limitations)+"</p><a href='"+esc(e.url)+"'>"+esc(e.source)+" · "+esc(e.url)+"</a></div>");
 }s.push("</section>");
 s.push("<section class='section'><div class='eyebrow'>08 / VALIDITY LIMITATIONS</div><h2>Do not mistake realism for validation</h2><ul>");
 for(const item of [
 "All agents, names, districts, events, housing and school characteristics, city budgets and numerical baseline rates are invented.",
 "Only three numerical study findings have narrowly scoped outcome uses: youth-job offers and violent arrests; treatment association and opioid-overdose mortality; correctional education and post-release recidivism odds.",
 "Employment, housing, trust, police deterrence, school quality, residential mobility and network influence coefficients are hypothetical.",
 "Cohort is closed, with no demographic births or migration calibration. Simulated counts are not rates per 100,000 residents.",
 "A common seed and initial population make in-model comparisons more interpretable, but do not establish causal identification or external validity.",
 "Individual outcomes are fictitious and must not be used as risk assessments. No police stop or enforcement action can be justified by a model score.",
 "Study populations, follow-up horizons, confounding, uncertainty and heterogeneous treatment effects prevent mechanically translating study estimates into citywide forecasts."
 ])s.push("<li>"+esc(item)+"</li>");
 s.push("</ul><p>For credible real-world policy evaluation, estimate actual outcome and exposure distributions, identify treatment contrasts, validate outcome definitions, assess transportability and plausible confounders, and report parameter uncertainty.</p></section>");
 s.push("<footer>GENESIS REPORT ENGINE · "+esc(generated)+" · SYNTHETIC DATA ONLY.<br><a href='https://crimjordan.github.io/laplaces-officer/genesis.html'>Interactive GENESIS research environment</a></footer>");
 s.push("<script>document.getElementById('saveHTML').addEventListener('click',function(){var b=new Blob(['<!doctype html>'+document.documentElement.outerHTML],{type:'text/html;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='genesis-report-"+n+"-months.html';a.click();setTimeout(function(){URL.revokeObjectURL(u)},1200)});</script></body></html>");
 return{html:s.join(""),filename:"genesis-report-"+n+"-months.html",months:n,summary:{A:va,B:vb}};
}
function open(input){const out=build(input);let tab=null;try{tab=root.open("about:blank","_blank")}catch(_){}
 if(tab){tab.document.open();tab.document.write(out.html);tab.document.close();try{tab.opener=null}catch(_){}return{...out,method:"tab"}}
 const blob=new Blob([out.html],{type:"text/html;charset=utf-8"}),u=URL.createObjectURL(blob),a=document.createElement("a");
 a.download=out.filename;a.href=u;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1800);
 return{...out,method:"download"};
}
root.GenesisReport={build,open};
})(window);