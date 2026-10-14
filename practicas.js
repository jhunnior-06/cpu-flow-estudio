/* Material de estudio y autoevaluación original en español. */
(()=>{'use strict';
const $=id=>document.getElementById(id);const E=window.CPUEngine;let current=null,attempts=0,correct=0;
const theory=[
['01','¿Qué es la planificación de CPU?','El planificador (scheduler) es el componente del sistema operativo que selecciona un proceso de la cola READY y decide cuánto tiempo puede usar la CPU.','Los procesos listos esperan su turno. En una CPU de un solo núcleo solo se ejecuta un proceso a la vez.'],
['02','Estados de un proceso','Nuevo → Listo (READY) → Ejecución (RUNNING) → Finalizado. Un proceso puede pasar de ejecución a Bloqueado (WAITING) mientras espera una operación de entrada/salida, y regresar a Listo cuando termina.','Un proceso listo espera CPU; uno bloqueado espera un evento externo.'],
['03','Cola READY y despacho','Los procesos listos permanecen en la cola READY. El planificador decide cuál ejecutar según la política seleccionada y el despachador transfiere el control de la CPU.','Un cambio de contexto guarda y restaura el estado al cambiar de proceso.'],
['04','Planificación apropiativa y no apropiativa','En la planificación no apropiativa, el proceso conserva la CPU hasta terminar su ráfaga o bloquearse. En la apropiativa, puede ser interrumpido por una llegada, prioridad superior o fin de quantum.','No apropiativos: FCFS, SJF, prioridades. Apropiativos: SRTF, RR, prioridades apropiativas.'],
['05','Algoritmos clásicos','FCFS: orden de llegada. SJF: ráfaga más corta entre disponibles. SRTF: menor ráfaga restante, con interrupción. Round Robin: turnos con quantum. Prioridades: atiende según prioridad; en esta web 1 es la mayor.','Ningún algoritmo es siempre superior: importa minimizar espera y respuesta sin sacrificar equidad.'],
['06','Métricas fundamentales','TE (espera) = TR − ráfaga CPU, cuando no hay bloqueos. TR (retorno) = finalización − llegada. TS (respuesta) = primera ejecución − llegada. TTU = suma de ráfagas ejecutadas; TTT = tiempo total transcurrido.','Eficiencia = (TTU / TTT) × 100 %. Tiempo perdido = TTT − TTU. Penalización = TR / ráfaga CPU.'],
['07','Cómo resolver un ejercicio','1. Ordena por llegada y aplica la regla del algoritmo. 2. Traza el diagrama de Gantt con sus instantes de cambio. 3. Anota inicio y finalización de cada proceso. 4. Calcula retorno, espera y respuesta. 5. Calcula los promedios y el uso de CPU.','Para Round Robin actualiza la cola tras cada quantum; para SRTF revisa las llegadas durante la ejecución.']
];
const formulaGroups=[
  ['Por proceso','process',[
    ['Retorno (TR)','TR = TF − TL','Desde que llega hasta que termina; incluye CPU, espera y bloqueo.','TR = 8 − 2 = 6 u'],
    ['Espera (TE)','TE = TR − CPU − E/S','Tiempo acumulado en READY. Si no hay bloqueos, E/S = 0.','TE = 6 − 1 − 0 = 5 u'],
    ['Respuesta (TS)','TS = TI − TL','Tiempo hasta recibir CPU por primera vez; no incluye esperas posteriores.','TS = 7 − 2 = 5 u'],
    ['CPU restante','Restante = CPU − Ejecutado','Resta solo el tiempo efectivamente ejecutado, no el transcurrido.','Restante = 5 − 2 = 3 u'],
    ['Penalización (P)','P = TR / CPU','Retorno normalizado: cuántas veces el retorno contiene la ráfaga de CPU. No tiene unidades.','P = 6 / 1 = 6']
  ]],
  ['Promedios y rendimiento','metrics',[
    ['Promedios de TE, TR y TS','X promedio = ΣX / n','Aplica la misma fórmula a cada métrica. n cuenta solo los procesos con esa métrica disponible. Redondea al final.','TE promedio = (0 + 5 + 3 + 1) / 4 = 2.25 u'],
    ['Tiempo útil (TTU)','TTU = Σ duración de tramos con CPU ocupada','Suma los bloques ejecutados del Gantt; excluye CPU libre. En un lote completo equivale a la suma de ráfagas.','TTU = 2 + 4 + 3 = 9 u'],
    ['Tiempo total (TTT)','TTT = t final − t inicial','Incluye CPU ocupada e inactiva. En el simulador t inicial = 0, incluso si el primer proceso llega después.','TTT = 12 − 0 = 12 u'],
    ['Utilización / eficiencia de CPU','CPU (%) = (TTU / TTT) × 100','Porcentaje del intervalo observado durante el que la CPU ejecuta procesos.','CPU = (9 / 12) × 100 = 75 %'],
    ['Tiempo inactivo','Inactivo = TTT − TTU','Unidades en las que no hay un proceso ejecutándose.','Inactivo = 12 − 9 = 3 u'],
    ['Porcentaje de inactividad','Inactividad (%) = (Inactivo / TTT) × 100','También se obtiene como 100 % − utilización.','Inactividad = (3 / 12) × 100 = 25 %'],
    ['Rendimiento (throughput)','Rendimiento = N terminados / TTT','Cantidad de procesos completados por unidad de tiempo.','Rendimiento = 3 / 12 = 0.25 proc./u']
  ]],
  ['Fórmulas de los algoritmos','algorithms',[
    ['Round Robin: duración del turno','Máximo = min(q − usado en el turno, CPU restante)','Al agotarse q, el proceso pendiente vuelve al final de READY. Un bloqueo de E/S puede terminar el turno antes.','q = 2, usado = 0, restante = 5 → min(2, 5) = 2 u'],
    ['HRRN: relación de respuesta','R = (W + S) / S','Elige el R más alto. En este motor W = t − última entrada a READY y S = CPU restante; sin E/S, S es la ráfaga inicial.','W = 6, S = 3 → R = (6 + 3) / 3 = 3'],
    ['EDF: fecha límite absoluta','Fecha límite = liberación + plazo relativo','Selecciona la fecha límite absoluta más cercana entre los trabajos disponibles. Cada instancia tiene su propia liberación.','Liberación = 5, plazo = 3 → fecha límite = 8'],
    ['MLFQ: quantum por nivel','q del nivel L = q base × 2^L','Este simulador usa niveles L = 0, 1 y 2. Consumir el quantum baja un nivel; un desbloqueo devuelve al nivel superior.','q base = 2 → niveles 0, 1 y 2: 2, 4 y 8 u'],
    ['Lotería: probabilidad de selección','Probabilidad = boletos / Σ boletos disponibles','En este simulador boletos = max(1, 51 − prioridad). La probabilidad se recalcula con los procesos listos.','50 boletos de 90 → 50 / 90 × 100 = 55.56 %']
  ]]
];
const formulaVariables=[
  ['TL','Tiempo de llegada'],['TI','Primera ejecución en CPU'],['TF','Tiempo de finalización'],
  ['CPU','Ráfaga total de CPU'],['E/S','Tiempo bloqueado'],['n','Procesos con la métrica calculada'],
  ['Σ','Suma de los valores'],['q','Quantum'],['u','Unidades de tiempo']
];
function theoryMount(){
  const g=$('guia');if(!g)return;
  const reference=$('formulaReference');
  reference.innerHTML=`<div class="formula-reference-heading"><div><div class="overline">CONSULTA PARA RESOLVER EJERCICIOS</div><h3 id="formulaTitle">Formulario de fórmulas</h3><p>Identifica los datos, aplica la fórmula y sustituye los valores. Los ejemplos muestran la operación completa.</p></div><a class="secondary-button" href="#examen">Practicar con estas fórmulas →</a></div>`+
    `<dl class="formula-variables">${formulaVariables.map(([symbol,meaning])=>`<div><dt>${symbol}</dt><dd>${meaning}</dd></div>`).join('')}</dl>`+
    formulaGroups.map(([title,kind,items])=>`<section class="formula-group formula-group-${kind}"><h4>${title}</h4><div class="formula-reference-grid">${items.map(([name,formula,meaning,example])=>`<article class="formula-reference-card"><h5>${name}</h5><code>${formula}</code><p>${meaning}</p><div class="formula-example"><span>Ejemplo resuelto</span><code>${example}</code></div></article>`).join('')}</div></section>`).join('')+
    '<p class="formula-reference-note">TR y TE requieren que el proceso haya terminado; TS requiere su primera ejecución. Para promediar, excluye las métricas pendientes. TTU y TTT deben corresponder al mismo intervalo, con TTT mayor que cero.</p>';
  const deck=document.createElement('div');deck.className='theory-grid';
  deck.innerHTML=theory.map(([n,h,p,t])=>`<article class="theory-card"><span class="theory-number">TEMA ${n}</span><h3>${h}</h3><p>${p}</p><div class="theory-tip">${t}</div></article>`).join('');
  g.querySelector('.study-layout').before(deck);
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
