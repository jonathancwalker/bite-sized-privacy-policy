import { CASES } from './benchmark.mjs';
import { intelligentDecompose } from './llm-decompose.mjs';
const model=process.argv.includes('--model')?process.argv[process.argv.indexOf('--model')+1]:undefined;
const selected=process.argv.includes('--case')?CASES.filter(c=>c.id===process.argv[process.argv.indexOf('--case')+1]):CASES;
for(const item of selected){
  const result=await intelligentDecompose({text:item.text,title:item.id},{model});
  console.log(JSON.stringify({case:item.id,model:result.model,status:result.status,claims:result.claims.map(({unitId,claim,sourceQuote,contextQuote,qualifiers,validationFlags})=>({unitId,claim,sourceQuote,contextQuote,qualifiers,validationFlags})),rejected:result.rejected,failures:result.failures,unclaimedUnitIds:result.unclaimedUnitIds},null,2));
}
