import test from 'node:test';import assert from 'node:assert/strict';
import {CASES,runBenchmark} from './benchmark.mjs';
test('fixtures cover conditions, exceptions, links and table presentation',async()=>{
  const report=await runBenchmark();
  assert.equal(report.cases.length,CASES.length);
  for(const row of report.cases){assert.equal(row.sourceFirst.sourceCoverage,true,row.id);assert.equal(row.sourceFirst.sourceOrder,true,row.id);assert.equal(row.sourceFirst.sourcePhraseRetention,row.sourceFirst.sourcePhraseTotal,row.id);}
  assert.equal(report.liveModelRun,false);
});
