/* GENESIS 3D — independent WebGL scene, orbit controls and robust canvas fallback.
   Person markers are synthetic glyphs, never real surveillance imagery. */
(function(root){"use strict";
const N=12,D=144,S=9.8,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const palettes={people:"#65f3d0",crime:"#ff668e",recorded:"#ffb98e",patrol:"#ffc675",school:"#77d6ff",treatment:"#8cf2b6",trust:"#adabff",development:"#fbc5ff"};
function dimValue(d,layer){
 const total=arr=>Array.isArray(arr)?arr.slice(0,11).reduce((s,n)=>s+(+n||0),0):0;
 return layer==="crime"?total(d.true||d.underlying):layer==="recorded"?total(d.recorded||d.reported):
 layer==="patrol"?d.patrol||0:layer==="school"?d.schoolQuality||0:layer==="treatment"?d.clinic||0:
 layer==="trust"?d.trust||0:layer==="development"?d.development||0:layer==="people"?d.residents||0:0
}
function residentHome(world,id,month){
 if(month>0&&world.lifeFrames[month-1])return world.lifeFrames[month-1].people.home[id];
 return world.people[id].initial;
}
function colors(hex){return parseInt(hex.slice(1),16)}
async function create(container,callbacks={}){
 const status=callbacks.status||(()=>{});let startedRenderer=null;
 try{
  const THREE=await import("https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js");
  const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:"high-performance"});
  startedRenderer=renderer;renderer.setPixelRatio(Math.min(root.devicePixelRatio||1,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.48;container.append(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x050d19);scene.fog=new THREE.FogExp2(0x091c28,.0045);
  const camera=new THREE.PerspectiveCamera(47,1,.1,800),target=new THREE.Vector3(0,0,0);
  let yaw=.77,pitch=.86,distance=157,autoOrbit=false,disposed=false,raf=null,drag=null;
  scene.add(new THREE.HemisphereLight(0x9bfcfa,0x061226,1.9));
  const key=new THREE.DirectionalLight(0xe3fef6,2.2);key.position.set(-55,115,44);scene.add(key);
  const accent=new THREE.PointLight(0x35c5aa,42,135);accent.position.set(-30,45,-32);scene.add(accent);
  const bloom=new THREE.PointLight(0xff8c93,35,140);bloom.position.set(46,38,43);scene.add(bloom);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(380,380),new THREE.MeshStandardMaterial({color:0x081b29,roughness:1,metalness:.05}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-1.2;scene.add(ground);
  const grid=new THREE.GridHelper(140,14,0x26555e,0x1a3947);grid.position.y=-1.12;scene.add(grid);
  const foundations=[],blocks=[];
  const baseColor=new THREE.Color("#193347");
  const tileGeo=new THREE.PlaneGeometry(S-1.2,S-1.2);
  for(let i=0;i<D;i++){
   const x=((i%N)-(N-1)/2)*S,z=(Math.floor(i/N)-(N-1)/2)*S;
   const m=new THREE.Mesh(tileGeo,new THREE.MeshBasicMaterial({color:"#1e5760",transparent:true,opacity:.25,depthWrite:false,side:THREE.DoubleSide}));
   m.rotation.x=-Math.PI/2;m.position.set(x,-.96,z);scene.add(m);foundations.push(m);blocks.push(new THREE.Vector3(x,0,z));
  }
  // Procedural emissive window texture: no external images or assets.
  const texCanvas=document.createElement("canvas");texCanvas.width=64;texCanvas.height=128;const tx=texCanvas.getContext("2d");
  tx.fillStyle="#122a40";tx.fillRect(0,0,64,128);
  for(let row=0;row<16;row++)for(let col=0;col<8;col++){
   const n=(row*29+col*43+17)%23;tx.fillStyle=n<6?"#8be6ce":n<9?"#fff0af":"#254257";
   tx.globalAlpha=n<9?.82:.50;tx.fillRect(col*8+2,row*8+2,3.5,3.5);
  }tx.globalAlpha=1;
  const texture=new THREE.CanvasTexture(texCanvas);texture.colorSpace=THREE.SRGBColorSpace;
  const buildingMat=new THREE.MeshStandardMaterial({map:texture,color:0xffffff,metalness:.32,roughness:.55,emissive:"#155069",emissiveMap:texture,emissiveIntensity:.20});
  const geo=new THREE.BoxGeometry(1,1,1),buildingCount=D*3;
  const buildings=new THREE.InstancedMesh(geo,buildingMat,buildingCount);
  buildings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(buildings);
  const buildDistrict=[],buildOffsets=[],dummy=new THREE.Object3D();
  for(let i=0;i<D;i++)for(let k=0;k<3;k++){
    buildDistrict.push(i);buildOffsets.push(k);
    const b=blocks[i],h=3+(i*13+k*17)%18;
    dummy.position.set(b.x+[-2.6,2.35,-.1][k],h/2,b.z+[-1.6,1.3,2.4][k]);
    dummy.scale.set(2.2+k*.2,h,2.1+(i%3)*.2);dummy.updateMatrix();
    buildings.setMatrixAt(i*3+k,dummy.matrix);buildings.setColorAt(i*3+k,new THREE.Color(0x8eb6c6));
  }buildings.instanceMatrix.needsUpdate=true;
  const schools=new THREE.Group(),health=new THREE.Group();scene.add(schools,health);
  const schoolMat=new THREE.MeshBasicMaterial({color:0x7ad3ff,transparent:true,opacity:.8,depthWrite:false});
  const clinicMat=new THREE.MeshBasicMaterial({color:0x8cf2b6,transparent:true,opacity:.84,depthWrite:false});
  for(let i=0;i<D;i++){
   if(i%11===0){const s=new THREE.Mesh(new THREE.TorusGeometry(2,.18,6,24),schoolMat);s.position.set(blocks[i].x,2.2,blocks[i].z);s.rotation.x=Math.PI/2;schools.add(s)}
   if(i%17===0){const s=new THREE.Mesh(new THREE.OctahedronGeometry(1.3),clinicMat);s.position.set(blocks[i].x,6,blocks[i].z);health.add(s)}
  }
  // Instanced person lights as points, one marker per agent in the closed cohort.
  const peopleGeo=new THREE.BufferGeometry();const MAX=1152;
  const positions=new Float32Array(MAX*3),personColors=new Float32Array(MAX*3);
  peopleGeo.setAttribute("position",new THREE.BufferAttribute(positions,3));
  peopleGeo.setAttribute("color",new THREE.BufferAttribute(personColors,3));
  peopleGeo.setDrawRange(0,0);
  const peopleMaterial=new THREE.PointsMaterial({vertexColors:true,size:2.05,transparent:true,opacity:.92,sizeAttenuation:true,depthWrite:false});
  const peoplePoints=new THREE.Points(peopleGeo,peopleMaterial);peoplePoints.frustumCulled=false;scene.add(peoplePoints);
  const incidentGroup=new THREE.Group();scene.add(incidentGroup);
  const pulseGeo=new THREE.RingGeometry(3.1,3.45,40);
  const pulses=Array.from({length:25},(_,k)=>{const m=new THREE.Mesh(pulseGeo,new THREE.MeshBasicMaterial({color:0xff8d98,transparent:true,opacity:.4,depthWrite:false,side:THREE.DoubleSide}));
    m.rotation.x=-Math.PI/2;m.visible=false;incidentGroup.add(m);return m});
  const select=new THREE.Mesh(new THREE.RingGeometry(4.15,4.47,5),new THREE.MeshBasicMaterial({color:"#ffffff",transparent:true,opacity:.96,depthWrite:false,side:THREE.DoubleSide}));
  select.rotation.x=-Math.PI/2;select.rotation.z=Math.PI/5;scene.add(select);
  const raycaster=new THREE.Raycaster();raycaster.params.Points.threshold=1.5;
  const pointer=new THREE.Vector2(),intersection=new THREE.Vector3(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  let current=null,month=0,sel=-1,layer="people",lastCoords=[],lastFrame=null;
  function size(){const rect=container.getBoundingClientRect();if(rect.width<20||rect.height<20)return;
   renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix()}
  const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(size):null;if(observer)observer.observe(container);root.addEventListener("resize",size);size();
  function getPointer(e){const rect=renderer.domElement.getBoundingClientRect();return{x:(e.clientX-rect.left)/rect.width*2-1,y:-(e.clientY-rect.top)/rect.height*2+1}}
  function pick(e){
    const p=getPointer(e);pointer.set(p.x,p.y);raycaster.setFromCamera(pointer,camera);
    const hits=raycaster.intersectObject(peoplePoints,false);
    if(hits.length&&Number.isInteger(hits[0].index)&&hits[0].distanceToRay<1.8)return{person:hits[0].index};
    const buildingsHit=raycaster.intersectObject(buildings,false);
    if(buildingsHit.length&&Number.isInteger(buildingsHit[0].instanceId))return{district:buildDistrict[buildingsHit[0].instanceId]};
    if(raycaster.ray.intersectPlane(plane,intersection)){
      const x=Math.round(intersection.x/S+(N-1)/2),z=Math.round(intersection.z/S+(N-1)/2);
      if(x>=0&&x<N&&z>=0&&z<N)return{district:z*N+x};
    }
    return null;
  }
  renderer.domElement.addEventListener("pointerdown",e=>{drag={x:e.clientX,y:e.clientY,prevX:e.clientX,prevY:e.clientY};renderer.domElement.setPointerCapture(e.pointerId)});
  renderer.domElement.addEventListener("pointermove",e=>{if(!drag)return;const dx=e.clientX-drag.prevX,dy=e.clientY-drag.prevY;drag.prevX=e.clientX;drag.prevY=e.clientY;yaw-=dx*.005;pitch=clamp(pitch+dy*.004,.14,1.48)});
  renderer.domElement.addEventListener("pointerup",e=>{if(!drag)return;const moved=Math.hypot(e.clientX-drag.x,e.clientY-drag.y);drag=null;if(moved<7){const picked=pick(e);if(picked?.person!=null)callbacks.selectPerson?.(picked.person);else if(picked?.district!=null)callbacks.selectDistrict?.(picked.district)}});
  renderer.domElement.addEventListener("pointercancel",()=>drag=null);
  renderer.domElement.addEventListener("wheel",e=>{e.preventDefault();distance=clamp(distance*(e.deltaY>0?1.08:.93),32,290)},{passive:false});
  function setCamera(view){if(view==="top"){pitch=1.47;yaw=.04;distance=181}else if(view==="street"){pitch=.21;yaw=.55;distance=108}else{pitch=.86;yaw=.77;distance=157}}
  function colorFor(layer,value,max){
    const color=new THREE.Color(palettes[layer]||palettes.people);
    let v=layer==="people"?Math.min(1,value/20):layer==="crime"||layer==="recorded"?Math.pow(value/Math.max(1,max),.7):clamp(value,0,1);
    return baseColor.clone().lerp(color,.14+v*.80);
  }
  function update(world,at,selected,mode){
    current=world;month=Math.max(0,Math.min(at,world.month));sel=selected;layer=mode;
    const frame=month?world.lifeFrames[month-1]:null;lastFrame=frame;
    const districts=frame?.districts||world.city;
    const values=districts.map(d=>dimValue(d,mode)),max=Math.max(1,...values);
    for(let i=0;i<D;i++){
      const d=districts[i],tint=colorFor(layer,values[i],max);foundations[i].material.color.copy(tint);
      foundations[i].material.opacity=.17+Math.min(1,values[i]/max)*.48;
    }
    for(let j=0;j<buildingCount;j++){
      const id=buildDistrict[j],k=buildOffsets[j],d=districts[id],b=blocks[id],dev=d.development||.4;
      const center=Math.exp(-((id%12-5.5)**2+(Math.floor(id/12)-5.5)**2)/30);
      const base=3+center*15+((id*31+k*19)%14),h=base*(.65+dev*.85);
      dummy.position.set(b.x+[-2.6,2.35,-.1][k],h/2,b.z+[-1.6,1.3,2.4][k]);
      dummy.scale.set(2.05+.2*k,h,2.10+.3*((id+k)%3));dummy.updateMatrix();
      buildings.setMatrixAt(j,dummy.matrix);buildings.setColorAt(j,colorFor(layer,values[id],max));
    }buildings.instanceMatrix.needsUpdate=true;buildings.instanceColor.needsUpdate=true;
    const crowd=world.people.length,pa=frame?.people;
    for(let id=0;id<crowd;id++){
      const alive=pa?!!pa.alive[id]:world.state[id].alive;
      const home=pa?pa.home[id]:world.people[id].initial,b=blocks[home];
      const xOffset=(Math.sin(id*16.27)*.5+.5)*6-3,zOffset=(Math.cos(id*23.18)*.5+.5)*6-3;
      positions[id*3]=b.x+xOffset;positions[id*3+1]=alive?2.6+((id*7)%7)*.13:-500;positions[id*3+2]=b.z+zOffset;
      const emp=pa?!!pa.employed[id]:world.state[id].employed,treated=pa?!!pa.treatment[id]:false,flag=pa?pa.flags[id]:0;
      const color=new THREE.Color(id===sel?"#ffffff":!alive?"#193345":treated?"#a0ffb7":flag&2?"#ff8ca3":emp?"#65f3d0":"#85b4ef");
      personColors[id*3]=color.r;personColors[id*3+1]=color.g;personColors[id*3+2]=color.b;
    }peopleGeo.setDrawRange(0,crowd);peopleGeo.attributes.position.needsUpdate=true;peopleGeo.attributes.color.needsUpdate=true;
    const hot=districts.map((d,id)=>({id,v:dimValue(d,"crime")})).sort((a,b)=>b.v-a.v);
    pulses.forEach((m,k)=>{const h=hot[k];m.visible=!!h&&h.v>0&&month>0;if(m.visible){const b=blocks[h.id];m.position.set(b.x,.13,b.z)}});
    select.visible=sel>=0&&sel<crowd;
    if(select.visible){const b=blocks[residentHome(world,sel,month)];select.position.set(b.x,.65,b.z);}
    schools.visible=layer==="school"||layer==="people";health.visible=layer==="treatment"||layer==="people";
  }
  const rm=globalThis??root;
  const reduceMotion=root.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  function animate(time){
    if(disposed)return;
    raf=requestAnimationFrame(animate);if(document.hidden)return;
    if(autoOrbit&&!drag&&!reduceMotion)yaw+=.0009;
    camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*distance,target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(target);
    if(!reduceMotion){
      const t=time*.001;
      for(let k=0;k<pulses.length;k++)if(pulses[k].visible){const phase=(t*.55+k*.16)%1;pulses[k].scale.setScalar(1+phase*.75);pulses[k].material.opacity=.50*(1-phase)}
      // Shimmer without changing identities or geographic assignment.
      peoplePoints.position.y=Math.sin(t*.6)*.16;
    }
    renderer.render(scene,camera);
  }
  function capture(){renderer.render(scene,camera);return renderer.domElement.toDataURL("image/png")}
  function toggleOrbit(){autoOrbit=!autoOrbit;return autoOrbit}
  function dispose(){disposed=true;cancelAnimationFrame(raf);observer?.disconnect();root.removeEventListener("resize",size);renderer.dispose();renderer.domElement.remove()}
  status("WEBGL ACTIVE · "+buildingCount+" BUILDINGS / "+POP_TEXT()+" PEOPLE");
  function POP_TEXT(){return current?.people?.length||"1,152"}
  animate(0);
  return{type:"webgl",update,setCamera,capture,toggleOrbit,dispose};
 }catch(error){
  try{startedRenderer?.domElement?.remove();startedRenderer?.dispose()}catch(_){}
  status("ISOMETRIC BACKUP · FULL SIMULATOR AVAILABLE");
  return fallback(container,callbacks,error);
 }
}
function fallback(container,callbacks,error){
 const canvas=document.getElementById("fallback");canvas.hidden=false;
 const ctx=canvas.getContext("2d");
 let world=null,month=0,sel=-1,layer="people",zoom=1,rot=0;
 const project=(x,y,h=0)=>({x:600+(x-y)*30*zoom,y:185+(x+y)*15*zoom-h*7*zoom});
 function draw(){
  if(!ctx)return;
  ctx.fillStyle="#061623";ctx.fillRect(0,0,1200,760);
  if(!world)return;
  const f=month?world.lifeFrames[month-1]:null,ds=f?.districts||world.city;
  const vals=ds.map(d=>dimValue(d,layer)),max=Math.max(1,...vals);
  const ids=Array.from({length:D},(_,id)=>id).sort((a,b)=>(a%N+Math.floor(a/N))-(b%N+Math.floor(b/N)));
  for(const id of ids){
    const x=(id%N-5.5)*1.1,y=(Math.floor(id/N)-5.5)*1.1,d=ds[id],q=project(x,y),h=5+d.development*27+(id*19)%7;
    const v=layer==="crime"||layer==="recorded"?Math.pow(vals[id]/max,.7):clamp(vals[id],0,1);
    const col=colors(palettes[layer]||palettes.people),r=(col>>16)&255,g=col>>8&255,b=col&255;
    ctx.fillStyle="rgb("+Math.round(16+r*v*.74)+","+Math.round(27+g*v*.74)+","+Math.round(39+b*v*.68)+")";
    ctx.fillRect(q.x-7*zoom,q.y-h*zoom,13*zoom,h*zoom);
    ctx.fillStyle="#3c6574";ctx.fillRect(q.x-7*zoom,q.y-h*zoom,13*zoom,2*zoom);
    if(d.patrol){ctx.fillStyle="#ffc675";ctx.beginPath();ctx.arc(q.x,q.y-h*zoom-3,2.5,0,Math.PI*2);ctx.fill()}
  }
  const a=f?.people,limit=world.people.length;
  for(let id=0;id<limit;id++){
    const alive=a?!!a.alive[id]:world.state[id].alive;if(!alive)continue;
    const home=a?a.home[id]:world.people[id].initial,x=(home%N-5.5)*1.1,y=(Math.floor(home/N)-5.5)*1.1,q=project(x,y,2.7);
    ctx.fillStyle=id===sel?"#fff":(a?.employed[id]??world.state[id].employed)?"#65f3d0":"#94beec";
    ctx.globalAlpha=.75;ctx.fillRect(q.x+Math.sin(id*19)*6,q.y+Math.cos(id*13)*3,2.5,2.5);
  }
  ctx.globalAlpha=1;ctx.fillStyle="#a3c9d5";ctx.font="14px ui-monospace,monospace";
  ctx.fillText("ISOMETRIC BACKUP / NO WEBGL REQUIRED",20,32);
  if(error)ctx.fillText("3D MODULE NOT AVAILABLE: "+String(error.message).slice(0,85),20,54);
 }
 canvas.addEventListener("click",e=>{
   if(!world)return;const rect=canvas.getBoundingClientRect(),mx=(e.clientX-rect.left)/rect.width*1200,my=(e.clientY-rect.top)/rect.height*760;
   let dist=Infinity,selected=-1;
   for(let id=0;id<D;id++){const p=project((id%N-5.5)*1.1,(Math.floor(id/N)-5.5)*1.1);const d=Math.hypot(mx-p.x,my-p.y);if(d<dist){dist=d;selected=id}}
   if(selected>=0&&dist<38)callbacks.selectDistrict?.(selected);
 });
 return{type:"fallback",update(w,m,s,l){world=w;month=m;sel=s;layer=l;draw()},setCamera(type){zoom=type==="street"?1.2:type==="top"?.85:1;draw()},capture(){draw();return canvas.toDataURL("image/png")},toggleOrbit(){return false},dispose(){canvas.hidden=true}};
}
root.Genesis3D={create,dimValue,palettes};
})(window);