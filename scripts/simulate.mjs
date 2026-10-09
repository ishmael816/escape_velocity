import * as E from '../src/engine.js';
import { STARTERS } from '../src/cards.js';
import { writeFileSync } from 'node:fs';
const games=[];
for(const starterActivity of process.argv.includes('--matrix')?STARTERS:['A02'])for(const playerCount of [2,3,4])for(const seed of [7,42,20261009]){
 const g=E.createGame({starterActivity,playerCount,seed});g.players.forEach(p=>p.bot=true);
 while(g.phase!=='ended'&&g.week<=35){
  while(g.phase==='planning')E.botAct(g);
  E.resolveAll(g);
  for(const p of g.players){E.botDraft(g,p.id);if(!Object.hasOwn(g.escapeDecisions,p.id))E.chooseEscape(g,p.id);}
  E.closeWeek(g);
  if(process.argv.includes('--verbose')&&playerCount===3&&seed===42)console.log(JSON.stringify({week:g.week,players:g.players.map(p=>({income:p.income,sanity:p.sanity,skills:E.skillCounts(p),hand:E.unplacedCards(p).map(c=>c.type),cards:p.cards.map(c=>c.type)}))}));
  for(const p of g.players)for(const k of ['money','sanity','inspiration'])if(!Number.isFinite(p[k])||p[k]<0)throw Error(`Invalid ${k}`);
 }
 games.push({starterActivity,playerCount,seed,ended:g.phase==='ended',weeks:g.history.length,escapeWeeks:g.players.map(p=>p.escapedWeek),averageSlots:+(g.history.reduce((n,w)=>n+w.steps,0)/g.history.length).toFixed(1),maxSlots:Math.max(...g.history.map(w=>w.steps)),income:g.history.at(-1).players.map(p=>p.income)});
}
const report={note:'Heuristic bots verify legal progress, not human enjoyment, route balance or playtime. No fixed week cap exists in the game; 35 weeks is the test watchdog.',games};
const index=process.argv.indexOf('--output');if(index>=0)writeFileSync(process.argv[index+1],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(games.some(g=>!g.ended))process.exitCode=1;
