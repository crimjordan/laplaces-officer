/* GENESIS SOVEREIGN printable research report.
   Exposes actual simulated time series and explicit evidence limits. */
(function(root){"use strict";
const esc=x=>String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const fmt=n=>Math.round(Number(n)||0).toLocaleString("en-US");
const compact=n=>Number(n||0).toLocaleString("en-US",{notation:"compact",maximumFractionDigits:2});
const pct=n=>Number.isFinite(n)?(100*n).toFixed(1)+"%":"N/A";
function table(head,rows){
 return"<table><thead><tr>"+head.map(x=>"<th>"+esc(x)+"</th>").join("")+"</tr></thead><tbody>"+rows.map(row=>
 "<tr>"+row.map(cell=>"<td>"+esc(cell)+"</td>").join("")+"</tr>").join("")+"</tbody></table>";
}
const css=[
"@page{size:A4;margin:15mm}*{box-sizing:border-box}html{background:#e5edef}body{max-width:1000px;margin:28px auto;padding:45px 54px;background:white;color:#16313f;box-shadow:0 14px 50px #1335;font:12px/1.55 system-ui,Arial}",
"h1{font-size:40px;letter-spacing:-.05em;line-height:1.05;margin:8px 0 16px}h2{font-size:19px;margin:7px 0 11px}h3{font-size:13px;margin:7px 0}",
"p{margin:7px 0 13px}.brand{color:#0b8c7e;font:900 10px system-ui;letter-spacing:.12em}",
".toolbar{position:sticky;top:0;display:flex;align-items:center;justify-content:space-between;background:#133848;color:#fff;margin:-45px -54px 24px;padding:13px 18px}",
".toolbar button{padding:10px 13px;background:#b7f9e6;color:#08382e;font-weight:800;border:0;border-radius:6px;cursor:pointer}",
"header{border-bottom:3px solid #193c49;padding:5px 0 22px}.small{font-size:10px;color:#617e89}",
".warning{border:1px solid #ddb88b;background:#fff6e9;color:#6b4c2b;padding:12px;margin:19px 0}",
".section{margin:24px 0}.eyebrow{font-size:10px;color:#098679;font-weight:900;letter-spacing:.10em}",
"table{width:100%;border-collapse:collapse;font-size:10px;margin:11px 0}th{background:#e9f2f3;text-align:left;padding:8px 6px}td{border-bottom:1px solid #deeaed;padding:8px 6px}tr{break-inside:avoid}tbody tr:nth-child(even){background:#f8fafb}",
".charts{display:grid;grid-template-columns:1fr 1fr;gap:9px}.plot{border:1px solid #dae7eb;padding:9px;break-inside:avoid}.plot svg{width:100%;height:auto}",
".legend{font-size:10px;color:#677e88}li{margin:7px 0}.sources a{color:#0a8079}",
"footer{border-top:2px solid #193c49;font-size:10px;color:#64838c;padding-top:13px;margin-top:28px}",
"@media print{html{background:#fff}body{margin:0;padding:0;max-width:none;box-shadow:none}.toolbar{display:none}.warning,th{print-color-adjust:exact;-webkit-print-color-adjust:exact}}"
].join("\n");
function plot(a,b,key,title){
 const n=Math.min(a.length,b.length);if(!n)return"";
 const max=Math.max(1,...a,...b)*1.1,w=870,h=260,x0=61,y0=18,W=785,H=203;
 const x=i=>x0+i/Math.max(1,n-1)*W,y=v=>y0+H*(1-v/max);
 let svg="<svg viewBox='0 0 "+w+" "+h+"' role='img' aria-label='"+esc(title)+"'>";
 for(let i=0;i<=4;i++){const value=max*i/4,yy=y(value);
  svg+="<path d='M"+x0+" "+yy+" H845' stroke='#dce5e8'/>"+
  "<text x='53' y='"+(yy+4)+"' text-anchor='end' font-size='11' fill='#697e86'>"+esc(compact(value))+"</text>"}
 for(const [data,color]of [[a,"#087d74"],[b,"#bb7d47"]]){
  svg+="<polyline fill='none' stroke='"+color+"' stroke-width='3' points='"+
    data.map((v,i)=>x(i).toFixed(1)+","+y(v).toFixed(1)).join(" ")+"'/>";
 }
 svg+="<text x='61' y='248' font-size='11' fill='#617c85'>2028</text><text x='845' y='248' font-size='11' text-anchor='end' fill='#617c85'>"+(2027+n)+"</text></svg>";
 return"<div class='plot'><h3>"+esc(title)+"</h3>"+svg+"<p class='legend'>WORLD A (teal) · WORLD B (amber)</p></div>";
}
function build(geo,A,B,months,offenses,events=[]){
 const E=root.GenesisSovereign,n=Math.min(Math.max(0,Math.floor(months||0)),A.history.length,B.history.length);
 if(n<1)throw Error("Simulate one year to create a report.");
 const a=A.history[n-1],b=B.history[n-1],rows=[
 ["Population",fmt(a.population),fmt(b.population)],
 ["Underlying criminal incidents",fmt(a.underlying),fmt(b.underlying)],
 ["Police-recorded incidents",fmt(a.recorded),fmt(b.recorded)],
 ["Overdose emergencies (noncriminal)",fmt(a.overdoses),fmt(b.overdoses)],
 ["Opioid-overdose deaths",fmt(a.overdoseDeaths),fmt(b.overdoseDeaths)],
 ["Violent-crime arrests",fmt(a.violentArrests),fmt(b.violentArrests)],
 ["Post-release recidivism",fmt(a.recidivism),fmt(b.recidivism)],
 ["Housing instability",fmt(a.homeless),fmt(b.homeless)],
 ["Mean modeled employment",pct(a.employment),pct(b.employment)],
 ["Hypothetical trust",pct(a.trust),pct(b.trust)],
 ["Interprovince migration",fmt(a.interprovinceMigration),fmt(b.interprovinceMigration)],
 ["Housing support",fmt(a.housingSupport),fmt(b.housingSupport)],
 ["Youth program offers",fmt(a.youthOffers),fmt(b.youthOffers)],
 ["Treatment starts",fmt(a.treatmentStarts),fmt(b.treatmentStarts)]
 ];
 const regionRows=geo.provinces.map(p=>{
  const aa=E.provinceReport(A,n,p.id),bb=E.provinceReport(B,n,p.id);
  return[p.name,fmt(aa.population),fmt(aa.underlying),fmt(bb.underlying),pct(aa.trust),pct(bb.trust),
   fmt(aa.homeless),fmt(bb.homeless)];
 });
 const crimeRows=E.OFFENSES.map((t,i)=>[t.label,fmt(a.offenses[i]),fmt(b.offenses[i]),
  fmt(a.recordedOffenses[i]),fmt(b.recordedOffenses[i])]);
 const data=(W,k)=>W.history.slice(0,n).map(r=>r[k]);
 const charts="<div class='charts'>"+
  plot(data(A,"underlying"),data(B,"underlying"),"crime","Annual underlying criminal incidents")+
  plot(data(A,"recorded"),data(B,"recorded"),"recorded","Police-recorded incidents")+
  plot(data(A,"homeless"),data(B,"homeless"),"housing","Hypothetical housing instability")+
  plot(data(A,"violentArrests"),data(B,"violentArrests"),"arrests","Violent-crime arrests")+"</div>";
 const evidence=Object.values(E.PROGRAMS).filter(p=>p.url).map(p=>
  "<li><strong>"+esc(p.country)+" / "+esc(p.name)+":</strong> "+esc(p.anchor)+
   ". <em>Limitation:</em> "+esc(p.limitation)+". <a href='"+esc(p.url)+"'>Research source</a></li>").join("");
 const overrides=world=>Object.entries(world.config.provincePolicies).map(([id,k])=>geo.provinces[+id]?.name+": "+E.PROGRAMS[k]?.name).join("; ")||"None";
 const limitations=[
  "The geography, provinces, cities, transport network, land use, population totals and climate events are procedurally generated and do not correspond to a real country.",
  "Baseline crime incidence, report probabilities, demographic changes, migration, and almost all social, enforcement and economic transitions are hypothetical and not calibrated.",
  "A country-inspired program label does not import the country's actual historical outcomes or establish that its policy can be transported to this model.",
  "Chicago's summer-jobs RCT anchor applies to arrests among selected youth; it does not lower all underlying crimes.",
  "The Larochelle medication association is observational and conditional on treatment among overdose survivors; baseline mortality and access are uncalibrated.",
  "Correctional-education odds ratios are applied only to synthetic program exposure; the untreated baseline and program reach are assumed.",
  "Holding shared random seeds across policy worlds improves reproducibility within the artificial model but provides no external validity.",
  "Recorded crime changes with policing and surveillance even if underlying crime remains unchanged.",
  "Centuries-long simulations are speculative scenario experiments, not long-range forecasts."
 ];
 const policies=[["World A",E.PROGRAMS[A.config.national].name,overrides(A),JSON.stringify(a.policyApplied)],
  ["World B",E.PROGRAMS[B.config.national].name,overrides(B),JSON.stringify(b.policyApplied)]];
 const HTML="<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"+
 "<title>GENESIS SOVEREIGN | National Research Report</title><style>"+css+"</style></head><body>"+
 "<div class='toolbar'><strong>GENESIS / SOVEREIGN SCIENTIFIC OUTPUT</strong><button onclick='window.print()'>PRINT / SAVE PDF</button></div>"+
 "<header><div class='brand'>LAPLACE'S OFFICER / FUTURES OF SOCIETY</div><h1>The Fate of a Nation</h1>"+
 "<p>Matched fictional policies across "+n+" simulated years, from 2028 through "+(2027+n)+".</p>"+
 "<p class='small'>Scale "+geo.mode.toUpperCase()+" · "+geo.size.toLocaleString()+" parcels · "+geo.provinces.length+
 " provinces · "+geo.cities.length+" cities · generation seed "+geo.seed+" · "+E.VERSION+"</p></header>"+
 "<div class='warning'><strong>MODEL OUTPUT, NOT EMPIRICAL PREDICTION.</strong> This report uses fictional population structures, uncalibrated incident rates and assumed cross-national intervention mechanisms. The results are not estimated causal effects or real-world forecasts.</div>"+
 "<section class='section'><div class='eyebrow'>01 / OUTCOMES</div><h2>Final annual national indicators</h2>"+
 table(["Metric","World A","World B"],rows)+"</section>"+
 "<section class='section'><div class='eyebrow'>02 / DIVERGENT HISTORIES</div><h2>Annual time series</h2>"+charts+
 "<p class='small'>Each world starts from identical synthetic geography and seeded event opportunities. Policies and accumulated states can diverge.</p></section>"+
 "<section class='section'><div class='eyebrow'>03 / CRIME & OBSERVATION</div><h2>Disaggregated offense categories</h2>"+
 table(["Offense","Underlying A","Underlying B","Recorded A","Recorded B"],crimeRows)+
 "<p class='small'>Criminal possession processing, referrals and overdoses are separate outcomes, not conflated with drug-market incidents.</p></section>"+
 "<section class='section'><div class='eyebrow'>04 / PROVINCIAL INEQUALITY</div><h2>Geographic distribution</h2>"+
 table(["Province","Population A","Incidents A","Incidents B","Trust A","Trust B","Housing A","Housing B"],regionRows)+"</section>"+
 "<section class='section'><div class='eyebrow'>05 / GOVERNMENT DECISIONS</div><h2>National packages and local rollouts</h2>"+
 table(["World","National","Province overrides","Current model settings"],policies)+
 "<h3>Externally introduced hypothetical shocks</h3><p>World A: "+esc(JSON.stringify(A.shocks))+"</p><p>World B: "+
 esc(JSON.stringify(B.shocks))+"</p></section>"+
 "<section class='section'><div class='eyebrow'>06 / INTERNATIONAL EVIDENCE REGISTER</div><h2>What the sources actually support</h2>"+
 "<ul class='sources'>"+evidence+"</ul>"+
 "<p>No numerical policy effect is assumed to transfer automatically between national settings. Nearly all intervention pathways remain exploratory.</p></section>"+
 "<section class='section'><div class='eyebrow'>07 / VALIDITY & MODEL LIMITS</div><h2>What the experiment cannot establish</h2><ul>"+
 limitations.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul></section>"+
 "<footer>GENESIS SOVEREIGN / "+new Date().toISOString().slice(0,10)+
 " · SYNTHETIC RESEARCH ENVIRONMENT. Export the annual CSV and model JSON for reproducibility.</footer></body></html>";
 return{html:HTML,filename:"genesis-sovereign-"+geo.mode+"-"+n+"-year-report.html",year:n};
}
function open(geo,A,B,n,offenses,events=[]){
 const report=build(geo,A,B,n,offenses,events);let tab=null;try{tab=root.open("about:blank","_blank")}catch(_){}
 if(tab){tab.document.open();tab.document.write(report.html);tab.document.close();try{tab.opener=null}catch(_){}return{...report,method:"tab"}}
 const blob=new Blob([report.html],{type:"text/html;charset=utf-8"}),url=URL.createObjectURL(blob),link=document.createElement("a");
 link.download=report.filename;link.href=url;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
 return{...report,method:"download"};
}
root.SovereignReport={build,open};
})(window);