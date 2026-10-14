const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../scheduler.js');
const S=require('../solution.js');

test('Desarrolla el ejercicio de la captura con decisiones y sustituciones exactas',()=>{
  const sim=E.simulation([
    {id:'P1',arrival:0,burst:2,priority:3},
    {id:'P2',arrival:2,burst:1,priority:2},
    {id:'P3',arrival:5,burst:3,priority:1},
    {id:'P4',arrival:1,burst:5,priority:3}
  ],'fcfs');
  const model=S.build(sim),html=S.render(sim,E.COLORS);
  assert.deepEqual(model.groups.map(g=>[g.step.id,g.start,g.end]),[
    ['P1',0,2],['P4',2,7],['P2',7,8],['P3',8,11]
  ]);
  assert.deepEqual(model.groups[1].step.decision.candidates.map(p=>p.id),['P2','P4']);
  assert.match(model.groups[1].choice,/Se elige P4.*t=1/);
  assert.deepEqual(model.averages.map(a=>[a.symbol,a.sum,a.count,a.value]),[
    ['TE',9,4,2.25],['TR',20,4,5],['TS',9,4,2.25]
  ]);
  assert.ok(html.includes('TF − TL = 8 − 2 = 6 u'));
  assert.ok(html.includes('TR − CPU − E/S = 6 − 1 − 0 = 5 u'));
  assert.ok(html.includes('TE promedio = (0 + 5 + 3 + 1) / 4 = 9 / 4 = 2.25 u'));
  assert.ok(html.includes('(TTU / TTT) × 100 = (11 / 11) × 100 = 100 %'));
  assert.deepEqual(model.switches,[
    {t:2,from:'P1',to:'P4'},{t:7,from:'P4',to:'P2'},{t:8,from:'P2',to:'P3'}
  ]);
});

test('SRTF explica la interrupción con valores anteriores a consumir CPU',()=>{
  const sim=E.simulation([{id:'P1',arrival:0,burst:8},{id:'P2',arrival:1,burst:4},{id:'P3',arrival:2,burst:2}],'srtf');
  const groups=S.build(sim).groups;
  assert.deepEqual(groups[1].step.decision.candidates.map(p=>[p.id,p.remaining]),[['P1',7],['P2',4]]);
  assert.match(groups[1].choice,/min\(7, 4\) = 4 u/);
  assert.match(groups[2].choice,/min\(7, 3, 2\) = 2 u/);
  assert.equal(groups[1].remaining,3);
  // La instantánea no cambia al finalizar la simulación.
  assert.equal(sim.steps[0].decision.candidates[0].remaining,8);
});

test('Round Robin muestra el orden real: nuevas llegadas antes del proceso reencolado',()=>{
  const sim=E.simulation([{id:'P1',arrival:0,burst:4},{id:'P2',arrival:2,burst:1}],'rr',{quantum:2});
  const groups=S.build(sim).groups;
  assert.deepEqual(groups[1].step.decision.queue,['P2','P1']);
  assert.match(groups[1].choice,/min\(1, 2\) = 1 u/);
  assert.deepEqual(groups.map(g=>[g.step.id,g.start,g.end]),[['P1',0,2],['P2',2,3],['P1',3,5]]);
});

test('Round Robin distingue los turnos aunque solo quede un proceso en el Gantt',()=>{
  const sim=E.simulation([{id:'P1',arrival:0,burst:5}],'rr',{quantum:2});
  assert.equal(sim.segments.length,1);
  assert.deepEqual(S.build(sim).groups.map(g=>[g.start,g.end,g.remaining]),[[0,2,3],[2,4,1],[4,5,0]]);
  assert.equal(sim.steps[1].decision.turnUsed,1);
  assert.equal(sim.steps[2].decision.turnUsed,0);
});

test('SJF y prioridades justifican su elección entre los procesos disponibles',()=>{
  const rows=[{id:'P1',arrival:0,burst:5,priority:3},{id:'P2',arrival:0,burst:2,priority:1}];
  assert.match(S.build(E.simulation(rows,'sjf')).groups[0].choice,/min\(5, 2\) = 2 u/);
  assert.match(S.build(E.simulation(rows,'priority')).groups[0].choice,/min\(3, 1\) = prioridad 1/);
});

test('La solución explica la inactividad y descuenta E/S de la espera',()=>{
  const sim=E.simulation([{id:'P1',arrival:2,burst:4,ioAt:2,ioDuration:2}],'fcfs');
  const model=S.build(sim),html=S.render(sim,E.COLORS);
  assert.equal(model.groups[0].step.id,null);
  assert.equal(model.groups[0].end,2);
  assert.match(model.groups[0].choice,/Ningún proceso está listo/);
  assert.ok(html.includes('TR − CPU − E/S = 6 − 4 − 2 = 0 u'));
  assert.ok(html.includes('(TTU / TTT) × 100 = (4 / 8) × 100 = 50 %'));
  assert.equal(model.switches.length,0);
});

test('Los identificadores se muestran como texto en las soluciones',()=>{
  const sim=E.simulation([{id:'<img src=x>',arrival:0,burst:1}],'fcfs');
  const html=S.render(sim,E.COLORS);
  assert.ok(html.includes('&lt;img src=x&gt;'));
  assert.ok(!html.includes('<img src=x>'));
});
