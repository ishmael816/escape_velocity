import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {getCard} from '../src/cards.js';
import {cardFace} from '../src/card-face.js';
import {make,add,rig,turn,finish,next} from './helpers.mjs';
import {unchanged} from './regression-helpers-v22.mjs';

test('Sunday halves together cost 2 sanity; withdrawal and moves recalculate immediately',()=>{
 const g=make(),p=g.players[0],a=add(g,p,'A-E'),b=add(g,p,'B-E');
 E.place(g,0,a.uid,{day:6,period:0});assert.equal(p.sanity,3);
 turn(g);E.place(g,0,b.uid,{day:6,period:1});assert.equal(p.sanity,1);assert.equal(E.sundayStress(g,p),2);
 turn(g);E.place(g,0,b.uid,{day:5,period:1});assert.equal(p.sanity,3);
 turn(g);E.place(g,0,b.uid,{day:6,period:1});turn(g);E.unplace(g,0,a.uid);assert.equal(p.sanity,3);
});
test('one 8h occupies both halves and applies Sunday burden only once',()=>{
 const g=make(),p=g.players[0],c=add(g,p,'B-H');
 E.place(g,0,c.uid,{day:6,period:1});assert.equal(E.sundayStress(g,p),2);assert.equal(p.sanity,1);
 assert.equal(E.slotHours(p,'6-0'),4);assert.equal(E.slotHours(p,'6-1'),4);
 for(let i=0;i<3;i++){finish(g);assert.equal(p.income,3);assert.equal(p.sanity,1);if(i<2)next(g);}
});
test('parallel cards count occupied time, not printed total hours',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['B-M',6,0],['A-E',6,0]]);
 assert.equal(E.slotHours(p,'6-0'),4);assert.equal(E.sundayStress(g,p),0);assert.equal(p.sanity,3);
 const c=add(g,p,'B-E');E.place(g,0,c.uid,{day:6,period:1});assert.equal(p.sanity,1);
});
test('Sunday night remains separate from daytime occupancy',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['A-E',6,0],['B-E',6,2]]);
 assert.equal(E.sundayStress(g,p),0);assert.equal(p.sanity,1);
 const h=make({startSanity:5}),q=h.players[0];rig(h,q,[['A-E',6,0],['B-E',6,1],['A-E',6,2]]);
 assert.equal(E.sanityState(h,q).pressure,4);assert.equal(q.sanity,1);
});
test('Sunday burden participates in placement legality and rejected placement is atomic',()=>{
 const g=make(),p=g.players[0],c=add(g,p,'A-L');
 assert.match(E.canPlace(g,p,c.uid,{day:6,period:0}),/理智/);unchanged(g,()=>E.place(g,0,c.uid,{day:6,period:0}));
 E.place(g,0,c.uid,{day:5,period:0});assert.equal(p.sanity,1);
});
test('outing stays +4 on workdays; Sunday-only compensation preserves net +4',()=>{
 assert.equal(getCard('W-S').support,4);
 for(const day of [0,5,6]){
  const g=make(),p=g.players[0];rig(g,p,[['W-S',day]]);
  assert.equal(E.supportPlan(g,p)[0].amount,day===6?6:4);assert.equal(p.sanity,7);
  const preview=E.preview(g,0);assert.equal(preview.sanity,7);assert.equal(preview.money,9);
  for(let i=0;i<3;i++){finish(g);assert.equal(p.sanity,7);if(i<2)next(g);}
 }
});
test('unfunded outing receives no Sunday compensation and returns to hand',()=>{
 const g=make({startMoney:1}),p=g.players[0];rig(g,p,[['W-S',6]]);
 assert.equal(p.sanity,1);finish(g);assert.equal(p.sanity,3);assert.equal(p.money,4);
 assert.equal(E.findPlacement(p,p.cards[0].uid),null);
});
test('team-paused outing loses its positive effect and Sunday compensation',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['W-S',6]]);g.inspection.blockedTimes=[{day:6,period:0}];
 assert.equal(E.preview(g,0).sanity,1);finish(g);assert.equal(p.sanity,1);assert.equal(p.money,11);
});
test('Sunday burden can block escape without changing income; moving to workdays restores eligibility',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['B-H',6],['B-H',5],['B-M',0],['B-M',1],['B-S',4]]);
 finish(g);assert.equal(p.income,10);assert.equal(p.sanity,4);assert(!E.eligible(g,p));
 next(g);turn(g);const c=p.cards.find(c=>c.type==='B-H');E.place(g,0,c.uid,{day:2,period:0});finish(g);
 assert.equal(p.income,10);assert.equal(p.sanity,6);assert(E.eligible(g,p));
});
test('outing prints base +4 and a separate pictogram for Sunday-only +2',()=>{
 const face=cardFace(getCard('W-S'));assert(face.includes('打出：理智 +4'));assert(face.includes('周日全天理智补偿＋2'));
 assert(!face.includes('打出：理智 +6'));
});
