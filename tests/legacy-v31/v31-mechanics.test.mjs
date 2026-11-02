import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {CARDS,ADVANCED,getCard,cardPhases} from '../src/cards.js';
import {make,add,rig,turn,lock,finish,next,skills,seedFor} from './helpers.mjs';
import {offer,supplyIds,unchanged,reload} from './regression-helpers-v22.mjs';

const all=[...CARDS,...ADVANCED];
test('v31 fixed supply, empty starts, 4h/8h markets and unified price/skill gates',()=>{
 assert.equal(all.length,38);assert.equal(new Set(all.map(d=>d.name)).size,38);
 for(const n of [2,3,4]){const g=make({playerCount:n});assert.equal(supplyIds(g).length,152);assert.equal(new Set(supplyIds(g)).size,152);assert.deepEqual(Object.values(g.market).map(x=>x.length),[8,4]);assert(g.players.every(p=>!p.cards.length&&p.money===8&&p.sanity===3));assert.equal(g.config.nightStress4,1);}
 for(const d of all){assert([4,8].includes(d.hours));assert.equal(d.copies,4);assert.equal(cardPhases(d).purchase.sanity,undefined);assert(!d.capitalRatio);}
});

for(const d of all.filter(d=>d.skill))test(d.name+': pay on every successful execution, archive only at completion',()=>{
 const g=make({startMoney:20}),p=g.players[0],c=offer(g,d.id),ids=supplyIds(g);
 E.buy(g,0,c.uid);turn(g);E.place(g,0,c.uid,{day:6,period:0});
 for(let i=1;i<=d.progressTarget;i++){finish(g);assert.equal(c.progress,i);assert.equal(p.money,20-d.price.money-i*d.cost.money+i*3);assert.equal(E.skillCounts(p)[d.skill],i===d.progressTarget?1:0);assert.deepEqual(supplyIds(g),ids);if(i<d.progressTarget)next(g);}
 assert(!E.findPlacement(p,c.uid));assert(p.skills.includes(c));
});

test('sanity, cash and inspection gates prevent growth progress and payment',()=>{
 for(const why of ['sanity','cash','caught']){const g=make(),p=g.players[0],c=add(g,p,'B-G1');p.schedule={'0-0':[c.uid]};
  if(why==='sanity')g.config.startSanity=1;if(why==='cash')p.money=0;if(why==='caught'){g.inspection.inspectionCount=1;g.diceRandom=seedFor([1,1]);}
  const cash=p.money;finish(g);assert.equal(c.progress,undefined);assert.equal(p.money,cash+3-(why==='caught'?1:0));assert.equal(E.skillCounts(p).B,0);
 }
});

test('night is -1, full Sunday -2; structural support never accumulates and unaffordable support returns',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['W-S',0,2],['W-S',6],['W-S',6,1]]);
 assert.equal(p.sanity,6);finish(g);assert.equal(p.sanity,6);assert.equal(p.money,5);next(g);finish(g);
 // Two of the three support fees are affordable before income. Withdrawal frees a Sunday half.
 assert.equal(p.supports.filter(x=>x.active).length,2);assert.equal(E.unplacedCards(p).length,1);assert.equal(p.sanity,6);assert.equal(p.money,4);
});

test('capital locks four, moving does not pay again, withdrawal refunds once',()=>{
 const g=make(),p=g.players[0],c=add(g,p,'C-E');E.place(g,0,c.uid,{day:5,period:0});assert.equal(p.money,4);turn(g);
 E.place(g,0,c.uid,{day:6,period:0});assert.equal(p.money,4);E.unplace(g,0,c.uid);assert.equal(p.money,8);unchanged(g,()=>E.unplace(g,0,c.uid));
});

test('no automatic inspiration after any number of empty weeks',()=>{
 const g=make();for(let i=0;i<4;i++){finish(g);assert.equal(E.inspirationCount(g.players[0]),0);if(i<3)next(g);}
});

test('inspiration generation: choose position, pay once, reload, retain until occupied',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['A-I',6]]);p.inspirationSlots=[];lock(g);E.resolveAll(g);
 assert.equal(g.opportunity.stage,'inspire');const cash=p.money;
 unchanged(g,()=>E.chooseActivity(g,1,['0-2']));unchanged(g,()=>E.chooseActivity(g,0,['bad']));
 const clone=reload(g);E.chooseActivity(g,0,['0-2']);E.chooseActivity(clone,0,['0-2']);E.resolveAll(g);E.resolveAll(clone);assert.deepEqual(g,clone);assert.equal(p.money,cash);assert.deepEqual(p.inspirationSlots,['0-2']);
 next(g);turn(g);const other=add(g,p,'A-E');E.place(g,0,other.uid,{day:6,period:2});turn(g);E.place(g,0,other.uid,{day:0<g.day?g.day:0,period:2});
 // Explicitly exercise a future marker so daily progression does not invalidate the move.
 p.inspirationSlots=['6-2'];turn(g);E.place(g,0,other.uid,{day:6,period:2});assert.equal(E.inspirationCount(p),0);E.unplace(g,0,other.uid);assert.equal(E.inspirationCount(p),0);
});

test('residency requires two distinct empty nights and does not partly charge',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['A-R',0]]);p.inspirationSlots=['0-2','1-2','2-2','3-2','4-2','5-2'];finish(g);assert.equal(g.opportunity,null);assert.equal(p.money,11);
 const h=make(),q=h.players[0];rig(h,q,[['A-R',0]]);q.inspirationSlots=[];lock(h);E.resolveAll(h);
 unchanged(h,()=>E.chooseActivity(h,0,['1-2','1-2']));E.chooseActivity(h,0,['1-2','2-2']);E.resolveAll(h);assert.equal(q.money,9);assert.equal(E.inspirationCount(q),2);
});

test('newly generated inspiration enables later income in the same week; source can be skipped',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['A-R',0],['A-M',1]]);p.inspirationSlots=[];lock(g);E.resolveAll(g);E.chooseActivity(g,0,['4-2','5-2']);E.resolveAll(g);assert.equal(p.income,3);assert.equal(p.sanity,4);
 const h=make();rig(h,h.players[0],[['A-I',0]]);h.players[0].inspirationSlots=[];lock(h);E.resolveAll(h);E.chooseActivity(h,0);E.resolveAll(h);assert.equal(h.players[0].money,11);assert.equal(E.inspirationCount(h.players[0]),0);
});

test('creative support remains when inspiration income gate fails, but vanishes when caught',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['A-M',0]]);p.inspirationSlots=[];finish(g);assert.equal(p.income,0);assert.equal(p.sanity,4);
 const h=make(),q=h.players[0];rig(h,q,[['A-M',0]]);q.inspirationSlots=[];h.inspection.inspectionCount=1;h.diceRandom=seedFor([1,1]);finish(h);assert.equal(q.income,0);assert.equal(q.sanity,3);assert.equal(q.caught,1);
});

test('material notes spend a chosen marker, free acquisition still gates skills, leftovers discarded',()=>{
 const g=make({startMoney:0}),p=g.players[0];rig(g,p,[['A-Q',0]]);p.inspirationSlots=['1-2','2-2'];lock(g);E.resolveAll(g);
 E.chooseActivity(g,0,'1-2');assert.deepEqual(p.inspirationSlots,['2-2']);
 const candidates=['A-H','A-E','B-G1'].map(t=>offer(g,t));for(const c of candidates)g.market[getCard(c).hours]=g.market[getCard(c).hours].filter(x=>x!==c);
 // Controlled candidates use actual supply; A-H is 8h, only used here to test skill validation independently of draw.
 g.opportunity.stage='choose';g.opportunity.options=candidates;g.opportunity.lane=4;
 unchanged(g,()=>E.chooseOpportunity(g,0,candidates[0].uid));E.chooseOpportunity(g,0,candidates[1].uid);assert(p.cards.includes(candidates[1]));assert.equal(p.money,0);assert(g.discard[8].includes(candidates[0]));assert(g.discard[4].includes(candidates[2]));assert.equal(E.findPlacement(p,candidates[1].uid),null);
 E.resolveAll(g);assert.equal(p.income,0);
});

test('draw then discard same week resumes parallel queue after every reload without duplicating income',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['A-Q',0],['B-E',0],['A-X',1]]);p.inspirationSlots=['3-2'];lock(g);E.resolveAll(g);E.chooseActivity(g,0,'3-2');E.chooseOpportunityLane(g,0,4);
 const target=g.opportunity.options.find(c=>!E.canBuy(g,p,getCard(c),-getCard(c).price.money));assert(target);E.chooseOpportunity(g,0,target.uid);E.resolveAll(g);assert.equal(g.opportunity.stage,'discard-hand');
 const clone=reload(g);E.chooseActivity(g,0,target.uid);E.chooseActivity(clone,0,target.uid);E.resolveAll(g);E.resolveAll(clone);assert.deepEqual(g,clone);assert.equal(p.income,5);assert.equal(p.weeklyEarnings.filter(x=>x.type==='B-E').length,1);assert.equal(E.findPlacement(p,target.uid),null);assert(g.discard[getCard(target).hours].includes(target));
});

test('ordinary repeated search pays before reveal, preserves market, discards leftovers and keeps source',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['C-Q',6]]);lock(g);const market=structuredClone(g.market),money=p.money;E.resolveAll(g);assert.equal(p.money,money-1);E.chooseOpportunityLane(g,0,4);const options=[...g.opportunity.options];E.chooseOpportunity(g,0);assert.deepEqual(g.market,market);assert(options.every(c=>g.discard[4].includes(c)));E.resolveAll(g);assert(E.findPlacement(p,p.cards[0].uid));assert.equal(p.money,money-1+3);
});

test('free draw and preview do not read hidden deck or dice, and humans stay pending',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['A-Q',0],['A-D1',1],['B-T',2]]);p.inspirationSlots=['3-2','4-2'];const before=structuredClone(g),shown=E.preview(g,0);assert.deepEqual(g,before);
 const h=reload(g);h.decks[4].reverse();h.random++;h.diceRandom++;assert.deepEqual(E.preview(h,0),shown);lock(g);E.resolveAll(g);const pending=structuredClone(g);E.botOpportunity(g);assert.deepEqual(g,pending);
});

for(const [type,low,high]of [['B-T',1,3],['B-H',2,4]])test(type+' product: 2 successful trials, mature from third; caught does not advance; withdrawal retains',()=>{
 const g=make(),p=g.players[0];rig(g,p,[[type,0]]);const c=p.cards[0];finish(g);assert.equal(c.progress,1);assert.equal(p.income,low);next(g);
 g.inspection.inspectionCount=1;g.diceRandom=seedFor([1,1]);finish(g);assert.equal(c.progress,1);assert.equal(p.income,0);next(g);turn(g);E.unplace(g,0,c.uid);E.place(g,0,c.uid,{day:5,period:0});finish(g);assert.equal(c.progress,2);assert.equal(p.income,low);next(g);finish(g);assert.equal(p.income,high);assert(E.findPlacement(p,c.uid));assert.equal(E.skillCounts(p).B,0);
});

test('parallel only fits two 4h in daytime and neither protects nor re-executes its partner',()=>{
 const g=make(),p=g.players[0],a=add(g,p,'B-E'),b=add(g,p,'A-E'),c=add(g,p,'B-M');E.place(g,0,a.uid,{day:6,period:0});turn(g);E.place(g,0,b.uid,{day:6,period:0});turn(g);assert.equal(E.slotHours(p,{day:6,period:0}),4);unchanged(g,()=>E.place(g,0,c.uid,{day:6,period:0}));finish(g);assert.equal(p.income,4);
 const h=make(),q=h.players[0];rig(h,q,[['B-E',6,2]]);const d=add(h,q,'B-M');unchanged(h,()=>E.place(h,0,d.uid,{day:6,period:2}));
});

test('hiring from hand avoids charging purchase price twice; archives without executing',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['C-J',0]]);const target=add(g,p,'B-G1');lock(g);E.resolveAll(g);const cash=p.money;assert(E.hireCandidates(g,0).includes(target));E.chooseHire(g,0,target.uid);assert.equal(p.money,cash-3);assert.equal(E.skillCounts(p).B,1);assert(!p.cards.includes(target));E.resolveAll(g);assert.equal(p.income,0);
});

test('headhunter only hires revealed growth, discards other candidates, conserves real supply',()=>{
 const g=make(),p=g.players[0],source=offer(g,'C-R');g.market[4]=g.market[4].filter(c=>c!==source);p.cards.push(source);p.schedule={'0-0':[source.uid]};
 const target=offer(g,'A-G1');g.market[4]=g.market[4].filter(c=>c!==target);g.decks[4].push(target);g.mondayMarketBought=true;const ids=supplyIds(g);lock(g);E.resolveAll(g);assert.equal(g.opportunity.options.length,3);assert(E.hireCandidates(g,0).includes(target));
 const others=g.opportunity.options.filter(c=>c!==target);E.chooseHire(g,0,target.uid);assert.equal(p.money,3);assert.equal(E.skillCounts(p).A,1);assert(others.every(c=>g.discard[4].includes(c)));assert.deepEqual(supplyIds(g),ids);E.resolveAll(g);
});

test('hiring excludes permissions, products, duplicate skills and scheduled hand cards',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['C-J',0],['B-G1',2]]);skills(p,'A');offer(g,'W-P');offer(g,'B-T');offer(g,'A-G1');lock(g);E.resolveAll(g);assert(E.hireCandidates(g,0).every(c=>getCard(c).skill&&c.type!=='A-G1'&&c.type!=='B-G1'));const before=structuredClone(g);assert.throws(()=>E.chooseHire(g,0,p.cards[1].uid));assert.deepEqual(g,before);
});

test('professional low-sanity conditional bonus is cash, never escape income; overtime is risky',()=>{
 const g=make({startSanity:2}),p=g.players[0];rig(g,p,[['W-E',0]]);finish(g);assert.equal(p.money,14);assert.equal(p.income,0);
 const h=make(),q=h.players[0],c=add(h,q,'W-O');unchanged(h,()=>E.place(h,0,c.uid,{day:0,period:0}));E.place(h,0,c.uid,{day:0,period:2});assert.equal(q.sanity,1);finish(h);assert.equal(q.money,15);assert.equal(q.income,0);
});

test('weekend completes after three paid successes and activates next week only',()=>{
 const g=make({startMoney:20}),p=g.players[0];rig(g,p,[['W-F',0]]);const c=p.cards[0];
 for(let i=1;i<=3;i++){finish(g);assert.equal(c.progress,i);assert.equal(p.weekend,false);assert.equal(p.sanity,3);if(i<3)next(g);}
 assert.equal(p.weekendFrom,4);assert(p.completedActivities.includes(c));assert.equal(p.money,23);next(g);assert(p.weekend);assert.equal(p.sanity,5);assert.equal(E.workType(p,{day:5,period:0}),null);
});

test('chain inspection continues only for players hit; shared rolls never extend another player risk',()=>{
 const g=make(),p=g.players[0],q=g.players[1];rig(g,p,[['A-E',0],['A-E',1]]);rig(g,q,[['A-E',1]]);g.inspection.inspectionCount=1;g.diceRandom=seedFor([1,2,2]);finish(g);
 assert.deepEqual(g.inspection.rolls,[1,2,2]);assert.equal(p.caught,2);assert.equal(q.caught,0);assert.equal(p.income,0);assert.equal(q.income,2);assert.equal(p.money,9);assert.equal(q.money,13);
});

test('same date and 8h each paused once; repeated inspection round never fines twice',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['B-H',0],['A-E',1],['A-E',1,1]]);g.inspection.inspectionCount=2;g.diceRandom=seedFor([1,2,2,1]);finish(g);assert.equal(p.caught,3);assert.equal(p.money,8);assert.equal(p.income,0);const before=reload(g);assert.throws(()=>E.rollInspections(g));assert.deepEqual(g,before);
});

test('professional, holiday, team-blocked and protected cards do not trigger further inspection',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['W-E',0],['A-E',1]]);p.protectionFrom=1;E.setProtection(g,0,{day:1,period:0});g.inspection.inspectionCount=1;g.diceRandom=seedFor([2,1]);finish(g);assert.deepEqual(g.inspection.rolls,[2]);assert.equal(p.caught,0);assert.equal(p.income,2);
 const h=make(),q=h.players[0];rig(h,q,[['B-H',0]]);h.inspection.blockedTimes=[{day:0,period:1}];h.inspection.inspectionCount=1;h.diceRandom=seedFor([1,1]);finish(h);assert.deepEqual(h.inspection.rolls,[1]);assert.equal(q.caught,0);assert.equal(q.income,0);
});

test('cash deferred until weekend cannot pay execution costs; escaped income has no cap',()=>{
 const g=make({startMoney:0}),p=g.players[0];rig(g,p,[['A-E',0],['C-Q',1]]);finish(g);assert.equal(p.money,5);assert.equal(g.opportunity,null);assert.equal(E.unplacedCards(p).length,1);
 const h=make({startSanity:6}),q=h.players[0];rig(h,q,[['C-M',0],['C-M',1],['C-M',2]]);finish(h);assert.equal(q.income,12);assert(E.eligible(h,q));
});
