import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {CARDS, ADVANCED, EVENTS, getCard} from '../src/cards.js';
import {make, add, skills, rig, turn, finish, next, lock, seedFor} from './helpers.mjs';
import {unchanged, reload, offer} from './regression-helpers-v22.mjs';
const sun={day:6,period:0};

test('regression: empty starts, obsolete options ignored, resource and event contracts retained',()=>{
  for(const playerCount of [2,3,4]) {
    const g=make({playerCount,starterActivity:'A02',startInspiration:99,livingCost:7});
    for(const p of g.players) {assert.deepEqual(p.cards,[]);assert.deepEqual(p.skills,[]);assert.deepEqual(p.schedule,{});assert.equal(p.money,8);assert.equal(p.sanity,3);}
    for(const k of ['starterActivity','startInspiration','livingCost'])assert.equal(g.config[k],undefined);
  }
  assert.equal(EVENTS.length,12);
  assert.deepEqual([1,2,3].map(n=>EVENTS.filter(e=>e.inspectionCount===n).length),[4,3,1]);
  for(const d of [...CARDS,...ADVANCED])for(const field of ['price','cost','gain'])assert(!Object.hasOwn(d[field],'sanity'));
});

test('regression: seven full action rounds and rotated first player',()=>{
  const g=make(),p=g.players[0],c=add(g,p,'A-E');
  for(let day=0;day<7;day++)for(let id=0;id<2;id++) {
    assert.equal(g.day,day);assert.equal(E.activeBuyer(g),id);
    if(id===0)E.place(g,id,c.uid,{day:6,period:day%2});else E.pass(g,id);
  }
  assert.equal(g.actionCount,14);assert.equal(g.endedByPass,false);assert.equal(p.money,8);
  E.resolveAll(g);assert.equal(p.money,12);next(g);assert.equal(E.activeBuyer(g),1);
});

test('regression: rejected purchases and wrong-turn actions preserve the entire state',()=>{
  const g=make(),c=offer(g,'A-E'),own=add(g,g.players[0],'B-E');
  unchanged(g,()=>E.buy(g,1,c.uid));unchanged(g,()=>E.buy(g,0,'missing'));
  unchanged(g,()=>E.place(g,1,own.uid,sun));unchanged(g,()=>E.unplace(g,1,own.uid));
  unchanged(g,()=>E.discardCard(g,1,own.uid));unchanged(g,()=>E.pass(g,1));
  const poor=make({startMoney:0}),unaffordable=offer(poor,'A-E');unchanged(poor,()=>E.buy(poor,0,unaffordable.uid));
});

test('regression: past source, past destination and discard failures are atomic',()=>{
  const g=make(),p=g.players[0],past=add(g,p,'C-E'),other=add(g,p,'A-E');
  E.place(g,0,past.uid,{day:0,period:0});turn(g);
  unchanged(g,()=>E.place(g,0,past.uid,sun));unchanged(g,()=>E.unplace(g,0,past.uid));
  unchanged(g,()=>E.discardCard(g,0,past.uid));
  unchanged(g,()=>E.place(g,0,other.uid,{day:0,period:0}));
  unchanged(g,()=>E.unplace(g,0,other.uid));unchanged(g,()=>E.discardCard(g,0,'missing'));
  assert.equal(past.lockedCapital,4);
});

test('regression: invalid slots, ownership, capital, skill and raw-sanity rejection are atomic',()=>{
  const g=make({startMoney:3}),p=g.players[0],c=add(g,p,'A-E');
  for(const s of [{day:-1,period:0},{day:7,period:0},{day:0.5,period:0},{day:0,period:3}])unchanged(g,()=>E.place(g,0,c.uid,s));
  unchanged(g,()=>E.place(g,0,'missing',sun));
  const capital=add(g,p,'C-E'),advanced=add(g,p,'A-H');
  unchanged(g,()=>E.place(g,0,capital.uid,sun));unchanged(g,()=>E.place(g,0,advanced.uid,sun));
  const h=make({startSanity:1}),x=add(h,h.players[0],'A-E');
  unchanged(h,()=>E.place(h,0,x.uid,{day:6,period:2}));
});

test('regression: rejected overlapping placement does not release existing capital',()=>{
  const g=make(),p=g.players[0],c=add(g,p,'C-E'),block=add(g,p,'A-L');
  E.place(g,0,c.uid,{day:4,period:0});turn(g);E.place(g,0,block.uid,sun);turn(g);
  unchanged(g,()=>E.place(g,0,c.uid,sun));assert.equal(c.lockedCapital,4);assert.equal(p.money,4);
});

test('regression: 8h anchors to morning, moving and withdrawal release both halves',()=>{
  const g=make(),p=g.players[0],c=add(g,p,'A-L');
  E.place(g,0,c.uid,{day:4,period:1});assert.equal(E.findPlacement(p,c.uid).key,'4-0');
  assert.deepEqual(E.cardsInSlot(p,{day:4,period:0}),[c]);assert.deepEqual(E.cardsInSlot(p,{day:4,period:1}),[c]);
  turn(g);unchanged(g,()=>E.place(g,0,c.uid,{day:4,period:0}));
  E.place(g,0,c.uid,{day:6,period:1});assert.equal(E.cardsInSlot(p,{day:4,period:1}).length,0);
  turn(g);E.unplace(g,0,c.uid);assert.equal(E.cardsInSlot(p,sun).length,0);assert.equal(E.cardsInSlot(p,{day:6,period:1}).length,0);assert.equal(p.sanity,3);
});

for(const period of [0,1])test(`regression: team blocks either half (${period}) of an 8h activity without cost or fine`,()=>{
  const g=make(),p=g.players[0],c=add(g,p,'A-L');
  g.inspection.blockedTimes=[{day:6,period}];unchanged(g,()=>E.place(g,0,c.uid,sun));
  g.inspection.blockedTimes=[];E.place(g,0,c.uid,sun);g.inspection.blockedTimes=[{day:6,period}];
  finish(g);assert.equal(p.money,11);assert.equal(p.income,0);assert.equal(p.caught,0);assert(E.findPlacement(p,c.uid));
});

test('regression: inspection hidden before lock, shared dates and idempotent repeated rolls',()=>{
  const g=make();g.inspection.inspectionCount=3;g.diceRandom=seedFor([2,2,5]);
  unchanged(g,()=>E.rollInspections(g));lock(g);assert.deepEqual(g.inspection.times,[]);E.step(g);
  assert.deepEqual(g.inspection.rolls,[2,2,5]);assert.deepEqual(g.inspection.times,[{day:1,period:0},{day:1,period:1},{day:4,period:0},{day:4,period:1}]);
  const before=structuredClone(g);E.rollInspections(g);assert.deepEqual(g,before);
});

for(const type of ['A-E','A-L'])test(`regression: duplicate inspection dates fine ${type} only once`,()=>{
  const g=make(),p=g.players[0],c=add(g,p,type);E.place(g,0,c.uid,{day:0,period:0});
  g.inspection.inspectionCount=3;g.diceRandom=seedFor([1,1,1]);const sanity=p.sanity;finish(g);
  assert.equal(p.caught,1);assert.equal(p.income,0);assert.equal(p.money,10);assert.equal(p.sanity,sanity);
  const before=structuredClone(g);E.resolveAll(g);assert.deepEqual(g,before);unchanged(g,()=>E.step(g));
});

test('regression: shared inspection hits both players but never Sunday or night',()=>{
  const g=make();for(const p of g.players)rig(g,p,[['A-E',0],['B-E',0,2],['A-E',6]]);
  g.inspection.inspectionCount=1;g.diceRandom=seedFor([1]);finish(g);
  for(const p of g.players){assert.equal(p.caught,1);assert.equal(p.income,2);assert.equal(p.money,12);assert.equal(p.sanity,1);}
});

test('regression: temporary Saturday leave pauses professional work without adding permanent sanity',()=>{
  const g=make(),p=g.players[0];rig(g,p,[['W-E',5]]);p.tempWeekend=true;finish(g);
  assert.equal(p.settlement.otherIncome,0);assert.equal(p.money,11);assert.equal(p.weekend,false);assert.equal(p.sanity,2);
});

test('regression: independent hidden seed and reload step-vs-resolveAll yield identical settlement',()=>{
  const g=make(),p=g.players[0];rig(g,p,[['A-L',6],['B-S',4]]);g.inspection.inspectionCount=2;
  const before=structuredClone(g),preview=E.preview(g,0);assert.deepEqual(g,before);
  const different=reload(g);different.diceRandom=seedFor([6,6]);assert.deepEqual(E.preview(different,0),preview);
  lock(g);E.step(g);const clone=reload(g);E.resolveAll(g);while(clone.phase==='resolving')E.step(clone);
  assert.deepEqual(g,clone);assert.equal(g.history.length,1);
});

test('regression: duplicate growth recycles and another route cannot satisfy its skill gate',()=>{
  const g=make(),p=g.players[0];rig(g,p,[['A-G1',6],['A-G1',6,1]]);finish(g);
  assert.equal(E.skillCounts(p).A,1);assert.equal(g.discard[4].filter(c=>c.type==='A-G1').length,1);
  skills(p,'WW');assert.deepEqual(E.skillMissing(p,getCard('A-H')),['A','A']);
});

test('regression: protection selection is once before first action and never shields 8h',()=>{
  const g=make(),p=g.players[0];p.protectionFrom=1;
  unchanged(g,()=>E.setProtection(g,0,{day:6,period:0}));unchanged(g,()=>E.setProtection(g,0,{day:0,period:2}));
  E.setProtection(g,0,{day:0,period:0});unchanged(g,()=>E.setProtection(g,0,{day:1,period:0}));
  const c=add(g,p,'A-L');E.place(g,0,c.uid,{day:0,period:0});g.inspection.inspectionCount=1;g.diceRandom=seedFor([1]);finish(g);assert.equal(p.caught,1);
  const h=make();h.players[0].protectionFrom=1;E.buy(h,0,offer(h,'A-E').uid);turn(h);unchanged(h,()=>E.setProtection(h,0,{day:1,period:0}));
});

test('regression: completed protected growth cannot transfer its shield to the parallel card',()=>{
  const g=make(),p=g.players[0];skills(p,'B');rig(g,p,[['A-G1',0],['B-M',0]]);p.protectionFrom=1;E.setProtection(g,0,{day:0,period:0});
  g.inspection.inspectionCount=1;g.diceRandom=seedFor([1]);finish(g);
  assert.equal(E.skillCounts(p).A,1);assert.equal(p.caught,1);assert.equal(p.income,0);assert.equal(p.money,10);
});

test('regression: multiweek permission keeps progress through insufficient cash, withdrawal and reload',()=>{
  const g=make({startMoney:1}),p=g.players[0];skills(p,'WW');const c=add(g,p,'W-P1');E.place(g,0,c.uid,{day:4,period:0});finish(g);
  assert.equal(c.progress,1);assert.equal(c.lastProgressWeek,1);assert.equal(p.money,3);next(g);turn(g);
  E.buy(g,0,offer(g,'W-M').uid);assert.equal(p.money,0);finish(g);
  assert.equal(c.progress,1);assert.equal(c.lastProgressWeek,1);assert(!p.weekend);assert.equal(p.money,3);
  next(g);turn(g);E.unplace(g,0,c.uid);assert.equal(c.progress,1);turn(g);E.place(g,0,c.uid,{day:4,period:0});
  const clone=reload(g);finish(g);finish(clone);assert.deepEqual(g,clone);
  assert(p.weekend);assert.equal(c.progress,2);assert.equal(p.money,5);assert.deepEqual(p.completedActivities,[c]);assert.equal(p.skills.length,2);
  assert.equal(E.findPlacement(p,c.uid),null);assert(!Object.values(g.discard).flat().includes(c));
});

test('regression: discarding an unfinished permission clears progress and recycles it',()=>{
  const g=make(),p=g.players[0];skills(p,'WW');const c=add(g,p,'W-P1');E.place(g,0,c.uid,{day:4,period:0});finish(g);next(g);turn(g);
  assert.equal(c.progress,1);E.discardCard(g,0,c.uid);assert.equal(c.progress,undefined);assert.equal(c.lastProgressWeek,undefined);assert(g.discard[8].includes(c));
});

for(const type of ['W-P1','W-P2'])test(`regression: ${type} can be bought before skills but cannot repeat an unlocked permission`,()=>{
  const g=make(),p=g.players[0],c=offer(g,type),lane=getCard(type).hours,n=g.market[lane].length;E.buy(g,0,c.uid);turn(g);
  assert.equal(g.market[lane].length,n);assert(g.mondayMarketBought);unchanged(g,()=>E.place(g,0,c.uid,{day:4,period:0}));
  skills(p,getCard(type).requires);assert.equal(E.canPlace(g,p,c.uid,{day:4,period:0}),null);
  if(type==='W-P1')p.weekend=true;else p.protectionFrom=g.week+1;
  unchanged(g,()=>E.place(g,0,c.uid,{day:4,period:0}));
});

test('regression: sanity clamps without drift, skill or stacked autonomy gains',()=>{
  const g=make(),p=g.players[0];skills(p,'WWAABBCC');assert.equal(E.syncSanity(g,p),3);
  p.tempWeekend=true;assert.equal(E.syncSanity(g,p),3);p.weekend=true;assert.equal(E.syncSanity(g,p),5);p.escaped=true;assert.equal(E.syncSanity(g,p),7);
  p.sanity=24;assert.equal(E.syncSanity(g,p),7);assert.equal(p.accountability,undefined);assert.equal(E.createGame({startSanity:24}).players[0].sanity,10);
  const h=make({startSanity:10}),q=h.players[0],c=add(h,q,'A-L');q.weekend=true;E.place(h,0,c.uid,sun);assert.equal(q.sanity,9);turn(h);E.unplace(h,0,c.uid);assert.equal(q.sanity,10);
});

test('regression: persistent income and pressure have no five-week sanity drift',()=>{
  const g=make(),p=g.players[0];rig(g,p,[['A-G1',0,2],['A-L',6]]);
  for(let i=0;i<5;i++){finish(g);assert.equal(p.sanity,2);assert.equal(p.income,2);if(i<4)next(g);}
});
