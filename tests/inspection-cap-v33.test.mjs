import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {make,rig,lock,seedFor,add,next} from './helpers.mjs';

function checked(plan,faces,rounds=1,options={}){
 const g=make({startMoney:30,...options});rig(g,g.players[0],plan);
 g.inspection.inspectionCount=rounds;g.diceRandom=seedFor(faces);
 return g;
}
test('a hit can chase once, but never follows a second hit in the same round',()=>{
 const g=checked([['B03',0],['B03',1],['B03',2]],[1,2,3]);
 lock(g);E.rollInspections(g);
 assert.deepEqual(g.inspection.rolls,[1,2]);
 E.resolveAll(g);assert.equal(g.players[0].caught,2);assert.equal(g.players[0].income,1);
});
test('each advertised round gets its own chase, while a previously hit date ends a round',()=>{
 const g=checked([['B03',0],['B03',1],['B03',2]],[1,2,1,3,4],3);
 lock(g);E.rollInspections(g);
 assert.deepEqual(g.inspection.chains.map(c=>c.map(x=>x.face)),[[1,2],[1],[3,4]]);
 E.resolveAll(g);assert.equal(g.players[0].caught,3);assert.equal(g.players[0].money,30-3+3);
});
test('a miss ends only that player participation; protected cards do not trigger chasing',()=>{
 const g=checked([['B03',0],['B03',1]],[1,2]);rig(g,g.players[1],[['B03',1]]);
 lock(g);E.rollInspections(g);
 assert.equal(g.inspection.playerTimes[1].length,0);assert.equal(g.inspection.playerTimes[0].length,4);
 const h=checked([['W04',0]],[1,2]);
 lock(h);E.rollInspections(h);assert.deepEqual(h.inspection.rolls,[1]);
});
test('caught support retains sanity, waives execution fees, and cannot trigger a low sanity event',()=>{
 const g=checked([['A11',0]],[1,2]),p=g.players[0];add(g,p,'A06');
 g.inspection.wellbeing={effect:'hand',max:3};
 assert.equal(p.sanity,4);lock(g);E.rollInspections(g);
 assert.equal(p.sanity,4);assert.equal(p.money,30);assert.equal(g.opportunity,null);
 assert.equal(p.supports[0].active,true);assert.equal(p.supports[0].fee,0);
 const before=structuredClone(g);E.rollInspections(g);assert.deepEqual(g,before);
 E.resolveAll(g);assert.equal(p.money,32);assert.equal(p.sanity,4);assert.equal(p.caught,1);
 // Withdrawing still cancels the placement effect.
 next(g);g.day=2;g.turn=0;
 while(E.activeBuyer(g)!==0)g.turn++;
 E.unplace(g,0,p.cards.find(c=>c.type==='A11').uid);assert.equal(p.sanity,3);
});
test('mixed income/support and negative sanity remain on the board when caught',()=>{
 const g=checked([['A11',0],['A03',0,1]],[1,2]),p=g.players[0];
 const before=p.sanity;lock(g);E.resolveAll(g);
 assert.equal(p.sanity,before);assert.equal(p.income,0);assert.equal(p.caught,2);
});
test('caught growth retains its progress and does not pay or advance',()=>{
 const g=checked([['B02',0]],[1,2]),p=g.players[0],c=p.cards[0];c.progress=1;
 lock(g);E.resolveAll(g);assert.equal(c.progress,1);assert.equal(p.skills.length,0);
 assert.equal(p.money,32);
});
