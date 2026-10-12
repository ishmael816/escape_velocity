import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {getCard} from '../src/cards.js';
import {make,turn,lock,next} from './helpers.mjs';
import {offer,supplyIds,unchanged} from './regression-helpers-v22.mjs';

test('search costs two plus the chosen printed price, with two setup actions and no immediate arrangement',()=>{
 const g=make(),p=g.players[0],source=offer(g,'S-Q');const all=supplyIds(g);
 E.buy(g,0,source.uid);assert.equal(p.money,6);assert.equal(g.actionCount,1);assert.equal(getCard(source).price.money,2);
 turn(g);E.place(g,0,source.uid,{day:6,period:0});assert.equal(g.actionCount,3);assert.equal(p.money,6);
 lock(g);E.resolveAll(g);assert.equal(g.opportunity.stage,'lane');const actions=g.actionCount;
 E.chooseOpportunityLane(g,0,8);assert.equal(g.opportunity.options.length,3);
 const target=g.opportunity.options.find(c=>p.money>=getCard(c).price.money);assert(target);const price=getCard(target).price.money;
 E.chooseOpportunity(g,0,target.uid);assert.equal(p.money,6-price);assert.equal(g.actionCount,actions);
 assert.deepEqual(supplyIds(g),all);unchanged(g,()=>E.place(g,0,target.uid,{day:6,period:0}));
 E.resolveAll(g);next(g);assert.equal(g.week,2);assert(p.cards.some(c=>c.uid===target.uid));
});
test('one remaining cash cannot buy search; skipping the revealed choice never refunds the source price',()=>{
 const poor=make({startMoney:1}),unaffordable=offer(poor,'S-Q');unchanged(poor,()=>E.buy(poor,0,unaffordable.uid));
 const g=make({startMoney:2}),p=g.players[0],source=offer(g,'S-Q');E.buy(g,0,source.uid);turn(g);E.place(g,0,source.uid,{day:6,period:0});lock(g);E.resolveAll(g);
 E.chooseOpportunityLane(g,0,4);assert.equal(p.money,0);unchanged(g,()=>E.chooseOpportunity(g,0,g.opportunity.options[0].uid));E.chooseOpportunity(g,0);assert.equal(p.money,0);
 E.resolveAll(g);assert.equal(p.money,3);assert.equal(p.income,0);
});
