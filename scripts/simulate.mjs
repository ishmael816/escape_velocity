import * as E from '../src/engine.js';
import { writeFileSync } from 'node:fs';
const games=[];
for(const playerCount of [2,3,4])for(const seed of process.argv.includes('--matrix')?[7,42,20261009,1,2,3,4,5,6,8,9,10]:[7,42,20261009]){
 const g=E.createGame({playerCount,seed});g.players.forEach(p=>p.bot=true);
 let marketSignature=JSON.stringify(g.market),unchangedMarketWeeks=0,longestUnchangedMarketWeeks=0;
 const weeklyEconomy=[];
 while(g.phase!=='ended'&&g.week<=35){
  while(g.phase==='planning')E.botAct(g);
  while(g.phase==='resolving'){E.resolveAll(g);if(g.opportunity)E.botOpportunity(g);}
  weeklyEconomy.push({week:g.week,players:g.players.map(p=>({id:p.id,alreadyEscaped:p.escaped,money:p.money,income:p.income,sanity:p.sanity,supportFee:(p.supports||[]).filter(s=>s.active).reduce((n,s)=>n+s.fee,0),marketPurchases:g.logs.filter(l=>l.week===g.week&&l.player===p.id&&l.text.startsWith('购买「')).length}))});
  for(const p of g.players){E.botDraft(g,p.id);if(!Object.hasOwn(g.escapeDecisions,p.id))E.chooseEscape(g,p.id);}
  E.closeWeek(g);
  const nextMarket=JSON.stringify(g.market);unchangedMarketWeeks=nextMarket===marketSignature?unchangedMarketWeeks+1:0;marketSignature=nextMarket;longestUnchangedMarketWeeks=Math.max(longestUnchangedMarketWeeks,unchangedMarketWeeks);
  if(process.argv.includes('--verbose')&&playerCount===3&&seed===42)console.log(JSON.stringify({week:g.week,players:g.players.map(p=>({income:p.income,sanity:p.sanity,skills:E.skillCounts(p),hand:E.unplacedCards(p).map(c=>c.type),cards:p.cards.map(c=>c.type)}))}));
  for(const p of g.players)for(const k of ['money','sanity','inspiration'])if(!Number.isFinite(p[k])||p[k]<0)throw Error(`Invalid ${k}`);
 }
 games.push({startingHand:0,playerCount,seed,ended:g.phase==='ended',weeks:g.history.length,opportunities:g.opportunityHistory.length,opportunityPurchases:g.opportunityHistory.filter(x=>x.bought).length,opportunityRetries:g.opportunityHistory.filter(x=>x.retried).length,lastOpportunityWeek:g.opportunityHistory.at(-1)?.week??null,longestUnchangedMarketWeeks,escapeWeeks:g.players.map(p=>p.escapedWeek),cashAtEscape:g.players.map(p=>p.escapedWeek?g.history.find(w=>w.week===p.escapedWeek).players.find(x=>x.id===p.id).money:null),weeklyEconomy,averageSlots:+(g.history.reduce((n,w)=>n+w.steps,0)/g.history.length).toFixed(1),maxSlots:Math.max(...g.history.map(w=>w.steps)),income:g.history.at(-1).players.map(p=>p.income),lastSettlement:g.history.at(-1).players});
}
const report={note:'Heuristic bots verify legal progress, not human enjoyment, route balance or playtime. No fixed week cap exists in the game; 35 weeks is the test watchdog.',games};
const index=process.argv.indexOf('--output');if(index>=0)writeFileSync(process.argv[index+1],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(games.some(g=>!g.ended))process.exitCode=1;
