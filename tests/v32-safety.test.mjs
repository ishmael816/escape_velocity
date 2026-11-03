import {placementTurn,adjustmentTurn} from './helpers.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {make,rig,finish,next,seedFor,add,lock} from './helpers.mjs';
import {opportunityPanel} from '../src/opportunity-ui.js';
import {placementPanel} from '../src/marker-ui.js';

test('chain inspection continues on unprotected hits and stops on an already checked day',()=>{
 const g=make(),[p,q]=g.players;rig(g,p,[['A06',0],['A06',1]]);rig(g,q,[['A06',1]]);
 g.inspection.inspectionCount=1;g.diceRandom=seedFor([1,2,2]);finish(g);
 assert.deepEqual(g.inspection.rolls,[1,2,2]);assert.equal(p.caught,2);assert.equal(q.caught,0);assert.equal(p.income,0);assert.equal(q.income,1);
 assert.equal(p.money,9);assert.equal(q.money,12);
});
test('8h hit and repeated inspection charge each actual activity only once',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['B09',0],['A06',1],['A06',1,1]]);
 g.inspection.inspectionCount=2;g.diceRandom=seedFor([1,2,2,1]);finish(g);assert.equal(p.caught,3);assert.equal(p.income,0);assert.equal(p.money,8);
});
test('duty and working professional cards do not extend an inspection chain',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['W06',0],['A06',1]]);p.cards[1].duty=1;
 g.inspection.inspectionCount=1;g.diceRandom=seedFor([2,1]);finish(g);
 assert.equal(g.opportunity.stage,'lane');E.chooseOpportunityLane(g,0,4);E.chooseOpportunity(g,0);E.resolveAll(g);
 assert.deepEqual(g.inspection.rolls,[2]);assert.equal(p.caught,0);assert.equal(p.income,1);
});
test('earlier income cannot pay a later growth execution fee before weekly payout',()=>{
 const g=make({startMoney:0}),p=g.players[0];rig(g,p,[['A06',0],['B02',1]]);finish(g);
 assert.equal(p.cards.find(c=>c.type==='B02').progress,undefined);assert.equal(p.money,4);
});
test('empty nights never generate inspiration automatically',()=>{
 const g=make();for(let n=0;n<3;n++){finish(g);assert.equal(E.inspirationCount(g.players[0]),0);if(n<2)next(g);}
});
test('night and full Sunday costs use occupancy; support does not accumulate',()=>{
 const g=make({startMoney:30}),p=g.players[0];rig(g,p,[['W10',0,2],['W10',6],['W10',6,1]]);
 assert.equal(p.sanity,6);finish(g);assert.equal(p.sanity,6);next(g);finish(g);assert.equal(p.sanity,6);
});
test('discarding a replayable archive preserves one physical card and clears markers',()=>{
 const g=make(),p=g.players[0],c={uid:'archived-pipeline',type:'B05',auto:1,progress:1};p.skills.push(c);
 adjustmentTurn(g);E.discardCard(g,0,c.uid);assert(!p.skills.includes(c));assert.equal(g.discard[4].filter(x=>x.uid===c.uid).length,1);assert.equal(c.auto,undefined);assert.equal(c.progress,undefined);
});
test('marker selection UI exposes sources and occupied nights are excluded',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['A03',0],['W01',2,2]]);lock(g);E.resolveAll(g);
 const html=opportunityPanel(g);assert(html.includes('marker-night-0'));assert(html.includes('marker-night-1'));assert(!html.includes('value="2-2"'));assert(html.includes('opp-marker'));
});
test('investment placement UI exposes current rate, capacity and duty choice',()=>{
 const g=make(),p=g.players[0],c=add(g,p,'C06');p.duty=1;g.exchangeRate=4;
 const html=placementPanel(g,p,c.uid,{day:0,period:0});assert(html.includes('marker-play-capital'));assert(html.includes('max="3"'));assert(html.includes('$4'));assert(html.includes('marker-play-duty'));
});
