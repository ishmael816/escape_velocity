import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {getCard} from '../src/cards.js';
import {make,add,rig,skills,next} from './helpers.mjs';
const offers=g=>Object.values(g.market).flat();
const supply=g=>[...offers(g),...Object.values(g.decks).flat(),...Object.values(g.discard).flat(),...g.players.flatMap(p=>[...p.cards,...(p.reserved?[p.reserved]:[])])].map(c=>c.uid).sort();
function until(g,day){let n=0;while(g.phase==='planning'&&g.day<day){assert(++n<50);if(g.marketRefresh)E.chooseMarketRefresh(g,E.activeBuyer(g));else E.pass(g,E.activeBuyer(g));}}
function skipReserve(g){while(g.weekendReserve)E.chooseReserve(g,E.activeBuyer(g));}
test('fixed phases enforce two procurements, free Wednesday adjustments and two new placements',()=>{
 const g=make(),p=g.players[0],a=add(g,p,'A06'),b=add(g,p,'A06'),c=add(g,p,'A06');
 assert.throws(()=>E.place(g,0,a.uid,{day:0,period:0}),/周四/);until(g,2);
 p.schedule={'5-0':[a.uid]};const actions=g.actionCount;
 E.place(g,0,a.uid,{day:0,period:0});E.place(g,0,a.uid,{day:1,period:0});assert.equal(g.actionCount,actions);
 assert.throws(()=>E.place(g,0,b.uid,{day:1,period:1}),/周四/);assert.throws(()=>E.buy(g,0,offers(g)[0].uid),/采购/);
 E.pass(g,0);E.pass(g,1);assert.equal(g.day,3);
 assert.throws(()=>E.place(g,0,a.uid,{day:0,period:0}),/周三/);
 E.unplace(g,0,a.uid);E.place(g,0,b.uid,{day:0,period:0});assert.equal(E.activeBuyer(g),1);
 assert.throws(()=>E.place(g,0,c.uid,{day:0,period:1}),/轮到|等待/);E.pass(g,1);
 E.place(g,0,c.uid,{day:0,period:1});E.pass(g,1);assert(g.weekendReserve);assert.equal(g.actionCount,10);assert(!g.inspectionResolved);
});
test('reservation requires an empty free morning, counts physical occupancy and excludes temporary weekends',()=>{
 const g=make(),p=g.players[0];assert(E.canReserve(g,p));rig(g,p,[['A06',6]]);assert(!E.canReserve(g,p));
 p.tempWeekend=true;assert(!E.canReserve(g,p));p.weekend=true;assert(E.canReserve(g,p));
 rig(g,p,[['A08',5],['A08',6]]);assert(!E.canReserve(g,p));
 p.schedule={};p.reserved={uid:'reserved',type:'A06'};assert(!E.canReserve(g,p));p.reserved=null;p.escaped=true;assert(!E.canReserve(g,p));
});
test('reserve is free, refills immediately, preserves supply and cannot be replaced, used or discarded',()=>{
 let g=make({startMoney:0}),p=g.players[0];const before=supply(g);until(g,5);
 const c=g.market[8].find(c=>getCard(c).requires),uid=c.uid;assert(c);assert(E.canBuy(g,p,getCard(c)));
 const actions=g.actionCount,dice=g.diceRandom;E.chooseReserve(g,0,uid);
 assert.equal(p.reserved.uid,uid);assert.equal(p.money,0);assert.equal(p.cards.length,0);assert.equal(E.cardAt(p,uid),undefined);assert(!offers(g).some(c=>c.uid===uid));assert.equal(g.market[8].length,4);assert.deepEqual(supply(g),before);
 const saved=structuredClone(g);assert.throws(()=>E.chooseReserve(g,0,offers(g)[0].uid));assert.deepEqual(g,saved);
 g=JSON.parse(JSON.stringify(g));assert.equal(E.activeBuyer(g),1);E.chooseReserve(g,1);assert.equal(g.phase,'resolving');assert.equal(g.actionCount,actions);assert.equal(g.diceRandom,dice);assert(!g.inspectionResolved);
 E.resolveAll(g);next(g);p=g.players[0];E.pass(g,1);const snapshot=structuredClone(g);assert.throws(()=>E.buy(g,0,uid));assert.deepEqual(g,snapshot);
 p.money=100;skills(p,'WWWWAAAABBBBCCCC');const price=getCard(p.reserved).price.money;E.buy(g,0,uid);assert.equal(p.money,100-price);assert.equal(p.reserved,null);assert(p.cards.some(c=>c.uid===uid));assert.equal(g.marketRefresh,null);assert.equal(g.day,1);
});
test('unbought reservation persists through later weeks and is private and non-discardable',()=>{
 const g=make();until(g,5);E.chooseReserve(g,0,g.market[4][0].uid);skipReserve(g);E.resolveAll(g);next(g);
 const uid=g.players[0].reserved.uid;assert.throws(()=>E.buy(g,1,uid),/不在市场/);until(g,2);E.pass(g,1);assert.throws(()=>E.discardCard(g,0,uid),/待买/);
 until(g,5);assert.equal(g.weekendReserve.player,1);E.chooseReserve(g,1);E.resolveAll(g);next(g);assert.equal(g.players[0].reserved.uid,uid);
});
test('weekend queue follows rotated seats and grants one choice even with both free mornings',()=>{
 const g=make({playerCount:4});g.first=2;g.players[3].escaped=true;g.players[2].weekend=true;
 rig(g,g.players[1],[['A08',6]]);until(g,5);assert.equal(E.activeBuyer(g),2);assert.deepEqual(g.weekendReserve.remaining,[0]);E.chooseReserve(g,2);assert.equal(E.activeBuyer(g),0);E.chooseReserve(g,0);assert.equal(g.phase,'resolving');assert.equal(g.actionCount,15);
});
test('refresh protection forbids refreshing, but still allows weekend reservation',()=>{
 const g=make();E.pass(g,0);E.pass(g,1);E.chooseMarketRefresh(g,0,0);E.chooseMarketRefresh(g,1);const c=E.marketCell(g,'A',0);until(g,5);E.chooseReserve(g,0,c.uid);assert.equal(g.players[0].reserved.uid,c.uid);assert(E.refreshProtected(g,0));
});
