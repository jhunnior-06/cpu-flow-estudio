/* Material de estudio y autoevaluación original en español. */
(()=>{'use strict';
const $=id=>document.getElementById(id);const E=window.CPUEngine;let current=null,attempts=0,correct=0;
function theoryMount(){
  const g=$('guia');if(!g)return;
  const S=window.CPUStudy;
  $('formulaReference').innerHTML=S.renderReference();
  const deck=document.createElement('div');deck.className='study-foundations';
  deck.innerHTML=S.renderFoundations();
  g.querySelector('.study-layout').before(deck);
  $('pdfWorkedExamples').innerHTML=S.renderExamples(E);
}
const rand=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const safe=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fields={arrival:{label:'Llegada',min:0,max:500},burst:{label:'Ráfaga de CPU',min:1,max:200},priority:{label:'Prioridad',min:1,max:50}};

function renderEditorRows(){
  $('examProcessRows').innerHTML=current.rows.map((r,i)=>`<tr><td data-exam-label="Proceso"><input class="exam-process-input exam-process-name" data-exam-row="${i}" data-exam-field="id" aria-label="Nombre del proceso en la fila ${i+1}" type="text" maxlength="20" required value="${safe(r.id)}"></td>${Object.entries(fields).map(([key,f])=>`<td data-exam-label="${f.label}"><input class="exam-process-input" data-exam-row="${i}" data-exam-field="${key}" aria-label="${f.label} en la fila ${i+1}" type="number" step="1" min="${f.min}" max="${f.max}" required value="${safe(r[key])}"></td>`).join('')}<td class="exam-row-actions"><button type="button" class="exam-remove-process" data-exam-remove="${i}" aria-label="Eliminar fila ${i+1}" ${current.rows.length===1?'disabled':''}>Eliminar</button></td></tr>`).join('');
  $('examProcessCount').textContent=`${current.rows.length} de 20 procesos`;
  $('examAddProcess').disabled=current.rows.length>=20;
}
function updatePracticeHeading(){
  const name=E.ALGORITHMS.find(a=>a.id===current.algo).name;
  $('examPracticeLabel').textContent=`PRÁCTICA ${name.toUpperCase()} · DATOS EDITABLES`;
  $('examQuantumBox').hidden=current.algo!=='rr';
}
function validateExercise(){
  document.querySelectorAll('#examQuestion [aria-invalid]').forEach(input=>input.removeAttribute('aria-invalid'));
  const fail=(message,selector)=>{document.querySelector(selector)?.setAttribute('aria-invalid','true');throw Error(message);};
  const ids=new Set();
  current.rows.forEach((r,i)=>{
    const id=String(r.id).trim(),selector=`[data-exam-row="${i}"][data-exam-field="id"]`;
    if(!id||id.length>20)fail(`Escribe un nombre de 1 a 20 caracteres para el proceso de la fila ${i+1}.`,selector);
    if(ids.has(id))fail(`El nombre «${id}» está repetido. Cada proceso debe tener un nombre diferente.`,selector);
    ids.add(id);
    for(const [key,f] of Object.entries(fields)){
      const value=Number(r[key]);
      if(r[key]===''||!Number.isInteger(value)||value<f.min||value>f.max)fail(`${f.label} de ${id}: escribe un entero entre ${f.min} y ${f.max}.`,`[data-exam-row="${i}"][data-exam-field="${key}"]`);
    }
  });
  if(current.algo==='rr'&&(current.quantum===''||!Number.isInteger(Number(current.quantum))||Number(current.quantum)<1||Number(current.quantum)>100))fail('Quantum: escribe un entero entre 1 y 100.','#examQuantum');
}
function renderSolution(){
  const el=$('examSolution');
  el.hidden=!current.showSolution||!current.sim;
  if(el.hidden){el.innerHTML='';return;}
  el.innerHTML=window.CPUSolution.render(current.sim,E.COLORS)+
    '<button type="button" class="secondary-button" id="examToSimulator">Ver este ejercicio en el simulador ↑</button>';
  $('examToSimulator').onclick=copyToSimulator;
}
function recalculate(resetAnswers=true){
  current.sim=null;
  $('examEditorError').hidden=true;
  if(resetAnswers){
    $('examFeedback').textContent='';
    $('examWaiting').value='';$('examTurnaround').value='';
  }
  try{
    validateExercise();
    current.sim=E.simulation(current.rows,current.algo,{quantum:current.algo==='rr'?Number(current.quantum):2,horizon:40});
  }catch(error){
    $('examEditorError').textContent=error.message;
    $('examEditorError').hidden=false;
  }
  $('examCheck').disabled=!current.sim;
  $('examShow').disabled=!current.sim;
  renderSolution();
}
function make(){
  current={algo:$('examTopic').value,rows:Array.from({length:4},(_,i)=>({id:`P${i+1}`,arrival:i===0?0:rand(0,5),burst:rand(1,7),priority:rand(1,4)})),quantum:rand(2,4),sim:null,showSolution:false};
  $('examQuestion').innerHTML=`<div class="exam-label" id="examPracticeLabel"></div><h3>Calcula la planificación de tus procesos</h3><p>Edita los valores, agrega o elimina procesos y calcula el tiempo de espera promedio y el tiempo de retorno promedio.</p><div class="exam-editor-toolbar"><button type="button" class="secondary-button" id="examAddProcess">+ Agregar proceso</button><span id="examProcessCount" aria-live="polite"></span><label class="exam-quantum" id="examQuantumBox">Quantum<input class="exam-process-input" id="examQuantum" type="number" min="1" max="100" step="1" required value="${current.quantum}"></label></div><div class="table-container"><table class="data-table exam-editor-table"><caption>Datos editables del ejercicio</caption><thead><tr><th>Proceso</th><th>Llegada</th><th>Ráfaga CPU</th><th>Prioridad</th><th>Acciones</th></tr></thead><tbody id="examProcessRows"></tbody></table></div><p class="exam-editor-hint">Los cálculos se actualizan con los datos de esta tabla. Prioridad 1 = más alta. Usa tiempos enteros.</p><div class="warning exam-editor-error" id="examEditorError" role="alert" hidden></div><form id="examForm" class="exam-answers"><label>Espera promedio (TE)<input id="examWaiting" type="number" step="any" required placeholder="Respuesta numérica"></label><label>Retorno promedio (TR)<input id="examTurnaround" type="number" step="any" required placeholder="Respuesta numérica"></label><button class="run-button" id="examCheck" type="submit">Comprobar respuestas</button></form>`;
  updatePracticeHeading();renderEditorRows();recalculate();
  $('examScore').textContent=`Aciertos: ${correct} de ${attempts}`;
  $('examAddProcess').onclick=()=>{
    if(current.rows.length>=20)return;
    const used=new Set(current.rows.map(r=>String(r.id).trim()));let n=1;
    while(used.has('P'+n))n++;
    current.rows.push({id:'P'+n,arrival:0,burst:3,priority:3});
    renderEditorRows();recalculate();
    $('examProcessRows').lastElementChild.querySelector('input').focus({preventScroll:true});
  };
  $('examProcessRows').addEventListener('input',event=>{
    const input=event.target.closest('[data-exam-field]');if(!input)return;
    current.rows[Number(input.dataset.examRow)][input.dataset.examField]=input.value;
    recalculate();
  });
  $('examProcessRows').addEventListener('click',event=>{
    const button=event.target.closest('[data-exam-remove]');if(!button||current.rows.length<=1)return;
    const index=Number(button.dataset.examRemove);
    current.rows.splice(index,1);renderEditorRows();recalculate();
    const next=$('examProcessRows').children[Math.min(index,current.rows.length-1)];
    const nextButton=next.querySelector('[data-exam-remove]');
    (nextButton.disabled?next.querySelector('input'):nextButton).focus({preventScroll:true});
  });
  $('examQuantum').addEventListener('input',event=>{current.quantum=event.target.value;recalculate();});
  $('examForm').addEventListener('submit',event=>{
    event.preventDefault();if(!current.sim)return;
    const a=current.sim.metrics,w=Number($('examWaiting').value),tr=Number($('examTurnaround').value);
    const good=Math.abs(w-a.waiting)<.011&&Math.abs(tr-a.turnaround)<.011;
    attempts++;if(good)correct++;
    $('examFeedback').innerHTML=`<div class="${good?'exam-ok':'exam-wrong'}">${good?'✓ ¡Correcto!':'Revisa las métricas y calcula de nuevo.'} ${good?'Ambos promedios coinciden con los datos actuales de tu ejercicio.':'Puedes consultar la solución explicada.'}</div>`;
    $('examScore').textContent=`Aciertos: ${correct} de ${attempts}`;
  });
}
function reveal(){
  if(!current)make();
  current.showSolution=true;recalculate(false);
}
function copyToSimulator(){
  if(!current.sim)return;
  const data={algo:current.algo,rows:current.sim.processes,quantum:current.algo==='rr'?Number(current.quantum):2};
  const select=$('algorithm');select.value=data.algo;select.dispatchEvent(new Event('change',{bubbles:true}));
  const rows=$('processRows');
  while(rows.querySelectorAll('tr').length>data.rows.length)rows.querySelector('tr:last-child [data-remove]').click();
  while(rows.querySelectorAll('tr').length<data.rows.length)$('addProcess').click();
  const trs=rows.querySelectorAll('tr');
  data.rows.forEach((r,i)=>{
    for(const key of ['id','arrival','burst','priority','ioAt','ioDuration']){
      const input=trs[i].querySelector(`[data-field="${key}"]`);
      input.value=key.startsWith('io')?0:r[key];
      input.dispatchEvent(new Event('input',{bubbles:true}));
    }
  });
  const q=$('quantum');q.value=data.quantum;q.dispatchEvent(new Event('input',{bubbles:true}));
  $('simulate').click();$('simulador').scrollIntoView({behavior:'smooth'});
}
function start(){
  theoryMount();if(!$('examGenerate'))return;
  $('examGenerate').onclick=make;$('examShow').onclick=reveal;
  $('examTopic').addEventListener('change',event=>{
    if(!current)return;
    current.algo=event.target.value;updatePracticeHeading();recalculate();
  });
  make();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
