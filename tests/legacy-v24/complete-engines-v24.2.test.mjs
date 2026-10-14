import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {CARDS,ADVANCED,getCard,cardCopies} from '../src/cards.js';
import {make,add,skills,turn,finish,next,lock,seedFor} from './helpers.mjs';
import {offer,supplyIds,reload,unchanged} from './regression-helpers-v22.mjs';

for(const route of 'WABC')for(const level of [1,2])test(`${route}-G${level}: paid multiweek execution, final reward once, real supply and reload`,()=>{
 let g=make(),p=g.players[0];const ids=supplyIds(g),type=`${route}-G${level}`,d=getCard(type),uid=offer(g,type).uid;
 E.buy(g,0,uid);turn(g);E.place(g,0,uid,{day:4,period:0});
 assert.equal(p.money,6);assert.equal(p.sanity,3-d.stress);assert.equal(d.progressTarget,level===1?2:3);
 for(let n=1;n<=d.progressTarget;n++){
  const before=p.money;finish(g);assert.equal(p.money,before-1+3+(n===d.progressTarget?level-1:0));
  assert.equal(p.income,0);assert.deepEqual(supplyIds(g),ids);
  const c=[...p.cards,...p.skills].find(c=>c.uid===uid);assert.equal(c.progress,n);
  assert.equal(E.skillCounts(p)[route],n===d.progressTarget?1:0);
  assert.equal(!!E.findPlacement(p,uid),n<d.progressTarget);
  if(n<d.progressTarget){next(g);g=reload(g);p=g.players[0];}
 }
 assert.equal(p.sanity,3);const finalCash=p.money;next(g);finish(g);assert.equal(p.money,finalCash+3);assert.equal(p.skills.length,1);
});

test('growth cannot advance or charge when cash, sanity line or inspection prevents execution',()=>{
 for(const reason of ['cash','sanity','inspection']){
  const g=make({startMoney:reason==='cash'?0:8,startSanity:reason==='sanity'?2:3}),p=g.players[0],c=add(g,p,'A-G1');
  E.place(g,0,c.uid,{day:0,period:reason==='sanity'?2:0});
  if(reason==='inspection'){g.inspection.inspectionCount=1;g.diceRandom=seedFor([1]);}
  const before=p.money;finish(g);assert.equal(c.progress,undefined);assert.equal(p.skills.length,0);assert(E.findPlacement(p,c.uid));
  assert.equal(p.money,before+3-(reason==='inspection'?1:0));
 }
});

test('growth withdrawal preserves progress, refunds sanity impact but not fees already paid',()=>{
 const g=make(),p=g.players[0],c=add(g,p,'B-G2');E.place(g,0,c.uid,{day:4,period:0});finish(g);next(g);turn(g);
 const cash=p.money;E.unplace(g,0,c.uid);assert.equal(c.progress,1);assert.equal(p.money,cash);assert.equal(p.sanity,3);
 E.place(g,0,c.uid,{day:5,period:0});finish(g);assert.equal(c.progress,2);assert.equal(p.skills.length,0);
});

test('2/3/4 players share exactly the same 148-card physical supply',()=>{
 const defs=[...CARDS,...ADVANCED];assert.equal(defs.length,37);
 for(const n of [2,3,4]){
  const g=make({playerCount:n});assert.equal(supplyIds(g).length,148);
  assert.equal(g.market[4].length,8);assert.equal(g.market[8].length,4);
  for(const d of defs){assert.equal(cardCopies(d,n),4);assert.equal([...g.market[d.hours],...g.decks[d.hours]].filter(c=>c.type===d.id).length,4);}
 }
});

test('overtime is off-work-only, creates structural pressure and never escape income',()=>{
 const g=make(),p=g.players[0],c=add(g,p,'W-O');
 unchanged(g,()=>E.place(g,0,c.uid,{day:0,period:0}));
 E.place(g,0,c.uid,{day:0,period:2});assert.equal(p.sanity,0);finish(g);
 assert.equal(p.income,0);assert.equal(p.money,13);assert.equal(p.settlement.otherIncome,2);
 next(g);turn(g);E.unplace(g,0,c.uid);assert.equal(p.sanity,3);E.place(g,0,c.uid,{day:6,period:0});assert.equal(p.sanity,2);
});

test('overtime pauses if temporary Saturday holiday ends while card stays in that slot',()=>{
 const g=make(),p=g.players[0],c=add(g,p,'W-O');p.tempWeekend=true;
 E.place(g,0,c.uid,{day:5,period:0});finish(g);const money=p.money;next(g);assert.equal(p.tempWeekend,false);finish(g);
 assert.equal(p.money,money+3);assert.equal(p.settlement.otherIncome,0);assert(E.findPlacement(p,c.uid));
});

for(const [type,pattern,count,fee,markers]of [['W-Q','W',2,0,0],['A-Q','A',3,0,2],['B-Q','BB',3,0,0],['C-Q','C',4,1,0]])test(`${type}: repeated private search keeps source, pays printed fee, buys normally and preserves public market`,()=>{
 const g=make(),p=g.players[0];skills(p,pattern);p.inspirationSlots=Array.from({length:markers},(_,i)=>`${i}-2`);
 const c=add(g,p,type);E.place(g,0,c.uid,{day:4,period:0});
 const top=offer(g,'A-E');g.market[4]=g.market[4].filter(c=>c.uid!==top.uid);g.decks[4].push(top);
 g.mondayMarketBought=true;lock(g);const publicIds=g.market[4].map(c=>c.uid),money=p.money;
 E.resolveAll(g);assert.equal(g.opportunity.stage,'lane');assert.equal(p.money,money-fee);assert.equal(g.opportunity.count,count);
 E.chooseOpportunityLane(g,0,4);assert.equal(g.opportunity.options.length,count);assert.equal(g.opportunity.options[0].uid,top.uid);
 const clone=reload(g);E.chooseOpportunity(g,0,top.uid);E.chooseOpportunity(clone,0,top.uid);assert.deepEqual(clone,g);
 assert.equal(p.money,money-fee-getCard('A-E').price.money);assert.equal(E.findPlacement(p,top.uid),null);
 assert(E.findPlacement(p,c.uid));assert.deepEqual(g.market[4].map(c=>c.uid),publicIds);assert(!p.skills.some(x=>x.uid===c.uid));
 E.resolveAll(g);next(g);finish(g);assert.equal(g.opportunity.sourceType,type);
 E.chooseOpportunityLane(g,0,4);E.chooseOpportunity(g,0);E.resolveAll(g);assert(E.findPlacement(p,c.uid));assert.equal(g.opportunityHistory.length,2);
});

test('commercial search with no cash returns to hand, while insufficient creative markers just pause',()=>{
 for(const type of ['C-Q','A-Q']){
  const g=make({startMoney:type==='C-Q'?0:8}),p=g.players[0];skills(p,type[0]);const c=add(g,p,type);
  E.place(g,0,c.uid,{day:4,period:0});finish(g);assert.equal(g.opportunity,null);assert.equal(!!E.findPlacement(p,c.uid),type==='A-Q');
  assert.equal(p.money,type==='C-Q'?3:11);
 }
});

test('hiring prepays every growth execution fee plus hiring fee; no progress refund is awarded',()=>{
 const g=make({startMoney:20}),p=g.players[0];skills(p,'C');const recruit=add(g,p,'C-U');
 E.place(g,0,recruit.uid,{day:4,period:0});finish(g);assert.equal(g.opportunity.stage,'hire');
 const target=offer(g,'A-G2'),before=p.money;assert.equal(E.hireCost(getCard(target)),6);
 p.money=5;unchanged(g,()=>E.chooseHire(g,0,target.uid));p.money=before;
 E.chooseHire(g,0,target.uid);assert.equal(p.money,before-6);assert.equal(E.skillCounts(p).A,1);assert.equal(p.skills.at(-1).hired,true);
 E.resolveAll(g);assert.equal(p.money,before-6+3);assert.equal(p.settlement.otherIncome,0);
});

test('inspiration starts absent, forms on empty nights after settlement, never stacks, placement clears permanently until another settlement',()=>{
 const g=make(),p=g.players[0];assert.equal(E.inspirationCount(p),0);assert.equal(p.inspiration,undefined);
 finish(g);assert.equal(E.inspirationCount(p),7);next(g);finish(g);assert.equal(E.inspirationCount(p),7);next(g);turn(g);
 const c=add(g,p,'A-E');E.place(g,0,c.uid,{day:4,period:2});assert.equal(E.inspirationCount(p),6);turn(g);E.unplace(g,0,c.uid);assert.equal(E.inspirationCount(p),6);
 finish(g);assert.equal(E.inspirationCount(p),7);
});

test('a growth card completing at night cannot produce a free inspiration marker in that same week',()=>{
 const g=make(),p=g.players[0],c=add(g,p,'A-G1');c.progress=1;E.place(g,0,c.uid,{day:4,period:2});finish(g);
 assert.equal(E.skillCounts(p).A,1);assert.equal(E.findPlacement(p,c.uid),null);assert.equal(E.inspirationCount(p),6);assert(!p.inspirationSlots.includes('4-2'));
 next(g);finish(g);assert.equal(E.inspirationCount(p),7);
});

test('creative marker requirement is a settlement condition, not a currency or purchase/placement cost',()=>{
 const g=make(),p=g.players[0];skills(p,'AA');const c=offer(g,'A-M');
 assert.equal(E.canBuy(g,p,getCard(c)),null);E.buy(g,0,c.uid);turn(g);E.place(g,0,c.uid,{day:4,period:0});
 const before=structuredClone(g);assert.equal(E.preview(g,0).income,0);assert.deepEqual(g,before);
 finish(g);assert.equal(p.income,0);assert.equal(E.inspirationCount(p),7);next(g);finish(g);assert.equal(p.income,2);assert.equal(E.inspirationCount(p),7);
});

test('creative support without enough markers supplies neither sanity nor income and charges no upkeep',()=>{
 const g=make(),p=g.players[0];skills(p,'A');const c=add(g,p,'A-S');E.place(g,0,c.uid,{day:4,period:0});
 assert.equal(p.sanity,3);const before=p.money;finish(g);assert.equal(p.income,0);assert.equal(p.money,before+3);assert.equal(p.sanity,3);
 next(g);finish(g);assert.equal(p.income,getCard(c).fixedProfit);assert.equal(p.sanity,3+getCard(c).support-getCard(c).stress);
});

test('invalid, duplicate and occupied inspiration slots do not count toward creative gates',()=>{
 const g=make(),p=g.players[0];p.inspirationSlots=['0-2','0-2','7-2','2-0','oops'];assert.equal(E.inspirationCount(p),1);
 const c=add(g,p,'A-E');E.place(g,0,c.uid,{day:0,period:2});assert.equal(E.inspirationCount(p),0);assert.deepEqual(p.inspirationSlots,[]);
});
