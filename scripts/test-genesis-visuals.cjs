/* Offline, dependency-free GENESIS visual regression tests.
   Ensures animated WebGL accessories and no-WebGL fallback do not break.
   Run: node scripts/test-genesis-visuals.cjs
*/
"use strict";
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,".."),load=name=>fs.readFileSync(path.join(root,name),"utf8");
const html=load("genesis.html");
for(const file of ["genesis-fx.js","genesis-3d.js","genesis-app.js","genesis.css"])
 assert(html.includes(file),"Missing GENESIS asset "+file);
for(const id of ["fxStatus","fxPerformance"])assert(html.includes('id="'+id+'"'),"Missing FX interface "+id);
for(const x of ['data-weather="night"','data-weather="dawn"','data-weather="storm"',
                 'data-fx="traffic"','data-fx="patrol"','data-fx="signals"','data-fx="stars"','data-fx="streams"'])
 assert(html.includes(x),"Missing cinematic toggle "+x);
for(const file of ["genesis-fx.js","genesis-3d.js","genesis-app.js"])
 assert.doesNotThrow(()=>new vm.Script(load(file),{filename:file}));
class Vec{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
 copy(o){return this.set(o.x,o.y,o.z)}
 setScalar(v){this.x=v;this.y=v;this.z=v;return this}}
class Color{constructor(value=0xffffff){this.set(value)}
 set(value){const n=typeof value==="number"?value:parseInt(String(value).replace("#",""),16)||0;
 this.r=(n>>16&255)/255;this.g=(n>>8&255)/255;this.b=(n&255)/255;return this}
 copy(c){this.r=c.r;this.g=c.g;this.b=c.b;return this}}
class Object3D{constructor(){this.position=new Vec();this.rotation=new Vec();this.scale=new Vec(1,1,1);
 this.visible=true;this.children=[]}
 add(...objects){this.children.push(...objects);return this}
 remove(x){this.children=this.children.filter(o=>o!==x)}
}
class Geometry{constructor(){this.attributes={};this.drawRange={start:0,count:0}}
 setAttribute(name,value){this.attributes[name]=value;return this}
 setDrawRange(start,count){this.drawRange={start,count}}
 dispose(){}}
class BufferAttribute{constructor(array,size){this.array=array;this.itemSize=size;this.needsUpdate=false}
 setUsage(){return this}}
class Material{constructor(options={}){Object.assign(this,options);this.color=new Color(options.color??0xffffff)}
 dispose(){}}
class Mesh extends Object3D{constructor(geometry,material){super();this.geometry=geometry;this.material=material}}
class FakeScene extends Object3D{constructor(){super();this.background=new Color(0x050d19);this.fog={color:new Color(0x091c28)}}}
const fakeThree={
 BufferGeometry:Geometry,BufferAttribute,DynamicDrawUsage:35048,
 PointsMaterial:Material,MeshBasicMaterial:Material,LineBasicMaterial:Material,
 Points:Mesh,Mesh,Line:Mesh,LineSegments:Mesh,Group:Object3D,
 IcosahedronGeometry:Geometry,BoxGeometry:Geometry,ConeGeometry:Geometry,
 CylinderGeometry:Geometry,RingGeometry:Geometry,
 DoubleSide:2,AdditiveBlending:2,Vector3:Vec,Color
};
(async()=>{
 const browser={};
 const context=vm.createContext({window:browser,console,Math,Float32Array,Uint8Array,Uint16Array,
    Date,Number,requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},setTimeout:()=>1,clearTimeout:()=>{}});
 vm.runInContext(load("genesis-fx.js"),context,{filename:"genesis-fx.js"});
 const scene=new FakeScene(),centers=Array.from({length:144},(_,i)=>new Vec((i%12-5.5)*9.8,0,(Math.floor(i/12)-5.5)*9.8));
 const lights={key:{intensity:2},hemi:{intensity:2},accent:{intensity:42},bloom:{intensity:35},renderer:{toneMappingExposure:1.4}};
 const fx=browser.GenesisFX.create(fakeThree,scene,centers,lights,{spacing:9.8});
 assert.equal(fx.snapshot().atmosphere,"night");
 const districts=centers.map((p,i)=>({id:i,score:i*0.07,patrol:i%5===0?1:0,
   residents:8+(i%5),true:[i%4,i%3,1,0,0,0,0,0,0,0,0,0],recorded:[i%2,0,0],
   schoolQuality:.5,clinic:.4,trust:.6,development:.5}));
 const world={initialCity:districts,lifeFrames:[{districts}]};
 const metrics=fx.update(world,1,"crime",-1);
 assert(metrics.activeBeacons>0,"No crime beacons");
 assert(metrics.activePatrol>0,"No animated patrol beacons");
 fx.animate(1000,16.67);
 assert.equal(fx.setAtmosphere("storm"),"storm");
 fx.animate(1050,16.67);
 assert.equal(fx.setFX("traffic",false),false);
 assert.equal(fx.setQuality(true),true);
 assert.equal(fx.snapshot().lowPower,true);
 assert.equal(fx.setAtmosphere("dawn"),"dawn");
 assert.equal(fx.setQuality(false),false);
 fx.dispose();
 // No network: a failed module load must enter the *animated* canvas fallback.
 const gradient=()=>({addColorStop(){}});
 const noop=()=>{};
 const ctx=new Proxy({createLinearGradient:gradient,createRadialGradient:gradient},{get(target,key){
   return key in target?target[key]:noop
 },set(target,key,value){target[key]=value;return true}});
 const canvas={width:1200,height:760,hidden:true,getContext:()=>ctx,addEventListener:noop,
   getBoundingClientRect:()=>({left:0,top:0,width:1200,height:760}),toDataURL:()=>"data:image/png;base64,A"};
 context.document={getElementById:()=>canvas,hidden:false};
 context.window.matchMedia=()=>({matches:false});
 context.window.devicePixelRatio=1;
 context.window.addEventListener=noop;
 context.window.removeEventListener=noop;
 vm.runInContext(load("genesis-3d.js"),context,{filename:"genesis-3d.js"});
 const viewer=await browser.Genesis3D.create({}, {status:noop});
 assert.equal(viewer.type,"fallback","No-WebGL mode should fail over to canvas");
 const residents=Array.from({length:384},(_,id)=>({id,initial:id%144}));
 const states=Array.from({length:384},(_,id)=>({alive:true,employed:id%2===0}));
 const researchWorld={people:residents,initialState:states,initialCity:districts,
   lifeFrames:[{districts,people:{alive:new Uint8Array(384).fill(1),home:new Uint8Array(residents.map(p=>p.initial)),employed:new Uint8Array(384)}}]};
 viewer.update(researchWorld,1,15,"crime",-1);
 assert.equal(viewer.setAtmosphere("storm"),"storm");
 assert.equal(viewer.setEffects("traffic",false),false);
 assert.equal(viewer.setQuality(true),true);
 assert.equal(viewer.effectsStatus().engine,"canvas");
 assert(viewer.capture().startsWith("data:image/png"));
 viewer.dispose();
 console.log("GENESIS CINEMATIC VISUAL REGRESSION TEST PASSED");
 console.log("✓ WebGL scene accessories: patrol drones, traffic, signals, lighting, weather, low power");
 console.log("✓ Canvas fallback: scene render, historical snapshot, weather and FX toggles, capture");
})().catch(error=>{console.error(error);process.exitCode=1});
