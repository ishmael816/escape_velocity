import * as E from '../src/engine.js';
import {getCard} from '../src/cards.js';
import {mkdirSync,writeFileSync} from 'node:fs';

// Read-only audit of the first four weeks. Extra salary is a comparison, not a rule change.
const rows=[],actions=[];
for(const salary of [3,4])for(const playerCount of [2,3,4])for(const seed of [7,42,20261009,1,2,3,4,5,6,8,9,10]){
 const g=E.createGame({salary,playerCount,seed});g.players.forEach(p=>p.bot=true);
 while(g.week<=4&&g.phase!=='ended'){
  const base={salary,playerCount,seed,week:g.week};
  const stats=g.players.map(p=>({...base,player:p.id,startMoney:p.money,buy:0,arrange:0,pass:0,passWithoutAffordableMarket:0,passWithoutAffordableMarketOrHandPlacement:0}));
  while(g.phase==='planning'){
   const p=g.players[E.activeBuyer(g)],row=stats[p.id],money=p.money,day=g.day,logStart=g.logs.length;
   const affordable=Object.values(g.market).flat().filter(c=>E.canPay(p,getCard(c).price)).length;
   const handPlace=E.unplacedCards(p).some(c=>Array.from({length:21},(_,i)=>({day:Math.floor(i/3),period:i%3})).some(s=>!E.canPlace(g,p,c.uid,s)));
   E.botAct(g);
   const text=g.logs.slice(logStart).filter(l=>l.player===p.id).map(l=>l.text).join(' ');
   const kind=text.includes('躺平：')?'pass':text.includes('购买「')||text.includes('启动信用项目')?'buy':'arrange';
   row[kind]++;if(kind==='pass'&&!affordable){row.passWithoutAffordableMarket++;if(!handPlace)row.passWithoutAffordableMarketOrHandPlacement++;}
   actions.push({...base,player:p.id,day,money,kind,affordable,handPlace,text});
  }
  while(g.phase==='resolving'){E.resolveAll(g);if(g.opportunity)E.botOpportunity(g);}
  for(const p of g.players){E.botDraft(g,p.id);if(!Object.hasOwn(g.escapeDecisions,p.id))E.chooseEscape(g,p.id);Object.assign(stats[p.id],{endMoney:p.money,income:p.income,sanity:p.sanity,caught:p.caught});}
  rows.push(...stats);E.closeWeek(g);
 }
}
const summary=[];
for(const salary of [3,4])for(const week of [1,2,3,4]){
 const r=rows.filter(r=>r.salary===salary&&r.week===week),avg=k=>+(r.reduce((n,r)=>n+r[k],0)/r.length).toFixed(2);
 summary.push({salary,week,playerWeeks:r.length,averageBuy:avg('buy'),averageArrange:avg('arrange'),averagePass:avg('pass'),averageEndMoney:avg('endMoney'),averageIncome:avg('income'),allPassWeeks:r.filter(r=>r.pass===7).length,passes:r.reduce((n,r)=>n+r.pass,0),passesWithoutAffordableMarket:r.reduce((n,r)=>n+r.passWithoutAffordableMarket,0),passesWithoutAffordableMarketOrHandPlacement:r.reduce((n,r)=>n+r.passWithoutAffordableMarketOrHandPlacement,0)});
}
const report={note:'Heuristic bots, 36 games per salary, first four weeks only. No affordable public card and no legal unplaced-hand placement is a liquidity indicator, not proof of forced passing: moving/removing scheduled cards, personal projects and card desirability are not evaluated by this classification.',summary,rows,actions};
mkdirSync('tmp',{recursive:true});
writeFileSync('tmp/opening-economy-v0.15.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
