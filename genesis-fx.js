/* GENESIS FX / CINEMATIC CITY
   Purely visual effects. No mutations to agents, crime counts or policies.
   Traffic, drones, skyline pulses and data streams are decorative abstractions,
   NOT evidence of individual travel, patrol vehicle paths, or observed events.
*/
(function(root){"use strict";
const COUNT=144,LANES=12;
const ACCENTS={people:0x67f8df,crime:0xff648b,recorded:0xffaf84,patrol:0xffce7f,school:0x69d3ff,treatment:0x8effc0,trust:0xb3a8ff,development:0xf8bbfc};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function metric(d,layer,focus){
 const count=arr=>Array.isArray(arr)?(focus>=0?(arr[focus]||0):arr.slice(0,11).reduce((a,b)=>a+b,0)):0;
 if(layer==="crime")return count(d.true||d.underlying);
 if(layer==="recorded")return count(d.recorded||d.reported);
 if(layer==="patrol")return d.patrol||0;
 if(layer==="school")return d.schoolQuality||0;
 if(layer==="treatment")return d.clinic||0;
 if(layer==="trust")return d.trust||0;
 if(layer==="development")return d.development||0;
 return d.residents||0;
}
function create(THREE,scene,centers,lights,options={}){
 const S=options.spacing||9.8;
 const state={atmosphere:"night",traffic:true,patrol:true,signals:true,stars:true,streams:true,lowPower:false};
 const reduced=!!options.reducedMotion;
 const made=[],add=(obj)=>{scene.add(obj);made.push(obj);return obj};
 const original={hemi:lights.hemi?.intensity||1.9,key:lights.key?.intensity||2.2,accent:lights.accent?.intensity||42,bloom:lights.bloom?.intensity||35};
 const palette=(k)=>new THREE.Color(ACCENTS[k]||ACCENTS.people);
 // Deep-space star dome. Stars are cosmetic; they carry no data.
 const starsGeom=new THREE.BufferGeometry(),starsPos=new Float32Array(600*3);
 for(let i=0;i<600;i++){const a=i*2.399963,rad=165+(i*103%185),el=65+(i*73%240);starsPos[i*3]=Math.cos(a)*rad;starsPos[i*3+1]=el;starsPos[i*3+2]=Math.sin(a)*rad}
 starsGeom.setAttribute("position",new THREE.BufferAttribute(starsPos,3));
 const stars=add(new THREE.Points(starsGeom,new THREE.PointsMaterial({color:0xb2eaff,size:1.10,transparent:true,opacity:.80,depthWrite:false})));
 // Movable light points represent *decorative* transit animation.
 const CARS=124;
 const trafficGeo=new THREE.BufferGeometry(),trafficPos=new Float32Array(CARS*3),trafficCol=new Float32Array(CARS*3);
 const trafficLines=[];
 for(let i=0;i<CARS;i++){
  const hue=new THREE.Color(i%7===0?0xff91a8:i%5===0?0xffca82:i%3===0?0x77caff:0x51f5d8);
  trafficCol[i*3]=hue.r;trafficCol[i*3+1]=hue.g;trafficCol[i*3+2]=hue.b;
  trafficLines.push({vertical:i%2===0,lane:i%LANES,fraction:((i*73+31)%131)/131,speed:.018+(i%11)*.004});
 }
 trafficGeo.setAttribute("position",new THREE.BufferAttribute(trafficPos,3).setUsage(THREE.DynamicDrawUsage));
 trafficGeo.setAttribute("color",new THREE.BufferAttribute(trafficCol,3));
 trafficGeo.setDrawRange(0,CARS);
 const traffic=add(new THREE.Points(trafficGeo,new THREE.PointsMaterial({vertexColors:true,size:1.72,transparent:true,opacity:1,depthWrite:false,sizeAttenuation:true})));
 traffic.frustumCulled=false;
 // Stylized patrol allocation drones, not tracked devices. Beam intensity is
 // symbolic; no geolocated agents or real-world enforcement route is implied.
 const droneGeo=new THREE.IcosahedronGeometry(.63,0),droneMat=new THREE.MeshBasicMaterial({color:0xffd798});
 const rotorGeo=new THREE.BoxGeometry(2.5,.085,.20),rotorMat=new THREE.MeshBasicMaterial({color:0x9bffff});
 const beamGeo=new THREE.ConeGeometry(2.2,8,12,1,true),beamMat=new THREE.MeshBasicMaterial({color:0x7bddf7,transparent:true,opacity:.085,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
 const dronePool=[],droneRoot=add(new THREE.Group());
 for(let i=0;i<28;i++){
  const group=new THREE.Group();
  const body=new THREE.Mesh(droneGeo,droneMat),rotor=new THREE.Mesh(rotorGeo,rotorMat),rotorB=new THREE.Mesh(rotorGeo,rotorMat),beam=new THREE.Mesh(beamGeo,beamMat);
  rotorB.rotation.y=Math.PI/2;beam.position.y=-4.5;
  group.add(body,rotor,rotorB,beam);droneRoot.add(group);dronePool.push(group);group.visible=false;
 }
 let patrolDistricts=[];
 // Vertical signal columns show synthetic event concentrations, with a ring
 // at ground level. These are NOT real incident locations.
 const beacons=[],beaconRoot=add(new THREE.Group());
 const cylinder=new THREE.CylinderGeometry(.20,.75,1.0,8,1,true);
 const ring=new THREE.RingGeometry(2.5,2.72,32);
 for(let i=0;i<27;i++){
  const group=new THREE.Group();
  const shaft=new THREE.Mesh(cylinder,new THREE.MeshBasicMaterial({color:0xff87b2,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
  const halo=new THREE.Mesh(ring,new THREE.MeshBasicMaterial({color:0xff87b2,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}));
  halo.rotation.x=-Math.PI/2;halo.position.y=.20;group.add(shaft,halo);
  group.visible=false;beaconRoot.add(group);beacons.push({group,shaft,halo,height:1});
 }
 // Visual network link segments: the "algorithmic signal" contains no personal
 // movement data and does not represent actual connections between places.
 const PATHS=46,pathGeom=new THREE.BufferGeometry(),pathPoints=new Float32Array(PATHS*2*3),pathColors=new Float32Array(PATHS*2*3);
 pathGeom.setAttribute("position",new THREE.BufferAttribute(pathPoints,3).setUsage(THREE.DynamicDrawUsage));
 pathGeom.setAttribute("color",new THREE.BufferAttribute(pathColors,3).setUsage(THREE.DynamicDrawUsage));
 pathGeom.setDrawRange(0,0);
 const pathLines=add(new THREE.LineSegments(pathGeom,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.40,depthWrite:false,blending:THREE.AdditiveBlending})));
 // Weather: sprites are bright particles, not real meteorological information.
 const RAIN=470,rainGeom=new THREE.BufferGeometry(),rainPos=new Float32Array(RAIN*3);
 for(let i=0;i<RAIN;i++){rainPos[i*3]=((i*71)%213-106)*.67;rainPos[i*3+1]=8+(i*47%115);rainPos[i*3+2]=((i*53)%227-113)*.67}
 rainGeom.setAttribute("position",new THREE.BufferAttribute(rainPos,3).setUsage(THREE.DynamicDrawUsage));
 const rain=add(new THREE.Points(rainGeom,new THREE.PointsMaterial({color:0xa0dfff,size:.45,transparent:true,opacity:.70,depthWrite:false})));
 const meteorGeo=new THREE.BufferGeometry(),meteorPos=new Float32Array(45*3),meteorColors=new Float32Array(45*3);
 for(let i=0;i<45;i++){const hue=new THREE.Color(i%2?0xa3f8ff:0xffdcaa);meteorColors[i*3]=hue.r;meteorColors[i*3+1]=hue.g;meteorColors[i*3+2]=hue.b}
 meteorGeo.setAttribute("position",new THREE.BufferAttribute(meteorPos,3).setUsage(THREE.DynamicDrawUsage));
 meteorGeo.setAttribute("color",new THREE.BufferAttribute(meteorColors,3));
 meteorGeo.setDrawRange(0,45);
 const atmosphereDots=add(new THREE.Points(meteorGeo,new THREE.PointsMaterial({vertexColors:true,size:.6,transparent:true,opacity:.5,depthWrite:false})));
 // Neon outer-city transit arteries establish visual depth.
 const roadGroup=add(new THREE.Group()),lineMat=new THREE.LineBasicMaterial({color:0x26a8a0,transparent:true,opacity:.26,blending:THREE.AdditiveBlending});
 for(let k=0;k<LANES+1;k++){
  const v=(k-LANES/2)*S;
  for(const path of [new Float32Array([v,-.90,-65,v,-.90,65]),new Float32Array([-65,-.90,v,65,-.90,v])]){
   const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(path,3));
   roadGroup.add(new THREE.Line(g,lineMat));
  }
 }
 let lastData=null,lastAt=0;
 function setAtmosphere(mode){
  if(!["night","dawn","storm"].includes(mode))return;
  state.atmosphere=mode;
  const night=mode==="night",storm=mode==="storm",dawn=mode==="dawn";
  scene.background.set(dawn?0x52627d:storm?0x020a16:0x050d19);
  if(scene.fog?.color)scene.fog.color.set(dawn?0x536479:storm?0x08182b:0x091c28);
  if(lights.key)lights.key.intensity=dawn?3.35:storm?.58:original.key;
  if(lights.hemi)lights.hemi.intensity=dawn?2.8:storm?1.3:original.hemi;
  if(lights.accent)lights.accent.intensity=dawn?13:storm?64:original.accent;
  if(lights.bloom)lights.bloom.intensity=dawn?12:storm?55:original.bloom;
  if(lights.renderer)lights.renderer.toneMappingExposure=dawn?1.70:storm?1.23:1.48;
  stars.visible=night&&state.stars&&!state.lowPower;
  rain.visible=storm&&!state.lowPower;
  return mode;
 }
 function setFX(name,enabled){
  if(!(name in state)||["atmosphere","lowPower"].includes(name))return false;
  state[name]=!!enabled;
  if(name==="traffic")traffic.visible=state.traffic;
  if(name==="stars")stars.visible=state.stars&&state.atmosphere==="night"&&!state.lowPower;
  if(name==="patrol")droneRoot.visible=state.patrol;
  if(name==="signals")beaconRoot.visible=state.signals;
  if(name==="streams")pathLines.visible=state.streams&&!state.lowPower;
  return state[name];
 }
 function setQuality(low){
  state.lowPower=!!low;
  if(state.lowPower){rain.visible=false;atmosphereDots.visible=false;stars.visible=false;pathLines.visible=false;}
  else {atmosphereDots.visible=true;setAtmosphere(state.atmosphere);pathLines.visible=state.streams}
  return state.lowPower;
 }
 function update(world,month,layer,focus=-1){
  lastAt=month;
  const frame=month>0?world.lifeFrames[month-1]:null;
  lastData=frame?.districts||world.initialCity||world.city;
  const sorted=lastData.map((d,id)=>({id,value:metric(d,layer,focus)})).sort((a,b)=>b.value-a.value||a.id-b.id);
  const max=Math.max(1,sorted[0]?.value||1),c=palette(layer);
  let active=0;
  for(let i=0;i<beacons.length;i++){
   const item=sorted[i],beacon=beacons[i],visible=month>0&&item?.value>0&&layer!=="people"&&layer!=="patrol";
   beacon.group.visible=!!visible;if(!visible)continue;
   const pos=centers[item.id],h=2+clamp(item.value/max,0,1)*17;
   beacon.height=h;beacon.group.position.set(pos.x,0,pos.z);
   beacon.shaft.position.y=h/2;beacon.shaft.scale.set(1,h,1);
   beacon.shaft.material.color.copy(c);beacon.halo.material.color.copy(c);active++;
  }
  const patrolItems=lastData.map((d,id)=>({id,p:d.patrol||0})).filter(x=>x.p>0).sort((a,b)=>b.p-a.p||a.id-b.id);
  patrolDistricts=patrolItems.slice(0,dronePool.length).map(x=>x.id);
  dronePool.forEach((d,i)=>{d.visible=i<patrolDistricts.length});
  let vertices=0;
  if(month>0&&sorted.length>2){
   const anchors=lastData.map((d,id)=>({id,score:d.score||0})).sort((a,b)=>b.score-a.score).slice(0,9);
   const lineColor=palette(layer==="crime"?"crime":layer==="recorded"?"recorded":"people");
   for(let a=0;a<anchors.length&&vertices<PATHS*2;a++){
    for(let b=a+1;b<anchors.length&&b<a+6&&vertices<PATHS*2;b++){
     const p=centers[anchors[a].id],q=centers[anchors[b].id],start=vertices*3,end=(vertices+1)*3;
     pathPoints[start]=p.x;pathPoints[start+1]=4+(a%3)*3;pathPoints[start+2]=p.z;
     pathPoints[end]=q.x;pathPoints[end+1]=4+(b%4)*3;pathPoints[end+2]=q.z;
     for(let k of [start,end]){pathColors[k]=lineColor.r;pathColors[k+1]=lineColor.g;pathColors[k+2]=lineColor.b}
     vertices+=2;
    }
   }
  }
  pathGeom.setDrawRange(0,vertices);
  pathGeom.attributes.position.needsUpdate=true;pathGeom.attributes.color.needsUpdate=true;
  setFX("traffic",state.traffic);setFX("patrol",state.patrol);setFX("signals",state.signals);
  if(!state.lowPower){setFX("stars",state.stars);setFX("streams",state.streams)}
  return{activeBeacons:active,activePatrol:patrolDistricts.length,linkedPaths:vertices/2};
 }
 function animate(timestamp,delta=0){
  const t=timestamp*.001,motion=reduced?0:1;
  if(state.traffic){
   for(let i=0;i<CARS;i++){
    const meta=trafficLines[i],f=(meta.fraction+t*meta.speed*motion)%1;
    const along=(f-.5)*LANES*S,lane=(meta.lane-5.5)*S+S*.5;
    trafficPos[i*3]=meta.vertical?lane:along;
    trafficPos[i*3+1]=.15;
    trafficPos[i*3+2]=meta.vertical?along:lane;
   }
   trafficGeo.attributes.position.needsUpdate=true;
  }
  if(state.patrol){
   for(let i=0;i<patrolDistricts.length;i++){
    const d=dronePool[i],p=centers[patrolDistricts[i]],phase=t*.68+i*.91;
    d.position.set(p.x+Math.sin(phase)*2*motion,12+(1.7*Math.sin(phase*1.7))*motion,p.z+Math.cos(phase)*2*motion);
    d.rotation.y=phase*.24*motion;
   }
  }
  if(state.signals){
   for(let i=0;i<beacons.length;i++){const b=beacons[i];if(!b.group.visible)continue;
    const pulse=(Math.sin(t*2.2+i*.62)+1)*.5;
    b.halo.scale.setScalar(1+.45*pulse*motion);
    b.halo.material.opacity=.35+.43*pulse;b.shaft.material.opacity=.11+.22*pulse;
   }
  }
  if(state.atmosphere==="storm"&&!state.lowPower){
   const speed=delta>0?clamp(delta/16.67,.5,2.5):1;
   for(let i=0;i<RAIN;i++){const j=i*3+1;rainPos[j]-=(.52+(i%9)*.12)*speed*motion;if(rainPos[j]<0)rainPos[j]=90+(i%25)}
   rainGeom.attributes.position.needsUpdate=true;
   if(lights.bloom)lights.bloom.intensity=55+(Math.sin(t*.76)> .998?40:0);
  }
  if(!state.lowPower){
   for(let i=0;i<45;i++){
    const wave=t*(.18+(i%5)*.025),angle=i*2.4;
    meteorPos[i*3]=Math.cos(angle)*60+Math.sin(wave+i)*4;
    meteorPos[i*3+1]=12+((i*13)%60)+Math.cos(wave+i)*2;
    meteorPos[i*3+2]=Math.sin(angle)*60+Math.cos(wave+i)*4;
   }
   meteorGeo.attributes.position.needsUpdate=true;
  }
 }
 function snapshot(){return{...state,lastAt,patrolDrones:patrolDistricts.length}}
 function dispose(){
  for(const obj of made){scene.remove(obj)}
  for(const mat of [droneMat,rotorMat,beamMat]){if(mat?.dispose)mat.dispose()}
  for(const g of [starsGeom,trafficGeo,droneGeo,rotorGeo,beamGeo,cylinder,ring,pathGeom,rainGeom,meteorGeo]){if(g?.dispose)g.dispose()}
 }
 setAtmosphere("night");
 return{update,animate,setAtmosphere,setFX,setQuality,snapshot,dispose};
}
root.GenesisFX={create,metric};
})(window);