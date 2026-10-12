import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {make, add, skills, rig, turn, finish, next, lock, seedFor} from './helpers.mjs';
import {reload, offer, unchanged} from './regression-helpers-v22.mjs';

test('regression: support placement and withdrawal change sanity immediately without paying or refunding fees',()=>{
  const g=make(),p=g.players[0],c=add(g,p,'W-S');E.place(g,0,c.uid,{day:6,period:0});assert.equal(p.sanity,7);assert.equal(p.money,8);
  turn(g);E.unplace(g,0,c.uid);assert.equal(p.sanity,3);assert.equal(p.money,8);
});

test('regression: support prepaid exactly once, including repeated rolls, reload and three weeks',()=>{
  let g=make();rig(g,g.players[0],[['W-S',6]]);
  for(let week=1;week<=3;week++){
    const money=g.players[0].money;lock(g);E.rollInspections(g);assert.equal(g.players[0].money,money-2);assert.equal(g.players[0].sanity,7);
    const rolled=structuredClone(g);E.rollInspections(g);assert.deepEqual(g,rolled);
    const clone=reload(g);E.resolveAll(g);E.resolveAll(clone);assert.deepEqual(g,clone);
    assert.equal(g.players[0].money,money+1);assert.equal(g.players[0].sanity,7);assert.equal(g.history.length,week);
    const ended=structuredClone(g);E.resolveAll(g);assert.deepEqual(g,ended);if(week<3){g=reload(g);next(g);}
  }
});

test('regression: Sunday support funds earlier night growth, charged once',()=>{
  const g=make({startSanity:0}),p=g.players[0],support=add(g,p,'W-S'),growth=add(g,p,'A-G1');
  E.place(g,0,support.uid,{day:6,period:0});turn(g);E.place(g,0,growth.uid,{day:1,period:2});assert.equal(p.sanity,2);
  finish(g);assert.equal(E.skillCounts(p).A,1);assert.equal(p.sanity,4);assert.equal(p.money,9);
});

test('regression: support fees follow calendar order, skip an unaffordable expensive card and still fund a cheaper card',()=>{
  const g=make({startMoney:3}),p=g.players[0];rig(g,p,[['B-S',2],['W-S',1],['W-S',0]]);
  const expected=['0-0','1-0','2-0'].map(k=>p.schedule[k][0]);lock(g);E.rollInspections(g);
  assert.deepEqual(p.supports.map(x=>x.uid),expected);assert.deepEqual(p.supports.map(x=>x.active),[true,false,true]);
  assert.equal(p.money,0);assert.equal(p.sanity,10);assert.equal(E.findPlacement(p,expected[1]),null);
  E.resolveAll(g);assert.equal(p.money,3);assert.equal(p.sanity,10);
});

test('regression: unfunded support does not reactivate from later income or auto-arrange next week',()=>{
  const g=make({startMoney:1}),p=g.players[0];rig(g,p,[['A-E',0],['W-S',6]]);const uid=p.cards[1].uid;finish(g);
  assert.equal(p.money,5);assert.equal(p.sanity,3);assert.equal(p.supports[0].active,false);assert.equal(E.findPlacement(p,uid),null);
  next(g);assert.equal(E.findPlacement(p,uid),null);assert.equal(E.syncSanity(g,p),3);
});

test('regression: caught paid support loses whole-week effect, pays no upkeep, receives one fine',()=>{
  const g=make(),p=g.players[0];rig(g,p,[['W-S',5]]);g.inspection.inspectionCount=3;g.diceRandom=seedFor([6,6,6]);lock(g);E.rollInspections(g);
  assert.equal(p.money,8);assert.equal(p.sanity,3);assert.equal(p.supports[0].active,false);
  const clone=reload(g);E.resolveAll(g);E.resolveAll(clone);assert.deepEqual(g,clone);assert.equal(p.money,10);assert.equal(p.caught,1);
});

for(const period of [0,1])test(`regression: team on 8h support half ${period} disables it without upkeep or fines`,()=>{
  const g=make(),p=g.players[0];rig(g,p,[['W-S',6]]);g.inspection.blockedTimes=[{day:6,period}];finish(g);
  assert.equal(p.money,11);assert.equal(p.sanity,3);assert.equal(p.caught,0);assert.equal(p.supports[0].active,false);
});

test('regression: protected 4h paid support remains funded and effective on an inspected day',()=>{
  const g=make(),p=g.players[0];rig(g,p,[['B-S',0]]);p.protectionFrom=1;E.setProtection(g,0,{day:0,period:0});
  g.inspection.inspectionCount=1;g.diceRandom=seedFor([1]);finish(g);
  assert.equal(p.money,10);assert.equal(p.sanity,6);assert.equal(p.caught,0);assert.equal(p.supports[0].active,true);
});

test('regression: support and pressure are applied before the upper clamp; withdrawal cannot manufacture sanity',()=>{
  const g=make({startSanity:9}),p=g.players[0],c=add(g,p,'W-S');E.place(g,0,c.uid,{day:6,period:0});assert.equal(p.sanity,10);
  const pressure=add(g,p,'A-L');turn(g);E.place(g,0,pressure.uid,{day:5,period:0});assert.equal(p.sanity,10);
  turn(g);E.unplace(g,0,c.uid);assert.equal(p.sanity,7);turn(g);E.unplace(g,0,pressure.uid);assert.equal(p.sanity,9);
});

test('regression: purchasing reduces preview support budget before the weekly bill',()=>{
  const g=make({startMoney:2}),p=g.players[0];rig(g,p,[['W-S',6]]);assert.equal(p.sanity,7);
  E.buy(g,0,offer(g,'A-G2').uid);assert.equal(p.money,0);assert.equal(p.sanity,3);
  const before=structuredClone(g),preview=E.preview(g,0);assert.deepEqual(g,before);assert.equal(preview.sanity,3);assert.equal(preview.money,3);
});

test('regression: locked capital cannot pay upkeep; caught investment retains principal and refunds exactly once',()=>{
  const g=make({startMoney:3}),p=g.players[0];rig(g,p,[['W-S',6]]);const c=add(g,p,'C-E');E.place(g,0,c.uid,{day:0,period:0});
  assert.equal(p.money,0);assert.equal(p.sanity,3);g.inspection.inspectionCount=1;g.diceRandom=seedFor([1]);finish(g);
  assert.equal(p.money,3);assert.equal(p.income,0);assert.equal(p.caught,1);assert.equal(c.lockedCapital,3);assert.equal(E.unplacedCards(p).filter(c=>c.type==='W-S').length,1);
  next(g);turn(g);E.unplace(g,0,c.uid);assert.equal(p.money,6);assert.equal(c.lockedCapital,undefined);turn(g);
  unchanged(g,()=>E.unplace(g,0,c.uid));E.discardCard(g,0,c.uid);assert.equal(p.money,6);assert.equal(g.discard[4].filter(x=>x.uid===c.uid).length,1);
});

test('regression: discard directly releases invested principal without counting it as income',()=>{
  const g=make(),p=g.players[0],c=add(g,p,'C-E');E.place(g,0,c.uid,{day:6,period:0});turn(g);E.discardCard(g,0,c.uid);
  assert.equal(p.money,8);assert.equal(p.income,0);assert.equal(c.lockedCapital,undefined);assert(g.discard[4].includes(c));assert.equal(p.sanity,3);
});

test('regression: interim earnings do not pay until the last slot and next week clears the bill',()=>{
  const g=make(),p=g.players[0];rig(g,p,[['A-E',0],['B-E',6]]);lock(g);E.step(g);E.step(g);
  assert.equal(p.money,8);assert.equal(p.income,0);assert.equal(p.weeklyEarnings.length,1);assert.equal(p.settlement,null);assert(!E.eligible(g,p));
  E.resolveAll(g);assert.deepEqual(p.settlement,{week:1,sideIncome:2,otherIncome:0,salary:3,eventMoney:0,total:5});assert.equal(p.money,13);
  next(g);assert.equal(p.settlement,null);assert.deepEqual(p.weeklyEarnings,[]);assert.equal(p.income,0);
});

test('regression: pending ordinary cash cannot fund a later multweek project',()=>{
  const g=make({startMoney:0}),p=g.players[0];skills(p,'WW');rig(g,p,[['W-E',0],['W-P1',4]]);
  const before=structuredClone(g),preview=E.preview(g,0);assert.deepEqual(g,before);assert.equal(preview.money,4);
  finish(g);assert.equal(p.money,4);assert.equal(p.cards.find(c=>c.type==='W-P1').progress,undefined);assert(!p.weekend);
});

test('regression: growth refunds, salary and event awards are cash but never side income',()=>{
  const g=make(),p=g.players[0];rig(g,p,[['W-E',0],['A-G2',1],['A-E',6]]);g.inspection.gain={money:2};
  finish(g);assert.deepEqual(p.settlement,{week:1,sideIncome:1,otherIncome:2,salary:3,eventMoney:2,total:8});assert.equal(p.money,16);assert.equal(p.income,1);
});

test('regression: escaped players receive no further settlement, income, salary or event bonus',()=>{
  const g=make({playerCount:3}),p=g.players[0];p.escaped=true;rig(g,p,[['A-E',6]]);g.inspection.gain={money:2};g.inspection.employeesOnly=true;finish(g);
  assert.equal(p.settlement,null);assert.equal(p.money,8);
  assert.equal(g.players[1].money,13);
});

test('regression: weekly side income has no cap at the escape threshold',()=>{
  const g=make({playerCount:4}),p=g.players[0];skills(p,'AA');rig(g,p,[['A-H',0],['A-H',1],['A-H',5],['A-H',6]]);finish(g);
  assert.equal(p.income,12);assert.equal(p.settlement.sideIncome,12);assert.equal(p.money,23);assert.equal(p.rawIncome,undefined);
});
