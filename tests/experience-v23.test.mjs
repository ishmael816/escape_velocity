import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {getCard} from '../src/cards.js';
import {make,add,rig,turn,finish,next,lock,skills,seedFor} from './helpers.mjs';
import {offer,unchanged,supplyIds,reload} from './regression-helpers-v22.mjs';

test('v23: another lane purchase cannot keep stale cards on display beyond two weeks',()=>{
 const g=make({startMoney:100}),initial=supplyIds(g),old8=g.market[8].map(c=>c.uid);
 for(let week=1;week<=2;week++){
  turn(g);E.buy(g,0,g.market[4][0].uid);finish(g);assert(!g.mondayMarketRefreshed);assert(old8.every(uid=>g.market[8].some(c=>c.uid===uid)));
  const clone=reload(g);next(g);next(clone);assert.deepEqual(g,clone);
 }
 assert.equal(g.week,3);assert(g.market[8].every(c=>!old8.includes(c.uid)&&c.marketSince===3));assert.deepEqual(supplyIds(g),initial);
 assert.equal(g.logs.filter(l=>l.tone==='market-aging').length,1);
});

test('v23: independently replenished offers keep their own age; exhausted expiry conserves instances',()=>{
 const g=make({startMoney:100});turn(g);E.buy(g,0,g.market[4][0].uid);finish(g);next(g);
 turn(g);E.buy(g,0,g.market[4][0].uid);const fresh=g.market[4].at(-1).uid;finish(g);next(g);
 assert(g.market[4].some(c=>c.uid===fresh&&c.marketSince===2));
 const h=make({startMoney:100});for(const lane of [4,8]){h.decks[lane]=[];h.discard[lane]=[];}
 const ids=supplyIds(h);for(let i=0;i<3;i++){finish(h);next(h);}
 assert.deepEqual(supplyIds(h),ids);assert.equal(new Set(supplyIds(h)).size,ids.length);assert(Object.values(h.market).flat().every(c=>h.week-c.marketSince<2));
});

test('v23: direct growth uses a real finite card, full printed price and one purchase action',()=>{
 const g=make(),p=g.players[0],ids=supplyIds(g),before=structuredClone(g),offers=E.learningOffers(g,0);
 assert.deepEqual(g,before);assert.equal(offers.length,4);assert.deepEqual(offers.map(c=>getCard(c).skill),[...'WABC']);
 const c=offers.find(c=>c.type==='A-G1'),money=p.money,actions=g.actionCount;
 E.learn(g,0,c.type);assert(p.cards.includes(c));assert.equal(p.money,money-2);assert.equal(g.actionCount,actions+1);assert.equal(E.findPlacement(p,c.uid),null);assert.deepEqual(supplyIds(g),ids);
 turn(g);unchanged(g,()=>E.learn(g,0,'A-G1'));assert.equal(E.learningOffers(g,0).find(c=>getCard(c).skill==='A').type,'A-G2');
 const a=g.actionCount;E.place(g,0,c.uid,{day:6,period:0});assert.equal(g.actionCount,a+1);finish(g);assert.equal(E.skillCounts(p).A,1);
});

test('v23: direct growth failures are atomic and cannot mint copies from another player or completed archives',()=>{
 const g=make({startMoney:0});unchanged(g,()=>E.learn(g,1,'A-G1'));unchanged(g,()=>E.learn(g,0,'A-H'));unchanged(g,()=>E.learn(g,0,'A-G1'));
 const h=make();for(const pile of [...Object.values(h.market),...Object.values(h.decks),...Object.values(h.discard)])for(let i=pile.length-1;i>=0;i--)if(getCard(pile[i]).skill==='A')h.players[1].cards.push(...pile.splice(i,1));
 const ids=supplyIds(h);assert(!E.learningOffers(h,0).some(c=>getCard(c).skill==='A'));unchanged(h,()=>E.learn(h,0,'A-G1'));assert.deepEqual(supplyIds(h),ids);
 skills(h.players[0],'BB');assert(!E.learningOffers(h,0).some(c=>getCard(c).skill==='B'));
});

test('v23: direct growth from a public offer is identical to an ordinary buy including Monday status',()=>{
 const g=make(),c=offer(g,'A-G1'),clone=reload(g);E.learn(g,0,c.type);E.buy(clone,0,c.uid);assert.deepEqual(g,clone);
});

test('v23: off-display growth does not secretly veto Monday market refresh',()=>{
 const g=make(),c=E.learningOffers(g,0).find(c=>!Object.values(g.market).flat().some(x=>x.uid===c.uid));assert(c);
 E.learn(g,0,c.type);assert(!g.mondayMarketBought);E.pass(g,1);assert(g.mondayMarketRefreshed);
});

test('v23: moving three future cards frees a whole day without three paid actions',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['A-E',6],['B-E',6,1],['A-G1',6,2]]);const money=p.money,ids=supplyIds(g);
 for(const [i,s]of [{day:4,period:0},{day:4,period:1},{day:5,period:2}].entries())E.place(g,0,p.cards[i].uid,s);
 assert.equal(g.actionCount,0);assert.equal(g.day,0);assert.equal(E.activeBuyer(g),0);assert.equal(p.money,money);assert.equal(p.sanity,1);
 for(const period of [0,1,2])assert.equal(E.cardsInSlot(p,{day:6,period}).length,0);assert.deepEqual(supplyIds(g),ids);
 const clone=reload(g);finish(g);finish(clone);assert.deepEqual(g,clone);assert.equal(p.income,2);assert.equal(E.skillCounts(p).A,1);
});

test('v23: free move/withdraw cannot farm capital, actions, income or free first placements',()=>{
 const g=make(),p=g.players[0],c=add(g,p,'C-E');E.place(g,0,c.uid,{day:5,period:0});turn(g);const actions=g.actionCount;
 for(let i=0;i<20;i++){E.place(g,0,c.uid,{day:5+i%2,period:1});assert.equal(p.money,4);assert.equal(c.lockedCapital,4);assert.equal(g.actionCount,actions);}
 E.unplace(g,0,c.uid);assert.equal(p.money,8);assert.equal(g.actionCount,actions);assert.equal(p.income,0);
 unchanged(g,()=>E.unplace(g,0,c.uid));E.place(g,0,c.uid,{day:6,period:0});assert.equal(p.money,4);assert.equal(g.actionCount,actions+1);
});

test('v23: free edits remain turn-bound, past-bound and locked during inspection or pending choice',()=>{
 const g=make(),p=g.players[0],c=add(g,p,'A-E');E.place(g,0,c.uid,{day:0,period:0});unchanged(g,()=>E.unplace(g,0,c.uid));turn(g);
 unchanged(g,()=>E.unplace(g,0,c.uid));unchanged(g,()=>E.place(g,0,c.uid,{day:6,period:0}));lock(g);unchanged(g,()=>E.unplace(g,0,c.uid));
 const h=make();rig(h,h.players[0],[['S-Q',0],['A-E',6]]);lock(h);E.resolveAll(h);assert(h.opportunity);unchanged(h,()=>E.unplace(h,0,h.players[0].cards[0].uid));
});

test('v23: upgrading a basic activity uses free withdrawal plus one paid new arrangement',()=>{
 const g=make(),p=g.players[0];skills(p,'AA');const base=add(g,p,'A-L'),advanced=add(g,p,'A-H');E.place(g,0,base.uid,{day:6,period:0});turn(g);
 const actions=g.actionCount;E.unplace(g,0,base.uid);assert.equal(g.actionCount,actions);E.place(g,0,advanced.uid,{day:6,period:0});assert.equal(g.actionCount,actions+1);
 finish(g);assert.equal(p.income,4);assert.equal(Object.values(p.schedule).flat().length,1);assert.equal(p.sanity,5);
});

test('v23: protection remembers a candidate, never silently activates next week or transfers after growth',()=>{
 const g=make(),p=g.players[0];p.protectionFrom=1;skills(p,'B');rig(g,p,[['A-G1',2],['B-M',2]]);E.setProtection(g,0,{day:2,period:0});
 assert.equal(p.lastProtectedSlot,'2-0');g.inspection.inspectionCount=1;g.diceRandom=seedFor([3]);finish(g);assert.equal(p.caught,1);assert.equal(p.income,0);next(g);
 assert.equal(p.lastProtectedSlot,'2-0');assert.equal(p.protectedSlot,null);assert.equal(p.protectionChosen,false);turn(g);
 E.setProtection(g,0,{day:2,period:0});assert.equal(g.actionCount,1); // seat 1 passed first
 unchanged(g,()=>E.setProtection(g,0,{day:1,period:0}));
});

for(const n of [2,3,4])for(const route of 'WABC')test(`v23: ${n} players, ${route} growth recovers from no visible growth at every seat`,()=>{
 for(let seat=0;seat<n;seat++){
  const g=make({playerCount:n}),p=g.players[seat];
  // Remove growth from display by swapping existing finite public instances.
  for(let i=0;i<g.market[4].length;i++)if(getCard(g.market[4][i]).skill){
   const index=g.decks[4].findIndex(c=>!getCard(c).skill);assert(index>=0);
   [g.market[4][i],g.decks[4][index]]=[g.decks[4][index],g.market[4][i]];
  }
  const ids=supplyIds(g);assert(!Object.values(g.market).flat().some(c=>getCard(c).skill));
  for(const [suffix,period]of [['G1',0],['G2',1]]){
   turn(g,seat);const before=p.money,actions=g.actionCount;E.learn(g,seat,route+'-'+suffix);
   const c=p.cards.find(c=>c.type===route+'-'+suffix);assert.equal(p.money,before-getCard(c).price.money);assert.equal(g.actionCount,actions+1);
   turn(g,seat);E.place(g,seat,c.uid,{day:4,period});assert.deepEqual(supplyIds(g),ids);
  }
  finish(g);assert.equal(E.skillCounts(p)[route],2);assert.equal(p.money,8);assert.equal(p.sanity,3);assert.equal(p.cards.length,0);assert.deepEqual(supplyIds(g),ids);
 }
});
