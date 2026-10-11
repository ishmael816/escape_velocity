import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {CARDS,getCard} from '../src/cards.js';
import {make,turn,lock,finish,next,add,skills,rig,seedFor} from './helpers.mjs';

test('four support types use normal pools and reversible contributions, not gains',()=>{
 const cards=CARDS.filter(d=>['A13','B13','C13','W13'].includes(d.id));assert.equal(cards.length,4);
 assert.deepEqual(cards.map(d=>[d.hours,d.price.money,d.support,d.upkeep]),[[4,4,1,0],[4,2,2,1],[2,3,2,1],[4,2,3,2]]);
 for(const d of cards){assert.equal(d.once,false);assert.deepEqual(d.gain,d.id==='A13'?{money:1}:{});assert.equal(d.stress,0);assert.equal(d.minSanity,0);assert.equal(d.maxSanity,10);assert.ok(!d.professional);}
});
test('placing and removing support changes bar immediately, without instant fee or refund',()=>{
 const g=make(),p=g.players[0],c=add(g,p,'W13');E.place(g,0,c.uid,{day:6,period:0});assert.equal(p.sanity,6);assert.equal(p.money,8);
 turn(g);E.unplace(g,0,c.uid);assert.equal(p.sanity,3);assert.equal(p.money,8);
});
test('support prepaid once after inspection, same bar over three weeks, no accumulation',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['W13',6]]);
 for(let i=0;i<3;i++){lock(g);const money=p.money;E.rollInspections(g);assert.equal(p.money,money-2);assert.equal(p.sanity,6);E.rollInspections(g);assert.equal(p.money,money-2);E.resolveAll(g);assert.equal(p.money,money+g.config.salary-2);assert.equal(p.sanity,6);if(i<2)next(g);}
});
test('Sunday support enables earlier activities and is not charged again on Sunday',()=>{
 const g=make({startSanity:0}),p=g.players[0];rig(g,p,[['A02',0,2],['W13',6]]);lock(g);const m=p.money;E.resolveAll(g);
 assert.equal(p.skills[0]?.type,'A02');assert.equal(p.sanity,3);assert.equal(p.money,m+g.config.salary-2);
});
test('insufficient upfront cash: later income and salary do not reactivate support',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['A02',0,2],['W13',6]]);lock(g);p.money=1;E.resolveAll(g);
 assert.equal(p.sanity,3);assert.equal(p.money,1+g.config.salary);assert.equal(p.supports[0].reason,'付不起维持费');assert.equal(E.unplacedCards(p).filter(c=>c.type==='W13').length,1);assert.equal(p.supports[0].active,false);
 next(g);E.syncSanity(g,p);assert.equal(p.sanity,3); // Funding next week does not auto-arrange a withdrawn card.
});
test('multiple support fees paid in schedule order; unaffordable one does not block cheaper later one',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['W13',0],['W13',1],['B13',2]]);lock(g);p.money=3;E.rollInspections(g);
 assert.deepEqual(p.supports.map(x=>x.active),[true,false,true]);assert.equal(p.money,0);assert.equal(p.sanity,8);
});
test('caught support loses whole-week contribution, costs no upkeep, fined exactly one',()=>{
 const g=make({startSanity:0}),p=g.players[0];rig(g,p,[['A02',0,2],['W13',5]]);g.inspection.inspectionCount=1;g.diceRandom=seedFor([6]);lock(g);const m=p.money;E.rollInspections(g);
 assert.equal(p.sanity,0);assert.equal(p.money,m);E.resolveAll(g);assert.equal(p.skills.length,0);assert.equal(p.caught,1);assert.equal(p.money,m+g.config.salary-1);
});
test('team event disables support without upkeep or inspection fine',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['W13',6]]);g.inspection.blockedTimes=[{day:6,period:0}];lock(g);const m=p.money;E.resolveAll(g);assert.equal(p.sanity,3);assert.equal(p.money,m+g.config.salary);assert.equal(p.caught,0);
});
test('4h night and two 2h night cards disable all support on that night, pressure stays',()=>{
 for(const plan of [[['W13',0,2]],[['C13',0,2],['C13',0,2]]]){
  const g=make({startSanity:8}),p=g.players[0];rig(g,p,plan);assert.equal(p.sanity,4);lock(g);const m=p.money;E.resolveAll(g);assert.equal(p.sanity,4);assert.equal(p.money,m+g.config.salary);assert.ok(p.supports.every(x=>!x.active));
 }
 const g=make(),p=g.players[0],c=add(g,p,'W13');assert.match(E.canPlace(g,p,c.uid,{day:6,period:2}),/低于 0/);
});
test('protected 2h support stays active on inspected work slot',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['C13',0]]);p.protectedSlot='0-0';g.inspection.inspectionCount=1;g.diceRandom=seedFor([1]);lock(g);E.resolveAll(g);assert.equal(p.sanity,5);assert.equal(p.caught,0);assert.equal(p.supports[0].active,true);
});
test('support and pressure apply before clamp, withdrawal does not manufacture sanity',()=>{
 const g=make({startSanity:9}),p=g.players[0],c=add(g,p,'W13');E.place(g,0,c.uid,{day:6,period:0});assert.equal(p.sanity,10);turn(g);E.unplace(g,0,c.uid);assert.equal(p.sanity,9);
});
test('buying or locking capital reduces preview support budget',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['W13',6]]);p.money=2;E.syncSanity(g,p);assert.equal(p.sanity,6);
 const c=g.market[2].find(c=>getCard(c).price.money===2);E.buy(g,0,c.uid);assert.equal(p.sanity,3);
 const h=make(),q=h.players[0];rig(h,q,[['W13',6]]);q.money=4;const job=add(h,q,'C06');
 E.place(h,0,job.uid,{day:0,period:0});assert.equal(q.money,0);assert.equal(q.sanity,2);
});
test('preview is pure, prepays support and reload never double charges',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['W13',6]]);const before=JSON.stringify(g),preview=E.preview(g,0);assert.equal(preview.sanity,6);assert.equal(preview.money,9);assert.equal(JSON.stringify(g),before);
 lock(g);E.step(g);const clone=JSON.parse(JSON.stringify(g));E.resolveAll(g);E.resolveAll(clone);assert.deepEqual(clone,g);
});
test('income alone cannot escape; exact sanity six qualifies before escape autonomy',()=>{
 const g=make(),p=g.players[0];g.phase='escape';p.income=10;assert.equal(E.eligible(g,p),false);
 rig(g,p,[['W13',6]]);assert.equal(E.eligible(g,p),true);p.money=1;assert.equal(E.eligible(g,p),false);
});
