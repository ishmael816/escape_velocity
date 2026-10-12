// Usage: node scripts/evaluate-bot-conversion.mjs <checkout-root> <report.json> [--full]
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
const root=resolve(process.argv[2]), E=await import(pathToFileURL(resolve(root,'src/engine.js'))),{getCard}=await import(pathToFileURL(resolve(root,'src/cards.js')));
const seeds=process.argv.includes('--full')?[20261014,20261015,20261016,991,65537,90817,424242,71933]:[20261016];
const slots=Array.from({length:21},(_,i)=>({day:Math.floor(i/3),period:i%3}));
function actionable(g,p,c){const d=getCard(c);if(!d.income||p.cards.some(x=>x.type===c.type)||!E.qualified(p,d)||!E.canPay(p,d.price))return false;
 const clone=structuredClone(g),q=clone.players[p.id];q.money-=d.price.money;q.cards.push(structuredClone(c));
 return slots.some(s=>!E.canPlace(clone,q,c.uid,s)&&!E.activityDanger(clone,q,c,s));
}
const games=[];
for(const n of [2,3,4])for(const seed of seeds)for(const first of process.argv.includes('--full')?Array.from({length:n},(_,i)=>i):[0]){
 const g=E.createGame({playerCount:n,seed});g.players.forEach(p=>p.bot=true);g.first=first;
 const weeks=[],missed=[],decisions=[];
 while(g.phase!=='ended'&&g.week<=25){
  let guard=0;
  while(g.phase==='planning'){
   if(++guard>1000)throw Error('planning loop');
   const p=g.players[E.activeBuyer(g)],before=p.cards.map(c=>c.uid),skills=E.skillCounts(p),cash=p.money,week=g.week,day=g.day;
   const offers=Object.values(g.market).flat().filter(c=>actionable(g,p,c)).map(c=>c.type);
   const held=p.cards.map(c=>({type:c.type,missing:E.skillMissing(p,getCard(c))}));
   E.botAct(g);
   const bought=p.cards.find(c=>!before.includes(c.uid));
   if(bought){const row={week,day,seat:p.id,cash,skills,bought:bought.type,offers};decisions.push(row);const d=getCard(bought);if(d.skill&&offers.length&&!held.some(c=>c.missing.includes(d.skill)))missed.push(row);}
  }
  while(g.phase==='resolving'){E.resolveAll(g);if(g.opportunity)E.botOpportunity(g);}
  weeks.push({week:g.week,players:g.players.map(p=>({id:p.id,escaped:p.escaped,income:p.income,money:p.money,sanity:p.sanity,skills:E.skillCounts(p),cards:p.cards.map(c=>c.type),board:p.cards.filter(c=>E.findPlacement(p,c.uid)).map(c=>c.type)}))});
  for(const p of g.players){E.botDraft(g,p.id);if(!Object.hasOwn(g.escapeDecisions,p.id))E.chooseEscape(g,p.id);}
  E.closeWeek(g);
 }
 games.push({n,seed,first,ended:g.phase==='ended',escape:g.players.map(p=>p.escapedWeek),weeks,missed,decisions});
}
const milestones=games.flatMap(g=>g.weeks[0].players.map(p=>{const w=g.weeks.map(w=>({...w.players[p.id],week:w.week}));return{n:g.n,seed:g.seed,first:g.first,seat:p.id,firstIncome:w.find(x=>x.income>0)?.week??null,income5:w.find(x=>x.income>=5)?.week??null,income10:w.find(x=>x.income>=10)?.week??null,escape:g.escape[p.id],zeroAt4:!!w.find(x=>x.week===4&&!x.escaped&&x.income===0&&Object.values(x.skills).reduce((a,b)=>a+b,0)>=2)}}));
const mean=k=>{const a=milestones.filter(x=>x[k]!=null);return a.reduce((s,x)=>s+x[k],0)/a.length;};
const summary={games:games.length,ended:games.filter(g=>g.ended).length,missed:games.reduce((s,g)=>s+g.missed.length,0),players:milestones.length,zeroAt4:milestones.filter(x=>x.zeroAt4).length,firstIncome:mean('firstIncome'),income5:mean('income5'),income10:mean('income10'),escape:mean('escape'),maxWeeks:Math.max(...games.map(g=>g.weeks.length))};
writeFileSync(process.argv[3],JSON.stringify({note:'All built-in bots, public legal actions only. Rotated starting seat before first action. Not a replay of the human market path.',summary,milestones,games},null,2)+'\n');console.log(JSON.stringify(summary));

if(games.some(g=>!g.ended))process.exitCode=1;
