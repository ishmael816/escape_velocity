// Read-only gameplay audit: independent games, no app saves or balance changes.
import * as E from '../src/engine.js';
import {getCard} from '../src/cards.js';
import {writeFileSync} from 'node:fs';
const allSlots=Array.from({length:21},(_,i)=>({day:Math.floor(i/3),period:i%3}));
const games=[];
for(const playerCount of [2,3,4])for(let seed=1;seed<=100;seed++){
 const g=E.createGame({playerCount,seed});g.players.forEach(p=>p.bot=true);
 const weeks=[],firstAdvanced=Array(playerCount).fill(null),firstSkill=Array(playerCount).fill(null),actionLog=[];
 while(g.phase!=='ended'&&g.week<=35){
  const actions={buy:0,place:0,move:0,unplace:0,refresh:0,pass:0},before=g.logs.length;
  while(g.phase==='planning'){
   const id=E.activeBuyer(g),p=g.players[id],start=g.logs.length,day=g.day;
   E.botAct(g);
   const line=g.logs.slice(start).find(l=>l.player===id)?.text||'';
   const key=line.startsWith('购买')?'buy':line.startsWith('安排')?'place':line.startsWith('移动')?'move':line.startsWith('撤回')?'unplace':line.includes('刷新')?'refresh':'pass';
   actions[key]++;if(playerCount===3&&seed===42)actionLog.push({week:g.week,day,id,action:key,text:line});
  }
  const scheduled=g.players.map(p=>Object.values(p.schedule).flat().length),slots=g.timeline.length;
  const board=g.players.map(p=>allSlots.reduce((o,s)=>{const cards=E.cardsInSlot(p,s);if(!cards.length)return o;o[s.period===2?'night':E.workType(p,s)?'work':'free']+=cards.length;return o;},{night:0,work:0,free:0}));
  const advancedScheduled=g.players.map(p=>allSlots.flatMap(s=>E.cardsInSlot(p,s)).filter(c=>getCard(c).tier==='advanced').map(c=>c.type));
  const startResolve=g.logs.length;E.resolveAll(g);const resolveLogs=g.logs.slice(startResolve);
  g.players.forEach((p,i)=>{if(p.skills.length&&firstSkill[i]===null)firstSkill[i]=g.week;if(advancedScheduled[i].some(type=>resolveLogs.some(l=>l.player===i&&l.text.includes(getCard(type).name)&&!['warning','caught'].includes(l.tone)))&&firstAdvanced[i]===null)firstAdvanced[i]=g.week;});
  const resourceOps=resolveLogs.reduce((n,l)=>n+(l.text.match(/(?:资金|理智|灵感) [＋+−-]\d+/g)||[]).length,0);
  weeks.push({week:g.week,event:g.inspection.name,actions,scheduled,slots,board,resourceOps,warnings:resolveLogs.filter(l=>l.tone==='warning').length,caught:resolveLogs.filter(l=>l.tone==='caught').length,players:g.players.map(p=>({income:p.income,sanity:p.sanity,money:p.money,hand:E.unplacedCards(p).length,skills:E.skillCounts(p),upgrades:p.upgrades.length,weekend:p.weekend})),logs:playerCount===3&&seed===42?g.logs.slice(before):undefined});
  for(const p of g.players){E.botDraft(g,p.id);if(!Object.hasOwn(g.escapeDecisions,p.id))E.chooseEscape(g,p.id);}E.closeWeek(g);
 }
 games.push({playerCount,seed,ended:g.phase==='ended',length:weeks.length,escapeWeeks:g.players.map(p=>p.escapedWeek),firstSkill,firstAdvanced,final:g.players.map(p=>({id:p.id,escaped:p.escaped,sanity:p.sanity,money:p.money,weekend:p.weekend,upgrades:p.upgrades.map(c=>c.type),skills:E.skillCounts(p)})),weeks,actionLog:actionLog.length?actionLog:undefined});
}
const avg=a=>+(a.reduce((s,n)=>s+n,0)/a.length).toFixed(2);
const stat=a=>{const sorted=[...a].sort((a,b)=>a-b);return {n:a.length,min:sorted[0],median:sorted[Math.floor(sorted.length/2)],mean:avg(a),p90:sorted[Math.floor(sorted.length*.9)],max:sorted.at(-1)};};
const sumActions=rows=>rows.reduce((a,w)=>{for(const[k,v]of Object.entries(w.actions))a[k]=(a[k]||0)+v;return a;},{});
const summary=[2,3,4].map(n=>{const gs=games.filter(g=>g.playerCount===n),ws=gs.flatMap(g=>g.weeks),ps=gs.flatMap(g=>g.final);return {players:n,games:gs.length,ended:gs.filter(g=>g.ended).length,weeks:stat(gs.map(g=>g.length)),actions:sumActions(ws),week1Actions:sumActions(ws.filter(w=>w.week===1)),week2Actions:sumActions(ws.filter(w=>w.week===2)),scheduledTable:stat(ws.map(w=>w.scheduled.reduce((a,b)=>a+b,0))),finalScheduledTable:stat(gs.map(g=>g.weeks.at(-1).scheduled.reduce((a,b)=>a+b,0))),finalSlots:stat(gs.map(g=>g.weeks.at(-1).slots)),firstAdvanced:stat(gs.flatMap(g=>g.firstAdvanced).filter(x=>x!==null)),firstSkill:stat(gs.flatMap(g=>g.firstSkill).filter(x=>x!==null)),caught:ws.reduce((n,w)=>n+w.caught,0),warnings:ws.reduce((n,w)=>n+w.warnings,0),finalSanity:stat(ps.map(p=>p.sanity)),finalMoney:stat(ps.map(p=>p.money)),playersWithWeekend:ps.filter(p=>p.weekend).length,playersWithCore:ps.filter(p=>p.upgrades.length).length,board:ws.flatMap(w=>w.board).reduce((a,b)=>({work:a.work+b.work,night:a.night+b.night,free:a.free+b.free}),{work:0,night:0,free:0})};});
writeFileSync('docs/pacing-audit-v0.8.json',JSON.stringify({method:'300 heuristic-bot games, default nap starter, seeds 1..100 per player count. Counts describe this bot, not human behavior; timing is not measured.',summary,games},null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
