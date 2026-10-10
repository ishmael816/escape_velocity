import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {make,rig,lock,next,seedFor} from './helpers.mjs';

test('side income is paid only after the last slot; inspiration still chains immediately',()=>{
 const g=make({startInspiration:0}),p=g.players[0];
 rig(g,p,[['A05',0],['C05',1],['A05',6]]);lock(g);const money=p.money;
 E.step(g);E.step(g);assert.equal(p.inspiration,1);
 E.step(g);assert.equal(p.money,money);assert.equal(p.income,0);assert.equal(p.inspiration,0);
 assert.equal(E.eligible(g,p),false);
 E.resolveAll(g);assert.equal(p.money,money+4);assert.equal(p.income,1);
 assert.deepEqual(p.settlement,{week:1,sideIncome:1,otherIncome:0,salary:3,eventMoney:0,total:4});
 next(g);assert.equal(p.settlement,null);assert.deepEqual(p.weeklyEarnings,[]);assert.equal(p.income,0);
});

test('earned cash cannot fund a later paid activity; preview uses the same rule',()=>{
 const g=make({startMoney:0}),p=g.players[0];
 rig(g,p,[['C05',0],['C14',6]]);
 const prediction=E.preview(g,0);assert.equal(prediction.money,4);
 assert.ok(prediction.warnings.some(x=>x.text.includes('资源不足')));
 lock(g);E.resolveAll(g);
 assert.equal(g.opportunity,null);assert.equal(p.money,4);assert.equal(p.income,1);
 assert.ok(p.cards.some(c=>c.type==='C14'));assert.equal(p.skills.length,0);
});

test('cash returns, salary bonuses and event awards share payout but never count as side income',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['W05',0],['W06',1],['B01',6]]);
 g.diceRandom=seedFor([6]);g.inspection.gain={money:2};lock(g);const money=p.money;
 E.step(g);E.step(g);E.step(g);
 assert.equal(p.money,money);assert.equal(p.income,0);
 E.resolveAll(g);
 assert.equal(p.settlement.otherIncome,6);assert.equal(p.settlement.eventMoney,2);
 assert.equal(p.settlement.total,11);assert.equal(p.money,money+11);assert.equal(p.income,0);
});

test('opportunity purchase cannot spend pending earnings; reload pays the bill exactly once',()=>{
 const g=make({startMoney:0}),p=g.players[0];rig(g,p,[['C05',0],['A14',6]]);
 lock(g);E.resolveAll(g);assert.equal(g.opportunity.sourceType,'A14');assert.equal(p.money,0);
 g.decks[2]=[{uid:'bill-candidate',type:'A02'}];g.discard[2]=[];
 E.chooseOpportunityLane(g,0,2);
 assert.throws(()=>E.chooseOpportunity(g,0,'bill-candidate'),/资金不足/);
 const restored=JSON.parse(JSON.stringify(g));
 for(const x of [g,restored]){E.chooseOpportunity(x,0);E.resolveAll(x);assert.equal(x.players[0].money,4);E.resolveAll(x);assert.equal(x.players[0].money,4);}
 assert.deepEqual(restored,g);
});

test('caught activity contributes no earnings; paid fees and fines are not charged twice',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['C05',0],['C05',6],['A13',6,2]]);
 g.inspection.inspectionCount=1;g.diceRandom=seedFor([1]);lock(g);const money=p.money;
 E.resolveAll(g);assert.equal(p.caught,1);assert.equal(p.income,1);
 assert.equal(p.settlement.total,4);assert.equal(p.money,money-1-1+4);
 assert.equal(p.weeklyEarnings.filter(x=>x.type==='C05').length,1);
});

test('escaped players still receive side income but no employee salary or bonus',()=>{
 const g=make(),p=g.players[0];p.escaped=true;rig(g,p,[['C05',6]]);
 g.inspection.gain={money:2};g.inspection.employeesOnly=true;lock(g);const money=p.money;
 E.resolveAll(g);assert.equal(p.settlement.salary,0);assert.equal(p.settlement.eventMoney,0);
 assert.equal(p.settlement.total,1);assert.equal(p.money,money+1);
});
