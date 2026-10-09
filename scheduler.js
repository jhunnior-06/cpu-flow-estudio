/* CPU Lab — motor de simulación educativo; código original, sin dependencias. */
(function(root,factory){const m=factory(); if(typeof module==='object'&&module.exports) module.exports=m; else root.CPUEngine=m;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const COLORS=['#7569fb','#22b8a8','#f49a58','#ed6b93','#7da2ff','#dfb45f','#67c58b','#b47ee9','#e68bca','#55c1e2','#c7a36d','#ef766d','#76a2aa','#7a86d4','#c4c75d','#bd91ee','#6ac1ae','#db9369','#9fafd5','#ed94a6'];
const ALGORITHMS=[
 {id:'fcfs',name:'FCFS',long:'First Come, First Served',kind:'No apropiativo',desc:'El primer proceso que llega utiliza la CPU hasta terminar su ráfaga o bloquearse.'},
 {id:'sjf',name:'SJF',long:'Shortest Job First',kind:'No apropiativo',desc:'Elige la ráfaga restante más corta cuando la CPU queda libre.'},
 {id:'srtf',name:'SRTF',long:'Shortest Remaining Time First',kind:'Apropiativo',desc:'Puede interrumpir al proceso actual cuando existe otro con menos tiempo restante.'},
 {id:'rr',name:'Round Robin',long:'Turnos con quantum',kind:'Apropiativo',desc:'Asigna un máximo de quantum unidades por turno y rota entre los procesos listos.'},
 {id:'priority',name:'Prioridades',long:'Prioridades sin apropiación',kind:'No apropiativo',desc:'Atiende la prioridad más alta (número menor) sin interrumpir.'},
 {id:'priorityp',name:'Prioridades P.',long:'Prioridades con apropiación',kind:'Apropiativo',desc:'Puede interrumpir cuando llega un proceso de mayor prioridad.'},
 {id:'hrrn',name:'HRRN',long:'Highest Response Ratio Next',kind:'No apropiativo',desc:'Selecciona mayor (espera + servicio) / servicio; reduce inanición.'},
 {id:'ljf',name:'LJF',long:'Longest Job First',kind:'No apropiativo',desc:'Selecciona primero la ráfaga disponible de mayor duración.'},
 {id:'lrtf',name:'LRTF',long:'Longest Remaining Time First',kind:'Apropiativo',desc:'En cada unidad escoge el mayor tiempo de ejecución pendiente.'},
 {id:'mlq',name:'Multinivel',long:'Multilevel Queue',kind:'Colas',desc:'Cola alta con Round Robin; cola baja con FCFS. La alta interrumpe a la baja.'},
 {id:'mlfq',name:'MLFQ',long:'Multilevel Feedback Queue',kind:'Colas',desc:'Tres niveles: los procesos inician arriba y descienden al consumir el quantum.'},
 {id:'lottery',name:'Lotería',long:'Lottery Scheduling',kind:'Probabilístico',desc:'Sortea la CPU entre procesos listos. Mayor prioridad significa más boletos.'},
 {id:'edf',name:'EDF',long:'Earliest Deadline First',kind:'Tiempo real',desc:'Tareas periódicas: ejecuta el trabajo con fecha límite absoluta más cercana.'},
 {id:'rms',name:'Rate Monotonic',long:'Rate Monotonic Scheduling',kind:'Tiempo real',desc:'Tareas periódicas: menor período equivale a mayor prioridad fija.'}
];
function valid(input,opt={}){
 if(!Array.isArray(input)||!input.length)throw Error('Agrega al menos un proceso.');
 if(input.length>20)throw Error('Máximo 20 procesos por simulación.');
 const ids=new Set();const p=input.map((r,i)=>{
  const id=String(r.id||'P'+(i+1)).trim().slice(0,20);
  if(!id||ids.has(id))throw Error('Cada proceso necesita un identificador único.');ids.add(id);
  function val(name,min,max,def){const raw=r[name]===undefined||r[name]===''?def:Number(r[name]);if(!Number.isInteger(raw)||raw<min||raw>max)throw Error('Valor inválido de '+name+' en '+id+'. Usa enteros entre '+min+' y '+max+'.');return raw;}
  const burst=val('burst',1,200,1),arrival=val('arrival',0,500,0),priority=val('priority',1,50,3),queue=val('queue',0,1,0),period=val('period',1,300,10),deadline=val('deadline',1,500,period),ioAt=val('ioAt',0,burst,0),ioDuration=val('ioDuration',0,100,0);
  if(ioAt>=burst && ioDuration>0)throw Error('La E/S de '+id+' debe empezar antes de terminar su ráfaga.');
  return {id,index:i,burst,arrival,priority,queue,period,deadline,ioAt,ioDuration};
 });
 const quantum=Number(opt.quantum??2);if(!Number.isInteger(quantum)||quantum<1||quantum>100)throw Error('Quantum: ingresa un entero de 1 a 100.');
 const horizon=Number(opt.horizon??40);if(!Number.isInteger(horizon)||horizon<1||horizon>600)throw Error('Horizonte: ingresa un entero entre 1 y 600.');
 return {p,quantum,horizon};
}
function metrics(rows,steps,meta={}){
 const total=steps.length, busy=steps.filter(s=>s.id!==null).length;
 const done=rows.filter(p=>p.finish!==null);
 const avg=(f)=>done.length?done.reduce((s,p)=>s+f(p),0)/done.length:0;
 const results=rows.map(p=>{const turnaround=p.finish===null?null:p.finish-p.arrival;const wait=turnaround===null?null:turnaround-p.burst-(p.blockedTotal||0);return {id:p.id,label:p.label||p.id,arrival:p.arrival,burst:p.burst,priority:p.priority,queue:p.queue,finish:p.finish,first:p.first,wait:wait===null?null:Math.max(0,wait),turnaround,response:p.first===null?null:p.first-p.arrival,blocked:p.blockedTotal||0,deadline:p.absDeadline??null,missed:p.finish!==null&&p.absDeadline!=null&&p.finish>p.absDeadline,complete:p.finish!==null};});
 const switches=steps.reduce((acc,s,i)=>{if(s.id===null||i===0)return acc;return acc+(steps[i-1].id!==null&&steps[i-1].id!==s.id?1:0);},0);
 const denom=Math.max(1,total);const avgValid=key=>{let doneR=results.filter(p=>p[key]!==null);return doneR.length?doneR.reduce((s,p)=>s+p[key],0)/doneR.length:0};
 return {results,metrics:{waiting:avgValid('wait'),turnaround:avgValid('turnaround'),response:avgValid('response'),cpu:100*busy/denom,throughput:done.length/denom,ttU:busy,ttT:total,idle:total-busy,loss:100*(total-busy)/denom,switches,completed:done.length,total:rows.length,missed:results.filter(r=>r.missed).length,...meta}};
}
function makeSegments(steps){let out=[];for(let s of steps){const last=out[out.length-1];if(last&&last.id===s.id&&last.end===s.t){last.end++;}else out.push({id:s.id,label:s.label||s.id,start:s.t,end:s.t+1});}return out;}
function simulation(input,algorithm='fcfs',opt={}){
 const {p:base,quantum,horizon}=valid(input,opt);if(!ALGORITHMS.some(a=>a.id===algorithm))throw Error('Algoritmo no reconocido.');
 if(algorithm==='edf'||algorithm==='rms')return realTime(base,algorithm,horizon);
 let ps=base.map(a=>({...a,remaining:a.burst,served:0,first:null,finish:null,blockedUntil:null,blockedTotal:0,readySince:a.arrival,level:0,sliceUsed:0}));
 let t=0,run=null,pending=null,lastId=null,steps=[],q=[],queues=[[],[],[]],seed=11723;
 const fifo=algorithm==='rr'||algorithm==='mlq'||algorithm==='mlfq';
 function push(p,front=false){if(algorithm==='rr'){if(!q.includes(p.id))front?q.unshift(p.id):q.push(p.id);}else if(algorithm==='mlq'){let arr=queues[p.queue];if(!arr.includes(p.id))front?arr.unshift(p.id):arr.push(p.id);}else if(algorithm==='mlfq'){let arr=queues[p.level];if(!arr.includes(p.id))front?arr.unshift(p.id):arr.push(p.id);}}
 const byId=id=>ps.find(p=>p.id===id);
 function ready(p){return p.arrival<=t&&p.remaining>0&&(p.blockedUntil===null||p.blockedUntil<=t);}
 function cmp(a,b,score,desc=false){const aa=score(a),bb=score(b);return (desc?bb-aa:aa-bb)||(a.readySince-b.readySince)||(a.arrival-b.arrival)||(a.index-b.index);}
 function nextRandom(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
 for(t=0;t<2500;t++){
   const fresh=[];
   for(let p of ps){if(p.arrival===t){fresh.push(p);push(p);}else if(p.blockedUntil!==null&&p.blockedUntil===t){p.blockedUntil=null;p.readySince=t;p.sliceUsed=0;if(algorithm==='mlfq')p.level=0;fresh.push(p);push(p);}}
   if(pending){push(pending);pending=null;}
   const candidates=ps.filter(ready);
   if(!candidates.length&&ps.every(p=>p.remaining===0))break;
   const validRun=run&&ready(run);
   let explain='';
   const pick=(score,desc)=>candidates.slice().sort((a,b)=>cmp(a,b,score,desc))[0]||null;
   const pickQueue=()=>{if(algorithm==='rr'){while(q.length){const n=byId(q.shift());if(n&&ready(n))return n;}}
    else {for(let qi=0;qi<(algorithm==='mlq'?2:3);qi++){const arr=queues[qi];while(arr.length){const n=byId(arr.shift());if(n&&ready(n))return n;}}}return null;};
   if(algorithm==='rr'){
      if(!validRun){run=pickQueue();if(run)run.sliceUsed=0;}explain=run?'Turno circular: '+run.id+' usa como máximo '+quantum+' unidades.':'No hay procesos listos.';
   }else if(algorithm==='mlq'){
      if(validRun&&run.queue===1&&queues[0].some(id=>ready(byId(id)))){push(run,true);run=null;}
      if(!run)run=pickQueue();explain=run?'Cola '+(run.queue===0?'alta (RR)':'baja (FCFS)')+': ejecuta '+run.id+'.':'CPU inactiva.';
   }else if(algorithm==='mlfq'){
      if(validRun&&queues.slice(0,run.level).some(arr=>arr.some(id=>ready(byId(id))))){push(run,true);run=null;}
      if(!run)run=pickQueue();explain=run?'Nivel '+((run.level||0)+1)+' (quantum '+(quantum*2**run.level)+'): ejecuta '+run.id+'.':'CPU inactiva.';
   }else if(algorithm==='fcfs'||algorithm==='sjf'||algorithm==='ljf'||algorithm==='priority'||algorithm==='hrrn'){
      if(!validRun){if(algorithm==='fcfs')run=pick(p=>p.readySince);if(algorithm==='sjf')run=pick(p=>p.remaining);if(algorithm==='ljf')run=pick(p=>p.remaining,true);if(algorithm==='priority')run=pick(p=>p.priority);if(algorithm==='hrrn')run=pick(p=>(t-p.readySince+p.remaining)/p.remaining,true);}
      explain=run?'Decisión sin apropiación: '+run.id+' continúa hasta finalizar o bloquearse.':'CPU inactiva.';
   }else if(algorithm==='srtf'||algorithm==='lrtf'||algorithm==='priorityp'){
      const prev=run;
      if(algorithm==='srtf')run=pick(p=>p.remaining);
      if(algorithm==='lrtf')run=pick(p=>p.remaining,true);
      if(algorithm==='priorityp')run=pick(p=>p.priority);
      explain=run?(prev&&prev.id!==run.id?'Apropiación: ':'Selección: ')+run.id+(algorithm==='priorityp'?' (prioridad '+run.priority+')':' (restan '+run.remaining+' u).'):'CPU inactiva.';
   }else if(algorithm==='lottery'){
      const tickets=candidates.map(p=>Math.max(1,51-p.priority));let r=nextRandom()*tickets.reduce((a,b)=>a+b,0);run=null;for(let i=0;i<candidates.length;i++){r-=tickets[i];if(r<0){run=candidates[i];break;}}run=run||candidates.at(-1)||null;explain=run?'Sorteo reproducible: gana '+run.id+' (peso '+(51-run.priority)+').':'CPU inactiva.';
   }
   const readyOther=candidates.filter(p=>!run||p.id!==run.id).slice().sort((a,b)=>a.readySince-b.readySince||a.index-b.index).map(p=>p.id);
   const blocked=ps.filter(p=>p.blockedUntil!==null&&p.blockedUntil>t).map(p=>p.id);
   const state={t,id:run?run.id:null,label:run?run.id:'Inactiva',ready:readyOther,blocked,arrivals:fresh.map(p=>p.id),remaining:run?run.remaining:null,reason:explain,states:Object.fromEntries(ps.map(p=>[p.id,p.finish!==null?'Finalizado':p.arrival>t?'Nuevo':p.blockedUntil!==null&&p.blockedUntil>t?'Bloqueado':run&&p.id===run.id?'Ejecución':'Listo']))};
   if(run){if(run.first===null)run.first=t;run.remaining--;run.served++;run.sliceUsed++;lastId=run.id;}
   steps.push(state);
   if(!run)continue;
   if(run.remaining===0){run.finish=t+1;run=null;continue;}
   if(run.ioDuration>0&&run.ioAt>0&&run.served===run.ioAt){run.blockedUntil=t+1+run.ioDuration;run.blockedTotal+=run.ioDuration;run=null;continue;}
   let expire=(algorithm==='rr'||(algorithm==='mlq'&&run.queue===0))&&run.sliceUsed>=quantum;
   if(algorithm==='mlfq')expire=run.sliceUsed>=quantum*2**run.level;
   if(expire){if(algorithm==='mlfq')run.level=Math.min(2,run.level+1);run.sliceUsed=0;run.readySince=t+1;pending=run;run=null;}
 }
 if(t>=2500)throw Error('La simulación superó las 2500 unidades. Reduce los tiempos.');
 const calc=metrics(ps,steps);return {algorithm,algorithmName:ALGORITHMS.find(a=>a.id===algorithm).name,processes:base,steps,segments:makeSegments(steps),...calc,quantum,horizon,periodic:false};
}
function realTime(base,algorithm,horizon){
 const jobs=[];for(const p of base){for(let arrival=p.arrival,k=0;arrival<horizon;arrival+=p.period,k++){
  jobs.push({...p,arrival,absDeadline:arrival+p.deadline,remaining:p.burst,served:0,first:null,finish:null,blockedTotal:0,label:p.id+'#'+(k+1),parentId:p.id,index:p.index});
  if(jobs.length>700)throw Error('Demasiadas instancias periódicas; aumenta los períodos.');
 }}
 const steps=[];
 for(let t=0;t<horizon;t++){
  const available=jobs.filter(p=>p.arrival<=t&&p.remaining>0);
  const sorted=available.slice().sort((a,b)=>(algorithm==='edf'?a.absDeadline-b.absDeadline:a.period-b.period)||(a.arrival-b.arrival)||(a.index-b.index));
  const p=sorted[0]||null;
  const states={};for(const job of jobs){if(job.arrival<=t&&job.remaining>0)states[job.label]=p===job?'Ejecución':'Listo';}
  const arrivals=jobs.filter(x=>x.arrival===t).map(x=>x.label);
  steps.push({t,id:p?p.id:null,label:p?p.label:'Inactiva',ready:sorted.slice(1).map(x=>x.label),blocked:[],arrivals,remaining:p?p.remaining:null,reason:p?(algorithm==='edf'?'Vence antes: ':'Período más corto: ')+p.label+' (fecha límite '+p.absDeadline+', período '+p.period+').':'Sin trabajos liberados.',states});
  if(p){if(p.first===null)p.first=t;p.remaining--;p.served++;if(!p.remaining)p.finish=t+1;}
 }
 const out=metrics(jobs,steps);out.metrics.missed=jobs.filter(j=>j.absDeadline<=horizon&&(j.finish===null||j.finish>j.absDeadline)).length;
 out.metrics.pending=jobs.filter(j=>j.finish===null).length;
 return {algorithm,algorithmName:ALGORITHMS.find(a=>a.id===algorithm).name,processes:base,steps,segments:makeSegments(steps),...out,quantum:0,horizon,periodic:true};
}
function compare(input,opt={}){return ALGORITHMS.map(a=>{try{const sim=simulation(input,a.id,opt);return {id:a.id,name:a.name,...sim.metrics};}catch(e){return {id:a.id,name:a.name,error:e.message};}});}
return {ALGORITHMS,COLORS,simulation,compare,valid};
});