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
function resolve(g,roster){
 while(g.phase==='resolving'){
  E.resolveAll(g);if(g.opportunity){const q=g.opportunity,id=q.player,p=g.players[id];
   if(q.stage==='hire')E.chooseHire(g,id);else{
    if(q.stage==='lane')E.chooseOpportunityLane(g,id,[4,8].filter(l=>g.decks[l].length||g.discard[l].length).sort((a,b)=>(p.money>=5?b-a:a-b))[0]);
    const prediction=E.preview(g,id),options=g.opportunity.options.filter(c=>p.money>=getCard(c).price.money+getCard(c).capital+fee(g,p)).sort((a,b)=>score(g,p,b,roster[id],prediction)-score(g,p,a,roster[id],prediction));
    E.chooseOpportunity(g,id,options.length&&score(g,p,options[0],roster[id],prediction)>0?options[0].uid:null);
   }
  }
 }
}
function run(n,seed,roster,{flexAfterIdle=false,capture=false}={}){
 const g=E.createGame({playerCount:n,seed,mode:'hotseat'}),idle=roster.map(()=>0),flex=roster.map(()=>false),weeks=[],snapshots=[];let operations=0;
 while(g.phase!=='ended'&&g.week<=30){
  if(capture)snapshots.push(structuredClone(g));
  const acts=roster.map(()=>[]),effective=roster.map((s,id)=>flex[id]?'mixed':s);
  while(g.phase==='planning'){
   if(++operations>20000)throw Error('watchdog');const id=E.activeBuyer(g);
   act(g,id,effective[id],(kind,cost)=>acts[id].push({kind,cost}));
  }
  resolve(g,effective);
  weeks.push({week:g.week,players:g.players.map(p=>({id:p.id,escaped:p.escaped,income:p.income,sanity:p.sanity,cash:p.money,skills:E.skillCounts(p),maintenance:(p.supports||[]).filter(x=>x.active).reduce((s,x)=>s+x.fee,0),cards:Object.values(p.schedule).flat().length,acts:acts[p.id],effective:effective[p.id]}))});
  for(const p of g.players){
   const useful=acts[p.id].some(a=>['buy','learn','place'].includes(a.kind));idle[p.id]=useful?0:idle[p.id]+1;
   if(flexAfterIdle&&roster[p.id]!=='mixed'&&roster[p.id]!=='repeat'&&idle[p.id]>=2)flex[p.id]=true;
   if(!Object.hasOwn(g.escapeDecisions,p.id))E.chooseEscape(g,p.id,true);
  }
  E.closeWeek(g);
 }
 const first=Math.min(...g.players.filter(p=>p.escaped).map(p=>p.escapedWeek)),winCount=g.players.filter(p=>p.escapedWeek===first).length;
 return {n,seed,roster,ended:g.phase==='ended',weeks,players:g.players.map(p=>({id:p.id,policy:roster[p.id],escaped:p.escapedWeek,winShare:p.escapedWeek===first?1/winCount:0,skills:E.skillCounts(p),cards:p.cards.map(c=>c.type),schedule:p.schedule})),flex,g:capture?g:undefined,snapshots:capture?snapshots:undefined};
}

const argv=(name,other)=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:other;
const selectedSeeds=argv('--seeds',seeds.join(',')).split(',').map(Number),output=argv('--output','screen.json'),outcomes=[];
const pairs=process.argv.includes('--all-pairs')?policies.flatMap((p,i)=>policies.slice(i+1).map(q=>[p,q])):['basic','W','A','B','C','repeat'].map(p=>['mixed',p]);
for(const pair of pairs)for(const seed of selectedSeeds)for(const seat of [0,1]){
 const roster=seat===0?pair:[...pair].reverse();outcomes.push({...run(2,seed,roster),mixedSeat:roster.indexOf('mixed')});
}
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const pct=a=>[...a].sort((a,b)=>a-b)[Math.min(a.length-1,Math.floor(a.length*.9))];
const summary={games:outcomes.length,ended:outcomes.filter(g=>g.ended).length,gameWeeksMean:mean(outcomes.map(g=>g.weeks.length)),mixedShare:mean(outcomes.filter(g=>g.mixedSeat>=0).map(g=>g.players[g.mixedSeat].winShare)),policies:{}};
for(const policy of ['basic','W','A','B','C','mixed','repeat']){
 const rows=outcomes.flatMap(g=>g.players.filter(p=>p.policy===policy).map(p=>{const weeks=g.weeks.map(w=>w.players[p.id]).filter((w,i)=>!p.escaped||g.weeks[i].week<=p.escaped);let longest=0,streak=0;for(const w of weeks){streak=!w.acts.some(a=>['buy','learn','place'].includes(a.kind))&&!(w.income>=10&&w.sanity>=6)?streak+1:0;longest=Math.max(longest,streak);}return {...p,last:weeks.at(-1),longest};})),escaped=rows.filter(p=>p.escaped);
 summary.policies[policy]={n:rows.length,escapeN:escaped.length,share:mean(rows.map(p=>p.winShare)),week:mean(escaped.map(p=>p.escaped)),cards:mean(escaped.map(p=>p.last.cards)),maintenance:mean(escaped.map(p=>p.last.maintenance)),idleP90:pct(rows.map(p=>p.longest))};
}
fs.writeFileSync(output,JSON.stringify(summary,null,2));fs.writeFileSync(output.replace('.json','-details.json.gz'),gzipSync(JSON.stringify(outcomes),{level:9}));console.log(JSON.stringify(summary,null,2));
