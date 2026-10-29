/* OMEGA REPORTER v1 — standalone, print-ready synthetic research reports.
   Purely descriptive calculations over a simulation. No causal identification,
   no external data transmission, no prediction of real-world outcomes. */
(function(global){
"use strict";
const DATE=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const COLORS={A:"#0e8b87",B:"#db8052"};
const num=n=>Number.isFinite(+n)?+n:0;
const sum=a=>a.reduce((s,v)=>s+num(v),0);
const mean=a=>a.length?sum(a)/a.length:0;
const int=n=>Math.round(num(n)).toLocaleString("en-US");
const dec=(n,d=1)=>num(n).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});
const percent=(v,d=1)=>Number.isFinite(v)?dec(v*100,d)+"%":"Not estimable";
const escapeHtml=t=>String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const monthName=m=>m?DATE[(m-1)%12]+" "+(2027+Math.floor((m-1)/12)):"JAN 2027";
const difference=(a,b)=>num(a)-num(b);
const signed=n=>(n>0?"+":"")+int(n);
const css=[
"@page{size:A4;margin:16mm 15mm}",
":root{--ink:#172b39;--muted:#577084;--sea:#0e8b87;--terra:#db8052;--line:#dce4e7;--bg:#f3f6f7;--panel:#eff4f5}",
"*{box-sizing:border-box}html{background:#dae2e5}body{max-width:1000px;margin:30px auto;padding:38px 50px;background:white;color:var(--ink);font:14px/1.55 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 20px 80px #1a34452e}",
"h1{font-size:39px;line-height:1.08;letter-spacing:-.04em;margin:12px 0}h2{font-size:21px;letter-spacing:-.025em;margin:0 0 12px}h3{font-size:15px;margin:0 0 7px}p{margin:8px 0 13px}a{color:#096b76;text-decoration:none}a:hover{text-decoration:underline}",
".brand{font:800 11px system-ui;letter-spacing:.19em;color:var(--sea)}.cover{padding:18px 0 26px;border-bottom:3px solid var(--ink);position:relative}.cover .subtitle{font-size:16px;max-width:760px;color:#516775}.meta{display:flex;gap:12px;flex-wrap:wrap;margin-top:17px}.meta span{font:700 11px system-ui;color:#4a6370;padding:6px 9px;background:var(--panel);border-radius:5px}",
".warning{border:1px solid #e6cba4;background:#fff7ea;padding:11px 13px;color:#6a4c26;margin:18px 0;border-radius:6px}.section{margin:26px 0;break-inside:auto}.section-title{display:flex;align-items:center;gap:12px;margin-bottom:11px}.section-title .index{font:800 11px system-ui;color:var(--sea)}.section-title h2{margin:0}",
".kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:16px 0}.kpi{padding:12px;border:1px solid var(--line);background:#f8fafb;border-radius:7px}.kpi small{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#516775}.kpi strong{display:block;font-size:23px;letter-spacing:-.035em;margin-top:6px}.kpi span{display:block;font-size:10px;color:#607988;margin-top:3px}",
".twocol{display:grid;grid-template-columns:1fr 1fr;gap:16px}.key{font-weight:700;color:var(--sea)}.finding{border-left:3px solid var(--sea);padding:7px 12px;margin:10px 0;background:#f4f9f8}.note{font-size:12px;color:#586f7a}.source{font-size:11px;word-break:break-word}",
"table{border-collapse:collapse;width:100%;margin:13px 0;font-size:11.5px;table-layout:fixed}thead{display:table-header-group}tr{break-inside:avoid}th{text-align:left;background:#e8eef0;color:#29475a;font-weight:800;font-size:10px;letter-spacing:.01em;padding:10px 6px;border-bottom:1px solid #bbced4}td{padding:8px 6px;border-bottom:1px solid #e4eaed;vertical-align:top;font-variant-numeric:tabular-nums}td.num,th.num{text-align:right}tbody tr:nth-child(even){background:#fafcfc}tfoot td{font-weight:800;background:#edf4f5}",
".chart{padding:12px;border:1px solid #dde7e9;border-radius:8px;margin:16px 0;break-inside:avoid}.chart svg{width:100%;height:auto;display:block}.legend{display:flex;gap:18px;font-size:11px;color:#4b6470;margin:5px 0}.legend i{display:inline-block;width:20px;height:3px;margin-right:6px;vertical-align:middle}.legend .a{background:var(--sea)}.legend .b{background:var(--terra)}",
".callout{border:1px solid #cad9dd;background:#f6fafb;padding:12px;margin:15px 0}.list{padding-left:20px}.list li{margin:8px 0}.banner{font-weight:900;color:var(--terra);text-transform:uppercase;letter-spacing:.09em;font-size:11px}.fineprint{font-size:10px;color:#69808a}",
".toolbar{position:sticky;top:0;z-index:5;background:#122938;color:#edf9fb;margin:-38px -50px 25px;padding:13px 22px;display:flex;justify-content:space-between;align-items:center;gap:15px}.toolbar button{background:#e9f7f4;color:#103b40;border:0;border-radius:5px;font-weight:800;padding:10px 14px;cursor:pointer}.toolbar .actions{display:flex;gap:8px}.toolbar .brand{color:#8ff4dd}",
"footer{margin-top:34px;border-top:2px solid var(--ink);padding-top:12px;color:#607987;font-size:10px}.page-break{break-before:page}",
"@media(max-width:750px){body{padding:20px;margin:0}.toolbar{margin:-20px -20px 22px;flex-wrap:wrap}.twocol,.kpis{grid-template-columns:1fr 1fr}.kpi strong{font-size:19px}h1{font-size:30px}table{font-size:10px}.chart{padding:5px}}",
"@media print{html{background:white}body{margin:0!important;padding:0!important;box-shadow:none!important;max-width:none!important;font-size:11px}.toolbar{display:none!important}.cover{padding-top:0}h1{font-size:34px}.section{margin:19px 0}.chart{padding:4px}.kpi{padding:8px}.kpi strong{font-size:20px}.warning{print-color-adjust:exact;-webkit-print-color-adjust:exact}.kpi,thead th,.chart,.finding{print-color-adjust:exact;-webkit-print-color-adjust:exact}a{color:#096b76}p{orphans:3;widows:3}}"
].join("\n");
function topShare(frame,key,types,excludeHealth){
 if(!frame||!frame.length)return NaN;
 const counts=frame.map(d=>(key==="truth"?d.truth:d.recorded||[]).reduce((s,n,k)=>s+(excludeHealth&&types[k]?.isHarm?0:num(n)),0));
 const total=sum(counts);
 if(total===0)return NaN;
 return sum(counts.slice().sort((a,b)=>b-a).slice(0,15))/total;
}
function gini(values){const v=values.map(x=>Math.max(0,num(x))).sort((a,b)=>a-b),n=v.length,tot=sum(v);if(!n||!tot)return NaN;return v.reduce((s,x,i)=>s+(2*(i+1)-n-1)*x,0)/(n*tot)}
function monthlyAudit(frame,types){
 if(!Array.isArray(frame)||frame.length===0)return null;
 const ranked=frame.map((d,i)=>({i,risk:(d.priorScore||d.score||[]).reduce((s,n,k)=>s+(types[k]?.isHarm?0:num(n)),0),
   true:(d.truth||[]).reduce((s,n,k)=>s+(types[k]?.isHarm?0:num(n)),0)}));
 const byRisk=ranked.slice().sort((a,b)=>b.risk-a.risk||a.i-b.i).slice(0,20);
 const byTrue=new Set(ranked.slice().sort((a,b)=>b.true-a.true||a.i-b.i).slice(0,20).map(d=>d.i));
 return byRisk.filter(d=>byTrue.has(d.i)).length;
}
function summarizeWorld(world,n,types){
 const rows=world.history.slice(0,n),endFrame=world.snapshots?.[n-1];
 const byTrue=types.map((_,k)=>sum(rows.map(r=>r.trueByType?.[k]))),byRecorded=types.map((_,k)=>sum(rows.map(r=>r.recordedByType?.[k])));
 const budget=sum(rows.map(r=>r.budgetMillions));
 const preventionCost=sum(rows.map(r=>num(r.budgetMillions)*num(r.prevention)/100));
 const observed=sum(rows.map(r=>r.recordedCrime)),underlying=sum(rows.map(r=>r.trueCrime));
 const shocks=rows.reduce((s,r)=>s+((r.shocksActive||[]).length>0?1:0),0);
 const audit=rows.map((r,i)=>monthlyAudit(world.snapshots?.[i],types)).filter(v=>Number.isFinite(v));
 const concentrations=topShare(endFrame,"truth",types,true);
 const counts=endFrame?.map(d=>(d.truth||[]).reduce((s,v,k)=>s+(types[k]?.isHarm?0:num(v)),0))||[];
 const policies=[...new Set(rows.map(r=>r.settingsSnapshot?.policy||r.policy||"unspecified"))];
 const changed=rows.some((r,i)=>i>0&&JSON.stringify(r.settingsSnapshot)!==JSON.stringify(rows[i-1].settingsSnapshot));
 return {rows,byTrue,byRecorded,underlying,observed,overdose:sum(rows.map(r=>r.overdose)),
    recordedOverdose:sum(rows.map(r=>r.recordedOverdose)),meanTrust:mean(rows.map(r=>r.trust)),
    lastTrust:rows.at(-1)?.trust||NaN,budget,preventionCost,meanPatrol:mean(rows.map(r=>r.patrolCount)),
    meanCoverage:mean(rows.map(r=>r.supportReach)),auditMean:mean(audit),auditMonths:audit.length,
    max15Share:concentrations,gini:gini(counts),settingsChanged:changed,policies,
    firstSettings:rows[0]?.settingsSnapshot||world.settings,lastSettings:rows.at(-1)?.settingsSnapshot||world.settings,
    meanObservation:underlying>0?observed/underlying:NaN,shockMonths:shocks,
    start12:mean(rows.slice(0,Math.min(12,n)).map(r=>r.trueCrime)),
    end12:mean(rows.slice(Math.max(0,n-12)).map(r=>r.trueCrime))};
}
function svgLineChart(a,b,key,title,unit="number"){
 const length=Math.min(a.length,b.length);
 if(!length)return "";
 const values=a.concat(b).map(r=>num(r[key]));
 const high=Math.max(1,...values),low=unit==="percent"?0:0;
 const max=unit==="percent"?1:high*1.13;
 const w=900,h=280,l=61,t=29,r=18,bot=45,pw=w-l-r,ph=h-t-bot;
 const x=i=>l+(i/Math.max(1,length-1))*pw;
 const y=v=>t+(1-(num(v)-low)/Math.max(.0001,max-low))*ph;
 const esc=escapeHtml;
 let v="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 280' role='img' aria-label='"+esc(title)+"'>";
 v+="<title>"+esc(title)+"</title><desc>Synthetic monthly outcomes for World A and World B across "+length+" months.</desc>";
 for(let j=0;j<=4;j++){const value=low+(max-low)*j/4,yy=y(value);
    v+="<line x1='"+l+"' x2='"+(w-r)+"' y1='"+yy+"' y2='"+yy+"' stroke='#e0eaed' stroke-width='1'/>";
    v+="<text x='"+(l-8)+"' y='"+(yy+4)+"' text-anchor='end' font-size='12' fill='#617b88'>"+esc(unit==="percent"?Math.round(value*100)+"%":int(value))+"</text>";
 }
 for(let j=0;j<=4;j++){const i=Math.round((length-1)*j/4),xx=x(i);
    v+="<text x='"+xx+"' y='"+(h-13)+"' text-anchor='middle' font-size='12' fill='#617b88'>"+(i+1)+"</text>";
 }
 const pts=rows=>rows.map((row,i)=>x(i).toFixed(2)+","+y(row[key]).toFixed(2)).join(" ");
 v+="<polyline points='"+pts(a)+"' fill='none' stroke='"+COLORS.A+"' stroke-width='3.4' stroke-linejoin='round' stroke-linecap='round'/>";
 v+="<polyline points='"+pts(b)+"' fill='none' stroke='"+COLORS.B+"' stroke-width='3.4' stroke-linejoin='round' stroke-linecap='round'/>";
 v+="<text x='"+(w/2)+"' y='"+(h-1)+"' text-anchor='middle' fill='#617b88' font-size='12'>Simulated month</text></svg>";
 return "<div class='chart'><h3>"+esc(title)+"</h3>"+v+"<div class='legend'><span><i class='a'></i> World A</span><span><i class='b'></i> World B</span></div></div>";
}
function heading(i,title){return "<div class='section-title'><span class='index'>"+String(i).padStart(2,"0")+" /</span><h2>"+escapeHtml(title)+"</h2></div>"}
function addTable(headers,rows,foot){
 let h="<table><thead><tr>"+headers.map((x,i)=>"<th"+(i?" class='num'":"")+">"+escapeHtml(x)+"</th>").join("")+"</tr></thead><tbody>";
 for(const row of rows){h+="<tr>"+row.map((cell,i)=>"<td"+(i?" class='num'":"")+">"+escapeHtml(cell)+"</td>").join("")+"</tr>"}
 h+="</tbody>";if(foot)h+="<tfoot><tr>"+foot.map((x,i)=>"<td"+(i?" class='num'":"")+">"+escapeHtml(x)+"</td>").join("")+"</tr></tfoot>";return h+"</table>";
}
function formatSetting(v,k){if(v==null)return "Not recorded";if(k==="budget")return "$"+int(v)+"M / month";if(k==="prevention"||k==="surveillance")return dec(v,0)+"%";return String(v).replaceAll("_"," ")}
function build(input){
 const end=Math.min(Math.max(0,Math.floor(num(input.months))),input.A?.history?.length||0,input.B?.history?.length||0);
 if(end<1)throw Error("Run at least one simulated month before generating a report.");
 const types=input.types||[];
 const A=summarizeWorld(input.A,end,types),B=summarizeWorld(input.B,end,types);
 const profile=["full","trends","audit","prevention"].includes(input.profile)?input.profile:"full";
 const totals={crimeA:A.underlying,crimeB:B.underlying,recordedA:A.observed,recordedB:B.observed,
 overdoseA:A.overdose,overdoseB:B.overdose,relativeDifference:B.underlying>0?(A.underlying-B.underlying)/B.underlying:NaN};
 const label={full:"Comprehensive Research Report",trends:"Crime and Harm Trend Report",audit:"Prediction & Observation Audit",prevention:"Prevention & Investment Report"}[profile];
 const generated=new Date().toISOString().slice(0,16).replace("T"," ")+" UTC";
 const first=monthName(1),last=monthName(end);
 const h=[];
 h.push("<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>OMEGA Research Report — "+escapeHtml(last)+"</title><style>"+css+"</style></head><body>");
 h.push("<div class='toolbar'><span class='brand'>LAPLACE / OMEGA REPORTS</span><div class='actions'><button onclick='window.print()'>Print / Save PDF</button><button id='downloadHTML' type='button'>Download standalone HTML</button></div></div>");
 h.push("<header class='cover'><div class='brand'>LAPLACE'S OFFICER / RESEARCH SIMULATOR</div><h1>"+escapeHtml(label)+"</h1>");
 h.push("<p class='subtitle'>Two synthetic policy futures. Reproducible simulated counts and descriptive comparisons, with methodological qualifications and source documentation.</p>");
 h.push("<div class='meta'><span>SIMULATED PERIOD · "+escapeHtml(first)+"–"+escapeHtml(last)+"</span><span>"+end+" MONTHS</span><span>144 SYNTHETIC DISTRICTS</span><span>SEED "+escapeHtml(input.seed||204921)+"</span><span>GENERATED "+escapeHtml(generated)+"</span></div></header>");
 h.push("<div class='warning'><strong>Research integrity notice.</strong> This document describes a fictional, nonvalidated simulation. All district counts, offense rates, financial amounts, intervention effects, trust levels, and policy comparisons are <strong>model-generated</strong>. They are not observed data, causal treatment effects, cost-benefit findings, or forecasts of real-world crime. Findings must not be used to deploy police or evaluate actual programs.</div>");
 h.push("<section class='section'>"+heading(1,"Executive summary"));
 h.push("<div class='kpis'>");
 for(const [caption,value,note] of [
   ["Underlying crimes / A",int(A.underlying),"Cumulative generated offenses"],
   ["Underlying crimes / B",int(B.underlying),"Cumulative generated offenses"],
   ["A − B",signed(A.underlying-B.underlying),"Difference in simulated counts"],
   ["Recorded signal / A",int(A.observed),"Not the underlying total"]
 ])h.push("<div class='kpi'><small>"+escapeHtml(caption)+"</small><strong>"+escapeHtml(value)+"</strong><span>"+escapeHtml(note)+"</span></div>");
 h.push("</div>");
 const lead=A.underlying===B.underlying?"Both worlds generated the same number of total criminal incidents in this period.":A.underlying<B.underlying?"World A generated "+int(B.underlying-A.underlying)+" fewer criminal incidents than World B.":"World A generated "+int(A.underlying-B.underlying)+" more criminal incidents than World B.";
 h.push("<p class='finding'><strong>Primary descriptive comparison.</strong> "+escapeHtml(lead)+" The difference is a consequence of the model's chosen mechanisms and stochastic generation, not evidence of policy effectiveness.</p>");
 const signsUnderlying=Math.sign(A.underlying-B.underlying),signsRecorded=Math.sign(A.observed-B.observed);
 if(signsUnderlying!==0&&signsRecorded!==0&&signsUnderlying!==signsRecorded){
   h.push("<p class='finding'><strong>Measurement reversal.</strong> The ordering of Worlds A and B reverses when comparing underlying incidents with recorded incidents. Within this model, the observed surveillance signal can support a different conclusion than the underlying event count.</p>")
 }else h.push("<p class='finding'><strong>Observation is conditional.</strong> Recorded counts differ from underlying generated counts because the simulation explicitly models reporting and police discovery. Agreement in rank between the worlds does not make the recorded data complete.</p>");
 h.push("<p class='finding'><strong>Other outcomes.</strong> The model generated "+int(A.overdose)+" overdose emergencies in A and "+int(B.overdose)+" in B. Mean modeled trust was "+percent(A.meanTrust)+" in A versus "+percent(B.meanTrust)+" in B. Overdose emergencies are noncriminal harms and are never included in the cumulative crime totals.</p>");
 if(A.settingsChanged||B.settingsChanged)h.push("<p class='note'><strong>Important:</strong> One or both worlds changed policy settings during this period. The tables use the historical settings stored for each simulated month; the final controls alone would misrepresent the full run.</p>");
 h.push("</section>");

 if(profile==="full"||profile==="trends"||profile==="prevention"){
  h.push("<section class='section'>"+heading(2,"Trends through simulated time"));
  h.push("<p>Figures show monthly generated counts, not rates per resident. The two worlds share their initial synthetic city and random seed, but policy settings, observation processes, and interventions differ.</p>");
  h.push(svgLineChart(A.rows,B.rows,"trueCrime","Figure 1. Underlying criminal incidents"));
  h.push(svgLineChart(A.rows,B.rows,"recordedCrime","Figure 2. Police-recorded criminal incidents"));
  if(profile==="full"||profile==="prevention")h.push(svgLineChart(A.rows,B.rows,"overdose","Figure 3. Overdose emergencies — separate noncriminal outcome"));
  h.push("<div class='twocol'><div class='callout'><strong>WORLD A / monthly trajectory</strong><p>Mean monthly underlying incidents in the first "+Math.min(end,12)+" observed months: <strong>"+dec(A.start12)+"</strong>. Mean of the last "+Math.min(end,12)+" months: <strong>"+dec(A.end12)+"</strong>.</p></div>");
  h.push("<div class='callout'><strong>WORLD B / monthly trajectory</strong><p>Mean monthly underlying incidents in the first "+Math.min(end,12)+" months: <strong>"+dec(B.start12)+"</strong>. Mean of the last "+Math.min(end,12)+" months: <strong>"+dec(B.end12)+"</strong>.</p></div></div>");
  h.push("<p class='note'>First-versus-last windows overlap when the report covers fewer than 24 months. No statistical hypothesis tests, causal identification, or model-fitting uncertainty are supplied by this simulator.</p></section>");
 }
 if(profile==="full"||profile==="trends"){
  h.push("<section class='section'>"+heading(3,"Crime categories and recording"));
  const rows=types.map((type,k)=>[type.name+(type.isHarm?" (health harm)":""),
    int(A.byTrue[k]),int(B.byTrue[k]),int(A.byRecorded[k]),int(B.byRecorded[k]),signed(A.byTrue[k]-B.byTrue[k])]);
  h.push(addTable(["Outcome category","Underlying A","Underlying B","Recorded A","Recorded B","A − B"],rows));
  h.push("<p class='note'>Cumulative category counts reflect model events over "+end+" exposure months; they are not incident rates. Drug-market offenses include an enforcement-sensitive discovery mechanism. The final row is an overdose health outcome, not crime.</p>");
  const annual=[];
  for(let start=0;start<end;start+=12){
    const a=A.rows.slice(start,start+12),b=B.rows.slice(start,start+12);
    annual.push([String(2027+Math.floor(start/12))+(a.length<12?" (partial)":""),int(sum(a.map(x=>x.trueCrime))),int(sum(b.map(x=>x.trueCrime))),int(sum(a.map(x=>x.recordedCrime))),int(sum(b.map(x=>x.recordedCrime))),int(sum(a.map(x=>x.overdose))),int(sum(b.map(x=>x.overdose)))]);
  }
  h.push("<h3>Table 2. Annual or partial-year totals</h3>");
  h.push(addTable(["Simulated year","Crime A","Crime B","Recorded A","Recorded B","Overdose A","Overdose B"],annual));
  h.push("</section>");
 }
 if(profile==="full"||profile==="audit"){
  h.push("<section class='section'>"+heading(4,"Algorithmic measurement audit"));
  h.push(svgLineChart(A.rows,B.rows,"observation","Figure 4. Share of all generated events recorded", "percent"));
  h.push("<div class='twocol'><div class='callout'><h3>Prediction diagnostic</h3><p>Mean overlap between the <strong>20 highest prior-score districts</strong> and the 20 highest realized-crime districts:</p><p><strong>World A:</strong> "+dec(A.auditMean,1)+" / 20<br><strong>World B:</strong> "+dec(B.auditMean,1)+" / 20</p></div>");
  h.push("<div class='callout'><h3>Geographic concentration</h3><p>At the report endpoint, the 15 most affected of 144 districts account for <strong>"+percent(A.max15Share)+"</strong> of A's underlying criminal events, compared with <strong>"+percent(B.max15Share)+"</strong> in B.</p><p>Endpoint Gini of district incident counts: "+dec(A.gini,3)+" (A) vs "+dec(B.gini,3)+" (B).</p></div></div>");
  h.push("<p><strong>Interpretation:</strong> The risk-score overlap is a ranking exercise on an invented, predictable geography. It is not accuracy on unseen real data. Scores are recorded-signal moving averages computed before the realized month; comparing them with contemporaneous observations would leak outcome information into the audit.</p>");
  h.push("<p class='note'>Recorded share is a fraction of generated events that the model marked as observed (across both criminal and overdose categories). This is not a real reporting rate. Concentration, Gini coefficients, and overlap depend on the simulated geography and sample size.</p></section>");
 }
 if(profile==="full"||profile==="prevention"){
  h.push("<section class='section'>"+heading(5,"Prevention, resources, and public trust"));
  h.push(svgLineChart(A.rows,B.rows,"trust","Figure 5. Monthly average hypothetical trust","percent"));
  h.push("<div class='kpis'>");
  for(const [caption,value,note] of [
    ["Budget A","$"+dec(A.budget,0)+"M","Sum of fictional monthly allocations"],
    ["Budget B","$"+dec(B.budget,0)+"M","Sum of fictional monthly allocations"],
    ["Prevention A","$"+dec(A.preventionCost,0)+"M","Implied allocation, not expenditure audit"],
    ["Prevention B","$"+dec(B.preventionCost,0)+"M","Implied allocation, not expenditure audit"]
  ])h.push("<div class='kpi'><small>"+escapeHtml(caption)+"</small><strong>"+escapeHtml(value)+"</strong><span>"+escapeHtml(note)+"</span></div>");
  h.push("</div>");
  h.push("<p>The model's mean number of patrolled districts per month was <strong>"+dec(A.meanPatrol)+"</strong> in World A and <strong>"+dec(B.meanPatrol)+"</strong> in World B. Average model support-reach indices were <strong>"+dec(A.meanCoverage,2)+"</strong> and <strong>"+dec(B.meanCoverage,2)+"</strong>. These indices do not represent verified program participation or an actual number of clients served.</p>");
  h.push("<p>The hypothetical pathways include treatment access, an education stock with delayed maturation, housing support, and violence interruption. Their effects vary by crime category inside the model. <strong>The coefficients used are not direct translations of study effect sizes, and this section cannot support a real-world benefit-cost ratio or claim of lives saved.</strong></p></section>");
 }
 h.push("<section class='section'>"+heading(6,"Policy configuration and scenario history"));
 const settingRows=["policy","tactics","prevention","budget","surveillance"].map(k=>[
   ({policy:"Deployment strategy",tactics:"Enforcement style",prevention:"Prevention allocation",budget:"Total budget",surveillance:"Surveillance coverage"})[k],
   formatSetting(A.firstSettings[k],k),formatSetting(A.lastSettings[k],k),
   formatSetting(B.firstSettings[k],k),formatSetting(B.lastSettings[k],k)
 ]);
 h.push(addTable(["Setting","A: first month","A: final month","B: first month","B: final month"],settingRows));
 h.push("<p><strong>Policies actually used:</strong> World A — "+escapeHtml(A.policies.join(", "))+"; World B — "+escapeHtml(B.policies.join(", "))+".");
 h.push("<br><strong>Historical control changes:</strong> "+(A.settingsChanged?"A changed; ":"A unchanged; ")+(B.settingsChanged?"B changed.":"B unchanged.")+"</p>");
 const eventRows=(input.shocks||[]).filter(s=>s.start<end).map(s=>[
   String(s.type||"unspecified").replaceAll("_"," "),
   monthName((s.start||0)+1),
   int(Math.min(end-s.start,s.duration)),
   "Both simulated worlds"
 ]);
 if(eventRows.length)h.push("<h3>Table 4. Injected scenario shocks overlapping this report</h3>"+addTable(["Shock","Start","Included months","Applies to"],eventRows));
 else h.push("<p>No manual scenario shocks were recorded during the reported months.</p>");
 h.push("<p class='note'>The simulator records the actual month-by-month policy inputs for analysis. Intervention mix and spillover assumptions at the endpoint can be inspected in the downloadable JSON export; when varied during a run, those parameters are also stored month-by-month in its history records.</p>");
 h.push("</section>");
 h.push("<section class='section'>"+heading(7,"Methods, evidence, and limitations"));
 h.push("<h3>Model architecture</h3><p>OMEGA simulates 144 fictional districts over monthly steps. Twelve modeled outcomes include eleven criminal/complaint categories and one separate noncriminal overdose health outcome. District baselines vary by invented land-use characteristics, simplified seasonal patterns, and a seeded random generator. A deployment algorithm assigns attention by prior recorded-risk scores, randomized allocation, equal rotation, need, or an intentionally unrealistic oracle benchmark. Incident generation is then modified by user-selected hypothetical mechanisms. Observation is generated separately through reporting/discovery probabilities, meaning recorded counts are not equal to underlying counts.</p>");
 h.push("<h3>Evidence informing the questions, not calibrating the coefficients</h3><ol class='list'>");
 const sources=[
  ["Braga, Turchan, Papachristos, & Hureau. Hot-spots policing: systematic review (2019).","https://www.campbellcollaboration.org/review/effects-of-hot-spots-policing-on-crime/"],
  ["Ensign, Friedler, Neville, Scheidegger, & Venkatasubramanian. Runaway feedback loops in predictive policing (2018).","https://proceedings.mlr.press/v81/ensign18a.html"],
  ["Lum & Isaac. To predict and serve? (2016).","https://doi.org/10.1111/j.1740-9713.2016.00960.x"],
  ["RAND / OJP. Evaluating the effectiveness of correctional education: a meta-analysis (2013).","https://www.ojp.gov/index.php/library/publications/evaluating-effectiveness-correctional-education-meta-analysis-programs-provide"],
  ["CDC. Opioid use disorder: treating (clinical evidence overview).","https://www.cdc.gov/overdose-prevention/hcp/clinical-care/opioid-use-disorder-treating.html"]
 ];
 for(const [title,url] of sources)h.push("<li><strong>"+escapeHtml(title)+"</strong><br><a class='source' href='"+escapeHtml(url)+"'>"+escapeHtml(url)+"</a></li>");
 h.push("</ol>");
 h.push("<h3>Limitations and inferential guardrails</h3><ul class='list'>");
 for(const item of [
 "No parameters were fitted to actual city data. Synthetic counts do not describe any real community or police agency.",
 "Comparing two simulated worlds with a common seed is an illustrative counterfactual, not an identified causal treatment effect.",
 "No demographic, socioeconomic exposure denominator or population rate is provided. Avoid interpreting raw counts as individual risk.",
 "Education, treatment, housing, deterrence, drug enforcement, trust, and spatial spillover are stylized mechanisms with hypothetical strengths.",
 "No confidence or credible intervals, sampling design, observational validation, or robust sensitivity analysis are included.",
 "Historical interventions, observation probabilities, and geographic heterogeneity make simple recorded-crime comparisons potentially misleading.",
 "The prevention budget is a simulated allocation; the financial figures should not be interpreted as actual prices, cost savings, or program returns.",
 "The ranking audit describes internal consistency on this synthetic world; it does not establish operational predictive validity."
 ])h.push("<li>"+escapeHtml(item)+"</li>");
 h.push("</ul><p class='note'>Recommended scholarly use: treat the environment as a pedagogical sandbox or a conceptual demonstration. To evaluate real policies, specify the jurisdiction, identify measured outcomes and exposure denominators, estimate credible treatment effects, assess uncertainty and identification assumptions, and review relevant legal and ethical constraints.</p></section>");
 h.push("<footer>OMEGA REPORT ENGINE v1 · SYNTHETIC SCENARIO · GENERATED "+escapeHtml(generated)+" · NO EXTERNAL DATA SHARED.<br>Source and simulator: <a href='https://crimjordan.github.io/laplaces-officer/omega.html'>crimjordan.github.io/laplaces-officer/omega.html</a></footer>");
 // A standalone document: nothing external is required for rendering or printing.
 h.push("<script>(function(){var b=document.getElementById('downloadHTML');if(!b)return;b.addEventListener('click',function(){var blob=new Blob(['<!doctype html>'+document.documentElement.outerHTML],{type:'text/html;charset=utf-8'});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download='omega-research-report-"+end+"-months.html';a.click();setTimeout(function(){URL.revokeObjectURL(url)},1500)})})();</script></body></html>");
 return {html:h.join(""),filename:"omega-research-report-"+end+"-months.html",metrics:{A,B,end,totals,profile},generated,reportTitle:label};
}
function open(input){
 const result=build(input);
 let tab=null;
 try{tab=global.open("about:blank","_blank")}catch(_){}
 if(tab){
   tab.document.open();tab.document.write(result.html);tab.document.close();
   try{tab.opener=null}catch(_){}
   return {...result,method:"new_tab"};
 }
 const blob=new Blob([result.html],{type:"text/html;charset=utf-8"});
 const url=URL.createObjectURL(blob),anchor=document.createElement("a");
 anchor.href=url;anchor.download=result.filename;document.body.append(anchor);anchor.click();anchor.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
 return {...result,method:"download"};
}
global.LaplaceOmegaReport={build,open,analyze:summarizeWorld,topShare,monthlyAudit};
})(window);