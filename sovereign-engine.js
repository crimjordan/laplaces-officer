/* LAPLACE // GENESIS SOVEREIGN: synthetic state-to-country agent-region engine.
   All geographic labels, baseline rates, and structural coefficients are invented.
   Empirical anchors apply only to narrowly measured outcome pathways.
   No real-person forecasts, surveillance locations, or police deployment advice.
*/
(function(root){"use strict";
const VERSION="sovereign-v1.0";
const MODES={
 state:{width:44,height:30,provinces:9,cities:6,horizon:200,label:"STATE"},
 country:{width:64,height:42,provinces:16,cities:12,horizon:200,label:"COUNTRY"},
 federation:{width:84,height:52,provinces:24,cities:19,horizon:120,label:"FEDERATION"}
};
const ZONES=[
 {id:"water",label:"Water / river",color:0x174668,weight:0},
 {id:"urban",label:"Urban residential",color:0x3b9eb7,weight:23},
 {id:"suburban",label:"Suburban",color:0x66a8a5,weight:8},
 {id:"commercial",label:"Commercial / CBD",color:0xbaa1f7,weight:37},
 {id:"industrial",label:"Industrial",color:0xe5aa71,weight:5},
 {id:"rural",label:"Rural / agricultural",color:0x83a878,weight:2.5},
 {id:"wilderness",label:"Forest / wilderness",color:0x436d62,weight:.28}
];
const OFFENSES=[
 {id:"theft",label:"Theft / larceny",rate:23,reported:.55,color:0xffc27b},
 {id:"burglary",label:"Burglary",rate:5.7,reported:.64,color:0xb7a8fc},
 {id:"vehicle",label:"Vehicle theft",rate:4.2,reported:.72,color:0x7abaff},
 {id:"robbery",label:"Robbery",rate:1.35,reported:.71,color:0xf8a6ab},
 {id:"assault",label:"Assault",rate:8.5,reported:.55,color:0xef7d7d},
 {id:"homicide",label:"Homicide",rate:.045,reported:.92,color:0xfc618d},
 {id:"fraud",label:"Fraud",rate:6.2,reported:.38,color:0x85e3b9},
 {id:"cybercrime",label:"Cybercrime",rate:6.8,reported:.31,color:0x72dff1},
 {id:"drugmarket",label:"Drug-market offenses",rate:3.8,reported:.29,color:0xd1a4f6},
 {id:"disorder",label:"Disorder incidents",rate:12,reported:.40,color:0xb6b7d1}
];
const PROGRAMS={
 none:{name:"Baseline / No special package",country:"Neutral comparison",flag:"◌",class:"Baseline scenario",anchor:"No external causal anchor",url:"",detail:"Status quo coefficients; general funding controls still operate.",limitation:"All dynamics and baseline rates remain hypothetical."},
 finland:{name:"Housing First",country:"Finland-inspired",flag:"FI",class:"Policy inspiration; descriptive evidence",anchor:"Long-run Finnish homelessness trends; not a transferable causal estimate",url:"https://www.europarl.europa.eu/RegData/etudes/STUD/2025/759352/CASP_STU%282025%29759352%28ANN01%29_EN.pdf",detail:"Housing support is prioritized for housing-insecure residents. The assumed rate of improvement is user-adjustable and not imported from Finnish trends.",limitation:"Finnish implementation and observed homelessness declines cannot establish a universal effect on crime or local housing stability."},
 portugal:{name:"Health-first drug policy",country:"Portugal-inspired",flag:"PT",class:"Policy inspiration; mixed contextual evidence",anchor:"UNSW Drug Policy Modelling Program summary (2024)",url:"https://www.unsw.edu.au/content/dam/pdfs/ada/sprc/research-reports/dpmp-drug-summit-2024-explainers/2024-11-was-decriminalisation-effective-in-portugal-v3.pdf",detail:"Reduces modeled criminal processing of possession contacts and expands hypothetical referral access. Does not automatically reduce drug markets or overdose incidence.",limitation:"Decriminalization, treatment expansion and broader trends co-occurred; outputs cannot isolate Portugal's historical policy effects."},
 norway:{name:"Correctional education / reentry",country:"Norway-inspired",flag:"NO",class:"Policy inspiration + US meta-analysis anchor",anchor:"RAND correctional education meta-analysis (2013); odds ratio 0.57",url:"https://www.rand.org/pubs/research_reports/RR266.html",detail:"A stylized reentry service offers correctional education and applies the published recidivism odds contrast only to a fictional enrolled subset.",limitation:"The RAND source is not a Norway-specific effect, and the modeled untreated recidivism baseline and take-up are hypothetical."},
 scotland:{name:"Violence interruption / focused deterrence",country:"Scotland-inspired",flag:"GB",class:"Policy inspiration; systematic review",anchor:"Braga, Weisburd & Turchan (2019) focused deterrence systematic review",url:"https://doi.org/10.1002/cl2.1051",detail:"An illustrative targeted violence-reduction pathway adjusts violent-incident exposure for a limited set of modeled areas.",limitation:"The review evaluated heterogeneous quasi-experimental programs; there is no universally transportable direct reduction coefficient."},
 chicago:{name:"Summer youth jobs",country:"United States / Chicago",flag:"US",class:"Narrow numerical RCT anchor",anchor:"Heller (2014) randomized trial: 43% lower violent-crime arrests among assigned selected youth over 16 months",url:"https://doi.org/10.1126/science.1257809",detail:"Changes the hypothetical violent-arrest count among reached eligible youth, not underlying citywide criminal incidents.",limitation:"Study concerned selected Chicago youth and an arrest outcome. It did not establish reductions in all crimes, all ages, or permanent regional change."},
 integrated:{name:"Integrated policy exchange",country:"Multi-country synthetic package",flag:"◎",class:"Speculative combination",anchor:"Program inspirations are not additive validated effects",url:"",detail:"Combines housing, treatment referrals, reentry and youth jobs with separate uptake limits; any synergistic behavior is hypothetical.",limitation:"Never interpret combined coefficients as evaluated nationwide policy effects."}
};
const DEFAULT_CONFIG={
 national:"none",intensity:70,budget:16,education:45,housing:40,health:35,employment:40,
 patrol:40,surveillance:35,procedure:"procedural",recallBias:0,spillover:30,migration:40,
 researchStrength:50,provincePolicies:{}
};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const sum=a=>a.reduce((acc,v)=>acc+(Number(v)||0),0);
function hash(...ns){let h=2166136261>>>0;for(const val of ns){h=Math.imul(h^(Math.floor(Number(val)||0)>>>0),16777619)>>>0;h^=h>>>13}return (h>>>0)/4294967296}
function smooth(t){return t*t*(3-2*t)}
function noise(x,y,seed,step=1){
 const X=x/step,Y=y/step,i=Math.floor(X),j=Math.floor(Y),dx=smooth(X-i),dy=smooth(Y-j);
 const a=lerp(hash(seed,i,j,3),hash(seed,i+1,j,3),dx),b=lerp(hash(seed,i,j+1,3),hash(seed,i+1,j+1,3),dx);
 return lerp(a,b,dy)*2-1;
}
function fractal(x,y,s){return .54*noise(x,y,s,15)+.32*noise(x,y,s+9,7)+.14*noise(x,y,s+19,3)}
function rangeName(seed,i){
 const a=["Arbor","Aster","Briar","Cedar","Crown","Dawn","Eagle","Elm","Fern","Glass","Harbor","Iron","Larch","Marble","North","Oak","Pine","River","Sable","Silver","Stone","Swan","Vale","West","Willow","Wind"],
 b=["haven","brook","field","ford","mouth","ridge","mere","point","vale","crest","stead","land","borough","view","wick","port","holm","bridge"];
 return a[Math.floor(hash(seed,i,11)*a.length)]+b[Math.floor(hash(seed,i,12)*b.length)];
}
function terrain(seed,mode="country"){
 const opts=MODES[mode]||MODES.country,w=opts.width,h=opts.height;
 const total=w*h,cells=new Array(total),cities=[],centers=[],roads=new Uint8Array(total);
 const near=(x,y,points)=>{let best=1e12,k=0;for(let i=0;i<points.length;i++){const p=points[i],d=(x-p.x)**2+(y-p.y)**2;if(d<best){best=d;k=i}}return{dist:Math.sqrt(best),id:k}};
 // Province headquarters are spatially distributed using a jittered lattice.
 const cols=Math.round(Math.sqrt(opts.provinces*w/h)),rows=Math.ceil(opts.provinces/cols);
 for(let i=0;i<opts.provinces;i++){
  const cx=i%cols,cy=Math.floor(i/cols);
  centers.push({id:i,name:rangeName(seed+14,i)+" Region",x:clamp((cx+.5+(.5-hash(seed,i,45))*.46)*w/cols,2,w-3),
   y:clamp((cy+.5+(.5-hash(seed,i,46))*.44)*h/rows,2,h-3)});
 }
 // A primary metropolitan region, satellite cities and rural market towns.
 const anchorCount=opts.cities;
 for(let i=0;i<anchorCount;i++){
  const province=centers[i%centers.length];
  const x=clamp(Math.floor(province.x+(hash(seed,i,81)-.5)*w*.22),3,w-4),
        y=clamp(Math.floor(province.y+(hash(seed,i,82)-.5)*h*.19),3,h-4);
  cities.push({id:i,x,y,name:rangeName(seed+243,i),size:i<Math.ceil(anchorCount/4)?5.6+hash(seed,i,72)*2.8:2.2+hash(seed,i,73)*3.0});
 }
 // Highway strips connect nearby towns. They are illustrated infrastructure,
 // not downloaded road maps or forecasts of real travel time.
 function line(a,b){
  const dx=b.x-a.x,dy=b.y-a.y,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)*3));
  for(let i=0;i<=steps;i++){const x=Math.round(a.x+dx*i/steps),y=Math.round(a.y+dy*i/steps);
   if(x>=0&&x<w&&y>=0&&y<h)roads[y*w+x]=1}
 }
 for(let i=0;i<cities.length;i++){
  const a=cities[i],closest=cities.filter(c=>c!==a).sort((b,c)=>
   (a.x-b.x)**2+(a.y-b.y)**2-((a.x-c.x)**2+(a.y-c.y)**2)).slice(0,2);
  for(const b of closest)line(a,b);
 }
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const idx=y*w+x,n=fractal(x,y,seed),large=noise(x,y,seed+25,26),alt=clamp(.38+.36*n+.20*large,0,1);
  // Two nonlinear rivers and coastal water around one edge: world is invented.
  const riverX=w*(.26+.09*Math.sin(y*.13+seed*.01)+.04*Math.sin(y*.31+2));
  const river2=h*(.65+.07*Math.sin(x*.12+1.8));
  const river=Math.abs(x-riverX)<.65||Math.abs(y-river2)<.46;
  const coast=(x<.8*w*.055&&large<.07)||(y>h*.93&&noise(x,0,seed+3,18)<-.10);
  const water=river||coast;
  const nearest=near(x,y,cities),city=cities[nearest.id],dist=nearest.dist/city.size;
  const transport=roads[idx]||roads[Math.max(0,y-1)*w+x]||roads[Math.min(h-1,y+1)*w+x];
  const commerce=clamp((1-dist)*1.2+(.5+n*.2)*transport,0,1);
  let zone=5;
  if(water)zone=0;
  else if(dist<.30&&city.size>3.6)zone=3;
  else if(dist<.82)zone=1;
  else if(dist<1.45)zone=2;
  else if(transport&&n>.17)zone=4;
  else if(alt>.66||n<-.29)zone=6;
  else zone=5;
  if(!water&&dist>1.1&&dist<3.2&&Math.abs(x-riverX)<3.3&&n>-.05&&hash(seed,x,y,41)>.48)zone=4;
  if(!water&&dist>.7&&dist<2.5&&transport&&hash(seed,x,y,42)>.72)zone=3;
  const nearestRegion=near(x+1.2*noise(x,y,seed+99,8),y+1.2*noise(x,y,seed+89,7),centers);
  const baseDensity=ZONES[zone].weight*(.70+.5*hash(seed,x,y,12));
  const population=water?0:baseDensity*(.55+city.size*.09)*(0.55+commerce*.45);
  const housing=clamp(.54+hash(seed,x,y,17)*.34-.09*(zone===3?1:0),.2,.98);
  const employment=clamp(.54+.29*commerce+.06*(zone===4?1:0)-.09*(zone===5?1:0)+n*.12,.25,.95);
  const education=clamp(.44+.25*commerce+.11*(zone===2?1:0)+hash(seed,x,y,20)*.18,.20,.96);
  const health=clamp(.39+.31*commerce+hash(seed,x,y,22)*.20,.15,.95);
  cells[idx]={id:idx,x,y,zone,province:nearestRegion.id,city:nearest.id,alt,river:river?1:0,
   transport:transport?1:0,commerce,basePopulation:population*1000,baseHousing:housing,
   baseEmployment:employment,baseEducation:education,baseHealth:health,
   initialTrust:clamp(.49+.22*hash(seed,x,y,24),.25,.9),
   baseDeprivation:clamp(.47-.28*commerce+.21*(1-housing)+.18*(1-employment)+.11*hash(seed,x,y,5),.05,.9)};
 }
 const adjacency=new Array(total);
 for(let i=0;i<total;i++){
  const x=i%w,y=Math.floor(i/w),list=[];
  if(x>0)list.push(i-1);if(x<w-1)list.push(i+1);if(y>0)list.push(i-w);if(y<h-1)list.push(i+w);
  adjacency[i]=list.filter(j=>cells[j].zone!==0);
 }
 const regionTotals=centers.map(c=>({...c,cells:0,population:0}));
 for(const d of cells){regionTotals[d.province].cells++;regionTotals[d.province].population+=d.basePopulation}
 return{version:VERSION,mode,seed,w,h,size:total,provinces:regionTotals,cities,cells,adjacency,roads,maxYears:opts.horizon,
  extent:"PROCEDURALLY GENERATED · NO REAL GEOGRAPHY",initialPopulation:sum(cells.map(d=>d.basePopulation))};
}
const STATE_KEYS=["population","employment","education","housing","health","trust","deprivation","score","underlying","recorded","overdose","development","survivors"];
function stateFromTerrain(geo){
 const st={};
 for(const k of STATE_KEYS)st[k]=new Float32Array(geo.size);
 for(const d of geo.cells){const i=d.id;
  st.population[i]=d.basePopulation;st.employment[i]=d.baseEmployment;st.education[i]=d.baseEducation;
  st.housing[i]=d.baseHousing;st.health[i]=d.baseHealth;st.trust[i]=d.initialTrust;
  st.deprivation[i]=d.baseDeprivation;st.score[i]=.20+hash(geo.seed,i,44)*.25;
  st.development[i]=clamp(.23+d.commerce*.44+d.alt*.18,.1,.92);
  st.survivors[i]=Math.round(d.basePopulation*.0008);
 }
 return st;
}
function copyState(st){const out={};for(const k of STATE_KEYS)out[k]=st[k].slice();return out}
function cloneConfig(input){
 const c={...DEFAULT_CONFIG,...(input||{})};
 c.provincePolicies={...(input?.provincePolicies||{})};
 if(!Object.hasOwn(PROGRAMS,c.national))c.national="none";
 for(const k of ["intensity","budget","education","housing","health","employment","patrol","surveillance","recallBias","spillover","migration","researchStrength"])c[k]=Number.isFinite(+c[k])?+c[k]:DEFAULT_CONFIG[k];
 return c;
}
function createWorld(geo,config={},seed=geo.seed){
 const s=stateFromTerrain(geo);
 return{version:VERSION,geo,seed,year:0,config:cloneConfig(config),state:s,initial:copyState(s),history:[],frames:[],shocks:[]};
}
function hitProgram(config,prov){const name=config.provincePolicies?.[prov]||config.national;return Object.hasOwn(PROGRAMS,name)?name:"none"}
function shockEffect(world,year,province,zone){
 const out={economic:0,flood:0,health:0,population:0};
 for(const e of world.shocks){if(year<e.from||year>=e.from+e.duration)continue;if(e.province!==-1&&e.province!==province)continue;
  if(e.type==="recession")out.economic+=.11*e.strength;
  if(e.type==="flood"&&(zone===4||zone===5||zone===2))out.flood+=.15*e.strength;
  if(e.type==="epidemic")out.health+=.16*e.strength;
  if(e.type==="migration")out.population+=.018*e.strength;
 }
 return out;
}
const normal=(a,b)=>{const u=Math.max(1e-9,a),v=Math.max(1e-9,b);return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
function stableCount(expect,seed,year,id,k){
 if(expect<=0)return 0;
 const z=normal(hash(seed,year,id,k,515),hash(seed,year,id,k,516));
 return Math.max(0,Math.round(expect+Math.sqrt(expect)*z));
}
function round3(x){return Math.round(x*1000)/1000}
function step(world){
 if(world.year>=world.geo.maxYears)return null;
 const G=world.geo,S=world.state,C=world.config,year=world.year+1,n=G.size;
 const next=copyState(S),delta=new Float32Array(n);
 const provinceTotals=Array.from({length:G.provinces.length},(_,i)=>({id:i,population:0,underlying:0,recorded:0,
  overdose:0,overdoseDeaths:0,trustSum:0,employed:0,homeless:0,youthOffers:0,recidivism:0,referrals:0,arrests:0,
  housingStarts:0,schoolSeats:0,careStarts:0,drugContacts:0,migrationIn:0,migrationOut:0}));
 const kinds=OFFENSES.length,categoryTotals=new Float64Array(kinds),recordedTotals=new Float64Array(kinds);
 const typeCounts=new Uint16Array(n*kinds),typeRecorded=new Uint16Array(n*kinds);
 let totalPop=0,totalCrime=0,totalRecorded=0,totalDeaths=0,totalOverdoses=0,totalHousing=0,totalYouth=0,totalArrests=0,
  totalRecidivism=0,totalReferrals=0,totalDrugContacts=0,totalSchool=0,totalTreatment=0,totalHomeless=0,
  totalEmployment=0,totalTrust=0,totalMigration=0,expectCrime=0;
 const policyUsage={};
 const effects={housing:0,health:0,education:0,violence:0,arrests:0,drugContacts:0};
 // Migration reacts to neighboring synthetic opportunities without changing
 // aggregate regional population by more than a small share annually.
 for(const d of G.cells){
  if(!d.basePopulation)continue;
  const i=d.id,attract=S.employment[i]*.41+S.housing[i]*.34+S.health[i]*.1+d.commerce*.15;
  for(const j of G.adjacency[i])if(j>i&&G.cells[j].basePopulation){
   const other=G.cells[j],b=S.employment[j]*.41+S.housing[j]*.34+S.health[j]*.1+other.commerce*.15;
   const diff=b-attract,flow=clamp(Math.abs(diff),0,.6)*Math.min(S.population[i],S.population[j])*.007*(C.migration/100);
   if(diff>0){delta[i]-=flow;delta[j]+=flow}else{delta[i]+=flow;delta[j]-=flow}
   if(d.province!==other.province)totalMigration+=flow;
  }
 }
 for(const d of G.cells){
  const i=d.id,oldPop=S.population[i];
  if(d.zone===0||oldPop<=0.01){next.population[i]=0;continue}
  const policy=hitProgram(C,d.province);
  policyUsage[policy]=(policyUsage[policy]||0)+1;
  const profile=shockEffect(world,year,d.province,d.zone);
  const poverty=S.deprivation[i],rollout=clamp((year-1)/7+.17,.1,1),power=clamp(C.intensity/100,0,1);
  const reach=clamp(power*rollout*Math.sqrt(C.budget/16)*(.65+.40*poverty),0,1.2);
  const effort={
   housing:C.housing/100*reach,school:C.education/100*reach,care:C.health/100*reach,
   jobs:C.employment/100*reach,patrol:C.patrol/100,monitor:C.surveillance/100
  };
  const programHousing=(policy==="finland"||policy==="integrated")?reach:0;
  const programHealth=(policy==="portugal"||policy==="integrated")?reach:0;
  const programReentry=(policy==="norway"||policy==="integrated")?reach:0;
  const programYouth=(policy==="chicago"||policy==="integrated")?reach:0;
  const programViolence=(policy==="scotland"||policy==="integrated")?reach:0;
  const care=clamp(S.health[i]+(.012*effort.care+.013*programHealth)*(1-S.health[i])-.008*profile.health+
    (hash(world.seed,year,i,100)-.5)*.004,.08,.99);
  const education=clamp(S.education[i]+(.009*effort.school+.008*programReentry)*(1-S.education[i])-
    .0025*(1-S.housing[i])+(hash(world.seed,year,i,101)-.5)*.005,.12,.99);
  const housing=clamp(S.housing[i]+(.011*effort.housing+.025*programHousing)*(1-S.housing[i])-
    .007*profile.economic-.016*profile.flood-.0035*(d.zone===3?1:0)+
    (hash(world.seed,year,i,102)-.5)*.004,.10,.995);
  const commerceBase=.48+.40*d.commerce-.06*(d.zone===5?1:0)-.035*(d.zone===4?1:0);
  const employment=clamp(S.employment[i]+.040*(commerceBase-S.employment[i])+
    .012*effort.jobs*(1-S.employment[i])-.012*profile.economic+
    (hash(world.seed,year,i,103)-.5)*.007,.20,.99);
  const policing=clamp(effort.patrol*(.5+.65*S.score[i]),0,1);
  const priorTrust=S.trust[i],trust=clamp(priorTrust+
    .0045*(C.procedure==="procedural"?1:-1)*policing+.002*housing-
    .006*policing*(1-C.surveillance/220)+
    (hash(world.seed,year,i,104)-.5)*.006,.14,.96);
  const deprivation=clamp(.41*(1-employment)+.25*(1-housing)+.21*(1-education)+.13*(1-care),.02,.97);
  const population=Math.max(.1,oldPop*(1+.0025+profile.population-.003*profile.economic-.007*profile.flood)+delta[i]);
  next.population[i]=population;next.employment[i]=employment;next.housing[i]=housing;next.education[i]=education;
  next.health[i]=care;next.trust[i]=trust;next.deprivation[i]=deprivation;
  next.development[i]=clamp(S.development[i]+.007*(employment-.45)+.007*effort.housing-.008*profile.flood,.08,.99);
  const P=provinceTotals[d.province],localTypes=new Float64Array(kinds);
  let crime=0,recorded=0;
  const vBase=.68+.53*deprivation+.18*d.commerce+.11*(d.zone===4?1:0);
  const neighborCrime=G.adjacency[i].length?sum(G.adjacency[i].map(j=>S.score[j]))/G.adjacency[i].length:0;
  const spatialMult=clamp(1+(neighborCrime-.3)*.14*(C.spillover/100),.85,1.17);
  for(let k=0;k<kinds;k++){
   const type=OFFENSES[k];
   let exp=(population/1000)*type.rate*vBase*spatialMult;
   if(k<=2)exp*=clamp(1+.46*(1-housing)+.23*profile.economic+.29*profile.flood,.80,1.8);
   if([3,4,5].includes(k))exp*=clamp(1+.34*(1-employment)+.21*(1-education),.80,1.65);
   if([6,7].includes(k))exp*=.84+.42*(d.zone===3?1:0)+.30*d.commerce;
   if(k===8)exp*=.84+.24*(d.zone===4?1:0);
   if(k===9)exp*=.91+.29*(d.zone===3?1:0);
   // Scotland-inspired violence modifier is entirely hypothetical. The
   // focused-deterrence evidence supports neither this number nor transfer.
   if([3,4,5].includes(k)&&programViolence>0){
    const factor=1-.09*programViolence*clamp(C.researchStrength/100,0,1);
    effects.violence+=exp*(1-factor);exp*=factor;
   }
   // Generic education, housing, employment pathways are NOT assumed to
   // directly reduce all crime. The relationships above are uncalibrated,
   // visible in the model card and never described as calibrated forecasts.
   const patrolFactor=1-policing*(C.researchStrength/100)*([0,1,2,3,4,5,8,9].includes(k)?.055:.016);
   exp*=patrolFactor;
   expectCrime+=exp;
   const actual=stableCount(exp,world.seed,year,i,k),recordFraction=clamp(type.reported*
     (.55+.69*effort.monitor)*(.80+.30*trust)*(.88+.22*policing),0,.98);
   const seen=Math.min(actual,Math.max(0,Math.round(actual*recordFraction+
     Math.sqrt(Math.max(1,actual*recordFraction*(1-recordFraction)))*
     normal(hash(world.seed,year,i,k,790),hash(world.seed,year,i,k,791)))));
   const idx=i*kinds+k;typeCounts[idx]=Math.min(65535,actual);typeRecorded[idx]=Math.min(65535,seen);
   categoryTotals[k]+=actual;recordedTotals[k]+=seen;localTypes[k]=actual;crime+=actual;recorded+=seen;
  }
  // The "drug possession" policy concerns legal processing of contacts,
  // not the underlying simulated drug market (category 8).
  const rawDrugContacts=stableCount(population/1000*2.9*(.38+.8*effort.monitor+.42*policing),world.seed,year,i,90);
  const processed=rawDrugContacts*(1-.82*programHealth),referrals=rawDrugContacts*.18*programHealth;
  const criminalContacts=stableCount(processed,world.seed,year,i,91),
        healthReferrals=stableCount(referrals,world.seed,year,i,92);
  effects.drugContacts+=rawDrugContacts-processed;
  // MOUD mortality anchor restricted to the previously-overdosed survivor
  // exposure pool. 0.41 is the observed adjusted methadone HR in Larochelle
  // (2018); base monthly/annual hazards and service uptake are invented.
  const newOverdoses=stableCount(population/1000*1.45*(.72+.38*poverty+.2*profile.health),
     world.seed,year,i,93);
  const survivors=S.survivors[i],careReach=clamp(.06+.18*effort.care+.23*programHealth,0,.75);
  const atRisk=survivors*careReach,untreatedHazard=.018;
  const mortalityExp=(survivors-atRisk)*untreatedHazard+atRisk*untreatedHazard*.41;
  const overdoseDeaths=stableCount(mortalityExp,world.seed,year,i,94);
  next.survivors[i]=Math.max(0,survivors*(.93)+newOverdoses-overdoseDeaths);
  effects.health+=atRisk*untreatedHazard*.59;
  // Narrow Heller RCT result: violent ARRESTS among reached selected youth.
  const eligibleYouth=population*.085,offered=eligibleYouth*.062*programYouth,baseYouthArrest=eligibleYouth*.012;
  const youthArrestsExp=(eligibleYouth-offered)*.012+offered*.012*.57;
  const otherArrestsExp=(localTypes[3]+localTypes[4]+localTypes[5])*.19;
  const violentArrests=stableCount(youthArrestsExp+otherArrestsExp,world.seed,year,i,95);
  effects.arrests+=offered*.012*.43;
  const reentryEligible=population*.0045,educated=reentryEligible*.25*programReentry;
  const baselineRecidivism=.28,adjustedOdds=baselineRecidivism*.57/
    (1-baselineRecidivism+baselineRecidivism*.57);
  const recidivism=stableCount((reentryEligible-educated)*baselineRecidivism+educated*adjustedOdds,
    world.seed,year,i,96);
  const homelessness=Math.max(0,population*(1-housing)*.037);
  const supported=population*(1-S.housing[i])*.018*programHousing;
  const schoolSeats=population*.12*.016*effort.school;
  const treatmentStarts=survivors*careReach*.10;
  const newScore=clamp(.75*S.score[i]+.25*(recorded/Math.max(1,population/1000*90)),.02,1);
  next.score[i]=newScore;next.underlying[i]=crime;next.recorded[i]=recorded;next.overdose[i]=newOverdoses;
  totalPop+=population;totalCrime+=crime;totalRecorded+=recorded;totalOverdoses+=newOverdoses;
  totalDeaths+=overdoseDeaths;totalHousing+=supported;totalYouth+=offered;totalArrests+=violentArrests;
  totalRecidivism+=recidivism;totalReferrals+=healthReferrals;totalDrugContacts+=criminalContacts;
  totalSchool+=schoolSeats;totalTreatment+=treatmentStarts;totalHomeless+=homelessness;
  totalEmployment+=population*employment;totalTrust+=population*trust;
  effects.housing+=supported;effects.education+=schoolSeats;
  P.population+=population;P.underlying+=crime;P.recorded+=recorded;P.overdose+=newOverdoses;
  P.overdoseDeaths+=overdoseDeaths;P.trustSum+=population*trust;P.employed+=population*employment;
  P.homeless+=homelessness;P.youthOffers+=offered;P.recidivism+=recidivism;
  P.referrals+=healthReferrals;P.arrests+=violentArrests;P.housingStarts+=supported;
  P.schoolSeats+=schoolSeats;P.careStarts+=treatmentStarts;P.drugContacts+=criminalContacts;
 }
 const report={
  year,calendarYear:2027+year,modelVersion:VERSION,population:totalPop,underlying:totalCrime,recorded:totalRecorded,
  expectedCrime:expectCrime,offenses:Array.from(categoryTotals),recordedOffenses:Array.from(recordedTotals),
  overdoses:totalOverdoses,overdoseDeaths:totalDeaths,employment:totalPop?totalEmployment/totalPop:0,
  trust:totalPop?totalTrust/totalPop:0,homeless:totalHomeless,youthOffers:totalYouth,violentArrests:totalArrests,
  recidivism:totalRecidivism,healthReferrals:totalReferrals,drugPossessionProcessed:totalDrugContacts,
  housingSupport:totalHousing,schoolSeats:totalSchool,treatmentStarts:totalTreatment,
  interprovinceMigration:totalMigration,provinceTotals,policyUsage,effects,
  policyApplied:{national:C.national,provincePolicies:{...C.provincePolicies},
   intensity:C.intensity,budget:C.budget,patrol:C.patrol,surveillance:C.surveillance,
   education:C.education,housing:C.housing,health:C.health,employment:C.employment,
   procedure:C.procedure,migration:C.migration,spillover:C.spillover,researchStrength:C.researchStrength}
 };
 world.year=year;world.state=next;world.history.push(report);
 const frame={year,arrays:copyState(next),trueTypes:typeCounts,recordedTypes:typeRecorded};
 world.frames.push(frame);
 return report;
}
function seek(world,year){
 const at=clamp(Math.floor(year),0,world.year);
 if(at===world.year)return at;
 world.state=at===0?copyState(world.initial):copyState(world.frames[at-1].arrays);
 world.frames.length=at;world.history.length=at;world.year=at;
 world.shocks=world.shocks.filter(s=>s.from<=at);
 return at;
}
function snapshot(world,year){
 if(year<=0)return{year:0,arrays:world.initial,trueTypes:null,recordedTypes:null};
 return world.frames[Math.min(world.frames.length-1,Math.max(0,year-1))]||null;
}
function provinceReport(world,year,provinceId){
 if(year<1)return null;const item=world.history[year-1]?.provinceTotals[provinceId];if(!item)return null;
 return{...item,trust:item.population?item.trustSum/item.population:0,employment:item.population?item.employed/item.population:0};
}
function zoneReport(world,year,zone){
 const f=snapshot(world,year);if(!f)return null;
 const {arrays}=f,geo=world.geo;let population=0,crime=0,recorded=0,trust=0,n=0;
 for(const d of geo.cells)if(d.zone===zone){n++;const i=d.id,p=arrays.population[i];
  population+=p;crime+=arrays.underlying[i];recorded+=arrays.recorded[i];trust+=p*arrays.trust[i]}
 return{cells:n,population,crime,recorded,trust:population?trust/population:0};
}
root.GenesisSovereign={VERSION,MODES,ZONES,OFFENSES,PROGRAMS,DEFAULT_CONFIG,
 terrain,createWorld,step,seek,snapshot,provinceReport,zoneReport,cloneConfig,stableCount,hash,fractal};
})(typeof window!=="undefined"?window:self);