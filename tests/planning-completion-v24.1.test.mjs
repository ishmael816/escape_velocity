import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {make,rig,next,finish} from './helpers.mjs';

test('voluntary planning completion uses ordinary passes, never skips an unmarked player',()=>{
 const g=make(),manual=structuredClone(g);E.setPlanningDone(g,0,true);assert.equal(g.actionCount,0);
 assert(E.autoPassPlanning(g));E.pass(manual,0);assert.equal(g.actionCount,1);assert.equal(E.activeBuyer(g),1);
 const before=structuredClone(g);assert.equal(E.autoPassPlanning(g),false);assert.deepEqual(g,before);
 delete g.players[0].planningDoneWeek;assert.deepEqual(g,manual);
});
test('completion can be cancelled between turns, survives reload, and expires after its week',()=>{
 const g=make();E.setPlanningDone(g,0,true);const restored=JSON.parse(JSON.stringify(g));assert(E.planningDone(restored,0));
 E.autoPassPlanning(restored);const actions=restored.actionCount;E.setPlanningDone(restored,0,false);assert.equal(restored.actionCount,actions);assert(!E.planningDone(restored,0));
 E.pass(restored,1);E.resolveAll(restored);next(restored);assert(!E.planningDone(restored,0));assert.equal(E.autoPassPlanning(restored),false);
 const old=make();E.setPlanningDone(old,0,true);finish(old);next(old);assert(!E.planningDone(old,0));
});
test('completion stops before resolution and cannot consume a pending human search',()=>{
 const g=make();rig(g,g.players[0],[['B-Q',6]]);E.setPlanningDone(g,0,true);E.autoPassPlanning(g);
 E.setPlanningDone(g,1,true);E.autoPassPlanning(g);assert.equal(g.phase,'resolving');assert(!g.inspectionResolved);
 const before=structuredClone(g);assert.equal(E.autoPassPlanning(g),false);assert.deepEqual(g,before);
 E.resolveAll(g);assert(g.opportunity);const pending=structuredClone(g);assert.equal(E.autoPassPlanning(g),false);assert.deepEqual(g,pending);
});
test('completion cannot mark another turn, a bot, or a finished phase',()=>{
 const g=make();let before=structuredClone(g);assert.throws(()=>E.setPlanningDone(g,1,true));assert.deepEqual(g,before);
 g.players[0].bot=true;before=structuredClone(g);assert.throws(()=>E.setPlanningDone(g,0,true));assert.deepEqual(g,before);
 g.players[0].bot=false;finish(g);before=structuredClone(g);assert.throws(()=>E.setPlanningDone(g,0,true));assert.deepEqual(g,before);
});
