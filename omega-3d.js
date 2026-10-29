/* OMEGA cinematic WebGL renderer. The 3D library is CDN loaded; an isometric fallback is always available. */
(function(global){
"use strict";
const DIM=12, PITCH=10.4;
const palette={truth:"#51e3f5",recorded:"#ff7ba4",gap:"#ffc77d",patrol:"#ffe1a3",trust:"#68eec5",prevention:"#b294ff",predicted:"#bf9bff",delta:"#ff668c"};
const clamp=(a,l,h)=>Math.max(l,Math.min(h,a));
function heatValue(d,mode,focus,baseline){
  if(!d)return 0;
  function s(a){if(!Array.isArray(a))return 0;if(focus>=0)return a[focus]||0;if(focus===-2)return a.slice(0,-1).reduce((x,y)=>x+y,0);return a.reduce((x,y)=>x+y,0)}
  if(mode==="truth")return baseline?s(d.base||[]):s(d.truth);
  if(mode==="recorded")return baseline? s((d.base||[]).map((v,i)=>v*([.54,.64,.79,.60,.49,.67,.96,.29,.33,.11,.38,.87][i]||.5))):s(d.recorded);
  if(mode==="gap")return baseline?0:Math.max(0,s(d.truth)-s(d.recorded));
  if(mode==="predicted")return s(d.score);
  if(mode==="delta")return d.delta||0;
  if(mode==="patrol")return d.patrol||0;
  if(mode==="trust")return d.trust||.65;
  if(mode==="prevention")return d.stock?Object.values(d.stock).reduce((x,y)=>x+y,0)/4:0;
  return 0;
}
function rgb(hex){const n=parseInt(hex.replace("#",""),16);return[(n>>16)&255,(n>>8)&255,n&255]}
async function create(container,callbacks={}){
  const status=callbacks.status||(()=>{});
  try{
    const THREE=await import("https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js");
    const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:"high-performance"});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.35;
    container.append(renderer.domElement);
    const scene=new THREE.Scene();
    scene.background=new THREE.Color(0x050c17);scene.fog=new THREE.FogExp2(0x06101c,.0054);
    const camera=new THREE.PerspectiveCamera(49,1,.1,900);
    const target=new THREE.Vector3(0,0,0);
    let yaw=.71,pitch=.78,distance=170,disposed=false,frame=null,mode="truth",focus=-2,selected=-1,activeMonth=0;
    scene.add(new THREE.HemisphereLight(0x7ecfe8,0x061b2f,2));
    const sun=new THREE.DirectionalLight(0x9ccdec,2.1);sun.position.set(-40,100,55);scene.add(sun);
    const lightA=new THREE.PointLight(0x35c9c7,35,115,2);lightA.position.set(-32,42,24);scene.add(lightA);
    const lightB=new THREE.PointLight(0xfa5292,22,115,2);lightB.position.set(39,40,-29);scene.add(lightB);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshStandardMaterial({color:0x081522,roughness:.93,metalness:.04}));floor.rotation.x=-Math.PI/2;floor.position.y=-.8;scene.add(floor);
    // Fine greenish city grid + roads; coordinates are intentionally fictional.
    const roadMaterial=new THREE.MeshBasicMaterial({color:0x153044,side:THREE.DoubleSide});
    const stripeMaterial=new THREE.MeshBasicMaterial({color:0x214e57,transparent:true,opacity:.55,side:THREE.DoubleSide});
    for(let k=0;k<=DIM;k++){
      const p=(k-DIM/2)*PITCH;
      for(const [width,length,rot,mat,y] of [[1.25,DIM*PITCH+7,0,roadMaterial,-.53],[.035,DIM*PITCH+7,0,stripeMaterial,-.515],[1.25,DIM*PITCH+7,Math.PI/2,roadMaterial,-.52],[.035,DIM*PITCH+7,Math.PI/2,stripeMaterial,-.515]]){
        const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,length),mat);
        mesh.rotation.set(-Math.PI/2,0,rot);
        if(rot===0)mesh.position.set(p,y,0);else mesh.position.set(0,y,p);
        scene.add(mesh);
      }
    }
    const districtMeshes=[],districtCenters=[];
    for(let i=0;i<DIM*DIM;i++){
      const x=((i%DIM)-(DIM-1)/2)*PITCH,z=(Math.floor(i/DIM)-(DIM-1)/2)*PITCH;
      districtCenters.push(new THREE.Vector3(x,0,z));
      const material=new THREE.MeshBasicMaterial({color:palette.truth,transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide});
      const tile=new THREE.Mesh(new THREE.PlaneGeometry(PITCH-1.35,PITCH-1.35),material);tile.rotation.x=-Math.PI/2;tile.position.set(x,-.38,z);scene.add(tile);districtMeshes.push(tile);
    }
    // Procedurally generated illuminated windows; no stock image or hosted asset.
    const win=document.createElement("canvas");win.width=64;win.height=128;
    const wx=win.getContext("2d");wx.fillStyle="#13263b";wx.fillRect(0,0,64,128);
    for(let row=0;row<16;row++)for(let col=0;col<8;col++){
      const n=((row*33+col*19+17)%23);wx.fillStyle=n<5?"#81b7b2":n<8?"#e6c190":"#203e57";wx.globalAlpha=n<8?.92:.5;wx.fillRect(col*8+2,row*8+2,4,3)
    }wx.globalAlpha=1;
    const windowTexture=new THREE.CanvasTexture(win);windowTexture.colorSpace=THREE.SRGBColorSpace;
    const towerMaterial=new THREE.MeshStandardMaterial({map:windowTexture,color:0xc4ecff,roughness:.55,metalness:.3,emissive:0x166271,emissiveMap:windowTexture,emissiveIntensity:.15});
    const blockGeo=new THREE.BoxGeometry(1,1,1),buildingCount=144*3;
    const buildings=new THREE.InstancedMesh(blockGeo,towerMaterial,buildingCount);buildings.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    const dummy=new THREE.Object3D(),instanceDistrict=[],baseHeights=[];
    let inst=0;
    for(let i=0;i<144;i++){
      const center=districtCenters[i],cx=center.x,cz=center.z;
      const cityCenter=Math.exp(-(cx*cx+cz*cz)/3500);
      for(let j=0;j<3;j++){
        const v=(Math.imul(i*13+j*37+43,16807)>>>0)/4294967296;
        const w=(Math.imul(i*71+j*23+127,48271)>>>0)/4294967296;
        const h=(2.8+cityCenter*19+v*14)*(j===1?.8:1);
        const ox=[-2.45,2.3,-.2][j],oz=[-1.8,1.1,2.55][j];
        dummy.position.set(cx+ox,h/2,cz+oz);dummy.scale.set(2.2+w*1.3,h,2.35+(1-v)*1.2);dummy.updateMatrix();buildings.setMatrixAt(inst,dummy.matrix);
        buildings.setColorAt(inst,new THREE.Color().setRGB(.55,.82,.97));
        instanceDistrict.push(i);baseHeights.push(h);inst++;
      }
    }
    buildings.instanceMatrix.needsUpdate=true;buildings.instanceColor.needsUpdate=true;buildings.castShadow=false;buildings.receiveShadow=false;scene.add(buildings);
    const topGroup=new THREE.Group();scene.add(topGroup);
    const ringGeo=new THREE.RingGeometry(3.7,4.05,48);
    const pulses=Array.from({length:18},()=>{
      const m=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:0xff7ba4,side:THREE.DoubleSide,transparent:true,opacity:.4,depthWrite:false}));
      m.rotation.x=-Math.PI/2;topGroup.add(m);return m
    });
    const selectGeo=new THREE.RingGeometry(4.4,4.7,4);
    const selection=new THREE.Mesh(selectGeo,new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,depthWrite:false,transparent:true,opacity:.95}));
    selection.rotation.x=-Math.PI/2;selection.rotation.z=Math.PI/4;selection.visible=false;scene.add(selection);
    // Drones are stylized glyphs, not surveillance footage or real tracked devices.
    const droneGroup=new THREE.Group();scene.add(droneGroup);
    const droneGeometry=new THREE.IcosahedronGeometry(.58,0),droneMat=new THREE.MeshBasicMaterial({color:0xffd79c});
    const wingGeo=new THREE.BoxGeometry(2.1,.08,.23),wingMat=new THREE.MeshBasicMaterial({color:0x92e8eb});
    const dronePool=[];
    for(let i=0;i<105;i++){
      const group=new THREE.Group(),body=new THREE.Mesh(droneGeometry,droneMat),wing=new THREE.Mesh(wingGeo,wingMat),wingB=new THREE.Mesh(wingGeo,wingMat);
      wingB.rotation.y=Math.PI/2;group.add(body,wing,wingB);group.visible=false;droneGroup.add(group);dronePool.push(group);
    }
    // Light traffic along the fictional road grid.
    const traffic=[];const trafficGroup=new THREE.Group();scene.add(trafficGroup);
    const lightGeometry=new THREE.SphereGeometry(.25,5,5);
    for(let i=0;i<85;i++){
      const hue=i%6===0?0xff8e70:i%3===0?0xb0edff:0x54f7d1;
      const v=new THREE.Mesh(lightGeometry,new THREE.MeshBasicMaterial({color:hue}));
      trafficGroup.add(v);traffic.push({mesh:v,vertical:i%2===0,lane:i%DIM,progress:(i*37%97)/97,speed:.01+(i%8)*.002});
    }
    const starsGeometry=new THREE.BufferGeometry(),starPositions=[];
    for(let i=0;i<750;i++){
      const a=i*2.39996,r=120+(i*53%250),y=65+(i*47%180);
      starPositions.push(Math.cos(a)*r,y,Math.sin(a)*r);
    }starsGeometry.setAttribute("position",new THREE.Float32BufferAttribute(starPositions,3));
    const stars=new THREE.Points(starsGeometry,new THREE.PointsMaterial({color:0xa9efff,size:.65,transparent:true,opacity:.7}));scene.add(stars);
    const effectGeometry=new THREE.BufferGeometry(),effectPositions=new Float32Array(700*3),effectColors=new Float32Array(700*3);
    effectGeometry.setAttribute("position",new THREE.BufferAttribute(effectPositions,3));
    effectGeometry.setAttribute("color",new THREE.BufferAttribute(effectColors,3));
    effectGeometry.setDrawRange(0,0);
    const particles=new THREE.Points(effectGeometry,new THREE.PointsMaterial({vertexColors:true,size:1.45,transparent:true,opacity:.84,sizeAttenuation:true,depthWrite:false}));scene.add(particles);
    const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),intersection=new THREE.Vector3();
    let dragging=null,viewState=null,values=[],maxVal=1,visibleDrones=[];
    function resize(){const rect=container.getBoundingClientRect();if(rect.width<20||rect.height<20)return;renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();}
    const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(resize):null;if(observer)observer.observe(container);global.addEventListener("resize",resize);resize();
    function cameraPosition(){camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*distance,target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(target)}
    function coordinate(e){const rect=renderer.domElement.getBoundingClientRect();return{x:((e.clientX-rect.left)/rect.width)*2-1,y:-((e.clientY-rect.top)/rect.height)*2+1}}
    function pick(e){const p=coordinate(e);pointer.set(p.x,p.y);raycaster.setFromCamera(pointer,camera);
      const intersections=raycaster.intersectObject(buildings,false);
      if(intersections.length&&Number.isInteger(intersections[0].instanceId))return instanceDistrict[intersections[0].instanceId];
      if(raycaster.ray.intersectPlane(plane,intersection)){
        const x=Math.round(intersection.x/PITCH+(DIM-1)/2),y=Math.round(intersection.z/PITCH+(DIM-1)/2);
        if(x>=0&&x<DIM&&y>=0&&y<DIM)return y*DIM+x
      }return -1}
    renderer.domElement.addEventListener("pointerdown",e=>{dragging={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,yaw,pitch};renderer.domElement.setPointerCapture(e.pointerId)});
    renderer.domElement.addEventListener("pointermove",e=>{if(!dragging)return;const dx=e.clientX-dragging.lastX,dy=e.clientY-dragging.lastY;dragging.lastX=e.clientX;dragging.lastY=e.clientY;yaw-=dx*.005;pitch=clamp(pitch+dy*.004,.14,1.48)});
    renderer.domElement.addEventListener("pointerup",e=>{if(!dragging)return;const moved=Math.hypot(e.clientX-dragging.x,e.clientY-dragging.y);dragging=null;if(moved<7){const id=pick(e);if(id>=0)callbacks.select?.(id)}});
    renderer.domElement.addEventListener("pointercancel",()=>{dragging=null});
    renderer.domElement.addEventListener("wheel",e=>{e.preventDefault();distance=clamp(distance*(e.deltaY>0?1.095:.91),35,330)},{passive:false});
    function setCamera(type){if(type==="top"){pitch=1.48;distance=185;yaw=.0}else if(type==="street"){pitch=.23;distance=108;yaw=.62}else{pitch=.78;distance=170;yaw=.71};target.set(0,0,0)}
    function update(data,layer,focusType,index,month=0,baseline=false){
      viewState=data;mode=layer;focus=focusType;selected=index;activeMonth=month;
      values=data.map(d=>heatValue(d,mode,focus,baseline));maxVal=Math.max(.05,...values.map(Math.abs));
      const accent=new THREE.Color(palette[mode]),baseC=new THREE.Color(0x101b30);
      data.forEach((d,i)=>{const val=values[i],norm=mode==="trust"?clamp((val-.2)/.75,0,1):mode==="prevention"?clamp(val/.65,0,1):mode==="patrol"?val:Math.pow(Math.abs(val)/maxVal,.7);
        const color=baseC.clone().lerp(mode==="delta"&&val<0?new THREE.Color("#43edd5"):accent,.15+norm*.83);
        districtMeshes[i].material.color.copy(color);districtMeshes[i].material.opacity=.20+norm*.46;
      });
      for(let j=0;j<instanceDistrict.length;j++){const id=instanceDistrict[j],norm=mode==="trust"?clamp((values[id]-.2)/.75,0,1):mode==="prevention"?clamp(values[id]/.65,0,1):mode==="patrol"?values[id]:Math.pow(Math.abs(values[id])/maxVal,.7);
        const c=new THREE.Color(0x26455b).lerp(mode==="delta"&&values[id]<0?new THREE.Color("#43edd5"):accent,.13+norm*.66);buildings.setColorAt(j,c);
      }buildings.instanceColor.needsUpdate=true;
      const sorted=data.map((d,i)=>({i,v:values[i]})).sort((a,b)=>Math.abs(b.v)-Math.abs(a.v));
      pulses.forEach((ring,j)=>{const district=sorted[j];ring.visible=!!district&&district.v>0&&month>0;if(ring.visible){const center=districtCenters[district.i];ring.position.set(center.x,.15,center.z);ring.material.color.copy(mode==="delta"&&district.v<0?new THREE.Color("#43edd5"):accent)}});
      selection.visible=selected>=0;if(selection.visible)selection.position.set(districtCenters[selected].x,.38,districtCenters[selected].z);
      visibleDrones=data.map((d,i)=>({id:i,patrol:d.patrol||0})).filter(d=>d.patrol>.05).sort((a,b)=>b.patrol-a.patrol).slice(0,dronePool.length);
      dronePool.forEach((d,i)=>{d.visible=i<visibleDrones.length});
      // Incident particles represent synthetic data intensity, not individual persons.
      let n=0;const cr=rgb(palette[mode]);for(const item of sorted.slice(0,90)){
        if(n>=700||item.v<=0)break;const center=districtCenters[item.i],count=Math.min(6,Math.max(1,Math.floor(item.v/maxVal*7)));
        for(let k=0;k<count&&n<700;k++){const ax=Math.sin(item.i*19+k*32)*3.2,az=Math.cos(item.i*11+k*21)*3.2;
          effectPositions[n*3]=center.x+ax;effectPositions[n*3+1]=4+(k*5+item.i)%25;effectPositions[n*3+2]=center.z+az;
          effectColors[n*3]=cr[0]/255;effectColors[n*3+1]=cr[1]/255;effectColors[n*3+2]=cr[2]/255;n++;
        }
      }effectGeometry.setDrawRange(0,n);effectGeometry.attributes.position.needsUpdate=true;effectGeometry.attributes.color.needsUpdate=true;
    }
    const reduced=global.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let frames=0,raf=0;
    function animate(timestamp){if(disposed)return;raf=requestAnimationFrame(animate);if(document.hidden)return;cameraPosition();
      if(!reduced){
        const t=timestamp*.001;for(let i=0;i<visibleDrones.length;i++){const targetId=visibleDrones[i].id,base=districtCenters[targetId],d=dronePool[i],phase=t*1.2+i*2.7;
          d.position.set(base.x+Math.sin(phase)*2.2,10+Math.cos(phase*1.5)*1.4,base.z+Math.cos(phase)*2.2);d.rotation.y=phase*.3;
        }
        for(const vehicle of traffic){const fraction=(vehicle.progress+t*vehicle.speed)%1,axis=(fraction-.5)*DIM*PITCH,lane=(vehicle.lane-(DIM-1)/2)*PITCH;
          if(vehicle.vertical)vehicle.mesh.position.set(lane,0.2,axis);
          else vehicle.mesh.position.set(axis,0.2,lane);
        }
        pulses.forEach((ring,i)=>{if(ring.visible){const scale=1+((t*.55+i*.13)%1)*.65;ring.scale.setScalar(scale);ring.material.opacity=.55*(1-((t*.55+i*.13)%1))}});
        particles.position.y=.3*Math.sin(t*.7);
      }else{dronePool.forEach((d,i)=>{if(i<visibleDrones.length){const base=districtCenters[visibleDrones[i].id];d.position.set(base.x,10,base.z)}})}
      renderer.render(scene,camera);frames++;
    }
    const lost=e=>{e.preventDefault();status("WEBGL CONTEXT LOST — RELOAD TO RESTORE")};renderer.domElement.addEventListener("webglcontextlost",lost,false);
    status("WEBGL 3D ACTIVE · "+buildingCount+" BUILDINGS");
    animate(0);
    return{type:"webgl",update,setCamera,capture(){renderer.render(scene,camera);return renderer.domElement.toDataURL("image/png")},
      dispose(){disposed=true;cancelAnimationFrame(raf);observer?.disconnect();global.removeEventListener("resize",resize);renderer.dispose();renderer.domElement.remove()}};
  }catch(error){
    status("ISOMETRIC BACKUP · WEBGL / CDN UNAVAILABLE");
    return fallback(container,callbacks,error);
  }
}
function fallback(container,callbacks,error){
  const canvas=document.getElementById("fallbackCanvas");canvas.hidden=false;
  const ctx=canvas.getContext("2d");let data=[],mode="truth",focus=-2,selected=-1,month=0,baseline=false,yaw=0,zoom=1;
  const project=(x,z,y=0)=>({x:580+(x-z)*27*zoom,y:160+(x+z)*14*zoom-y*8*zoom});
  function repaint(){
    if(!ctx)return;ctx.fillStyle="#061321";ctx.fillRect(0,0,1160,750);
    if(!data.length)return;
    const values=data.map(d=>heatValue(d,mode,focus,baseline)),maxVal=Math.max(.01,...values.map(Math.abs)),color=rgb(palette[mode]);
    const order=Array.from({length:144},(_,i)=>i).sort((a,b)=>(Math.floor(a/12)+a%12)-(Math.floor(b/12)+b%12));
    order.forEach(i=>{const x=i%12-5.5,z=Math.floor(i/12)-5.5,c=project(x*1.5,z*1.5),v=values[i],norm=mode==="trust"?clamp((v-.2)/.75,0,1):Math.pow(Math.abs(v)/maxVal,.7);
      const h=3+((i*17)%11)+Math.round(13*Math.exp(-((x*x+z*z)/22)));
      const w=13*zoom,top=c.y-h*zoom;
      const tone=mode==="delta"&&v<0?rgb("#43edd5"):color;const r=Math.round(18+tone[0]*norm*.75),g=Math.round(26+tone[1]*norm*.78),b=Math.round(34+tone[2]*norm*.82);
      ctx.fillStyle="rgb("+Math.round(r*.65)+","+Math.round(g*.65)+","+Math.round(b*.65)+")";ctx.fillRect(c.x-w,c.y-w*.6,w*2,5*zoom);
      ctx.fillStyle="rgb("+r+","+g+","+b+")";ctx.fillRect(c.x-w*.8,top,w*1.5,h*zoom);
      ctx.fillStyle="rgba(180,243,250,.22)";for(let floor=0;floor<h*zoom;floor+=7*zoom){ctx.fillRect(c.x-w*.6,top+floor,w*.9,1.2)}
      if(data[i].patrol>0){ctx.fillStyle="#ffcf9b";ctx.beginPath();ctx.arc(c.x,top-8,2.8,0,7);ctx.fill()}
      if(i===selected){ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.strokeRect(c.x-w*.95,top-3,w*1.85,h*zoom+7)}
    });
    ctx.fillStyle="#92b8c6";ctx.font="12px monospace";ctx.fillText("ISOMETRIC FALLBACK · "+(error?.message||"3D unavailable"),12,22);
  }
  canvas.addEventListener("click",e=>{const box=canvas.getBoundingClientRect(),px=(e.clientX-box.left)/box.width*1160,py=(e.clientY-box.top)/box.height*750;let nearest=-1,d=Infinity;
    for(let i=0;i<144;i++){const x=(i%12-5.5)*1.5,z=(Math.floor(i/12)-5.5)*1.5,p=project(x,z);const diff=Math.hypot(px-p.x,py-p.y);if(diff<d){nearest=i;d=diff}}
    if(nearest>=0&&d<38)callbacks.select?.(nearest)
  });
  repaint();
  return{type:"fallback",update(d,l,f,s,m,bl){data=d;mode=l;focus=f;selected=s;month=m;baseline=bl;repaint()},setCamera(p){zoom=p==="street"?1.25:p==="top"?.8:1;repaint()},capture(){return canvas.toDataURL("image/png")},dispose(){canvas.hidden=true}};
}
global.OmegaView3D={create,heatValue,palette};
})(window);