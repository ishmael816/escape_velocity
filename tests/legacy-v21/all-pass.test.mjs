import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {make,add,rig,next,seedFor} from './helpers.mjs';

function passDay(g){const day=g.day;while(g.phase==='planning'&&g.day===day)E.pass(g,E.activeBuyer(g));}

test('2–4 players: only a whole day of passes locks the week, with no free resources',()=>{
 for(const playerCount of [2,3,4]){
  const g=make({playerCount}),before=g.players.map(p=>[p.money,p.sanity,p.inspiration]);
  for(let n=0;n<playerCount-1;n++){E.pass(g,E.activeBuyer(g));assert.equal(g.phase,'planning');}
  E.pass(g,E.activeBuyer(g));
  assert.equal(g.phase,'resolving');assert.equal(g.endedByPass,true);assert.equal(g.actionCount,playerCount);
  assert.deepEqual(g.players.map(p=>[p.money,p.sanity,p.inspiration]),before);
  assert.equal(g.mondayMarketRefreshed,true);assert.equal(g.inspectionResolved,false);
  assert.throws(()=>E.pass(g,0),/等待/);
  E.resolveAll(g);assert.equal(g.phase,'escape');assert.equal(g.history.length,1);
  assert.equal(g.players[0].money,before[0][0]+g.config.salary);
 }
});

test('one non-pass continues planning; passes across two different days do not combine',()=>{
 const g=make(),p=g.players[0],c=add(g,p,'A05');
 E.place(g,0,c.uid,{day:6,period:0});E.pass(g,1);
 assert.equal(g.day,1);assert.equal(g.phase,'planning');assert.equal(g.dayPasses,0);
 E.pass(g,0);assert.equal(g.phase,'planning');assert.equal(g.dayPasses,1);
 E.buy(g,1,g.market[2][0].uid);assert.equal(g.day,2);assert.equal(g.endedByPass,false);
 passDay(g);assert.equal(g.phase,'resolving');assert.equal(g.actionCount,6);
});

test('reload preserves partial-day passes, and rotated next week resets them',()=>{
 const g=make({playerCount:3});E.pass(g,0);E.pass(g,1);
 const restored=JSON.parse(JSON.stringify(g));E.pass(g,2);E.pass(restored,2);assert.deepEqual(restored,g);
 E.resolveAll(g);next(g);assert.equal(g.dayPasses,0);assert.equal(g.endedByPass,false);assert.equal(E.activeBuyer(g),1);
 passDay(g);assert.equal(g.phase,'resolving');assert.equal(g.actionCount,3);
});

test('early finish executes later days, inspections and support exactly like a full locked week',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['A07',5],['W13',6]]);
 g.inspection.inspectionCount=1;g.diceRandom=seedFor([6]);
 passDay(g);assert.equal(g.timeline.length,2);
 const full=structuredClone(g);full.endedByPass=false;full.actionCount=14;
 E.resolveAll(g);E.resolveAll(full);
 assert.deepEqual(g.players,full.players);assert.deepEqual(g.diceRolls,full.diceRolls);
 assert.equal(p.caught,1);assert.equal(p.income,0);assert.equal(p.sanity,6);
 assert.equal(p.money,8-2-1+3);assert.equal(p.supportWeek,1);
});

test('all players includes escaped players, and a single pass does not lock that player out',()=>{
 const g=make({playerCount:3});g.players[0].escaped=true;
 E.buy(g,0,g.market[2][0].uid);E.pass(g,1);E.pass(g,2);
 assert.equal(g.day,1);assert.equal(g.phase,'planning');
 E.pass(g,0);E.buy(g,1,g.market[2][0].uid);E.pass(g,2);
 assert.equal(g.day,2);passDay(g);assert.equal(g.phase,'resolving');
});

test('an old partial-day save without pass tracking waits for a fully observed day',()=>{
 const g=make();E.pass(g,0);delete g.dayPasses;
 E.pass(g,1);assert.equal(g.phase,'planning');assert.equal(g.day,1);
 passDay(g);assert.equal(g.phase,'resolving');
});
