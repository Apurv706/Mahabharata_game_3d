// Virtual clock: time only moves when __step(ms) is called; one animation frame per step.
(()=>{
  let now=1000; const t0=Date.now();
  const timers=new Map(); let tid=1; let rafs=[]; let rid=1;
  const realPerf=performance.now.bind(performance);
  performance.now=()=>now;
  const RD=Date; const base=RD.now();
  class FD extends RD{constructor(...a){if(a.length)super(...a);else super(base+now);} static now(){return base+now;}}
  window.Date=FD;
  window.setTimeout=(f,ms,...a)=>{const id=tid++;timers.set(id,{f,at:now+Math.max(0,+ms||0),a});return id;};
  window.clearTimeout=id=>timers.delete(id);
  window.setInterval=(f,ms,...a)=>{const id=tid++;const iv=Math.max(1,+ms||1);timers.set(id,{f,at:now+iv,a,iv});return id;};
  window.clearInterval=id=>timers.delete(id);
  window.requestAnimationFrame=f=>{const id=rid++;rafs.push({id,f});return id;};
  window.cancelAnimationFrame=id=>{rafs=rafs.filter(r=>r.id!==id);};
  window.__step=(ms)=>{
    const end=now+ms;
    for(let guard=0;guard<10000;guard++){
      let next=null;for(const [id,t] of timers){if(t.at<=end&&(!next||t.at<next[1].at))next=[id,t];}
      if(!next)break;
      const [id,t]=next; now=Math.max(now,t.at);
      if(t.iv)t.at+=t.iv;else timers.delete(id);
      try{typeof t.f==="function"?t.f(...t.a):eval(t.f);}catch(e){console.error(e);}
    }
    now=end;
    const list=rafs;rafs=[];for(const r of list){try{r.f(now);}catch(e){console.error(e);}}
    return now;
  };
  window.__now=()=>now;
})();
