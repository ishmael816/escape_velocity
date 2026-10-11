import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {make,rig,skills,finish,turn} from './helpers.mjs';
import {offer} from './regression-helpers-v22.mjs';

test('v24: a prepared B board qualifies without W support and pays its printed support fees',()=>{
 const g=make({playerCount:2}),p=g.players[0];skills(p,'BB');
 rig(g,p,[['B-H',6],['B-M',0],['B-M',1],['B-E',2],['B-E',3],['B-S',4],['B-S',5]]);
 assert.equal(p.sanity,7);assert.equal(E.supportPlan(g,p).reduce((s,x)=>s+x.fee,0),2);
 finish(g);assert.equal(p.income,11);assert.equal(p.sanity,7);assert.equal(p.money,20);assert(E.eligible(g,p));
 assert(!p.cards.some(c=>c.type==='W-S'));
});

test('v24: the commercial middle tier is affordable with five cash and cannot farm its smaller principal',()=>{
 const g=make({startMoney:5}),p=g.players[0];skills(p,'C');const c=offer(g,'C-M');
 E.buy(g,0,c.uid);assert.equal(p.money,2);turn(g);
 E.place(g,0,c.uid,{day:6,period:0});assert.equal(p.money,0);assert.equal(c.lockedCapital,2);turn(g);
 const actions=g.actionCount;E.place(g,0,c.uid,{day:5,period:0});assert.equal(p.money,0);assert.equal(g.actionCount,actions);
 E.unplace(g,0,c.uid);assert.equal(p.money,2);assert.equal(c.lockedCapital,undefined);assert.equal(p.income,0);
 const snapshot=structuredClone(g);assert.throws(()=>E.unplace(g,0,c.uid));assert.deepEqual(g,snapshot);
});
