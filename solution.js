/* Desarrollo didáctico de las prácticas, a partir de la traza real del motor. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CPUSolution=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const safe=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fmt=value=>Number(value).toLocaleString('es-PE',{maximumFractionDigits:2});
  const rules={
    fcfs:'FCFS atiende por orden de llegada a la cola READY. El proceso elegido conserva la CPU hasta finalizar o bloquearse.',
    sjf:'SJF elige el menor tiempo de CPU restante entre los procesos disponibles. El proceso elegido conserva la CPU hasta finalizar o bloquearse.',
    srtf:'SRTF compara los tiempos restantes en cada instante. Puede interrumpir al proceso actual si otro disponible tiene menos CPU pendiente.',
    rr:'Round Robin atiende la cola READY en orden circular. Cada turno dura como máximo el quantum; si queda CPU pendiente, el proceso vuelve al final de la cola.',
    priority:'Prioridades elige el número de prioridad más pequeño (1 es la más alta). El proceso conserva la CPU hasta finalizar o bloquearse.'
  };

  function explainChoice(sim,step){
    const d=step.decision,candidates=d.candidates;
    if(step.id===null)return 'Ningún proceso está listo. La CPU permanece libre hasta la siguiente llegada o desbloqueo.';
    const chosen=candidates.find(p=>p.id===step.id);
    if(sim.algorithm==='rr'){
      return `${d.continued?'Continúa':'Comienza'} el turno de ${step.id}. Cola al inicio de este tramo: ${d.queue.join(' → ')}. `+
        `Tiempo disponible del turno = quantum − tiempo usado = ${sim.quantum} − ${d.turnUsed} = ${sim.quantum-d.turnUsed} u. `+
        `Puede ejecutar como máximo min(${chosen.remaining}, ${sim.quantum-d.turnUsed}) = ${Math.min(chosen.remaining,sim.quantum-d.turnUsed)} u antes de terminar, bloquearse o agotar el quantum.`;
    }
    if(d.continued&&sim.algorithm!=='srtf')return `${step.id} mantiene la CPU porque el algoritmo no es apropiativo; las nuevas llegadas esperan en READY.`;
    const tie=' Si hay empate, se usa llegada a READY, luego llegada inicial y orden de la tabla.';
    if(sim.algorithm==='fcfs'){
      const earliest=Math.min(...candidates.map(p=>p.readySince));
      return `Se elige ${step.id}: su entrada a READY es t=${chosen.readySince}, la más antigua entre los disponibles (mínimo = ${earliest}).${tie}`;
    }
    if(sim.algorithm==='sjf'||sim.algorithm==='srtf'){
      const values=candidates.map(p=>p.remaining);
      return `Restante = ráfaga CPU − CPU ya ejecutada. Se elige ${step.id} porque tiene el menor tiempo restante: min(${values.join(', ')}) = ${chosen.remaining} u.`+
        (sim.algorithm==='srtf'?(d.continued?' Mantiene la CPU tras comparar de nuevo.':' La selección se revisa en cada unidad y puede interrumpir a otro proceso.'):' La selección se realiza cuando la CPU queda libre.')+tie;
    }
    const priorities=candidates.map(p=>p.priority);
    return `Se elige ${step.id}: min(${priorities.join(', ')}) = prioridad ${chosen.priority}. El número menor indica mayor prioridad.${tie}`;
  }

  function build(sim){
    if(!rules[sim.algorithm])throw Error('Esta solución explicada corresponde a las cinco prácticas de examen.');
    const groups=[];
    for(const s of sim.steps){
      const last=groups.at(-1);
      const dispatch=s.id!==null&&!s.decision.continued;
      const review=sim.algorithm==='srtf'&&s.arrivals.length>0;
      if(!last||last.step.id!==s.id||dispatch||review)groups.push({step:s,start:s.t,end:s.t+1,arrivals:[...s.arrivals]});
      else {last.end=s.t+1;last.arrivals.push(...s.arrivals);}
    }
    for(const g of groups){
      g.choice=explainChoice(sim,g.step);
      g.remaining=g.step.id===null?null:g.step.remaining-(g.end-g.start);
    }
    const averages=[['TE','wait','Espera'],['TR','turnaround','Retorno'],['TS','response','Respuesta']].map(([symbol,key,name])=>{
      const values=sim.results.filter(r=>r[key]!==null).map(r=>r[key]);
      const sum=values.reduce((a,b)=>a+b,0);
      return {symbol,name,values,sum,count:values.length,value:values.length?sum/values.length:0};
    });
    const switches=sim.steps.filter((s,i)=>i>0&&s.id!==null&&sim.steps[i-1].id!==null&&s.id!==sim.steps[i-1].id)
      .map(s=>({t:s.t,from:sim.steps[s.t-1].label,to:s.label}));
    return {groups,averages,switches};
  }

  function formula(label,expression){return `<div class="worked-formula"><span>${safe(label)}</span><code>${safe(expression)}</code></div>`;}

  function render(sim,colors){
    const model=build(sim);
    const processColor=id=>id===null?'#64748b':colors[sim.processes.findIndex(p=>p.id===id)%colors.length];
    const segments=sim.segments;
    const gantt=`<div class="solution-gantt-scroll" tabindex="0" aria-label="Gantt de la solución"><div class="solution-gantt" style="min-width:${sim.steps.length*40}px">${segments.map(s=>
      `<div class="solution-gantt-block" style="flex:${s.end-s.start};--process-color:${processColor(s.id)}"><strong>${safe(s.id||'Libre')}</strong><span>${s.start} → ${s.end}</span></div>`).join('')}</div></div>`;
    const decisions=model.groups.map((g,i)=>{
      const s=g.step;
      const next=model.groups[i+1];
      let endNote=g.remaining===0?`${s.id} termina en t=${g.end}; este es su tiempo de finalización (TF).`:
        sim.algorithm==='rr'&&g.remaining!==null&&s.decision.turnUsed+g.end-g.start===sim.quantum?
          `Se agota el quantum. ${s.id} vuelve al final de READY después de incorporar las llegadas o desbloqueos de t=${g.end}.`:
        next&&next.step.blocked.includes(s.id)?`${s.id} se bloquea para E/S y libera la CPU.`:
        next&&next.step.id===s.id?`${s.id} continúa; se revisa el siguiente evento.`:
        g.remaining!==null?`${s.id} conserva ${g.remaining} u pendientes y espera su siguiente turno.`:'';
      const candidates=s.decision.candidates;
      return `<li class="decision-card"><div class="decision-heading"><span class="solution-step-number">${i+1}</span><h4>t=${g.start} → ${g.end} · ${safe(s.id||'CPU libre')}</h4></div>`+
        `<p>${safe(g.choice)}</p>`+
        (candidates.length?`<div class="table-container"><table class="data-table decision-candidates"><caption>Procesos disponibles en t=${g.start}</caption><thead><tr><th>Proceso</th><th>Llegada</th><th>CPU restante</th><th>Prioridad</th></tr></thead><tbody>${candidates.map(p=>
          `<tr${p.id===s.id?' class="chosen-process"':''}><td>${safe(p.id)}${p.id===s.id?' · Elegido':''}</td><td>${p.arrival}</td><td>${p.burst} − ${p.served} = ${p.remaining} u</td><td>${p.priority}</td></tr>`).join('')}</tbody></table></div>`:'')+
        formula('Duración del tramo',`${g.end} − ${g.start} = ${g.end-g.start} u`)+
        (g.remaining===null?'':formula('CPU restante al final',`${s.remaining} − ${g.end-g.start} = ${g.remaining} u`))+
        (g.arrivals.length?`<p class="solution-note">Llegadas o desbloqueos al inicio o durante este tramo: ${safe(g.arrivals.join(', '))}. Los procesos que aún no han llegado no participan en la elección.</p>`:'')+
        (endNote?`<p class="decision-outcome">${safe(endNote)}</p>`:'')+'</li>';
    }).join('');
    const calculations=sim.results.map(r=>`<article class="process-calculation"><h4><i style="background:${processColor(r.id)}"></i>${safe(r.label||r.id)}</h4>`+
      `<p>TL = ${r.arrival} · CPU = ${r.burst} · TI = ${r.first??'Pendiente'} · TF = ${r.finish??'Pendiente'} · E/S = ${r.blocked} u.</p>`+
      (r.complete?
        formula('1. Retorno (TR)',`TF − TL = ${r.finish} − ${r.arrival} = ${r.turnaround} u`)+
        formula('2. Espera (TE)',`TR − CPU − E/S = ${r.turnaround} − ${r.burst} − ${r.blocked} = ${r.wait} u`):'<p>El proceso no ha terminado; aún no se calculan TR ni TE.</p>')+
      (r.response===null?'<p>El proceso aún no recibe CPU; TS está pendiente.</p>':formula('3. Respuesta (TS)',`TI − TL = ${r.first} − ${r.arrival} = ${r.response} u`))+'</article>').join('');
    const averageMarkup=model.averages.map(a=>formula(`${a.name} promedio (${a.symbol})`,
      a.count?`${a.symbol} promedio = (${a.values.join(' + ')}) / ${a.count} = ${a.sum} / ${a.count} = ${fmt(a.value)} u`:'Sin procesos con esta métrica disponible.')).join('');
    const m=sim.metrics;
    const busy=segments.filter(s=>s.id!==null).map(s=>s.end-s.start);
    const contextList=model.switches.map(s=>`t=${s.t}: ${s.from} → ${s.to}`).join(' · ');
    return `<h3>Solución desarrollada · ${safe(sim.algorithmName)}</h3>`+
      `<section class="solution-section"><h4>Paso 1. Entender los datos y la regla</h4><p>${safe(rules[sim.algorithm])}${sim.algorithm==='rr'?` Quantum = ${sim.quantum} u.`:''}</p>`+
      `<dl class="solution-key"><div><dt>TL</dt><dd>Tiempo de llegada</dd></div><div><dt>CPU</dt><dd>Ráfaga total de CPU</dd></div><div><dt>TI</dt><dd>Primera ejecución</dd></div><div><dt>TF</dt><dd>Finalización</dd></div><div><dt>E/S</dt><dd>Tiempo bloqueado</dd></div><div><dt>u</dt><dd>Unidades de tiempo</dd></div></dl>`+
      `<p class="solution-note">TI y TF se leen del Gantt. ${sim.results.some(r=>r.blocked)?'El tiempo bloqueado en E/S se descuenta de la espera.':'En estas prácticas E/S = 0.'} Las métricas de retorno y espera se calculan cuando termina el proceso.</p></section>`+
      `<section class="solution-section"><h4>Paso 2. Construir el Gantt, decisión por decisión</h4>${gantt}<p class="exam-timing">${segments.map(s=>`${s.start}–${s.end}: ${safe(s.id||'CPU libre')}`).join(' · ')}</p>`+
      `<ol class="decision-list">${decisions}</ol></section>`+
      `<section class="solution-section"><h4>Paso 3. Sustituir los valores en cada fórmula</h4><div class="process-calculations">${calculations}</div>`+
      `<div class="table-container"><table class="data-table"><caption>Resumen de métricas por proceso (u)</caption><thead><tr><th>Proceso</th><th>TL</th><th>CPU</th><th>TI</th><th>TF</th><th>TE</th><th>TR</th><th>TS</th></tr></thead><tbody>${sim.results.map(r=>
        `<tr><td>${safe(r.label||r.id)}</td><td>${r.arrival}</td><td>${r.burst}</td><td>${r.first??'—'}</td><td>${r.finish??'Pendiente'}</td><td>${r.wait??'—'}</td><td>${r.turnaround??'—'}</td><td>${r.response??'—'}</td></tr>`).join('')}</tbody></table></div></section>`+
      `<section class="solution-section"><h4>Paso 4. Sumar y obtener los promedios</h4><p>Promedio = suma de los tiempos / número de procesos con esa métrica. Conserva los valores completos y redondea solo el resultado final a dos decimales.</p>${averageMarkup}</section>`+
      `<section class="solution-section solution-summary"><h4>Paso 5. Comprobar la utilización de CPU</h4>`+
      formula('Tiempo útil (TTU)',`${busy.join(' + ')||'0'} = ${m.ttU} u`)+
      formula('Tiempo total (TTT)',`${sim.steps.length} − 0 = ${m.ttT} u`)+
      formula('Eficiencia de CPU',`(TTU / TTT) × 100 = (${m.ttU} / ${m.ttT}) × 100 = ${fmt(m.cpu)} %`)+
      formula('Tiempo inactivo',`TTT − TTU = ${m.ttT} − ${m.ttU} = ${m.idle} u`)+
      formula('Rendimiento',`Procesos completados / TTT = ${m.completed} / ${m.ttT} = ${fmt(m.throughput)} proc./u`)+
      `<p>Cambios de contexto = ${m.switches}. ${safe(contextList||'No hay cambios entre procesos distintos.')} Se cuentan los cambios directos de un proceso a otro; la CPU libre no cuenta.</p></section>`;
  }
  return {build,render};
});
