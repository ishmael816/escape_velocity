// Public-information counter-strategy: no skills, advanced cards, or search activities.
import * as E from '../src/engine.js';
import {getCard} from '../src/cards.js';
import {hours} from '../src/card-visuals.js';
import {writeFileSync} from 'node:fs';
const slots=Array.from({length:21},(_,i)=>({day:Math.floor(i/3),period:i%3}));
function target(g,p,c){return slots.filter(s=>!E.canPlace(g,p,c.uid,s)&&!E.activityDanger(g,p,c,s)).sort((a,b)=>{const v=s=>s.day*3+s.period+(s.period===2&&hours(getCard(c).size)>2?100:0);return v(a)-v(b);})[0];}
function act(g){
 const p=g.players[0];if(p.escaped){E.pass(g,0);return;}
 const defs=p.cards.map(getCard),income=defs.reduce((n,d)=>n+(d.income?d.gain.money:0),0),supply=defs.reduce((n,d)=>n+(!d.once?(d.gain.inspiration||0):0),0),demand=defs.reduce((n,d)=>n+(d.cost.inspiration||0),0);
 for(const c of p.cards){const old=E.findPlacement(p,c.uid);if(old&&old.day>=g.day&&E.activityDanger(g,p,c,old)){const t=target(g,p,c);if(t)E.place(g,0,c.uid,t);else E.unplace(g,0,c.uid);return;}}
 const priority=c=>getCard(c).gain.sanity?40:getCard(c).gain.inspiration?30:20;
 const hand=E.unplacedCards(p).sort((a,b)=>priority(b)-priority(a));
 for(const c of hand){const t=target(g,p,c);if(t){E.place(g,0,c.uid,t);return;}}
 const value=c=>{const d=getCard(c);if(d.tier==='advanced'||d.skill||d.draft||d.unlockWeekend)return -1;
  if(d.gain.sanity)return p.sanity<5&&!defs.some(x=>x.gain.sanity)?40+d.gain.sanity*2-d.price.money-(d.cost.money||0):-1;
  if(d.gain.inspiration&&!d.once)return supply<demand+1?30+d.gain.inspiration-(d.cost.money||0)*2:-1;
  if(d.income)return income<=g.config.escapeIncome+2?20+d.gain.money/d.price.money:-1;return -1;};
 const offers=Object.values(g.market).flat().filter(c=>value(c)>0&&E.canPay(p,getCard(c).price)).sort((a,b)=>value(b)-value(a));
 if(g.day<6&&hand.length<2&&offers.length){E.buy(g,0,offers[0].uid);return;}
 if(p.money<12){E.pass(g,0);return;}
 const lane=p.sanity<4?'4':supply<demand+1?'4':income<=g.config.escapeIncome?'8':['2','4','8'][(g.day+g.week)%3];
 const worst=[...g.market[lane]].sort((a,b)=>value(a)-value(b))[0];if(worst)E.refresh(g,0,worst.uid);else E.pass(g,0);
}
const runs=[];
for(let seed=1;seed<=100;seed++){
 const g=E.createGame({playerCount:3,seed});const weeks=[];
 while(g.phase!=='ended'&&g.week<=35){while(g.phase==='planning'){if(E.activeBuyer(g)===0)act(g);else E.botAct(g);}E.resolveAll(g);weeks.push({week:g.week,income:g.players[0].income,sanity:g.players[0].sanity,cards:Object.values(g.players[0].schedule).flat().length});for(const p of g.players){E.botDraft(g,p.id);if(!Object.hasOwn(g.escapeDecisions,p.id))E.chooseEscape(g,p.id);}E.closeWeek(g);}
 runs.push({seed,ended:g.phase==='ended',escaped:g.players[0].escaped,escapeWeek:g.players[0].escapedWeek,weeks,cards:g.players[0].cards.map(c=>c.type),skills:g.players[0].skills.length});
}
const times=runs.filter(r=>r.escaped).map(r=>r.escapeWeek).sort((a,b)=>a-b);
const report={method:'Player 0 builds basic repeats with duplicates and one-shot recovery, against two default bots, 100 seeds. No skills/advanced/search cards. Heuristic, not optimal.',summary:{games:100,ended:runs.filter(r=>r.ended).length,escaped:times.length,escapeWeek:{min:times[0],median:times[Math.floor(times.length/2)],max:times.at(-1)}},runs};
writeFileSync('docs/basic-route-audit-v0.8.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary,null,2));
