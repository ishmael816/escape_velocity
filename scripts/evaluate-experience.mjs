// Same policies/seeds/seats for before/after comparisons. Uses only public
// actions and observable information; never changes ownership, resources or RNG.
import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
const arg=(name,fallback)=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:fallback;
const root=new URL(arg('--engine-root','../'),import.meta.url);
const E=await import(new URL('src/engine.js',root));
const {getCard}=await import(new URL('src/cards.js',root));
const seeds=arg('--seeds','7,42,20261009,1,2,3,11,23').split(',').map(Number);
const policies=['basic','W','A','B','C','mixed','repeat'];
const retiredCards=new WeakMap(); // Policy memory, never game resources/state.
const slots=Array.from({length:21},(_,i)=>({day:Math.floor(i/3),period:i%3}));
const scheduled=p=>Object.values(p.schedule).flat().length;
const fee=(g,p)=>E.supportPlan(g,p).filter(x=>x.active).reduce((n,x)=>n+x.fee,0);
const count=(p,t)=>p.cards.filter(c=>c.type===t).length;
const counts=p=>E.skillCounts(p);
function routes(policy,g){return 'WABC'.includes(policy)&&policy.length===1?policy:policy==='mixed'?'WABC':policy==='basic'&&g.week>=5?'A':'';}
function score(g,p,c,policy,prediction=E.preview(g,p.id)){
 const d=getCard(c),have=counts(p),growth=routes(policy,g),copies=count(p,c.type);
 if(d.skill){if(!growth.includes(d.skill)||p.skills.some(x=>x.type===c.type)||copies)return -100;
  const required=p.cards.some(x=>E.skillMissing(p,getCard(x)).includes(d.skill));
  return required?90:policy==='mixed'?(Object.values(have).reduce((a,b)=>a+b,0)<3?45:5):have[d.skill]<2?55:0;
 }
 if(d.opportunity)return copies||!growth||p.money<5?-100:12;
 if(d.hireFee)return -100; // Search/hiring correctness is tested separately.
 if(d.permanent)return d.unlockWeekend&&policy==='W'&&!p.weekend&&!copies?40:-100;
 if(d.professional)return -100;
 if(policy==='basic'||policy==='repeat'){if(d.requires&&[...d.requires].some(r=>!growth.includes(r)))return -100;}
 else if(policy!=='mixed'&&d.requires&&[...d.requires].some(r=>r!==policy))return -100;
 const missing=E.skillMissing(p,d).length;
 if(missing>0)return -100;
 if(d.support&&!d.income){
  const need=Math.max(0,6-E.sanityState(g,p).value);
  if(!need)return -100;
  return 38+Math.min(need,d.support)*3-d.upkeep*2-d.price.money;
 }
 if(!d.income)return -100;
 if(prediction.income>=12&&d.fixedProfit<=Math.min(...p.cards.filter(c=>E.findPlacement(p,c.uid)&&getCard(c).income).map(c=>getCard(c).fixedProfit)))return -100;
 const sanityGap=Math.max(0,6-(p.sanity+d.support-d.stress));
 const efficiency=d.fixedProfit/(d.price.money+d.capital*.6+d.upkeep*2);
 return 20+d.fixedProfit*4+efficiency*5+(d.advanced?8:0)-sanityGap*3+(policy==='repeat'&&copies?3:-copies*2);
}
function target(g,p,c){
 return slots.filter(s=>!E.canPlace(g,p,c.uid,s)&&!E.activityDanger(g,p,c,s)).sort((a,b)=>{
  const cost=s=>(s.period===2?18:0)+(E.workType(p,s)?g.inspection.inspectionCount*3:0)+s.day*.1;
  return cost(a)-cost(b);
 })[0];
}
function act(g,id,policy,record){
 const p=g.players[id],execute=(kind,fn)=>{const before=g.actionCount;fn();record(kind,g.actionCount-before);};
 if(!retiredCards.has(p))retiredCards.set(p,new Set());const retired=retiredCards.get(p);
 if(p.escaped){execute('pass',()=>E.pass(g,id));return;}
 if(p.protectionFrom<=g.week&&!p.actedThisWeek&&!p.protectionChosen){
  const s=slots.filter(s=>E.workType(p,s)&&E.cardsInSlot(p,s).some(c=>getCard(c).hours===4&&!getCard(c).professional)).sort((a,b)=>
   E.cardsInSlot(p,b).reduce((n,c)=>n+getCard(c).fixedProfit+getCard(c).support,0)-E.cardsInSlot(p,a).reduce((n,c)=>n+getCard(c).fixedProfit+getCard(c).support,0))[0];
  if(s)E.setProtection(g,id,s);
 }
 // Repair known team blocks; avoid pointless calendar changes for unknown rolls.
 for(const c of p.cards){const old=E.findPlacement(p,c.uid);if(old&&old.day>=g.day&&(E.activityDanger(g,p,c,old)||old.period===2&&p.sanity<6)){
  const s=target(g,p,c);if(s&&(old.period!==2||s.period!==2)){execute('move',()=>E.place(g,id,c.uid,s));return;}
 }}
 const prediction=E.preview(g,id);
 // Remove obsolete pressure only when the remaining board still qualifies.
 for(const c of p.cards){const old=E.findPlacement(p,c.uid),d=getCard(c);if(!old||old.day<g.day||!d.stress)continue;
  const q=structuredClone(g),r=q.players[id];r.schedule=Object.fromEntries(Object.entries(r.schedule).map(([k,a])=>[k,a.filter(x=>x!==c.uid)]).filter(([,a])=>a.length));E.syncSanity(q,r);
  const after=E.preview(q,id);if(after.income>=10&&((prediction.sanity<6&&after.sanity>prediction.sanity)||(after.sanity>=6&&prediction.income>10))){
   retired.add(c.uid);execute('withdraw',()=>E.unplace(g,id,c.uid));return;
  }
 }
 const hand=E.unplacedCards(p).filter(c=>!retired.has(c.uid)&&(!getCard(c).skill||!p.skills.some(x=>x.type===c.type))).sort((a,b)=>{
  const value=c=>{const d=getCard(c);return d.skill?100:d.support&&!d.income?90:d.advanced?80:d.permanent?70:50+d.fixedProfit*4+d.support*2-d.stress;};return value(b)-value(a);
 });
 for(const c of hand){const d=getCard(c);if(!E.qualified(p,d))continue;if(!d.once&&d.income&&prediction.income>=10&&prediction.sanity>=6)continue;
  const s=target(g,p,c);if(s){execute('place',()=>E.place(g,id,c.uid,s));return;}
 }
 // When a valuable upgrade has no space, retire a weaker activity; no free cash.
 for(const c of hand){const d=getCard(c);if(!d.income||!E.qualified(p,d))continue;
  const weak=p.cards.filter(x=>{const old=E.findPlacement(p,x.uid),v=getCard(x);return old&&old.day>=g.day&&v.income&&v.fixedProfit<d.fixedProfit&&!v.support;}).sort((a,b)=>getCard(a).fixedProfit-getCard(b).fixedProfit)[0];
  if(weak){retired.add(weak.uid);execute('withdraw',()=>E.unplace(g,id,weak.uid));return;}
 }
 if(prediction.income>=10&&prediction.sanity>=6){execute('pass',()=>E.pass(g,id));return;}
 const candidates=Object.values(g.market).flat().filter(c=>p.money>=getCard(c).price.money+getCard(c).capital+getCard(c).upkeep+fee(g,p)).map(c=>({c,value:score(g,p,c,policy,prediction)}));
 // Optional direct growth purchase is evaluated only when implemented by engine.
 if(E.learningOffers)for(const c of E.learningOffers(g,id))if(p.money>=getCard(c).price.money+fee(g,p))candidates.push({c,value:score(g,p,c,policy,prediction),learn:true});
 candidates.sort((a,b)=>b.value-a.value);
 const chosen=candidates.find(x=>x.value>0&&(hand.length<2||getCard(x.c).skill));
 if(chosen){execute(chosen.learn?'learn':'buy',()=>chosen.learn?E.learn(g,id,chosen.c.type):E.buy(g,id,chosen.c.uid));return;}
 execute('pass',()=>E.pass(g,id));
}
const games=[];
for(const n of [2,3,4])for(const seed of seeds)for(const focal of policies)for(let seat=0;seat<n;seat++){
 const roster=Array.from({length:n},(_,i)=>i===seat?focal:policies[(policies.indexOf(focal)+i+1+seeds.indexOf(seed))%policies.length]);
 const g=E.createGame({playerCount:n,seed,mode:'hotseat'}),players=roster.map((policy,id)=>({id,policy,firstProjected:null,firstEligible:null,escaped:null,productiveIdle:0,longestIdle:0,consecutiveIdle:0,freeReorders:0,paidReorders:0,actions:[],weeks:[]}));
 const seen=new Map();let maxMarketAge=0,maxContinuousMarketAge=0;const marketSamples=[];let operations=0;
 const observe=()=>{const cards=Object.values(g.market).flat(),current=new Set(cards.map(c=>c.uid));for(const uid of seen.keys())if(!current.has(uid))seen.delete(uid);for(const uid of current)if(!seen.has(uid))seen.set(uid,g.week);maxContinuousMarketAge=Math.max(maxContinuousMarketAge,...[...seen.values()].map(w=>g.week-w+1));return Math.max(0,...cards.map(c=>g.week-(c.marketSince??seen.get(c.uid))+1));};
 while(g.phase!=='ended'&&g.week<=30){
  const events=players.map(()=>({productive:0,reorder:0,paidReorder:0}));observe();
  while(g.phase==='planning'){
   if(++operations>20000)throw Error('action watchdog: '+JSON.stringify({n,seed,focal,seat,week:g.week}));
   const id=E.activeBuyer(g),metrics=players[id],pred=E.preview(g,id);
   if(!g.players[id].escaped&&pred.income>=10&&pred.sanity>=6)metrics.firstProjected??=g.week;
   act(g,id,roster[id],(kind,cost)=>{metrics.actions.push({week:g.week,kind,cost});if(['buy','learn','place'].includes(kind))events[id].productive++;if(['move','withdraw'].includes(kind)){events[id].reorder++;events[id].paidReorder+=cost;}});
   maxMarketAge=Math.max(maxMarketAge,observe());
  }
  while(g.phase==='resolving'){
   E.resolveAll(g);if(g.opportunity){const q=g.opportunity,id=q.player,p=g.players[id];
    if(q.stage==='hire')E.chooseHire(g,id);else{
     if(q.stage==='lane')E.chooseOpportunityLane(g,id,[4,8].filter(l=>g.decks[l].length||g.discard[l].length).sort((a,b)=>(p.money>=5?b-a:a-b))[0]);
     const prediction=E.preview(g,id),options=g.opportunity.options.filter(c=>p.money>=getCard(c).price.money+getCard(c).capital+fee(g,p)).sort((a,b)=>score(g,p,b,roster[id],prediction)-score(g,p,a,roster[id],prediction));
     E.chooseOpportunity(g,id,options.length&&score(g,p,options[0],roster[id],prediction)>0?options[0].uid:null);
    }
   }
  }
  marketSamples.push({week:g.week,maxAge:observe()});
  for(const p of g.players){
   const m=players[p.id],e=events[p.id];if(!p.escaped){
    const qualifies=E.eligible(g,p);if(qualifies)m.firstEligible??=g.week;
    if(!e.productive&&!qualifies){m.productiveIdle++;m.consecutiveIdle++;m.longestIdle=Math.max(m.longestIdle,m.consecutiveIdle);}else m.consecutiveIdle=0;
    m.freeReorders+=e.reorder-e.paidReorder;m.paidReorders+=e.paidReorder;
    m.weeks.push({week:g.week,income:p.income,sanity:p.sanity,cash:p.money,skills:counts(p),cards:scheduled(p),advancedIncomeCards:p.cards.filter(c=>E.findPlacement(p,c.uid)&&getCard(c).advanced&&getCard(c).income).length,successfulGrowthIncomeCards:p.weeklyEarnings.filter(x=>x.profit>0&&getCard(x).requires.length>=2).length,growthIncome:p.weeklyEarnings.filter(x=>getCard(x).requires.length>=2).reduce((n,x)=>n+x.profit,0),maintenance:(p.supports||[]).filter(x=>x.active).reduce((a,x)=>a+x.fee,0),productive:e.productive,reorders:e.reorder,paidReorders:e.paidReorder,event:g.inspection.kind});
   }
   if(!p.escaped&&!Object.hasOwn(g.escapeDecisions,p.id))E.chooseEscape(g,p.id,true);
   for(const key of ['money','sanity'])if(!Number.isFinite(p[key])||p[key]<0)throw Error('invalid resources');
  }
  E.closeWeek(g);for(const p of g.players)players[p.id].escaped=p.escapedWeek;
 }
 const escaped=players.filter(p=>p.escaped),first=Math.min(...escaped.map(p=>p.escaped)),winners=escaped.filter(p=>p.escaped===first);
 for(const m of players){m.winShare=winners.includes(m)?1/winners.length:0;m.final= m.weeks.at(-1);m.censored=!m.escaped&&g.phase==='ended';if(!m.escaped)m.failure={hand:E.unplacedCards(g.players[m.id]).map(c=>c.type),board:Object.values(g.players[m.id].schedule).flat().map(uid=>E.cardAt(g.players[m.id],uid).type),market:Object.values(g.market).flat().map(c=>c.type)};}
 games.push({n,seed,focal,seat,roster,ended:g.phase==='ended',weeks:g.history.length,maxMarketAge,maxContinuousMarketAge,marketSamples,players});
 if(games.length%25===0)console.error('completed '+games.length+' games');
}
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const percentile=(a,q)=>a.length?[...a].sort((a,b)=>a-b)[Math.min(a.length-1,Math.floor(a.length*q))]:null;
const all=games.flatMap(g=>g.players.map(p=>({...p,n:g.n}))),summary=Object.fromEntries(policies.map(policy=>{
 const ps=all.filter(p=>p.policy===policy),escaped=ps.filter(p=>p.escaped),two=ps.filter(p=>p.n===2);
 return [policy,{samples:ps.length,escaped:escaped.length,censored:ps.filter(p=>p.censored).length,unresolved:ps.filter(p=>!p.escaped&&!p.censored).length,firstShare2p:mean(two.map(p=>p.winShare)),escapeWeekMean:mean(escaped.map(p=>p.escaped)),escapeWeekP90:percentile(escaped.map(p=>p.escaped),.9),cardsMean:mean(escaped.map(p=>p.final.cards)),maintenanceMean:mean(escaped.map(p=>p.final.maintenance)),idleWeeksMean:mean(ps.map(p=>p.productiveIdle)),longestIdleP90:percentile(ps.map(p=>p.longestIdle),.9),reordersMean:mean(ps.map(p=>p.freeReorders+p.paidReorders)),paidReordersMean:mean(ps.map(p=>p.paidReorders))}];
}));
const report={schema:2,note:'Policy v2 permits useful duplicate cards for every policy. Basic prioritises zero-skill for four weeks then can grow A; repeat never grows. Display age resets on re-admission; continuous UID age can be longer when finite pools are exhausted. N-1 censors the last player; unresolved means watchdog, not loss. Policy probes are not human win rates.',seeds,totalGames:games.length,ended:games.filter(g=>g.ended).length,maxMarketAge:Math.max(...games.map(g=>g.maxMarketAge)),maxContinuousMarketAge:Math.max(...games.map(g=>g.maxContinuousMarketAge)),summary,games};
report.evaluatorRevision=5;report.engineRulesVersion=E.createGame().version;
report.uniqueConfigurations=new Set(games.map(g=>JSON.stringify([g.n,g.seed,g.roster]))).size;
report.endedBy24=games.filter(g=>g.ended&&g.weeks<=24).length;
report.note+=' Revision 5 also retires obsolete cards in policy memory, preventing immediately re-arranging what it just withdrew; permits multi-step pressure reduction. Same revision is used for both engines.';
const output=arg('--output','docs/experience-evaluation.json'),details=output.replace(/\.json$/,'-details.json.gz');
fs.writeFileSync(details,gzipSync(JSON.stringify(report),{level:9}));
const {games:fullGames,...header}=report;
fs.writeFileSync(output,JSON.stringify({...header,details:path.basename(details),failures:games.filter(g=>!g.ended).map(g=>({n:g.n,seed:g.seed,roster:g.roster,players:g.players.filter(p=>!p.escaped).map(({actions,weeks,...p})=>p)}))},null,2)+'\n');
console.log(JSON.stringify({games:report.totalGames,ended:report.ended,maxMarketAge:report.maxMarketAge,summary},null,2));
