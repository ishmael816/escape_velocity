import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {getCard} from '../src/cards.js';
import {make,rig,lock,finish,next,passKeeping,seedFor} from './helpers.mjs';
function passDay(g){const day=g.day;while(g.phase==='planning'&&g.day===day)passKeeping(g,E.activeBuyer(g));}
test('2–4 players: all passes advance five stages without free resources',()=>{
 for(const playerCount of [2,3,4]){
  const g=make({playerCount}),before=g.players.map(p=>[p.money,p.sanity]);
  for(let day=0;day<5;day++){assert.equal(g.day,day);passDay(g);if(day<4){assert.equal(g.phase,'planning');assert.equal(g.day,day+1);}}
  assert.equal(g.phase,'resolving');assert.equal(g.actionCount,playerCount*5);assert.equal(g.endedByPass,false);assert(!g.inspectionResolved);
  assert.deepEqual(g.players.map(p=>[p.money,p.sanity]),before);assert.throws(()=>E.pass(g,0));
  E.resolveAll(g);assert.equal(g.phase,'escape');assert.equal(g.history.length,1);assert.equal(g.players[0].money,before[0][0]+g.config.salary);
 }
});
test('a Monday skip retains Tuesday purchase and later arrangement',()=>{
 const g=make();passDay(g);assert.equal(g.day,1);const c=g.market[4].find(c=>!E.canBuy(g,g.players[0],getCard(c)));
 E.buy(g,0,c.uid);passKeeping(g,1);assert.equal(g.day,2);passDay(g);assert.equal(g.day,3);E.place(g,0,c.uid,{day:getCard(c).professional?0:6,period:0});assert.equal(E.activeBuyer(g),1);
});
test('reload preserves partial stages and next week rotates seats',()=>{
 const g=make({playerCount:3});passKeeping(g,0);passKeeping(g,1);const restored=JSON.parse(JSON.stringify(g));passKeeping(g,2);passKeeping(restored,2);assert.deepEqual(restored,g);
 finish(g);next(g);assert.equal(g.day,0);assert.equal(g.actionCount,0);assert.equal(E.activeBuyer(g),1);passDay(g);assert.equal(g.day,1);
});
test('skipping all stages still executes later days, inspection and support',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['A06',5],['W10',6]]);g.inspection.inspectionCount=1;g.diceRandom=seedFor([6]);
 lock(g);assert.equal(g.timeline.length,2);assert.equal(g.actionCount,10);E.resolveAll(g);assert.equal(p.caught,1);assert.equal(p.income,0);assert.equal(p.sanity,5);assert.equal(p.money,8-2-1+3);assert.equal(p.supportWeek,1);
});
test('escaped players are excluded from every fixed stage and reservation',()=>{
 const g=make({playerCount:3});g.players[0].escaped=true;assert.throws(()=>E.pass(g,0));
 for(let day=0;day<5;day++){assert.equal(E.activeBuyer(g),1);passDay(g);}
 assert.equal(g.actionCount,10);assert.equal(g.phase,'resolving');
});
