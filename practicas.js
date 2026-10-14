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
function make(){const algo=$('examTopic').value,rows=Array.from({length:4},(_,i)=>({id:`P${i+1}`,arrival:i===0?0:rand(0,5),burst:rand(1,7),priority:rand(1,4)})),quantum=rand(2,4),sim=E.simulation(rows,algo,{quantum,horizon:40});current={algo,rows,quantum,sim};const a=sim.metrics;
$('examQuestion').innerHTML=`<div class="exam-label">PRÁCTICA ${algo.toUpperCase()} · NIVEL UNIVERSITARIO</div><h3>Calcula la planificación de los siguientes procesos</h3><p>Obtén el diagrama de Gantt, el tiempo de espera promedio y el tiempo de retorno promedio. ${algo==='rr'?`Utiliza quantum = <strong>${quantum}</strong>.`:''}</p><div class="table-container"><table class="data-table"><thead><tr><th>Proceso</th><th>Llegada</th><th>Ráfaga CPU</th><th>Prioridad</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${r.id}</strong></td><td>${r.arrival}</td><td>${r.burst}</td><td>${r.priority}</td></tr>`).join('')}</tbody></table></div><form id="examForm" class="exam-answers"><label>Espera promedio (TE)<input id="examWaiting" type="number" step="any" required placeholder="Respuesta numérica"></label><label>Retorno promedio (TR)<input id="examTurnaround" type="number" step="any" required placeholder="Respuesta numérica"></label><button class="run-button" type="submit">Comprobar respuestas</button></form>`;
$('examFeedback').textContent='';$('examSolution').hidden=true;$('examSolution').innerHTML='';$('examScore').textContent=`Aciertos: ${correct} de ${attempts}`;$('examForm').addEventListener('submit',e=>{e.preventDefault();const w=Number($('examWaiting').value),tr=Number($('examTurnaround').value);const good=Math.abs(w-a.waiting)<.011&&Math.abs(tr-a.turnaround)<.011;attempts++;if(good)correct++;$('examFeedback').innerHTML=`<div class="${good?'exam-ok':'exam-wrong'}">${good?'✓ ¡Correcto!':'Revisa las métricas y calcula de nuevo.'} ${good?'Ambos promedios coinciden con el resultado de la simulación.':'Puedes consultar la solución explicada.'}</div>`;$('examScore').textContent=`Aciertos: ${correct} de ${attempts}`;});}
function reveal(){
  if(!current)make();
  const el=$('examSolution');
  el.hidden=false;
  el.innerHTML=window.CPUSolution.render(current.sim,E.COLORS)+
    '<button class="secondary-button" id="examToSimulator">Ver este ejercicio en el simulador ↑</button>';
  $('examToSimulator').onclick=()=>{
    const data=current,sel=$('algorithm');
    sel.value=data.algo;
    sel.dispatchEvent(new Event('change',{bubbles:true}));
    const rows=$('processRows');
    // Copiar exactamente el ejercicio, incluso si antes se añadieron más procesos.
    while(rows.querySelectorAll('tr').length>data.rows.length)rows.querySelector('tr:last-child [data-remove]').click();
    while(rows.querySelectorAll('tr').length<data.rows.length)$('addProcess').click();
    const trs=rows.querySelectorAll('tr');
    data.rows.forEach((r,i)=>{
      for(const [key,val] of Object.entries(r)){
        const inp=trs[i].querySelector(`[data-field="${key}"]`);
        inp.value=val;
        inp.dispatchEvent(new Event('input',{bubbles:true}));
      }
      // Estas prácticas no tienen bloqueos de E/S.
      for(const key of ['ioAt','ioDuration']){
        const inp=trs[i].querySelector(`[data-field="${key}"]`);
        inp.value=0;
        inp.dispatchEvent(new Event('input',{bubbles:true}));
      }
    });
    const q=$('quantum');
    q.value=data.quantum;
    q.dispatchEvent(new Event('input',{bubbles:true}));
    $('simulate').click();
    $('simulador').scrollIntoView({behavior:'smooth'});
  };
}
function start(){theoryMount();if(!$('examGenerate'))return;$('examGenerate').onclick=make;$('examShow').onclick=reveal;make();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
