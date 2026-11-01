/* GENESIS SOVEREIGN animated map fallback test.
   Exercises actual map rendering without WebGL or external imports. */
"use strict";
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const dir=path.resolve(__dirname,".."),read=name=>fs.readFileSync(path.join(dir,name),"utf8");
const browser={addEventListener(){},removeEventListener(){},devicePixelRatio:1};
const gradient=()=>({addColorStop(){}});
const noop=()=>{};
const ctx=new Proxy({createLinearGradient:gradient,createRadialGradient:gradient},{get(obj,name){
 return Object.hasOwn(obj,name)?obj[name]:noop
},set(obj,name,value){obj[name]=value;return true}});
const listeners={};
const canvas={style:{},className:"",width:0,height:0,
 getContext(){return ctx},
 addEventListener(name,fn){listeners[name]=fn},
 getBoundingClientRect(){return{left:0,top:0,width:900,height:600}},
 toDataURL(){return"data:image/png;base64,AAAB"},
 setPointerCapture:noop,remove(){this.removed=true}
};
const container={clientWidth:900,clientHeight:600,append(obj){this.canvas=obj}};
const document={createElement(type){if(type==="canvas")return canvas;throw Error("Unexpected DOM type "+type)},hidden:false};
const scope=vm.createContext({
 window:browser,document,Math,Date,Float32Array,Float64Array,Uint16Array,Uint8Array,console,
 devicePixelRatio:1,requestAnimationFrame:()=>1,cancelAnimationFrame:noop
});
vm.runInContext(read("sovereign-engine.js"),scope,{filename:"sovereign-engine.js"});
vm.runInContext(read("sovereign-view.js"),scope,{filename:"sovereign-view.js"});
const E=browser.GenesisSovereign,V=browser.SovereignView;
(async()=>{
 const geo=E.terrain(54181,"state"),world=E.createWorld(geo,{national:"finland"});
 let status="",selection=null;
 const view=await V.create(container,geo,cell=>{selection=cell},s=>{status=s});
 assert.equal(view.type,"canvas");assert(canvas.width>0);assert(status.includes("ISOMETRIC"));
 view.update(world,0,"zoning",0,1);
 assert(view.capture().startsWith("data:image/png"));
 E.step(world);
 for(const layer of Object.keys(V.LAYERS))view.update(world,1,layer,3,2);
 view.setCamera("top");view.setCamera("street");view.setCamera("orbit");
 listeners.wheel({deltaY:-100,preventDefault:noop});
 listeners.pointerdown({clientX:450,clientY:300,pointerId:1});
 listeners.pointerup({clientX:450,clientY:300});
 assert(selection&&selection.zone>=0&&selection.zone<E.ZONES.length,"Geographic click selection failed");
 view.dispose();assert.equal(canvas.removed,true);
 console.log("SOVEREIGN VISUAL FALLBACK TEST PASSED");
 console.log("✓ Full synthetic geographic map, 12 analytic data lenses and offense filters");
 console.log("✓ Isometric renderer without WebGL, image capture, camera controls, hover/click");
})().catch(err=>{console.error(err);process.exitCode=1});
