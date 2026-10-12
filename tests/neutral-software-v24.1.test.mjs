import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {CARDS,ADVANCED} from '../src/cards.js';
import {make,add,skills,rig,turn,finish,lock,seedFor} from './helpers.mjs';

test('card pool contains no simultaneous positive support and printed stress',()=>{
 assert.deepEqual([...CARDS,...ADVANCED].filter(c=>c.support>0&&c.stress>0).map(c=>c.id),[]);
});
test('neutral software can be placed at zero sanity without manufacturing sanity or fees',()=>{
 const g=make({startSanity:0,startMoney:0}),p=g.players[0];skills(p,'BB');const c=add(g,p,'B-H');
 E.place(g,0,c.uid,{day:6,period:0});assert.equal(p.sanity,0);assert.deepEqual(E.supportPlan(g,p),[]);
 const before=structuredClone(g),pred=E.preview(g,0);assert.deepEqual(g,before);assert.equal(pred.income,5);assert.equal(pred.sanity,0);
 turn(g);E.place(g,0,c.uid,{day:5,period:0});assert.equal(p.sanity,0);assert.equal(p.money,0);
 E.unplace(g,0,c.uid);assert.equal(p.sanity,0);assert.equal(p.money,0);
 E.place(g,0,c.uid,{day:6,period:0});turn(g);E.discardCard(g,0,c.uid);assert.equal(p.sanity,0);assert.equal(p.money,0);
});
test('neutral software still requires BB and a whole daytime slot',()=>{
 const g=make(),p=g.players[0],c=add(g,p,'B-H');assert.match(E.canPlace(g,p,c.uid,{day:6,period:0}),/技能/);
 skills(p,'BB');assert.match(E.canPlace(g,p,c.uid,{day:6,period:2}),/8h/);
 const other=add(g,p,'B-E');E.place(g,0,other.uid,{day:6,period:1});turn(g);
 assert.match(E.canPlace(g,p,c.uid,{day:6,period:0}),/8h/);
});
test('caught neutral software loses five income and one fine, with no hidden sanity penalty',()=>{
 const g=make(),p=g.players[0];skills(p,'BB');rig(g,p,[['B-H',0]]);
 g.inspection.inspectionCount=3;g.diceRandom=seedFor([1,1,1]);
 assert.equal(E.preview(g,0).income,5);assert.equal(E.preview(g,0).uncertain,true);
 lock(g);E.rollInspections(g);assert.equal(p.sanity,3);assert.deepEqual(p.supports,[]);
 const clone=structuredClone(g);E.rollInspections(g);assert.deepEqual(g,clone);E.resolveAll(g);
 assert.equal(p.income,0);assert.equal(p.caught,1);assert.equal(p.money,10);assert.equal(p.sanity,3);
 E.resolveAll(clone);assert.deepEqual(g,clone);
});
for(const period of [0,1])test(`team blocking neutral software half ${period} cancels income but has no sanity side effect`,()=>{
 const g=make(),p=g.players[0];skills(p,'BB');rig(g,p,[['B-H',6]]);g.inspection.blockedTimes=[{day:6,period}];
 assert.equal(E.preview(g,0).income,0);assert.equal(E.preview(g,0).sanity,3);finish(g);
 assert.equal(p.income,0);assert.equal(p.sanity,3);assert.equal(p.money,11);assert.equal(p.caught,0);
});
test('unfunded rest is withdrawn before software earns income; software cannot finance maintenance early',()=>{
 const g=make({startMoney:1}),p=g.players[0];skills(p,'BB');rig(g,p,[['B-H',0],['W-S',6]]);
 finish(g);assert.equal(p.income,5);assert.equal(p.sanity,3);assert.equal(p.money,9);
 assert.equal(E.unplacedCards(p).filter(c=>c.type==='W-S').length,1);assert.equal(p.supports.length,1);assert.equal(p.supports[0].active,false);
});
test('two software copies plus full rest qualify only if both income cards succeed and rest is funded',()=>{
 for(const caught of [false,true]){
  const g=make({playerCount:4}),p=g.players[0];skills(p,'BB');rig(g,p,[['B-H',0],['B-H',5],['W-S',6]]);
  const pred=E.preview(g,0);assert.equal(pred.income,10);assert.equal(pred.sanity,7);
  if(caught){g.inspection.inspectionCount=1;g.diceRandom=seedFor([1]);}
  finish(g);assert.equal(p.income,caught?5:10);assert.equal(p.sanity,7);assert.equal(E.eligible(g,p),!caught);
  assert.equal(p.supports.filter(x=>x.active).reduce((n,x)=>n+x.fee,0),2);
 }
});
