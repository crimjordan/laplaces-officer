/* National replication worker: keep large simulations off the UI thread. */
"use strict";
self.window=self;
try{
 importScripts("sovereign-engine.js?v=geo2","civilization-engine.js?v=2","civilization-experiments.js?v=2");
}catch(e){self.postMessage({type:"error",message:String(e?.message||e)})}
self.onmessage=function(message){if(message.data?.action!=="run")return;
 try{
  const X=self.CivilizationExperiments,plan=X.plan(message.data.plan),pairs=[];
  self.postMessage({type:"start",reps:plan.reps,years:plan.years,scale:plan.scale});
  for(let i=0;i<plan.reps;i++){
   const pair=X.runPair(plan,i);pairs.push(pair);
   self.postMessage({type:"progress",done:i+1,total:plan.reps,seed:pair.seed});
  }
  self.postMessage({type:"complete",result:X.analyze(plan,pairs)});
 }catch(e){self.postMessage({type:"error",message:String(e?.message||e),stack:String(e?.stack||"")})}
};