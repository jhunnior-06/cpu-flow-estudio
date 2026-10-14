const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../scheduler.js');
const S=require('../study.js');

test('Los cinco ejemplos del material reproducen los Gantt y promedios comprobados',()=>{
  const expected={
    fcfs:{segments:['A 0-4','B 4-7','C 7-9'],wait:7/3,ret:16/3,useful:9},
    priority:{segments:['A 0-4','C 4-6','B 6-9'],wait:2,ret:5,useful:9},
    sjf:{segments:['A 0-4','C 4-6','B 6-9'],wait:2,ret:5,useful:9},
    rr:{segments:['A 0-2','B 2-4','A 4-5','C 5-7','B 7-9','C 9-11','D 11-13','B 13-15'],wait:3.75,ret:7.5,useful:15},
    srtf:{segments:['A 0-3','B 3-4','C 4-8','D 8-10','B 10-15'],wait:1.75,ret:5.5,useful:15}
  };
  for(const example of S.examples){
    const sim=E.simulation(example.rows,example.id,{quantum:example.quantum||2}),want=expected[example.id];
    assert.deepEqual(sim.segments.map(s=>`${s.id} ${s.start}-${s.end}`),want.segments);
    assert.equal(sim.metrics.waiting,want.wait);
    assert.equal(sim.metrics.turnaround,want.ret);
    const total=S.paperTotals(sim);
    assert.equal(total.useful,want.useful);
    assert.equal(total.elapsed,want.useful);
    assert.equal(total.efficiency,100);
    assert.equal(total.lost,0);
  }
  const rr=S.examples.find(e=>e.id==='rr');
  assert.equal(E.simulation(rr.rows,'rr',{quantum:2}).results.find(r=>r.id==='C').turnaround,7);
});

test('TTT del material parte de la primera llegada y conserva la inactividad intermedia',()=>{
  const sim=E.simulation([{id:'A',arrival:2,burst:2},{id:'B',arrival:8,burst:1}],'fcfs');
  const total=S.paperTotals(sim);
  assert.equal(total.start,2);
  assert.equal(total.finish,9);
  assert.equal(total.elapsed,7);
  assert.equal(total.useful,3);
  assert.equal(total.efficiency,3/7*100);
  assert.equal(sim.metrics.ttT,9);
});
