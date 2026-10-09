/* CPU Flow Estudio — interacción en navegador (sin dependencias ni servicios externos). */
(() => {
  'use strict';
  const E = window.CPUEngine;
  if (!E) { document.body.textContent = 'No se pudo cargar el motor de planificación.'; return; }
  const $ = id => document.getElementById(id);
  const safe = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const num = value => Number.isFinite(value) ? value.toFixed(2) : '—';
  const color = id => {
    const idx = state.rows.findIndex(p => p.id === id);
    return idx < 0 ? '#9aa7be' : E.COLORS[idx % E.COLORS.length];
  };
  const sample = {
    rr: [{id:'P1',arrival:0,burst:4,priority:2},{id:'P2',arrival:1,burst:3,priority:1},{id:'P3',arrival:2,burst:2,priority:3},{id:'P4',arrival:3,burst:2,priority:4}],
    fcfs:[{id:'P1',arrival:0,burst:5},{id:'P2',arrival:1,burst:3},{id:'P3',arrival:2,burst:8},{id:'P4',arrival:3,burst:6}],
    sjf:[{id:'P1',arrival:0,burst:6},{id:'P2',arrival:1,burst:8},{id:'P3',arrival:2,burst:7},{id:'P4',arrival:3,burst:3}],
    prioridad:[{id:'P1',arrival:0,burst:4,priority:3},{id:'P2',arrival:1,burst:3,priority:1},{id:'P3',arrival:2,burst:2,priority:4},{id:'P4',arrival:3,burst:1,priority:2}],
    srtf:[{id:'P1',arrival:0,burst:8},{id:'P2',arrival:1,burst:4},{id:'P3',arrival:2,burst:2},{id:'P4',arrival:3,burst:1}],
    io:[{id:'P1',arrival:0,burst:7,ioAt:3,ioDuration:3},{id:'P2',arrival:1,burst:5,ioAt:2,ioDuration:2},{id:'P3',arrival:2,burst:3}],
    periodic:[{id:'P1',arrival:0,burst:2,period:5,deadline:5},{id:'P2',arrival:0,burst:1,period:3,deadline:3},{id:'P3',arrival:0,burst:2,period:8,deadline:8}]
  };
  const standard = row => ({id:row.id,arrival:row.arrival??0,burst:row.burst??3,priority:row.priority??3,queue:row.queue??0,period:row.period??10,deadline:row.deadline??10,ioAt:row.ioAt??0,ioDuration:row.ioDuration??0});
  const state = {rows:sample.rr.map(standard),algorithm:'rr',quantum:2,horizon:40,advanced:false,sim:null,step:0,playing:null,compare:[],history:[],page:35,quiz:0,selectedQuiz:null};
  const questions = [
    {q:'¿Cuál algoritmo ejecuta primero el proceso que llega antes?',options:['SRTF','FCFS','Round Robin','EDF'],correct:1,why:'FCFS ordena la cola por orden de llegada.'},
    {q:'En SRTF, ¿cuándo puede ser interrumpido un proceso?',options:['Nunca','Solamente al acabar el quantum','Cuando llega otro con menos tiempo restante','Cuando termina todo el lote'],correct:2,why:'SRTF es apropiativo: compara el tiempo pendiente y puede cambiar de proceso.'},
    {q:'Si un proceso llega en t=2 y finaliza en t=9, ¿cuál es su retorno?',options:['7','9','11','2'],correct:0,why:'Retorno = 9 − 2 = 7 unidades.'},
    {q:'¿Qué representa el quantum en Round Robin?',options:['Prioridad numérica','Tiempo máximo consecutivo por turno','Tiempo total de E/S','Cantidad de procesadores'],correct:1,why:'Cada turno dura como máximo el quantum; si no termina, vuelve a la cola.'},
    {q:'Una ráfaga dura 4 u, llega en 1 y finaliza en 11 sin bloqueo. ¿Espera?',options:['11','7','6','10'],correct:2,why:'Espera = (11 − 1) − 4 = 6.'},
    {q:'¿Qué algoritmo se basa en la fecha límite más cercana?',options:['EDF','LJF','HRRN','FCFS'],correct:0,why:'EDF selecciona entre trabajos listos el de plazo absoluto más próximo.'},
    {q:'En la convención de este simulador, prioridad 1 significa…',options:['Prioridad más baja','Prioridad más alta','CPU bloqueada','Desempate al azar'],correct:1,why:'Se utiliza una escala donde el número menor tiene mayor prioridad.'}
  ];
  let rerunTimer = null, toastTimer = null;
  function toast(message) { const el=$('toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),3200); }
  function stopPlay() { if(state.playing!==null){clearInterval(state.playing);state.playing=null;} $('togglePlay').textContent='▶ Reproducir'; }
  function getInput() {return state.rows.map(p=>({...p}));}
  function opts(){return {quantum:state.quantum,horizon:state.horizon};}
  function schedule(){ clearTimeout(rerunTimer);rerunTimer=setTimeout(run,200); }
  function colClass(name) {return name==='queue'?'col-queue':name==='period'?'col-period':name==='deadline'?'col-deadline':name==='ioAt'||name==='ioDuration'?'col-io':'';}
  function field(p,key,i){const id=key==='id';const cls=id?'process-input':'cell-input';const min=key==='arrival'||key==='queue'||key.startsWith('io')?0:1;return `<td class="${colClass(key)}"><input aria-label="${safe(key)} de ${safe(p.id)}" class="${cls}" data-row="${i}" data-field="${key}" type="${id?'text':'number'}" ${id?'maxlength="20"':`step="1" min="${min}"`} value="${safe(p[key])}"></td>`;}
  function updateInputVisibility(){
    const algo=state.algorithm, queues=['mlq','mlfq'].includes(algo), periodic=['edf','rms'].includes(algo);
    document.querySelectorAll('.col-queue').forEach(el=>el.classList.toggle('hidden',!queues));
    document.querySelectorAll('.col-period,.col-deadline').forEach(el=>el.classList.toggle('hidden',!periodic));
    document.querySelectorAll('.col-io').forEach(el=>el.classList.toggle('hidden',!state.advanced || periodic));
    $('quantumBox').classList.toggle('hidden',!['rr','mlq','mlfq'].includes(algo));
    $('horizonBox').classList.toggle('hidden',!periodic);
    const item=E.ALGORITHMS.find(a=>a.id===algo);
    $('algorithmInfo').innerHTML=`<strong>${safe(item.kind)} · ${safe(item.long)}</strong>${safe(item.desc)}${algo.startsWith('priority')?' Prioridad 1 = más alta.':''}`;
  }
  function renderRows(){
    $('processRows').innerHTML=state.rows.map((p,i)=>`<tr>${['id','arrival','burst','priority','queue','period','deadline','ioAt','ioDuration'].map(k=>field(p,k,i)).join('')}<td><button aria-label="Eliminar ${safe(p.id)}" class="remove-row" data-remove="${i}" ${state.rows.length===1?'disabled':''}>×</button></td></tr>`).join('');
    document.querySelectorAll('.col-priority').forEach(el=>el.classList.toggle('hidden',false));
    updateInputVisibility();
  }
  function renderMetrics(){
    const m=state.sim.metrics;
    const cards=[
      ['Tiempo de espera',num(m.waiting),'u promedio','Menor es mejor'],
      ['Tiempo de retorno',num(m.turnaround),'u promedio','Finalización − llegada'],
      ['Tiempo de respuesta',num(m.response),'u promedio','Primera ejecución − llegada'],
      ['Uso de CPU',num(m.cpu),'%','Tiempo ocupado / total'],
      ['Rendimiento',num(m.throughput),'proc./u','Procesos completados / tiempo'],
      ['Cambios de contexto',String(m.switches),'cambios','Entre procesos distintos'],
      ['Procesos completos',`${m.completed}/${m.total}`,'procesos','Trazas calculadas'],
      ['Tiempo inactivo',String(m.idle),'u','CPU sin ejecutar procesos']
    ];
    $('metricCards').innerHTML=cards.map(([t,v,u,n],i)=>`<div class="metric-card"><div class="metric-title">${t}</div><strong class="metric-value" style="color:${i===3?'#159e88':''}">${v}<span class="metric-unit"> ${u}</span></strong><div class="metric-foot ${i===3?'good':''}">${n}</div></div>`).join('');
    $('resultCaption').textContent=`${state.sim.algorithmName} · ${state.rows.length} proceso(s) · ${state.sim.steps.length} unidades simuladas`;
  }
  function renderGantt(){
    const sim=state.sim, div=$('ganttTimeline'), segments=sim.segments;
    const unit=sim.steps.length>180?10:sim.steps.length>80?17:sim.steps.length>35?24:38;
    const fullW=Math.max(1,sim.steps.length)*unit;
    $('ganttLegend').innerHTML=state.rows.map(p=>`<span class="legend-item"><i class="legend-swatch" style="background:${color(p.id)}"></i>${safe(p.id)}</span>`).join('')+'<span class="legend-item"><i class="legend-swatch" style="background:#e9edf5"></i>CPU libre</span>';
    div.innerHTML=`<div class="gantt-line" style="width:${fullW}px">${segments.map(s=>`<button type="button" data-at="${s.start}" title="${safe(s.label)}: t=${s.start} a t=${s.end}" aria-label="Ir a t=${s.start}, ${safe(s.label)}" class="gantt-segment ${s.id===null?'idle':''}" style="width:${(s.end-s.start)*unit}px;background:${s.id===null?'#e9edf5':color(s.id)}">${safe(s.label)}</button>`).join('')}</div><div class="gantt-ticks" style="width:${fullW}px">${segments.map(s=>`<span style="width:${(s.end-s.start)*unit}px"><span class="tick">${s.start}</span></span>`).join('')}<span><span class="tick">${sim.steps.length}</span></span></div>`;
  }
  function renderStep(){
    const sim=state.sim;if(!sim||!sim.steps.length)return;
    state.step=Math.max(0,Math.min(state.step,sim.steps.length-1));
    const s=sim.steps[state.step];
    $('stepCounter').textContent=`t=${s.t} → ${s.t+1}`;
    $('stepSlider').value=String(state.step);
    $('stepSlider').max=String(sim.steps.length-1);
    $('stepReadout').innerHTML=`<div class="readout-item"><span class="readout-label">EN CPU</span><strong style="color:${color(s.id)}">${safe(s.label)}</strong></div><div class="readout-item"><span class="readout-label">COLA DE LISTOS</span><strong>${safe(s.ready.join(', ')||'Vacía')}</strong></div><div class="readout-item"><span class="readout-label">BLOQUEADOS</span><strong>${safe(s.blocked.join(', ')||'Ninguno')}</strong></div>`;
    $('stateList').innerHTML=Object.entries(s.states).slice(0,40).map(([id,ss])=>`<div class="state-pill ${ss==='Ejecución'?'running':ss==='Finalizado'?'done':ss==='Bloqueado'?'blocked':''}"><i class="legend-swatch" style="background:${color(id.split('#')[0])}"></i>${safe(id)} <span class="state-status">${safe(ss)}</span></div>`).join('');
    $('stepExplanation').textContent=`En el instante t=${s.t}: ${s.reason}${s.arrivals.length?' Llegan o se desbloquean: '+s.arrivals.join(', ')+'.':''}`;
    $('goFirst').disabled=state.step===0;
    $('goPrev').disabled=state.step===0;
    $('goNext').disabled=state.step===sim.steps.length-1;
    $('goLast').disabled=state.step===sim.steps.length-1;
    document.querySelectorAll('.gantt-segment.selected').forEach(e=>e.classList.remove('selected'));
    const chosen=[...document.querySelectorAll('.gantt-segment')].find(e=>+e.dataset.at<=s.t && s.t<(e.nextElementSibling?+e.nextElementSibling.dataset.at:sim.steps.length));
    if(chosen)chosen.classList.add('selected');
  }
  function renderTrace(){
    if(!state.sim)return;
    const steps=state.sim.steps.slice(0,state.page);
    $('traceBody').innerHTML=steps.map(s=>`<tr><td>${s.t}–${s.t+1}</td><td><b style="color:${color(s.id)}">${safe(s.label)}</b></td><td>${safe(s.ready.join(', ')||'—')}</td><td>${safe(s.blocked.join(', ')||'—')}</td><td style="white-space:normal;min-width:260px">${safe(s.reason)}</td></tr>`).join('');
    $('traceCount').textContent=`${steps.length} de ${state.sim.steps.length} pasos`;
    $('traceMore').disabled=steps.length>=state.sim.steps.length;
    $('traceMore').textContent=steps.length>=state.sim.steps.length?'Todos los pasos visibles':'Mostrar más pasos';
  }
  function renderProcessResults(){
    if(!state.sim)return;
    const rows=state.sim.results;
    $('metricRows').innerHTML=rows.slice(0,350).map(r=>`<tr><td><span class="process-tag" style="background:${color(r.id)}">${safe(r.label||r.id)}</span></td><td>${r.arrival}</td><td>${r.burst}</td><td>${r.first??'—'}</td><td>${r.finish??'Pendiente'}</td><td>${r.turnaround??'—'}</td><td class="best-cell">${r.wait??'—'}</td><td>${r.response??'—'}</td></tr>`).join('');
  }
  function run(){
    stopPlay();$('errorBox').hidden=true;
    try{
      const sim=E.simulation(getInput(),state.algorithm,opts());
      state.sim=sim;state.step=0;state.page=35;
      renderMetrics();renderGantt();renderStep();renderProcessResults();renderTrace();
      renderCompare();
    }catch(error){$('errorBox').textContent=error.message;$('errorBox').hidden=false;state.sim=null;}
  }
  function renderCompare(){
    try{state.compare=E.compare(getInput(),opts());}catch(error){$('compareChart').textContent=error.message;return;}
    const metric=$('compareMetric').value;
    const decreasing=metric!=='cpu';
    const rows=state.compare.filter(r=>!r.error).slice().sort((a,b)=>decreasing?a[metric]-b[metric]:b[metric]-a[metric]);
    const max=Math.max(1,...rows.map(r=>Number(r[metric])||0));
    $('compareChart').innerHTML=rows.map((r,i)=>`<div class="compare-bar-row"><span>${safe(r.name)}</span><div class="bar-track"><span class="bar-fill" style="width:${Math.max(0,Math.min(100,r[metric]/max*100))}%;background:${i===0?'#22b8a8':E.COLORS[(i+3)%E.COLORS.length]}"></span></div><span class="compare-number">${metric==='cpu'?num(r[metric])+'%':num(r[metric])}</span></div>`).join('');
    $('compareRows').innerHTML=state.compare.map(r=>r.error?`<tr><td>${safe(r.name)}</td><td colspan="5">${safe(r.error)}</td><td>—</td></tr>`:`<tr><td><strong>${safe(r.name)}</strong></td><td>${num(r.waiting)}</td><td>${num(r.turnaround)}</td><td>${num(r.response)}</td><td>${num(r.cpu)}%</td><td>${r.switches}</td><td><button class="text-button" data-choose="${safe(r.id)}">Ver →</button></td></tr>`).join('');
  }
  function quizRender(){
    const q=questions[state.quiz%questions.length];
    $('quizBody').innerHTML=`<div class="quiz-question">${state.quiz+1}/${questions.length}. ${safe(q.q)}</div>${q.options.map((text,i)=>`<button class="quiz-option ${state.selectedQuiz===null?'':i===q.correct?'correct':i===state.selectedQuiz?'incorrect':''}" data-answer="${i}" ${state.selectedQuiz===null?'':'disabled'}>${String.fromCharCode(65+i)}. ${safe(text)}</button>`).join('')}<div class="quiz-feedback">${state.selectedQuiz===null?'Selecciona una respuesta.':`${state.selectedQuiz===q.correct?'✓ ¡Correcto!':'✕ Incorrecto.'} ${safe(q.why)}`}</div><button class="secondary-button" style="margin-top:12px" id="nextQuiz">Siguiente pregunta →</button>`;
  }
  function algorithmsRender(){
    $('algorithmCards').innerHTML=E.ALGORITHMS.map((a,i)=>`<div class="algo-card"><span class="algo-symbol">${['◷','✂','↘','↻','★','★','☰','↑','⇄','▤','▥','♣','⌛','◴'][i]}</span><h4>${safe(a.name)}</h4><small>${safe(a.kind)}</small><p>${safe(a.desc)}</p><button data-choose="${safe(a.id)}">Probar algoritmo →</button></div>`).join('');
  }
  function saveHistory(){
    if(!state.sim){toast('Primero ejecuta una simulación.');return;}
    const item={id:Date.now(),name:state.sim.algorithmName,algorithm:state.algorithm,rows:getInput(),quantum:state.quantum,horizon:state.horizon,waiting:state.sim.metrics.waiting,turnaround:state.sim.metrics.turnaround,date:new Date().toLocaleString('es-PE')};
    state.history.unshift(item);state.history=state.history.slice(0,35);writeHistory();renderHistory();toast('Simulación guardada en este navegador.');
  }
  function writeHistory(){try{localStorage.setItem('cpu-flow-estudio-v1',JSON.stringify(state.history));}catch(error){toast('Almacenamiento no disponible en este navegador.');}}
  function readHistory(){try{const saved=JSON.parse(localStorage.getItem('cpu-flow-estudio-v1')||'[]');state.history=Array.isArray(saved)?saved:[];}catch(_){state.history=[];}}
  function renderHistory(){
    $('historyList').innerHTML=state.history.length?state.history.map(h=>`<div class="history-card"><h3>${safe(h.name)}</h3><p>${safe(h.date)} · ${h.rows.length} procesos</p><div class="history-stats"><span>Espera ${num(h.waiting)} u</span><span>Retorno ${num(h.turnaround)} u</span></div><div class="history-actions"><button class="secondary-button compact" data-restore="${h.id}">Restaurar</button><button class="secondary-button compact" data-delete="${h.id}">Eliminar</button></div></div>`).join(''):'<div class="empty-history">No hay simulaciones guardadas todavía. Simula un ejercicio y pulsa «Guardar».</div>';
  }
  function setAlgorithm(name){state.algorithm=name;$('algorithm').value=name;updateInputVisibility();run();}
  function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  function exportCSV(){
    if(!state.sim)return;
    const cols=['Proceso','Llegada','Ráfaga','Prioridad','Primera CPU','Finalización','Retorno','Espera','Respuesta'];
    const rows=state.sim.results.map(r=>[r.label,r.arrival,r.burst,r.priority,r.first??'',r.finish??'',r.turnaround??'',r.wait??'',r.response??'']);
    download(`cpu-${state.algorithm}.csv`,'\ufeff'+[cols,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\r\n'),'text/csv;charset=utf-8');
  }
  function exportJSON(){if(state.sim)download(`cpu-${state.algorithm}.json`,JSON.stringify({algorithm:state.algorithm,options:opts(),processes:getInput(),steps:state.sim.steps,segments:state.sim.segments,results:state.sim.results,metrics:state.sim.metrics},null,2),'application/json');}
  function chooseSample(key){
    state.rows=(sample[key]||sample.rr).map(standard);
    state.quantum=2;state.horizon=40;state.algorithm={rr:'rr',fcfs:'fcfs',sjf:'sjf',prioridad:'priority',srtf:'srtf',io:'rr',periodic:'edf'}[key]||'rr';
    $('quantum').value=state.quantum;$('horizon').value=state.horizon;$('algorithm').value=state.algorithm;
    if(key==='io'){state.advanced=true;$('toggleAdvanced').setAttribute('aria-pressed','true');}
    renderRows();run();toast('Ejemplo cargado. Modifica los números para practicar.');
  }
  function init(){
    $('algorithm').innerHTML=E.ALGORITHMS.map(a=>`<option value="${safe(a.id)}">${safe(a.name)} — ${safe(a.long)}</option>`).join('');
    $('algorithm').value=state.algorithm;
    algorithmsRender();quizRender();readHistory();renderHistory();renderRows();run();
    $('algorithm').addEventListener('change',e=>setAlgorithm(e.target.value));
    $('quantum').addEventListener('input',e=>{state.quantum=Number(e.target.value);schedule();});
    $('horizon').addEventListener('input',e=>{state.horizon=Number(e.target.value);schedule();});
    $('processRows').addEventListener('input',e=>{
      const input=e.target.closest('[data-field]');if(!input)return;
      let value=input.type==='number'?(input.value===''?'':Number(input.value)):input.value;
      state.rows[Number(input.dataset.row)][input.dataset.field]=value;schedule();
    });
    $('processRows').addEventListener('click',e=>{
      const btn=e.target.closest('[data-remove]');if(!btn||state.rows.length<=1)return;
      state.rows.splice(Number(btn.dataset.remove),1);renderRows();run();
    });
    $('addProcess').addEventListener('click',()=>{
      if(state.rows.length>=20){toast('Máximo 20 procesos.');return;}
      let i=state.rows.length+1,id='P'+i;
      while(state.rows.some(p=>p.id===id)){id='P'+(++i);}
      state.rows.push(standard({id,arrival:0,burst:3}));renderRows();run();
      $('processTable').parentElement.scrollLeft=$('processTable').scrollWidth;
    });
    $('toggleAdvanced').addEventListener('click',()=>{state.advanced=!state.advanced;$('toggleAdvanced').setAttribute('aria-pressed',String(state.advanced));updateInputVisibility();});
    $('loadPreset').addEventListener('click',()=>chooseSample($('preset').value));
    $('resetData').addEventListener('click',()=>chooseSample('rr'));
    $('simulate').addEventListener('click',()=>{run();toast(state.sim?'Simulación actualizada.':'Corrige los datos señalados.');});
    $('stepSlider').addEventListener('input',e=>{stopPlay();state.step=Number(e.target.value);renderStep();});
    $('goFirst').addEventListener('click',()=>{stopPlay();state.step=0;renderStep();});
    $('goPrev').addEventListener('click',()=>{stopPlay();state.step--;renderStep();});
    $('goNext').addEventListener('click',()=>{stopPlay();state.step++;renderStep();});
    $('goLast').addEventListener('click',()=>{stopPlay();state.step=state.sim.steps.length-1;renderStep();});
    $('togglePlay').addEventListener('click',()=>{
      if(state.playing!==null){stopPlay();return;}if(!state.sim)return;
      if(state.step===state.sim.steps.length-1)state.step=0;
      $('togglePlay').textContent='Ⅱ Pausar';state.playing=setInterval(()=>{
        if(!state.sim||state.step>=state.sim.steps.length-1){stopPlay();return;}state.step++;renderStep();
      },650);renderStep();
    });
    $('ganttTimeline').addEventListener('click',e=>{const b=e.target.closest('[data-at]');if(!b)return;stopPlay();state.step=+b.dataset.at;renderStep();});
    $('toggleTrace').addEventListener('click',()=>{const x=$('traceWrap');x.hidden=!x.hidden;$('toggleTrace').textContent=x.hidden?'Ver todas las decisiones (tabla) ↓':'Ocultar decisiones ↑';});
    $('traceMore').addEventListener('click',()=>{state.page+=40;renderTrace();});
    $('compareMetric').addEventListener('change',renderCompare);
    $('compareNow').addEventListener('click',()=>{renderCompare();toast('Comparación recalculada.');});
    $('compareRows').addEventListener('click',e=>{const b=e.target.closest('[data-choose]');if(!b)return;setAlgorithm(b.dataset.choose);$('simulador').scrollIntoView({behavior:'smooth'});});
    $('algorithmCards').addEventListener('click',e=>{const b=e.target.closest('[data-choose]');if(!b)return;setAlgorithm(b.dataset.choose);$('simulador').scrollIntoView({behavior:'smooth'});});
    $('quizBody').addEventListener('click',e=>{
      const answer=e.target.closest('[data-answer]');if(answer&&state.selectedQuiz===null){state.selectedQuiz=+answer.dataset.answer;quizRender();return;}
      if(e.target.closest('#nextQuiz')){state.quiz=(state.quiz+1)%questions.length;state.selectedQuiz=null;quizRender();}
    });
    $('saveRun').addEventListener('click',saveHistory);
    $('downloadCsv').addEventListener('click',exportCSV);
    $('downloadJson').addEventListener('click',exportJSON);
    $('printRun').addEventListener('click',()=>window.print());
    $('clearHistory').addEventListener('click',()=>{if(!state.history.length)return;if(confirm('¿Deseas borrar todo el historial de este navegador?')){state.history=[];writeHistory();renderHistory();toast('Historial borrado.');}});
    $('historyList').addEventListener('click',e=>{
      const restore=e.target.closest('[data-restore]');const remove=e.target.closest('[data-delete]');const id=Number((restore||remove)?.dataset[restore?'restore':'delete']);if(!id)return;
      const item=state.history.find(h=>h.id===id);if(!item)return;
      if(remove){state.history=state.history.filter(h=>h.id!==id);writeHistory();renderHistory();return;}
      state.rows=item.rows.map(standard);state.algorithm=item.algorithm;state.quantum=item.quantum;state.horizon=item.horizon;
      $('algorithm').value=state.algorithm;$('quantum').value=state.quantum;$('horizon').value=state.horizon;renderRows();run();$('simulador').scrollIntoView({behavior:'smooth'});toast('Simulación restaurada.');
    });
    $('navToggle').addEventListener('click',()=>{const active=$('navToggle').getAttribute('aria-expanded')==='true';$('navToggle').setAttribute('aria-expanded',String(!active));document.querySelector('.top-nav').classList.toggle('open',!active);});
    document.querySelectorAll('.top-nav a').forEach(a=>a.addEventListener('click',()=>{document.querySelector('.top-nav').classList.remove('open');$('navToggle').setAttribute('aria-expanded','false');}));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();