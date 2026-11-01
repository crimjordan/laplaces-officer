/* Civilization 2.0 actual Canvas map fallback and offense-layer smoke. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const dir=path.resolve(__dirname,".."),read=f=>fs.readFileSync(path.join(dir,f),"utf8");
const win={addEventListener(){},removeEventListener(){},devicePixelRatio:1};
const gradient=()=>({addColorStop(){}});
const noop=()=>{};
const context2d=new Proxy({createLinearGradient:gradient,createRadialGradient:gradient},{
 get(t,k){return Object.hasOwn(t,k)?t[k]:noop},
 set(t,k,v){t[k]=v;return true}
});
const listeners={};
const canvas={style:{},width:0,height:0,className:"",setPointerCapture(){},
 getContext(){return context2d},
 addEventListener(event,fn){listeners[event]=fn},
 getBoundingClientRect(){return{left:0,top:0,width:950,height:570}},
 toDataURL(){return"data:image/png;base64,AAAB"},
 remove(){this.removed=true}};
const container={clientWidth:950,clientHeight:570,append(c){this.canvas=c}};
const document={hidden:false,createElement(type){if(type==="canvas")return canvas;throw Error("Unknown type "+type)}};
const scope=vm.createContext({window:win,document,Math,Date,Uint8Array,Uint16Array,Float32Array,Float64Array,
 devicePixelRatio:1,console,requestAnimationFrame:()=>1,cancelAnimationFrame:noop});
for(const name of ["sovereign-engine.js","civilization-engine.js"])
 vm.runInContext(read(name),scope,{filename:name});
win.GenesisSovereign=win.GenesisCivilization;
vm.runInContext(read("sovereign-view.js"),scope,{filename:"sovereign-view.js"});
const E=win.GenesisCivilization,V=win.SovereignView;
(async()=>{
 const geo=E.terrain(38421,"state"),world=E.createWorld(geo,{national:"none"});
 let msg="",selected;
 const view=await V.create(container,geo,c=>selected=c,status=>msg=status);
 assert.equal(view.type,"canvas");
 assert(canvas.width>0&&canvas.height>0);
 assert(msg.includes("ISOMETRIC"),"Did not select graphical fallback");
 view.update(world,0,"zoning",0,2);
 E.step(world);
 for(const name of Object.keys(V.LAYERS))view.update(world,1,name,3,2);
 assert(E.snapshot(world,1).trueTypes.length===geo.size*10,"Offense choropleth lacks per-parcel data");
 assert(view.capture().startsWith("data:image/png"));
 view.setCamera("top");view.setCamera("street");view.setCamera("orbit");
 listeners.wheel({preventDefault:noop,deltaY:-1});
 listeners.pointerdown({clientX:470,clientY:290,pointerId:1});
 listeners.pointerup({clientX:470,clientY:290});
 assert(selected&&selected.id>=0,"Map click did not select a cell");
 view.dispose();assert.equal(canvas.removed,true);
 console.log("CIVILIZATION II VISUAL TESTS PASSED");
 console.log("✓ Generated 3D-map substitute at year zero and year one");
 console.log("✓ All map layers and ten offense-specific heatmap counts available");
 console.log("✓ Zoom, camera, click selection and screenshot capture");
})().catch(e=>{console.error(e);process.exitCode=1});
