const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../scheduler.js');
const names = result => result.segments.map(s=>`${s.label} ${s.start}-${s.end}`);

test('FCFS conserva el orden de llegada y calcula espera y retorno', () => {
  const r=E.simulation([{id:'P1',arrival:0,burst:4},{id:'P2',arrival:1,burst:3},{id:'P3',arrival:2,burst:2}], 'fcfs');
  assert.deepEqual(names(r), ['P1 0-4','P2 4-7','P3 7-9']);
  assert.deepEqual(r.results.map(x=>x.wait), [0,3,5]);
  assert.deepEqual(r.results.map(x=>x.turnaround), [4,6,7]);
  assert.equal(r.metrics.cpu,100);
});

test('SJF elige la ráfaga más corta disponible sin apropiación',()=>{
  const r=E.simulation([{id:'P1',arrival:0,burst:5},{id:'P2',arrival:1,burst:7},{id:'P3',arrival:1,burst:2}],'sjf');
  assert.deepEqual(names(r),['P1 0-5','P3 5-7','P2 7-14']);
});

test('SRTF interrumpe cuando llega el trabajo de menor tiempo restante',()=>{
  const r=E.simulation([{id:'P1',arrival:0,burst:8},{id:'P2',arrival:1,burst:4},{id:'P3',arrival:2,burst:2}],'srtf');
  assert.deepEqual(names(r),['P1 0-1','P2 1-2','P3 2-4','P2 4-7','P1 7-14']);
  assert.equal(r.results.find(x=>x.id==='P1').wait,6);
});

test('Round Robin respeta el quantum y cambia el Gantt al cambiarlo',()=>{
  const p=[{id:'P1',arrival:0,burst:4},{id:'P2',arrival:0,burst:3}];
  const a=E.simulation(p,'rr',{quantum:1});
  const b=E.simulation(p,'rr',{quantum:2});
  assert.deepEqual(names(a),['P1 0-1','P2 1-2','P1 2-3','P2 3-4','P1 4-5','P2 5-6','P1 6-7']);
  assert.deepEqual(names(b),['P1 0-2','P2 2-4','P1 4-6','P2 6-7']);
  assert.notDeepEqual(a.segments,b.segments);
});

test('Prioridades apropiativas interrumpen al aparecer mayor prioridad',()=>{
  const p=[{id:'P1',arrival:0,burst:5,priority:4},{id:'P2',arrival:2,burst:2,priority:1}];
  assert.deepEqual(names(E.simulation(p,'priorityp')),['P1 0-2','P2 2-4','P1 4-7']);
  assert.deepEqual(names(E.simulation(p,'priority')),['P1 0-5','P2 5-7']);
});

test('Inactividad inicial y E/S se muestran como estados separados',()=>{
  const r=E.simulation([{id:'P1',arrival:2,burst:4,ioAt:2,ioDuration:2}], 'fcfs');
  assert.deepEqual(names(r),['Inactiva 0-2','P1 2-4','Inactiva 4-6','P1 6-8']);
  assert.equal(r.results[0].wait,0);
  assert.equal(r.results[0].blocked,2);
});

test('EDF y RMS crean instancias periódicas y respetan el horizonte',()=>{
  const p=[{id:'P1',arrival:0,burst:1,period:3,deadline:2},{id:'P2',arrival:0,burst:1,period:5,deadline:4}];
  for (const algorithm of ['edf','rms']) {
    const r=E.simulation(p,algorithm,{horizon:12});
    assert.equal(r.steps.length,12);
    assert.equal(r.periodic,true);
    assert.ok(r.results.some(x=>x.label==='P1#2'));
    assert.ok(r.metrics.completed>0);
  }
});

test('Comparador entrega catorce algoritmos con resultados numéricos',()=>{
  const result=E.compare([{id:'P1',arrival:0,burst:2},{id:'P2',arrival:1,burst:1}],{quantum:2,horizon:12});
  assert.equal(result.length,14);
  assert.ok(result.every(x=>!x.error));
  assert.ok(result.every(x=>Number.isFinite(x.waiting)));
});

test('Valida valores enteros, procesos duplicados y quantum no válido',()=>{
  assert.throws(()=>E.simulation([{id:'P1',arrival:0,burst:0}]),/inválido/);
  assert.throws(()=>E.simulation([{id:'P1',burst:2},{id:'P1',burst:3}]),/único/);
  assert.throws(()=>E.simulation([{id:'P1',burst:2}],'rr',{quantum:0}),/Quantum/);
});

test('HRRN escoge la mayor relación de respuesta entre los procesos listos',()=>{
  const p=[{id:'P1',arrival:0,burst:4},{id:'P2',arrival:1,burst:7},{id:'P3',arrival:3,burst:2}];
  assert.deepEqual(names(E.simulation(p,'hrrn')),['P1 0-4','P3 4-6','P2 6-13']);
});

test('LJF favorece la ráfaga más larga cuando queda disponible la CPU',()=>{
  const p=[{id:'P1',arrival:0,burst:3},{id:'P2',arrival:0,burst:6},{id:'P3',arrival:0,burst:2}];
  assert.deepEqual(names(E.simulation(p,'ljf')),['P2 0-6','P1 6-9','P3 9-11']);
});

test('MLQ interrumpe la cola de prioridad baja si llega un proceso de cola alta',()=>{
  const p=[{id:'P1',arrival:0,burst:5,queue:1},{id:'P2',arrival:2,burst:2,queue:0}];
  assert.deepEqual(names(E.simulation(p,'mlq',{quantum:2})),['P1 0-2','P2 2-4','P1 4-7']);
});

test('Lotería genera la misma planificación si se repiten los mismos valores',()=>{
  const p=[{id:'P1',arrival:0,burst:5,priority:1},{id:'P2',arrival:0,burst:4,priority:3}];
  assert.deepEqual(E.simulation(p,'lottery').steps.map(s=>s.id),E.simulation(p,'lottery').steps.map(s=>s.id));
});

test('Al modificar llegadas o ráfagas se vuelve a calcular cada unidad sin valores fijos',()=>{
  const p=[{id:'P1',arrival:0,burst:4},{id:'P2',arrival:1,burst:2}];
  const original=E.simulation(p,'srtf');
  const distinto=E.simulation([{...p[0],burst:1},{...p[1],arrival:0}],'srtf');
  assert.notDeepEqual(original.segments,distinto.segments);
  assert.equal(distinto.steps.filter(s=>s.id!==null).length,3);
});