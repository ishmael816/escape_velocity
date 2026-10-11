// Real engine, random markets, shared seeds; this heuristic comparison is not a human balance claim.
import fs from 'node:fs';import * as E from '../src/engine.js';import {getCard} from '../src/cards.js';
const slots=()=>Array.from({length:21},(_,i)=>({day:Math.floor(i/3),period:i%3}));
function target(g,p,c){return slots().filter(s=>!E.canPlace(g,p,c.uid,s)).sort((a,b)=>{
 const score=s=>(s.period===2?20:0)+(E.workType(p,s)?g.inspection.inspectionCount*3:0)+s.day*.1;
 return score(a)-score(b);
})[0];}
function basic(g){const p=g.players[E.activeBuyer(g)];if(p.escaped){E.pass(g,p.id);return;}
 for(const c of E.unplacedCards(p)){const s=target(g,p,c);if(s){E.place(g,p.id,c.uid,s);return;}}
 const income=E.preview(g,p.id).income,sanity=E.sanityState(g,p).value;
 const candidates=Object.values(g.market).flat().filter(c=>{const d=getCard(c);return !d.once&&!d.requires&&!d.professional&&(d.income||d.support)&&p.money>=d.price.money+(d.capital||0)+E.supportPlan(g,p).filter(x=>x.active).reduce((s,x)=>s+x.fee,0)+(d.upkeep||0);});
 const value=c=>{const d=getCard(c);if(d.support)return sanity<6?30+d.support/(d.upkeep||1):0;return income<10?10+d.fixedProfit/(d.price.money+(d.capital||0)):0;};
 candidates.sort((a,b)=>value(b)-value(a));
 if(candidates.length&&value(candidates[0])>0&&E.unplacedCards(p).length<2){E.buy(g,p.id,candidates[0].uid);return;}
 E.pass(g,p.id);
}
const games=[];
for(const playerCount of [2,3,4])for(const seed of [7,42,20261009])for(let basicSeat=0;basicSeat<playerCount;basicSeat++){
 const g=E.createGame({playerCount,seed});g.players.forEach(p=>p.bot=true);const snapshots=[];
 while(g.phase!=='ended'&&g.week<=35){
  while(g.phase==='planning'){if(E.activeBuyer(g)===basicSeat)basic(g);else E.botAct(g);}
  while(g.phase==='resolving'){E.resolveAll(g);if(g.opportunity)E.botOpportunity(g);}
  snapshots.push({week:g.week,steps:g.timeline.length,players:g.players.map(p=>({id:p.id,income:p.income,sanity:p.sanity,cash:p.money,skills:E.skillCounts(p),scheduled:Object.values(p.schedule).flat().length,maintenance:(p.supports||[]).filter(x=>x.active).reduce((n,x)=>n+x.fee,0)}))});
  for(const p of g.players){E.botDraft(g,p.id);if(!Object.hasOwn(g.escapeDecisions,p.id))E.chooseEscape(g,p.id);if(!Number.isFinite(p.money)||p.money<0||!Number.isFinite(p.sanity))throw Error('Invalid resources');}
  E.closeWeek(g);
 }
 const basicPlayer=g.players[basicSeat];if(Object.values(E.skillCounts(basicPlayer)).some(Boolean))throw Error('Basic policy gained skills');
 games.push({playerCount,seed,basicSeat,ended:g.phase==='ended',weeks:g.history.length,basicEscape:basicPlayer.escapedWeek,escapeWeeks:g.players.map(p=>p.escapedWeek),snapshots});
}
const report={note:'27 real-engine mixed-policy games. One cheap-repeat zero-skill policy versus the existing growth-oriented heuristic, with seat rotation. Not optimal strategies or human win rates. A 35-week watchdog is a test bound, not a game rule.',games};
fs.writeFileSync('docs/strategy-comparison-v0.22.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({games:games.length,ended:games.filter(g=>g.ended).length,basicEscaped:games.filter(g=>g.basicEscape).length,basicFirstOrTied:games.filter(g=>g.basicEscape&&g.basicEscape===Math.min(...g.escapeWeeks.filter(Boolean))).length,weeks:[Math.min(...games.map(g=>g.weeks)),Math.max(...games.map(g=>g.weeks))],timeouts:games.filter(g=>!g.ended).map(g=>({players:g.playerCount,seed:g.seed,basicSeat:g.basicSeat}))},null,2));
