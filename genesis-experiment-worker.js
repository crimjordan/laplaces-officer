/* Runs controlled synthetic experiments off the UI thread.
   Same model core is used by CI and the browser fallback. */
"use strict";
self.window=self;
try{
 importScripts("genesis-engine-v2.js?v=experiments1","genesis-experiments-core.js?v=experiments1");
}catch(err){self.postMessage({type:"error",message:"Experiment engine could not load: "+String(err.message||err)})}
self.onmessage=function(event){
 if(event.data?.action!=="start")return;
 try{
  const E=self.GenesisEngine,X=self.GenesisExperiments;
  if(!E||!X)throw Error("The experiment engine is unavailable");
  const plan=X.design(event.data.spec),batches=[];
  self.postMessage({type:"started",plan:{title:plan.title,description:plan.description,arms:plan.arms,spec:plan.spec}});
  for(let k=0;k<plan.spec.seeds;k++){
   batches.push(X.runSeed(E,plan,k));
   self.postMessage({type:"progress",done:k+1,total:plan.spec.seeds,seed:batches[k].seed});
  }
  self.postMessage({type:"complete",result:X.analyze(plan,batches)});
 }catch(err){
  self.postMessage({type:"error",message:String(err?.message||err),stack:String(err?.stack||"")});
 }
};