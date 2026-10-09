// Adversarial public-information policy: player 0 never buys skills or advanced cards.
import * as E from '../src/engine.js';
import {getCard} from '../src/cards.js';
import {writeFileSync} from 'node:fs';
const slots=Array.from({length:21},(_,i)=>({day:Math.floor(i/3),period:i%3}));
const runs=[];
function target(g,p,c){return slots.filter(s=>!E.canPlace(g,p,c.uid,s)&&!E.inspected(g,p,s)).sort((a,b)=>(a.day*3+a.period+(a.period===2?12:0))-(b.day*3+b.period+(b.period===2?12:0)))[0];}
function act(g){
 const p=g.players[0],defs=p.cards.map(getCard),income=defs.reduce((n,d)=>n+(d.income?d.gain.money:0),0),supply=defs.reduce((n,d)=>n+(d.gain.inspiration||0),0),demand=defs.reduce((n,d)=>n+(d.cost.inspiration||0),0),recovery=defs.reduce((n,d)=>n+(d.gain.sanity||0),0);
 for(const c of p.cards){const old=E.findPlacement(p,c.uid);if(old&&old.day>=g.day&&(E.inspected(g,p,old)||E.eventBlocksSlot(g,p,old))){const t=target(g,p,c);if(t)E.place(g,0,c.uid,t);else E.unplace(g,0,c.uid);return;}}
 const hand=E.unplacedCards(p).sort((a,b)=>{const v=c=>getCard(c).gain.sanity?30:getCard(c).gain.inspiration?20:10;return v(b)-v(a);});
 for(const c of hand){const t=target(g,p,c);if(t){E.place(g,0,c.uid,t);return;}}
 const value=c=>{const d=getCard(c);if(d.tier==='advanced'||d.once||d.skill||d.draft||d.unlockWeekend)return -1;
  if(d.gain.sanity)return recovery<2?40-(d.price.money||0)-(d.cost.money||0)*3: -1;
  if(d.gain.inspiration)return supply<demand+2?30+d.gain.inspiration-(d.cost.money||0)*2:-1;
  if(d.income)return income<=24?25+d.gain.money/(d.price.money||1): -1;return -1;};
 const offers=Object.values(g.market).flat().filter(c=>value(c)>0&&E.canPay(p,getCard(c).price)).sort((a,b)=>value(b)-value(a));
 if(g.day<6&&hand.length<2&&offers.length){E.buy(g,0,offers[0].uid);return;}
 if(p.money<12||income>24&&supply>=demand){E.pass(g,0);return;}
 const lane=supply<demand+2?'2':income<=24?'2':'1';const bad=[...g.market[lane]].sort((a,b)=>value(a)-value(b))[0];if(bad)E.refresh(g,0,bad.uid);else E.pass(g,0);
}
for(let seed=1;seed<=100;seed++){
 const g=E.createGame({playerCount:3,seed}),actions=[],weeks=[];
 while(g.phase!=='ended'&&g.week<=35){
  while(g.phase==='planning'){const id=E.activeBuyer(g),start=g.logs.length,day=g.day;if(id===0)act(g);else E.botAct(g);if(id===0&&seed===42)actions.push({week:g.week,day,logs:g.logs.slice(start)});}
  E.resolveAll(g);weeks.push({week:g.week,income:g.players[0].income,sanity:g.players[0].sanity,money:g.players[0].money,schedule:Object.values(g.players[0].schedule).flat().length});
  for(const p of g.players){E.botDraft(g,p.id);if(!Object.hasOwn(g.escapeDecisions,p.id))E.chooseEscape(g,p.id);}E.closeWeek(g);
 }
 runs.push({seed,ended:g.phase==='ended',length:weeks.length,escaped:g.players[0].escaped,escapeWeek:g.players[0].escapedWeek,cards:g.players[0].cards.map(c=>c.type),skills:g.players[0].skills.length,weeks,actions:seed===42?actions:undefined});
}
const escaped=runs.filter(r=>r.escaped),times=escaped.map(r=>r.escapeWeek).sort((a,b)=>a-b);
const summary={games:runs.length,ended:runs.filter(r=>r.ended).length,escapedWithoutSkills:escaped.length,escapeWeek:{min:times[0],median:times[Math.floor(times.length/2)],max:times.at(-1)},example:runs.find(r=>r.seed===42)};
writeFileSync('docs/basic-route-audit-2026-10-09.json',JSON.stringify({method:'Player 0 uses only basic repeatable cards with duplicates allowed, against two built-in bots; public information only, seeds 1..100. Policy is heuristic, not optimal.',summary,runs},null,2)+'\n');
console.log(JSON.stringify({...summary,example:{...summary.example,actions:undefined}},null,2));
