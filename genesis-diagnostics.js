/* GENESIS v2 — mechanism audit. These quantities describe simulated exposure
   and conditional expected counts; they are NOT real-world causal estimates. */
(function(root){"use strict";
const fields=[
 ["Crime and observation",[
  ["Underlying criminal incidents","totalCrime","count"],
  ["Conditional model-expected incidents","expectedCrime","decimal"],
  ["Same-state reference expected incidents","referenceExpectedCrime","decimal"],
  ["Police-recorded incidents","recordedCrime","count"],
  ["Hypothetical district investment adjustment","mechanismExpectedReductions.district","decimal"],
  ["Optional structural-link adjustment","mechanismExpectedReductions.structural","decimal"],
  ["Hypothetical patrol adjustment","mechanismExpectedReductions.patrol","decimal"],
  ["Patrolled district-months","patrolCount","count"]
 ]],
 ["Summer jobs and violent arrests",[
  ["Eligible youth program opportunities","eligibleYouth","count"],
  ["Expected funded summer-job offers","expectedYouthOffers","decimal"],
  ["Realized funded program offers","offeredJobs","count"],
  ["Program-offer exposure person-months","activeJobMonths","count"],
  ["Expected violent arrests","expectedArrests","decimal"],
  ["Reference expected arrests without offer effect","referenceExpectedArrests","decimal"],
  ["Realized violent arrests","violentArrests","count"]
 ]],
 ["Opioid medication and mortality",[
  ["Treatment starts or renewals","treatmentStarts","count"],
  ["Treated person-months","treatedPersonMonths","count"],
  ["Prior-survivor mortality-risk person-months","atRiskSurvivorMonths","count"],
  ["Risk person-months on medication","treatedRiskMonths","count"],
  ["Expected overdose deaths under treatment exposure","expectedMortality","decimal"],
  ["Same-state untreated expected deaths","referenceExpectedMortality","decimal"],
  ["Realized overdose deaths","overdoseDeaths","count"]
 ]],
 ["Reentry and other social mechanisms",[
  ["Custody person-months","custodyEducationEligibleMonths","count"],
  ["Correctional-education enrollment events","correctionStarts","count"],
  ["Post-release monitored person-months","postReleaseMonths","count"],
  ["Post-release months after correctional education","postReleaseEducatedMonths","count"],
  ["Expected recidivism events","expectedRecidivism","decimal"],
  ["Same-state recidivism expectation without education","referenceExpectedRecidivism","decimal"],
  ["Realized recidivism events","recidivism","count"],
  ["Housing assistance events","housingSupportEvents","count"],
  ["Student attendance person-months","schoolExposureMonths","count"],
  ["Employed person-months","employed","count"]
 ]]
];
const flat=fields.flatMap(([group,items])=>items.map(([label,key,format])=>({group,label,key,format})));
function sumField(rows,path){const keys=path.split(".");return rows.reduce((sum,row)=>{
 let v=row;for(const k of keys)v=v?.[k];return sum+(Number(v)||0)
},0)}
const nice=(n,format="count")=>Number.isFinite(n)?n.toLocaleString("en-US",{minimumFractionDigits:format==="decimal"?2:0,maximumFractionDigits:format==="decimal"?2:0}):"N/A";
function summarize(A,B,months){
 const n=Math.max(0,Math.min(Math.floor(months||0),A.history.length,B.history.length)),
 a=A.history.slice(0,n),b=B.history.slice(0,n);
 return{months:n,version:A.history[0]?.modelVersion||"unknown",
 rows:flat.map(f=>({...f,a:sumField(a,f.key),b:sumField(b,f.key)})),
 expectedA:sumField(a,"expectedCrime"),expectedB:sumField(b,"expectedCrime"),
 referenceA:sumField(a,"referenceExpectedCrime"),referenceB:sumField(b,"referenceExpectedCrime")};
}
function el(tag,text,parent,cls){const node=document.createElement(tag);if(text!=null)node.textContent=String(text);if(cls)node.className=cls;parent.append(node);return node}
function render(target,A,B,months){
 target.replaceChildren();const data=summarize(A,B,months);if(!data.months)return data;
 const table=el("table",null,target,"diagnosticTable"),head=el("thead",null,table),tr=el("tr",null,head);
 ["Cumulative synthetic diagnostic","World A","World B","A − B"].forEach(s=>el("th",s,tr));
 const tbody=el("tbody",null,table);let group="";
 for(const item of data.rows){
  if(item.group!==group){group=item.group;const tr=el("tr",null,tbody,"groupHead");el("th",group,tr).colSpan=4}
  const tr=el("tr",null,tbody);
  el("td",item.label,tr);
  el("td",nice(item.a,item.format),tr,"numeric");
  el("td",nice(item.b,item.format),tr,"numeric");
  el("td",(item.a-item.b>0?"+":"")+nice(item.a-item.b,item.format),tr,"numeric");
 }
 el("p","The reference is based on the same current synthetic population, not an independent no-treatment world. It isolates the within-month risk multiplier while preserving prior policy history.",target,"fine");
 return data;
}
function toCSV(A,B,months){
 const n=Math.max(0,Math.min(Math.floor(months||0),A.history.length,B.history.length));
 const head=["model_version","world","month","policy","budget","prevention","surveillance","employment_link","housing_link","education_link",...flat.map(x=>x.key.replace(/\./g,"_"))];
 const rows=[head];
 for(const [letter,world] of [["A",A],["B",B]])for(const metric of world.history.slice(0,n)){
  const cfg=metric.policiesUsed;
  rows.push([metric.modelVersion||"unknown",letter,metric.month,metric.policy,cfg.budget,cfg.prevention,cfg.surveillance,
   cfg.employmentLink??0,cfg.housingLink??0,cfg.educationLink??0,
   ...flat.map(({key})=>{let value=metric;for(const p of key.split("."))value=value?.[p];return Number(value)||0})]);
 }
 return rows.map(row=>row.join(",")).join("\n");
}
root.GenesisDiagnostics={fields,flat,sumField,summarize,render,toCSV};
})(window);