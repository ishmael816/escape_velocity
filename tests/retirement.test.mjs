import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {make,rig,quiet,lock,finish} from './helpers.mjs';

function escape(g,id){
 g.phase='escape';g.players[id].income=10;
 g.escapeDecisions=Object.fromEntries(E.playingPlayers(g).filter(p=>p.id!==id).map(p=>[p.id,false]));
 E.chooseEscape(g,id);E.closeWeek(g);
}

test('staggered winners leave play; N−1 ends without an extra week',()=>{
 const g=make({playerCount:4,startSanity:6});
 escape(g,1);
 assert.equal(g.week,2);assert.equal(g.phase,'planning');assert.equal(E.activeBuyer(g),2);
 assert.deepEqual(E.playingPlayers(g).map(p=>p.id),[0,2,3]);
 escape(g,2);
 assert.equal(g.week,3);assert.equal(E.activeBuyer(g),3);
 assert.deepEqual(E.playingPlayers(g).map(p=>p.id),[0,3]);
 escape(g,0);
 assert.equal(g.phase,'ended');assert.equal(g.week,3);
 assert.deepEqual(g.players.map(p=>p.escapedWeek),[3,1,2,null]);
 assert.equal(E.won(g,g.players[3]),false);
});

test('retired board stays frozen through events, support fees, search and reload',()=>{
 const g=make({playerCount:4,startSanity:6}),p=g.players[0];
 // Paid support, repeat search, and ordinary income must all stop executing.
 rig(g,p,[['B-S',0],['C-U',1,2],['A-E',6]]);
 escape(g,0);const before=structuredClone(p);
 for(let week=0;week<2;week++){
  quiet(g);g.inspection.gain={money:5};g.inspection.blockedTimes=[{day:0,period:2}];
  lock(g);assert.equal(g.actionCount,3);assert.deepEqual(g.timeline,[]);
  E.resolveAll(g);assert.equal(g.opportunity,null);assert.deepEqual(p,before);
  assert.equal(Object.hasOwn(g.escapeDecisions,0),false);
  assert.equal(E.preview(g,0).retired,true);assert.deepEqual(E.sanityState(g,p),before.escapeSanityState);
  assert.throws(()=>E.openDraft(g,0,'anything'),/未逃离/);
  E.closeWeek(g);assert.deepEqual(p,before);
 }
 const restored=JSON.parse(JSON.stringify(g));E.syncSanity(restored,restored.players[0]);
 assert.deepEqual(restored.players[0],before);
 assert.throws(()=>E.pass(g,0),/等待/);
 assert.throws(()=>E.place(g,0,p.cards[0].uid,{day:3,period:2}),/等待/);
 assert.throws(()=>E.unplace(g,0,p.cards[0].uid),/等待/);
});

test('rotated rounds skip two retired seats and preserve partial passes on reload',()=>{
 const g=make({playerCount:4});g.players[0].escaped=true;g.players[2].escaped=true;g.first=2;
 assert.equal(E.activeBuyer(g),3);E.pass(g,3);
 assert.equal(E.activeBuyer(g),1);assert.equal(g.phase,'planning');
 const restored=structuredClone(g);E.pass(g,1);E.pass(restored,1);
 assert.deepEqual(restored,g);assert.equal(g.phase,'resolving');assert.equal(g.actionCount,2);
});

test('early settlement still executes Sunday for remaining players',()=>{
 const g=make({playerCount:3});g.players[1].escaped=true;
 rig(g,g.players[2],[['A-E',6]]);finish(g);
 assert.equal(g.endedByPass,true);assert.equal(g.players[2].income,1);
 assert.equal(g.players[1].settlement,null);
});
