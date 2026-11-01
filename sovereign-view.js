/* GENESIS // SOVEREIGN 3D geographic visualizer.
   One cell = synthetic composite region. Buildings, flows, roads, borders,
   vehicle traces and labels are visuals, not geolocated observations.
*/
(function(root){"use strict";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const colorHex=n=>"#"+n.toString(16).padStart(6,"0");
const LAYERS={
 zoning:{label:"Land-use types",color:0x58f4d8},
 population:{label:"Population density",color:0x8aeaff},
 underlying:{label:"Underlying incidents",color:0xff7996},
 recorded:{label:"Recorded incidents",color:0xffcf98},
 employment:{label:"Employment rate",color:0x9df6bc},
 housing:{label:"Housing stability",color:0xf7c9a1},
 education:{label:"Education access",color:0xc5b2ff},
 health:{label:"Health-care access",color:0x67e5fd},
 trust:{label:"Hypothetical trust",color:0xf6adff},
 development:{label:"Built development",color:0xffffa4},
 province:{label:"Administrative provinces",color:0x73e4fd},
 offense:{label:"Selected offense type",color:0xff91c3}
};
const LAND_NAMES=["water","urban","suburban","commercial","industrial","rural","wilderness"];
function colorFromInt(hex){return[(hex>>16)&255,(hex>>8)&255,hex&255]}
function mixColor(a,b,t){return[a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t,a[2]*(1-t)+b[2]*t]}
function cellValue(cell,arrays,layer,offense,frame,index){
 const i=cell.id;
 if(layer==="zoning")return .35+cell.zone*.12;
 if(layer==="province")return (cell.province%9)/8;
 if(layer==="population")return Math.log1p(arrays.population[i])/11;
 if(layer==="underlying")return arrays.underlying[i]/Math.max(10,arrays.population[i]/1000*120);
 if(layer==="recorded")return arrays.recorded[i]/Math.max(10,arrays.population[i]/1000*75);
 if(layer==="offense")return frame?.trueTypes?.[i*10+(Number(offense)||0)]/Math.max(5,arrays.population[i]/1000*15)||0;
 return arrays[layer]?.[i]||0;
}
function cellColor(cell,arrays,layer,offense,frame,provSelected){
 if(cell.zone===0)return[22,72,116];
 if(layer==="zoning"){
  const base=colorFromInt(root.GenesisSovereign.ZONES[cell.zone].color);
  return cell.province===provSelected?mixColor(base,[194,251,229],.34):base;
 }
 if(layer==="province"){
  const h=(cell.province*137.508)%360,rgb=hsl(h/360,.45,.48);
  return cell.province===provSelected?mixColor(rgb,[221,255,236],.5):rgb;
 }
 const p=clamp(cellValue(cell,arrays,layer,offense,frame),0,1.2);
 const rgb=colorFromInt(LAYERS[layer]?.color||0x68f3da),bg=[18,42,62],t=clamp(Math.pow(p,.8)*.95+.09,0,1);
 return cell.province===provSelected?mixColor(mixColor(bg,rgb,t),[234,252,233],.32):mixColor(bg,rgb,t);
}
function hsl(h,s,l){const a=s*Math.min(l,1-l);const f=n=>{const k=(n+h*12)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1))))};return[f(0),f(8),f(4)]}
function flatCanvas(container,geo,select,status){
 const canvas=document.createElement("canvas");canvas.className="sovereignCanvas";
 container.append(canvas);const ctx=canvas.getContext("2d");
 if(!ctx)throw Error("Canvas unavailable");
 let frame=null,world=null,year=0,layer="zoning",offense=0,provinceSelected=0,zoom=1,panX=0,panY=0,drag=null,lastTime=0,disposed=false;
 function size(){const w=container.clientWidth||900,h=container.clientHeight||560;
  canvas.width=Math.max(360,Math.round(w*devicePixelRatio));canvas.height=Math.max(280,Math.round(h*devicePixelRatio));
  canvas.style.width=w+"px";canvas.style.height=h+"px";
 }
 size();
 const getXY=(x,y)=>{
  const w=canvas.width,h=canvas.height,margin=Math.min(w/(geo.w*1.5),h/(geo.h*1.5));
  const S=margin*zoom,ox=w/2-geo.w*S*.5+panX,oy=h/2-geo.h*S*.43+panY;
  return{x:ox+x*S,y:oy+y*S*.88,S};
 };
 function draw(t=0){
  if(disposed)return;
  const w=canvas.width,h=canvas.height,grad=ctx.createLinearGradient(0,0,w,h);
  grad.addColorStop(0,"#061320");grad.addColorStop(.5,"#102a38");grad.addColorStop(1,"#071420");
  ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  const arrays=frame?.arrays||world?.initial;
  if(!arrays)return;
  const S=getXY(0,0).S,skip=geo.size>3000&&S<4?2:1;
  for(let y=0;y<geo.h;y+=skip)for(let x=0;x<geo.w;x+=skip){
   const cell=geo.cells[y*geo.w+x];const p=getXY(x,y);
   if(p.x<-(3*S)||p.y<-(20*S)||p.x>w+3*S||p.y>h+20*S)continue;
   const col=cellColor(cell,arrays,layer,offense,frame,provinceSelected),sz=S*skip;
   ctx.fillStyle="rgb("+col.map(Math.round).join(",")+")";
   ctx.fillRect(p.x,p.y,Math.ceil(sz)+.3,Math.ceil(sz*.88)+.3);
   if(cell.zone!==0){
    // 2½D skyline extrusion: parcel height reflects generated land-use and
    // synthetic development; not real buildings or real urban growth.
    const height=Math.max(0,(cell.zone===3?13:cell.zone===1?8:cell.zone===2?3.7:cell.zone===4?5:1)*
      (arrays.development?.[cell.id]??cell.alt)*S*.23);
    if(S>3.6&&cell.zone<=4){
     const bw=S*.43,bh=S*.48,px=p.x+S*.25,py=p.y+S*.2;
     ctx.fillStyle="rgba(2,14,24,.55)";ctx.fillRect(px+bw*.16,py-height+bh*.18,bw,bh);
     ctx.fillStyle="rgba(173,239,230,.27)";ctx.fillRect(px,py-height,bw,bh);
     ctx.fillStyle="rgba(255,254,203,.37)";ctx.fillRect(px+2,py-height+2,Math.max(1,bw*.18),Math.max(2,bh*.17));
    }
   }
   if(cell.transport&&S>3.2){ctx.fillStyle="#b6d7ab70";ctx.fillRect(p.x,p.y+sz*.36,sz,.7)}
  }
  // Province borders are distinct from political borders of actual nations.
  if(S>3.5){
   ctx.strokeStyle="#9ecbd246";ctx.lineWidth=Math.max(.5,S*.07);
   for(let y=0;y<geo.h-1;y++)for(let x=0;x<geo.w-1;x++){
    const i=y*geo.w+x,c=geo.cells[i],right=geo.cells[i+1],down=geo.cells[i+geo.w],p=getXY(x,y);
    if(c.zone===0)continue;
    ctx.beginPath();
    if(c.province!==right.province){ctx.moveTo(p.x+S,p.y);ctx.lineTo(p.x+S,p.y+S*.88)}
    if(c.province!==down.province){ctx.moveTo(p.x,p.y+S*.88);ctx.lineTo(p.x+S,p.y+S*.88)}
    ctx.stroke();
   }
  }
  ctx.font="bold "+clamp(S*1.4,10,15)+"px system-ui";ctx.textAlign="center";
  for(const city of geo.cities){
   const p=getXY(city.x+.5,city.y);
   ctx.fillStyle="#e2fff0";ctx.shadowColor="#51f6d0";ctx.shadowBlur=8;
   ctx.beginPath();ctx.arc(p.x,p.y,Math.max(2,S*.25),0,7);ctx.fill();
   ctx.shadowBlur=0;ctx.fillStyle="#f8ffff";ctx.fillText(city.name,p.x,p.y-10);
  }
  if(world&&year>0){
   const region=geo.provinces[provinceSelected],p=getXY(region.x,region.y);
   ctx.strokeStyle="#fff5d3";ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,Math.max(10,S*1.2)+Math.sin(t*.0018)*3,0,7);ctx.stroke();
  }
  // Decorative mobile night signals. There is no geolocated police vehicle data.
  for(let i=0;i<110;i++){
   const road=geo.cities[i%geo.cities.length],b=geo.cities[(i*7+3)%geo.cities.length];
   const fraction=((t*.000025*(1+i%4))+i*.173)%1;
   const p=getXY(road.x+(b.x-road.x)*fraction,road.y+(b.y-road.y)*fraction);
   ctx.fillStyle=i%4?"#7ef4dc84":"#ffdc9f86";ctx.fillRect(p.x,p.y,Math.max(1,S*.14),Math.max(1,S*.14));
  }
  const g=ctx.createLinearGradient(0,0,0,100);g.addColorStop(0,"#03111ddc");g.addColorStop(1,"#03111d00");ctx.fillStyle=g;ctx.fillRect(0,0,w,100);
  ctx.fillStyle="#aafde8";ctx.font="bold 13px ui-monospace,monospace";ctx.textAlign="left";
  ctx.fillText("GENESIS // SOVEREIGN • ENHANCED ISOMETRIC VIEW",20,27);
  ctx.font="11px ui-monospace,monospace";ctx.fillStyle="#9cc6ca";
  ctx.fillText(geo.mode.toUpperCase()+" | "+geo.size.toLocaleString()+" SYNTHETIC CELLS | "+(2027+year)+" | SCROLL TO ZOOM • DRAG TO PAN",20,45);
 }
 function animate(ts){if(disposed)return;requestAnimationFrame(animate);if(document.hidden||ts-lastTime<40)return;lastTime=ts;draw(ts)}
 requestAnimationFrame(animate);
 canvas.addEventListener("pointerdown",e=>{drag={x:e.clientX,y:e.clientY,panX,panY,moved:false};canvas.setPointerCapture?.(e.pointerId)});
 canvas.addEventListener("pointermove",e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>5)drag.moved=true;
  panX=drag.panX+dx*devicePixelRatio;panY=drag.panY+dy*devicePixelRatio});
 canvas.addEventListener("pointerup",e=>{
  if(!drag)return;const moved=drag.moved;drag=null;
  if(moved)return;
  const rect=canvas.getBoundingClientRect(),mx=(e.clientX-rect.left)*devicePixelRatio,my=(e.clientY-rect.top)*devicePixelRatio;
  const zero=getXY(0,0),x=Math.floor((mx-zero.x)/zero.S),y=Math.floor((my-zero.y)/(zero.S*.88));
  if(x>=0&&x<geo.w&&y>=0&&y<geo.h)select(geo.cells[y*geo.w+x]);
 });
 canvas.addEventListener("wheel",e=>{e.preventDefault();zoom=clamp(zoom*(e.deltaY>0?.90:1.1),.6,4)},{passive:false});
 const resize=()=>size();root.addEventListener("resize",resize);
 status("ENHANCED ISOMETRIC · 2.5D TERRAIN • ANIMATED TRANSPORT • NO WEBGL REQUIRED");
 return{type:"canvas",update(w,y,l,o,p){world=w;year=y;layer=l;offense=o;provinceSelected=p;frame=root.GenesisSovereign.snapshot(w,y);draw()},
  setCamera(mode){zoom=mode==="top"?.82:mode==="street"?2.1:1.15;panX=panY=0},
  capture(){draw(lastTime);return canvas.toDataURL("image/png")},
  dispose(){disposed=true;root.removeEventListener("resize",resize);canvas.remove()}
 };
}
async function webgl(container,geo,select,status){
 let THREE;try{THREE=await import("https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js")}
 catch(_){THREE=await import("https://unpkg.com/three@0.160.1/build/three.module.js")}
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:"high-performance"});
 renderer.setPixelRatio(Math.min(root.devicePixelRatio||1,1.5));renderer.setSize(container.clientWidth||960,container.clientHeight||600);
 renderer.setClearColor(0x061522);renderer.shadowMap.enabled=false;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.45;renderer.domElement.className="sovereignCanvas";container.append(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x061522);scene.fog=new THREE.FogExp2(0x061522,.0034);
 const ambient=new THREE.HemisphereLight(0xa8f0e9,0x17334e,2.2);scene.add(ambient);
 const sun=new THREE.DirectionalLight(0xffdfb1,2.2);sun.position.set(-70,150,110);scene.add(sun);
 const w=geo.w,h=geo.h,span=Math.max(w,h),center=new THREE.Vector3(0,0,0);
 const camera=new THREE.PerspectiveCamera(53,(container.clientWidth||960)/(container.clientHeight||600),.1,1500);
 let radius=span*1.64,angle=.65,elevation=.98,playing=true,drag=null,selected=0,selectedWorld=null,year=0,layer="zoning",offense=0;
 const boxGeo=new THREE.BoxGeometry(.96,1,.96),mat=new THREE.MeshStandardMaterial({color:0xffffff,metalness:.20,roughness:.59});
 const terrainMesh=new THREE.InstancedMesh(boxGeo,mat,geo.size);terrainMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 terrainMesh.frustumCulled=false;scene.add(terrainMesh);
 const skylineMat=new THREE.MeshStandardMaterial({color:0xffffff,metalness:.22,roughness:.42,emissive:0x0c353e,emissiveIntensity:.40});
 const skylineGeo=new THREE.BoxGeometry(.42,1,.45),towerIds=geo.cells.filter(c=>[1,2,3,4].includes(c.zone)).map(c=>c.id);
 const towers=new THREE.InstancedMesh(skylineGeo,skylineMat,towerIds.length);towers.frustumCulled=false;scene.add(towers);
 const dummy=new THREE.Object3D(),col=new THREE.Color();
 const surface=new Float32Array(geo.size);
 const borderGeo=new THREE.BufferGeometry(),border=[];
 for(let i=0;i<geo.size;i++){
  const d=geo.cells[i],x=i%w,y=Math.floor(i/w),a=geo.cells[i+1],b=geo.cells[i+w];
  if(x<w-1&&a.province!==d.province&&d.zone!==0&&a.zone!==0)border.push(x+1-w/2,.24,y-h/2,x+1-w/2,.24,y+1-h/2);
  if(y<h-1&&b.province!==d.province&&d.zone!==0&&b.zone!==0)border.push(x-w/2,.24,y+1-h/2,x+1-w/2,.24,y+1-h/2);
 }
 borderGeo.setAttribute("position",new THREE.Float32BufferAttribute(border,3));
 const borders=new THREE.LineSegments(borderGeo,new THREE.LineBasicMaterial({color:0x9df6f7,transparent:true,opacity:.40}));scene.add(borders);
 const roadPoints=[];
 for(const c of geo.cells)if(c.transport&&c.zone!==0){const x=c.x-w/2+.5,z=c.y-h/2+.5;
  roadPoints.push(x-.47,.30,z,x+.47,.30,z,x,.30,z-.47,x,.30,z+.47)}
 const roads=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(roadPoints,3)),
  new THREE.LineBasicMaterial({color:0x4ee4ca,transparent:true,opacity:.28,blending:THREE.AdditiveBlending}));scene.add(roads);
 const tPts=[];
 for(let i=0;i<240;i++)tPts.push(0,.95,0);
 const transitGeometry=new THREE.BufferGeometry(),transitPositions=new Float32Array(240*3);
 transitGeometry.setAttribute("position",new THREE.BufferAttribute(transitPositions,3).setUsage(THREE.DynamicDrawUsage));
 const transit=new THREE.Points(transitGeometry,new THREE.PointsMaterial({size:.29,color:0xa8ffe4,sizeAttenuation:true,transparent:true,opacity:.9,depthWrite:false}));scene.add(transit);
 const dataBeacons=new THREE.Group(),sphereGeo=new THREE.SphereGeometry(.38,8,6),sphereMat=new THREE.MeshBasicMaterial({color:0xffc788,transparent:true,opacity:.85});
 for(const city of geo.cities){
  const mesh=new THREE.Mesh(sphereGeo,sphereMat);mesh.position.set(city.x-w/2+.5,3.5,city.y-h/2+.5);
  dataBeacons.add(mesh);
 }
 scene.add(dataBeacons);
 const starsGeo=new THREE.BufferGeometry(),starsArr=new Float32Array(900*3);
 for(let i=0;i<900;i++){const a=i*2.3999,r=120+i%130,el=60+(i*29%210);
  starsArr[3*i]=Math.cos(a)*r;starsArr[3*i+1]=el;starsArr[3*i+2]=Math.sin(a)*r}
 starsGeo.setAttribute("position",new THREE.BufferAttribute(starsArr,3));
 const stars=new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0xb9ffff,size:.65,transparent:true,opacity:.64}));scene.add(stars);
 const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();
 function positionCamera(){camera.position.set(Math.sin(angle)*Math.cos(elevation)*radius,Math.sin(elevation)*radius*.75,
    Math.cos(angle)*Math.cos(elevation)*radius);camera.lookAt(center)}
 function size(){const cw=container.clientWidth||900,ch=container.clientHeight||550;renderer.setSize(cw,ch);
  camera.aspect=cw/ch;camera.updateProjectionMatrix();positionCamera()}
 size();root.addEventListener("resize",size);
 function renderFrame(){
  if(!selectedWorld)return;
  const frame=root.GenesisSovereign.snapshot(selectedWorld,year),a=frame.arrays;
  let towerIndex=0;
  for(const d of geo.cells){
   const i=d.id,x=d.x-w/2+.5,z=d.y-h/2+.5;
   const height=d.zone===0?.08:.34+d.alt*2.2;
   dummy.position.set(x,height*.5-.15,z);dummy.scale.set(1,height,1);dummy.updateMatrix();
   terrainMesh.setMatrixAt(i,dummy.matrix);
   const rgb=cellColor(d,a,layer,offense,frame,selected),v=rgb.map(c=>clamp(c/255,0,1));
   col.setRGB(v[0],v[1],v[2]);terrainMesh.setColorAt(i,col);
   if([1,2,3,4].includes(d.zone)){
    const tall=(d.zone===3?8.3:d.zone===1?4.7:d.zone===4?2.8:1.8)*
      (.52+(a.development[i]||.5)*1.3)*(0.68+(i*13%19)/27);
    dummy.position.set(x,height+.5+tall/2,z);dummy.scale.set(.48,tall,.51);dummy.updateMatrix();
    towers.setMatrixAt(towerIndex,dummy.matrix);
    const tint=d.zone===3?new THREE.Color(0x9fcbe0):d.zone===4?new THREE.Color(0xe1ba86):new THREE.Color(0x6ed2c7);
    if(layer!=="zoning"){tint.lerp(col,.55)}
    towers.setColorAt(towerIndex,tint);towerIndex++;
   }
  }
  terrainMesh.instanceMatrix.needsUpdate=true;towers.instanceMatrix.needsUpdate=true;
  if(terrainMesh.instanceColor)terrainMesh.instanceColor.needsUpdate=true;
  if(towers.instanceColor)towers.instanceColor.needsUpdate=true;
 }
 const handleDown=e=>{drag={x:e.clientX,y:e.clientY,moved:false};renderer.domElement.setPointerCapture?.(e.pointerId)};
 renderer.domElement.addEventListener("pointerdown",handleDown);
 renderer.domElement.addEventListener("pointermove",e=>{if(!drag)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>3)drag.moved=true;
  angle-=dx*.006;elevation=clamp(elevation+dy*.004,.30,1.46);drag.x=e.clientX;drag.y=e.clientY;positionCamera()});
 renderer.domElement.addEventListener("pointerup",e=>{
  if(!drag)return;const wasMove=drag.moved;drag=null;if(wasMove)return;
  const rect=renderer.domElement.getBoundingClientRect();
  mouse.x=((e.clientX-rect.left)/rect.width)*2-1;mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(mouse,camera);
  const hit=raycaster.intersectObject(terrainMesh,false)[0];
  if(hit?.instanceId!=null)select(geo.cells[hit.instanceId]);
 });
 renderer.domElement.addEventListener("wheel",e=>{e.preventDefault();radius=clamp(radius*(e.deltaY>0?1.10:.90),12,span*4);positionCamera()},{passive:false});
 let last=0,disposed=false,raf=0;
 function animate(ts){
  if(disposed)return;raf=requestAnimationFrame(animate);if(document.hidden)return;
  if(playing)angle+=.00008;
  positionCamera();
  if(ts-last>32){
   last=ts;
   for(let i=0;i<240;i++){
    const a=geo.cities[i%geo.cities.length],b=geo.cities[(i*7+3)%geo.cities.length],f=((ts*.000013*(i%4+1)+i*.197)%1);
    transitPositions[i*3]=a.x-w/2+(b.x-a.x)*f;
    transitPositions[i*3+1]=2.0+Math.sin(f*Math.PI)*1.4;
    transitPositions[i*3+2]=a.y-h/2+(b.y-a.y)*f;
   }transitGeometry.attributes.position.needsUpdate=true;
   dataBeacons.children.forEach((m,i)=>{m.position.y=3.3+Math.sin(ts*.001+i)*.6});
  }
  renderer.render(scene,camera);
 }
 raf=requestAnimationFrame(animate);status("WEBGL ACTIVE · "+geo.size+" LAND PARCELS · "+towerIds.length+" BUILDING CLUSTERS · PROCEDURAL 3D");
 return{type:"webgl",update(w,y,l,o,p){selectedWorld=w;year=y;layer=l;offense=o;selected=p;renderFrame()},
  setCamera(mode){if(mode==="top"){elevation=1.47;radius=span*1.35;playing=false}
   else if(mode==="street"){elevation=.32;radius=span*.63;playing=false}
   else{elevation=.85;radius=span*1.4;playing=true}positionCamera()},
  capture(){renderer.render(scene,camera);return renderer.domElement.toDataURL("image/png")},
  dispose(){disposed=true;cancelAnimationFrame(raf);root.removeEventListener("resize",size);renderer.dispose();renderer.domElement.remove();
   for(const mesh of [terrainMesh,towers])mesh.dispose?.();
   for(const g of [boxGeo,skylineGeo,borderGeo,starsGeo,transitGeometry,sphereGeo])g.dispose?.()}
 };
}
async function create(container,geo,select,status){
 if(root.WebGLRenderingContext){try{return await webgl(container,geo,select,status)}
  catch(error){console.warn("SOVEREIGN WebGL unavailable; using animated projection",error);
   status("WEBGL UNAVAILABLE · SWITCHING TO ISOMETRIC PROJECTION")}}
 return flatCanvas(container,geo,select,status);
}
root.SovereignView={create,LAYERS,cellValue,cellColor};
})(window);