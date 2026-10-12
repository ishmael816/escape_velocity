import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {getCard} from '../src/cards.js';
import {make, rig, skills, lock, finish, next, turn, seedFor} from './helpers.mjs';
import {unchanged, reload, offer, supplyIds} from './regression-helpers-v22.mjs';
function search(options={}) {const g=make(options);rig(g,g.players[0],[['S-Q',6]]);lock(g);E.resolveAll(g);return g;}
const stack=(g,types)=>types.map(type=>({uid:'candidate-'+(++g.uid),type}));

test('regression: search rejects wrong owner, stage, lane, candidate and insufficient cash atomically',()=>{
  const g=search({startMoney:0});unchanged(g,()=>E.chooseOpportunityLane(g,1,4));unchanged(g,()=>E.chooseOpportunityLane(g,0,2));
  unchanged(g,()=>E.chooseOpportunity(g,0));unchanged(g,()=>E.step(g));
  E.chooseOpportunityLane(g,0,8);unchanged(g,()=>E.chooseOpportunity(g,1));unchanged(g,()=>E.chooseOpportunity(g,0,'missing'));
  unchanged(g,()=>E.chooseOpportunity(g,0,g.opportunity.options[0].uid));unchanged(g,()=>E.chooseOpportunityLane(g,0,4));
  E.chooseOpportunity(g,0);unchanged(g,()=>E.chooseOpportunity(g,0));E.resolveAll(g);assert.equal(g.players[0].money,3);
});

for(const buy of [false,true])test(`regression: search ${buy?'purchase':'skip'} returns all unchosen cards in exact bottom order`,()=>{
  const g=search(),cards=stack(g,['A-G1','B-G1','A-E','B-E','A-G2']);g.decks[4]=cards.slice();g.discard[4]=[];
  const before=supplyIds(g),money=g.players[0].money;E.chooseOpportunityLane(g,0,4);
  const revealed=[...g.opportunity.options],chosen=buy?revealed[1]:null;
  assert.deepEqual(revealed.map(c=>c.uid),cards.slice(-3).reverse().map(c=>c.uid));
  E.chooseOpportunity(g,0,chosen?.uid??null);
  const remaining=revealed.filter(c=>c!==chosen);assert.deepEqual(g.decks[4].slice(0,remaining.length),remaining.slice().reverse());
  assert.equal(g.decks[4].at(-1).uid,cards[1].uid);assert.deepEqual(supplyIds(g),before);
  assert.equal(g.players[0].money,money-(chosen?getCard(chosen).price.money:0));
});

test('regression: search advanced purchase has full price, no skill bypass and no same-week arrangement',()=>{
  const g=search(),p=g.players[0],c=stack(g,['A-H'])[0];g.decks[8]=[c];g.discard[8]=[];
  E.chooseOpportunityLane(g,0,8);E.chooseOpportunity(g,0,c.uid);assert.equal(p.money,2);assert(p.cards.includes(c));assert(!E.qualified(p,getCard(c)));
  unchanged(g,()=>E.place(g,0,c.uid,{day:6,period:0}));E.resolveAll(g);next(g);turn(g);unchanged(g,()=>E.place(g,0,c.uid,{day:6,period:0}));
});

test('regression: search cannot spend pending income; reload pays earnings and salary exactly once',()=>{
  const g=make({startMoney:0}),p=g.players[0];rig(g,p,[['A-E',0],['S-Q',6]]);lock(g);E.resolveAll(g);
  assert.equal(p.money,0);assert.equal(p.weeklyEarnings[0].money,1);g.decks[4]=stack(g,['A-E']);g.discard[4]=[];
  E.chooseOpportunityLane(g,0,4);unchanged(g,()=>E.chooseOpportunity(g,0,g.opportunity.options[0].uid));
  const clone=reload(g);for(const x of [g,clone]){E.chooseOpportunity(x,0);E.resolveAll(x);assert.equal(x.players[0].money,4);const before=structuredClone(x);E.resolveAll(x);assert.deepEqual(x,before);}
  assert.deepEqual(g,clone);
});

test('regression: same-slot parallel search and following player resume identically after reload at every pause',()=>{
  let g=make();const p=g.players[0];skills(p,'BB');rig(g,p,[['S-Q',6],['B-M',6]]);rig(g,g.players[1],[['S-Q',6]]);
  // A legal v22 parallel slot, unlike the retired two-card night fixture.
  assert.equal(E.slotHours(p,{day:6,period:0}),4);lock(g);const initial=supplyIds(g);E.resolveAll(g);
  for(const id of [0,1]){
    assert.equal(g.opportunity.player,id);assert.equal(g.opportunity.stage,'lane');
    const atLane=reload(g);E.chooseOpportunityLane(g,id,4);E.chooseOpportunityLane(atLane,id,4);assert.deepEqual(g,atLane);
    const atChoice=reload(g);E.chooseOpportunity(g,id);E.chooseOpportunity(atChoice,id);assert.deepEqual(g,atChoice);
    const afterChoice=reload(g);E.resolveAll(g);E.resolveAll(afterChoice);assert.deepEqual(g,afterChoice);
    if(id===0){assert.equal(g.players[0].weeklyEarnings.filter(x=>x.type==='B-M').length,1);assert.equal(g.players[0].money,8);}
    g=reload(g);
  }
  assert.equal(g.phase,'escape');assert.equal(g.history.length,1);assert.equal(g.players[0].income,2);assert.equal(g.players[0].money,13);
  assert.equal(g.opportunityHistory.length,2);assert.deepEqual(supplyIds(g),initial);
});

test('regression: preview neither reads hidden candidates nor mutates either RNG stream',()=>{
  const g=make();rig(g,g.players[0],[['S-Q',6],['B-S',5]]);g.inspection.inspectionCount=2;
  const before=structuredClone(g),prediction=E.preview(g,0);assert.deepEqual(g,before);assert(prediction.uncertain);
  const other=reload(g);for(const pile of Object.values(other.decks))pile.reverse();other.random=123;other.diceRandom=9876;
  assert.deepEqual(E.preview(other,0),prediction);
});

test('regression: inspected or event-blocked search remains owned and scheduled, never opens or recycles',()=>{
  for(const cause of ['inspection','team']){
    const g=make(),p=g.players[0];rig(g,p,[['S-Q',0]]);const c=p.cards[0];
    if(cause==='inspection'){g.inspection.inspectionCount=1;g.diceRandom=seedFor([1]);}else g.inspection.blockedTimes=[{day:0,period:0}];
    finish(g);assert.equal(g.opportunity,null);assert.equal(g.opportunityHistory.length,0);assert(p.cards.includes(c));assert(E.findPlacement(p,c.uid));assert(!g.discard[4].includes(c));
    assert.equal(p.money,cause==='inspection'?10:11);
  }
});

test('regression: exhausted search deck draws discard, excludes its source and conserves every instance',()=>{
  const g=search(),cards=stack(g,['A-G1','B-G1']);g.decks[4]=[];g.discard[4]=cards;
  const before=supplyIds(g),source=g.opportunity.sourceCard.uid;E.chooseOpportunityLane(g,0,4);
  assert.equal(g.opportunity.options.length,2);assert(g.opportunity.options.every(c=>c.uid!==source));assert.equal(g.discard[4].length,0);
  E.chooseOpportunity(g,0);assert.equal(g.discard[4].filter(c=>c.uid===source).length,1);assert.deepEqual(supplyIds(g),before);
  E.resolveAll(g);assert.equal(g.phase,'escape');
});

test('regression: search can reveal both public permissions in their actual duration decks',()=>{
  for(const type of ['W-P1','W-P2']){
    const g=search(),c=stack(g,[type])[0],lane=getCard(type).hours;g.decks[lane]=[c];g.discard[lane]=[];
    E.chooseOpportunityLane(g,0,lane);E.chooseOpportunity(g,0,c.uid);assert(g.players[0].cards.includes(c));assert(!E.qualified(g.players[0],getCard(c)));
  }
});

test('regression: humans remain pending; bots finish only their own search',()=>{
  const g=search(),before=structuredClone(g);E.botOpportunity(g);assert.deepEqual(g,before);
  g.players[1].bot=true;E.botOpportunity(g);assert.equal(g.opportunity.player,0);g.players[0].bot=true;E.botOpportunity(g);assert.equal(g.opportunity,null);
  E.resolveAll(g);assert.equal(g.phase,'escape');
});

function hiring(options={}) {
  const g=make(options),p=g.players[0];skills(p,'CBB');rig(g,p,[['C-U',0],['B-M',0],['A-E',6]]);
  const target=offer(g,'A-G2');g.mondayMarketBought=true;lock(g);E.resolveAll(g);return {g,target};
}

test('regression: hire owner, target, affordability and double-selection failures are atomic; reload resumes same-slot queue',()=>{
  const {g,target}=hiring();unchanged(g,()=>E.chooseHire(g,1,target.uid));unchanged(g,()=>E.chooseHire(g,0,'missing'));
  const clone=reload(g),before=supplyIds(g);
  for(const x of [g,clone]){E.chooseHire(x,0,target.uid);unchanged(x,()=>E.chooseHire(x,0,target.uid));E.resolveAll(x);assert.equal(x.players[0].income,3);assert.equal(x.players[0].money,11);assert.equal(x.players[0].settlement.otherIncome,0);}
  assert.deepEqual(g,clone);assert.deepEqual(supplyIds(g),before);assert.equal(g.players[0].skills.filter(c=>c.uid===target.uid).length,1);
  const poor=hiring({startMoney:0});unchanged(poor.g,()=>E.chooseHire(poor.g,0,poor.target.uid));E.chooseHire(poor.g,0);E.resolveAll(poor.g);assert.equal(poor.g.players[0].money,6);
});

test('regression: hire cannot use pending earnings or rehire an archived name next week',()=>{
  const g=make({startMoney:0}),p=g.players[0];skills(p,'C');rig(g,p,[['W-E',0],['C-U',1]]);
  const target=offer(g,'A-G1');g.mondayMarketBought=true;lock(g);E.resolveAll(g);assert.equal(p.weeklyEarnings[0].money,1);
  unchanged(g,()=>E.chooseHire(g,0,target.uid));E.chooseHire(g,0);E.resolveAll(g);assert.equal(p.money,4);
  next(g);g.mondayMarketBought=true;offer(g,'A-G1');lock(g);E.resolveAll(g);E.chooseHire(g,0,target.uid);E.resolveAll(g);
  next(g);g.mondayMarketBought=true;const duplicate=offer(g,'A-G1');lock(g);E.resolveAll(g);
  assert(!E.hireCandidates(g,0).some(c=>c.type==='A-G1'));unchanged(g,()=>E.chooseHire(g,0,duplicate.uid));E.chooseHire(g,0);E.resolveAll(g);
});
