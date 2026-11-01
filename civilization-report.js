/* Civilizations II: portable, printable research report. */
(function(root){"use strict";
const E=root.GenesisCivilization;
if(!E)throw Error("Civilization engine missing");
const esc=x=>String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const fmt=(v,d=0)=>Number(v||0).toLocaleString("en-US",{maximumFractionDigits:d,minimumFractionDigits:d});
const pc=v=>fmt(v*100,1)+"%";
const TABLE=(heads,rows)=>"<table><thead><tr>"+heads.map(h=>"<th>"+esc(h)+"</th>").join("")+"</tr></thead><tbody>"+rows.map(r=>"<tr>"+r.map(v=>"<td>"+esc(v)+"</td>").join("")+"</tr>").join("")+"</tbody></table>";
function chart(a,b,key,title){
 const n=Math.min(a.length,b.length);if(!n)return"";
 const max=Math.max(1,...a,...b),min=Math.min(0,...a,...b),diff=Math.max(1,max-min);
 const x=i=>65+740*i/Math.max(1,n-1),y=v=>170-143*(v-min)/diff;
 const path=arr=>arr.map((v,i)=>x(i).toFixed(1)+","+y(v).toFixed(1)).join(" ");
 return"<div class='plot'><h3>"+esc(title)+"</h3><svg viewBox='0 0 840 205'>"+
  "<path d='M65 171H805' stroke='#d2e4e5' stroke-width='1'/>"+
  "<polyline fill='none' stroke='#087d76' stroke-width='3' points='"+path(a)+"'/>"+
  "<polyline fill='none' stroke='#be8052' stroke-width='3' points='"+path(b)+"'/>"+
  "<text x='65' y='195' font-size='11'>2028</text><text x='805' y='195' text-anchor='end' font-size='11'>"+(2027+n)+"</text></svg>"+
  "<p class='small'>Teal = World A; amber = World B. Scale and values are synthetic.</p></div>";
}
function build(geo,A,B,years){
 const n=Math.min(Math.floor(years),A.history.length,B.history.length);
 if(n<1)throw Error("Advance at least one simulated year.");
 const a=A.history[n-1],b=B.history[n-1];
 const series=(w,k)=>w.history.slice(0,n).map(r=>r[k]);
 const outcomes=[
  ["Population",fmt(a.population),fmt(b.population)],["Births",fmt(a.births),fmt(b.births)],
  ["Deaths",fmt(a.deaths),fmt(b.deaths)],["External net migration",fmt(a.netExternalMigration),fmt(b.netExternalMigration)],
  ["Working-age employment",pc(a.employment),pc(b.employment)],
  ["GDP ($B constant 2027)",fmt(a.gdp,2),fmt(b.gdp,2)],
  ["Government receipts ($B)",fmt(a.taxRevenue,2),fmt(b.taxRevenue,2)],
  ["Government spending ($B)",fmt(a.spending,2),fmt(b.spending,2)],
  ["Delivered spending ($B)",fmt(a.effectiveBudget,2),fmt(b.effectiveBudget,2)],
  ["Government debt ($B)",fmt(a.debt,2),fmt(b.debt,2)],
  ["Debt as share of GDP",pc(a.debtGDP),pc(b.debtGDP)],
  ["Housing instability",fmt(a.unhoused),fmt(b.unhoused)],
  ["Underlying offenses",fmt(a.underlying),fmt(b.underlying)],
  ["Police-recorded offenses",fmt(a.recorded),fmt(b.recorded)],
  ["Opioid-overdose deaths",fmt(a.overdoseDeaths),fmt(b.overdoseDeaths)],
  ["Hypothetical trust",pc(a.trust),pc(b.trust)]
 ];
 const stateA=E.snapshot(A,n).arrays,stateB=E.snapshot(B,n).arrays;
 const cohorts=[["Children 0–17","children"],["Young adults 18–34","young"],["Adults 35–64","middle"],["Older adults 65+","elderly"]]
 .map(([name,key])=>[name,fmt(stateA[key].reduce((x,y)=>x+y,0)),fmt(stateB[key].reduce((x,y)=>x+y,0))]);
 const programs=[
  ["Summer-youth-job offers",a.youthOffers,b.youthOffers],
  ["Prior-overdose survivors receiving medication",a.medicationMonths,b.medicationMonths],
  ["Housing construction",a.housingBuild,b.housingBuild],
  ["Education places served",a.schoolServed,b.schoolServed],
  ["Health encounters delivered",a.careServed,b.careServed],
  ["Unmet health need",a.careUnmet,b.careUnmet],
  ["Failed cell implementation events",a.implementationFailures,b.implementationFailures],
  ["Recidivism",a.recidivism,b.recidivism],
  ["Violent arrests",a.violentArrests,b.violentArrests]
 ].map(row=>[row[0],fmt(row[1]),fmt(row[2])]);
 const sectors=Object.keys(a.sectorSpending).map(k=>[k,fmt(a.sectorSpending[k],2),fmt(b.sectorSpending[k],2),pc(a.budgetShares[k]),pc(b.budgetShares[k])]);
 const crimes=E.OFFENSES.map((t,i)=>[t.label,fmt(a.offenses[i]),fmt(b.offenses[i]),fmt(a.recordedOffenses[i]),fmt(b.recordedOffenses[i])]);
 const regions=geo.provinces.map(p=>{
  const aa=E.provinceReport(A,n,p.id),bb=E.provinceReport(B,n,p.id);
  return[p.code,p.name,fmt(aa.population),fmt(bb.population),fmt(aa.underlying),fmt(bb.underlying),fmt(aa.unhoused),fmt(bb.unhoused)];
 });
 const plots="<div class='plots'>"+["population","debtGDP","unhoused","underlying","recorded","overdoseDeaths"].map(k=>
  chart(series(A,k),series(B,k),k,E.metricNames.find(x=>x[0]===k)?.[1]||k)).join("")+"</div>";
 const studies=[
  ["United Nations, World Population Prospects 2024","Cohort-component accounting, not estimated vital rates","https://www.un.org/development/desa/pd/world-population-prospects-2024"],
  ["Heller 2014, Science","Violent arrests in a randomized youth employment trial, not total national crime","https://pubmed.ncbi.nlm.nih.gov/25477459/"],
  ["Larochelle et al. 2018","Methadone treatment's observational post-overdose mortality association; HR 0.41","https://pmc.ncbi.nlm.nih.gov/articles/PMC6387681/"],
  ["RAND 2013","Correctional education and recidivism evidence; baseline program access hypothetical","https://www.rand.org/pubs/research_reports/RR266.html"],
  ["Portugal, Finland, Scotland, Norway policy examples","Inspiration for program design, not portable national impact estimates","https://www.unsw.edu.au/content/dam/pdfs/ada/sprc/research-reports/dpmp-drug-summit-2024-explainers/2024-11-was-decriminalisation-effective-in-portugal-v3.pdf"]
 ];
 const limits=[
 "Territory, population, age structure, vital rates and costs are procedurally generated, not drawn from a real country.",
 "Age-cohort accounting is a genuine identity, but no birth or mortality probabilities are empirically calibrated.",
 "GDP, tax revenue, government debt, interest, housing investment and public capacity are stylized equations.",
 "Annual funding appropriations and actual program delivery are modeled separately; local failure probabilities are hypothetical.",
 "The summer jobs effect affects selected eligible youths' arrests, not overall criminal incident probabilities.",
 "Medication mortality and correctional education anchors concern narrow studied populations. Historical national effects cannot be transported.",
 "Two worlds can change several inputs together; comparisons require isolation and replication.",
 "Police recordings are not the same as underlying events and vary with surveillance settings.",
 "Long-horizon histories reflect compounded fictional assumptions, not real-world predictions."
 ];
 const css="@page{size:A4;margin:13mm}*{box-sizing:border-box}body{font:12px/1.5 system-ui,Arial;color:#16313a;max-width:1000px;margin:20px auto;padding:37px;background:#fff}"+
  "h1{font-size:38px;letter-spacing:-.05em}h2{font-size:19px}h3{font-size:13px}"+
  ".eyebrow{font-size:10px;letter-spacing:.13em;color:#098876;font-weight:900}.warning{background:#fff2df;border:1px solid #d7ae80;padding:12px}"+
  "section{margin:25px 0;break-inside:auto}table{border-collapse:collapse;width:100%;font-size:10px}th{text-align:left;color:#12544c;background:#e9f2f2;padding:8px}td{padding:7px;border-bottom:1px solid #d9e4e6}tr{break-inside:avoid}"+
  ".plots{display:grid;grid-template-columns:1fr 1fr;gap:10px}.plot{border:1px solid #e1e9e9;padding:9px;break-inside:avoid}.plot svg{width:100%;height:auto}.small{font-size:10px;color:#6d848b}"+
  ".toolbar{display:flex;justify-content:space-between;padding:12px;background:#173f46;color:white;margin:-37px -37px 20px}.toolbar button{padding:9px;background:#c1ffdf;border:0;border-radius:4px;cursor:pointer}"+
  ".reference{border-left:3px solid #21897d;padding:8px;background:#eff8f6;margin:9px 0}a{color:#087e70}"+
  "@media print{body{margin:0;padding:0;max-width:none}.toolbar{display:none}.warning,th{print-color-adjust:exact;-webkit-print-color-adjust:exact}}";
 const html="<!doctype html><html><head><meta charset='utf-8'><title>GENESIS Civilization Research Report</title><style>"+css+"</style></head><body>"+
  "<div class='toolbar'><strong>GENESIS CIVILIZATION II / RESEARCH REPORT</strong><button onclick='window.print()'>PRINT / SAVE PDF</button></div>"+
  "<header><div class='eyebrow'>LAPLACE'S OFFICER / SYNTHETIC SOCIETIES</div><h1>The Age of Institutions</h1>"+
  "<p>Parallel fictional national histories, 2027–"+(2027+n)+". "+geo.mode.toUpperCase()+", "+geo.size+
  " cells, "+geo.provinces.length+" uniquely identified provinces, seed "+geo.seed+".</p></header>"+
  "<div class='warning'><strong>NOT AN EMPIRICAL FORECAST.</strong> All results are generated from uncalibrated parameters. Government and social policy contrasts are not estimated effects in real populations.</div>"+
  "<section><div class='eyebrow'>01 / NATIONAL COMPARISON</div><h2>Final annual scorecard</h2>"+TABLE(["Outcome","World A","World B"],outcomes)+"</section>"+
  "<section><div class='eyebrow'>02 / HISTORICAL TRAJECTORIES</div><h2>Demography, budgets and criminal harm</h2>"+plots+"</section>"+
  "<section><div class='eyebrow'>03 / DEMOGRAPHIC ACCOUNTING</div><h2>Four explicit population cohorts</h2>"+
  TABLE(["Age cohort","World A","World B"],cohorts)+
  "<p>Population change = births − deaths + net external migration. Internal migration is zero-sum nationally.</p>"+
  "<p>Accounting residuals A "+fmt(a.diagnostics.populationAccountingError,8)+"; B "+fmt(b.diagnostics.populationAccountingError,8)+" (floating-point rounding).</p></section>"+
  "<section><div class='eyebrow'>04 / FISCAL STATE</div><h2>Appropriations versus actual delivery</h2>"+
  TABLE(["Sector","A approved $B","B approved $B","A share","B share"],sectors)+
  "<p>Government revenue, spending, debt interest and the borrowing ceiling influence the public budget. Administrative quality and failed implementation constrain actual delivery.</p></section>"+
  "<section><div class='eyebrow'>05 / CAPACITY DIAGNOSTICS</div><h2>Who was reached?</h2>"+
  TABLE(["Program delivery outcome","World A","World B"],programs)+"</section>"+
  "<section><div class='eyebrow'>06 / DISTINCT OFFENSE CATEGORIES</div><h2>Recorded versus underlying activity</h2>"+
  TABLE(["Offense","True A","True B","Recorded A","Recorded B"],crimes)+"</section>"+
  "<section><div class='eyebrow'>07 / ADMINISTRATIVE GEOGRAPHY</div><h2>Population, crime and housing across provinces</h2>"+
  TABLE(["Code","Province","Population A","Population B","Crime A","Crime B","Housing need A","Housing need B"],regions)+"</section>"+
  "<section><div class='eyebrow'>08 / POLICY AND SHOCK REGISTRY</div><h2>Actual simulation settings</h2>"+
  TABLE(["World","Config (JSON)","Shocks (JSON)"],[["A",JSON.stringify(A.config),JSON.stringify(A.shocks)],["B",JSON.stringify(B.config),JSON.stringify(B.shocks)]])+"</section>"+
  "<section><div class='eyebrow'>09 / RESEARCH PROVENANCE</div><h2>Narrow empirical anchors</h2>"+
  studies.map(([name,detail,url])=>"<div class='reference'><strong>"+esc(name)+"</strong><p>"+esc(detail)+". <a href='"+esc(url)+"'>Source</a></p></div>").join("")+"</section>"+
  "<section><div class='eyebrow'>10 / INTERPRETATION LIMITS</div><h2>What the model cannot establish</h2><ul>"+
  limits.map(v=>"<li>"+esc(v)+"</li>").join("")+"</ul></section>"+
  "<footer class='small'>GENESIS CIVILIZATION II · SIMULATION VERSION "+E.VERSION+
  " · "+new Date().toISOString().slice(0,10)+" · Fictional territory and data. Export raw annual CSV for independent numerical inspection.</footer></body></html>";
 return{html,years:n,filename:"genesis-civilization-"+geo.mode+"-"+n+"years.html",outcomes};
}
function open(geo,A,B,year){
 const result=build(geo,A,B,year);let tab=null;
 try{tab=root.open("about:blank","_blank")}catch(e){}
 if(tab){tab.document.open();tab.document.write(result.html);tab.document.close();try{tab.opener=null}catch(e){}return{...result,method:"tab"}}
 const blob=new Blob([result.html],{type:"text/html;charset=utf-8"}),url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download=result.filename;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);return{...result,method:"download"};
}
root.CivilizationReport={build,open};
})(window);