import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {CARDS,ADVANCED,getCard} from '../src/cards.js';
import {cardFace} from '../src/card-face.js';
import {make,rig,lock,finish,next,skills,seedFor,add,turn} from './helpers.mjs';

test('fixed creative and commercial income never roll activity dice',()=>{
 for(const type of ['A07','C06']){
  const g=make(),p=g.players[0];rig(g,p,[[type,6]]);const random=g.diceRandom;
  finish(g);assert.equal(p.income,2);assert.equal(g.diceRandom,random);
  assert.equal(g.diceRolls.filter(x=>x.kind==='activity').length,0);
 }
});

test('upward management rolls once, archives and cannot generate recurring bonuses',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['W06',0]]);g.diceRandom=seedFor([6]);finish(g);
 assert.equal(p.settlement.otherIncome,4);assert.equal(E.skillCounts(p).W,1);
 assert.equal(p.cards.length,0);next(g);finish(g);
 assert.equal(p.settlement.otherIncome,0);assert.equal(g.diceRolls.filter(x=>x.kind==='activity').length,1);
});

test('painting gives schedule support immediately and income only on weekly payout',()=>{
 const g=make(),p=g.players[0],c=add(g,p,'A13');E.place(g,0,c.uid,{day:6,period:0});
 assert.equal(p.sanity,4);assert.equal(p.money,8);assert.equal(p.income,0);
 lock(g);E.rollInspections(g);assert.equal(p.money,8);finish(g);
 assert.equal(p.income,1);assert.equal(p.money,12);assert.equal(p.sanity,4);
 next(g);turn(g);E.unplace(g,0,c.uid);assert.equal(p.sanity,3);assert.equal(p.money,12);
});

test('mixed support with boost and inspiration executes its non-sanity effects',()=>{
 const g=make(),p=g.players[0];skills(p,'BBBB');
 rig(g,p,[['B09',0],['B06',1],['B11',2]]);skills(p,'AAAABBBB');E.syncSanity(g,p);
 assert.equal(p.sanity,4);finish(g);
 assert.equal(p.income,6);assert.equal(p.inspiration,5);assert.equal(p.sanity,4);
});

test('mixed support lost to inspection also loses income; only one fine',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['A13',0]]);
 g.inspection.inspectionCount=3;g.diceRandom=seedFor([1,1,1]);finish(g);
 assert.equal(p.income,0);assert.equal(p.sanity,3);assert.equal(p.caught,1);assert.equal(p.money,10);
 assert.ok(E.findPlacement(p,p.cards[0].uid));
});

test('overtime disables mixed sanity support but still allows its income effect',()=>{
 const g=make({startSanity:7}),p=g.players[0];rig(g,p,[['A13',6,2]]);finish(g);
 assert.equal(p.sanity,3);assert.equal(p.income,1);assert.equal(p.money,12);
});

test('unfunded mixed activity returns to hand and cannot help the escape gate',()=>{
 const g=make({startInspiration:0}),p=g.players[0];skills(p,'ABB');rig(g,p,[['A11',6]]);
 assert.equal(p.sanity,4);finish(g);
 assert.equal(p.income,0);assert.equal(p.sanity,3);assert.equal(p.cards.length,1);
 assert.equal(E.findPlacement(p,p.cards[0].uid),null);assert.equal(p.supports[0].active,false);
 p.income=10;assert.equal(E.eligible(g,p),false);
 next(g);assert.equal(p.sanity,3);assert.equal(E.unplacedCards(p).length,1);
});

test('unaffordable repeat withdrawal releases its overtime pressure and survives reload',()=>{
 const g=make({startSanity:6,startInspiration:0}),p=g.players[0];rig(g,p,[['A07',0,2],['A05',6,2]]);
 assert.equal(p.sanity,2);lock(g);E.step(g);const restored=JSON.parse(JSON.stringify(g));
 for(const x of [g,restored]){E.resolveAll(x);assert.equal(x.players[0].sanity,6);assert.equal(E.unplacedCards(x.players[0])[0].type,'A07');}
 assert.deepEqual(g,restored);
});

test('one-time multiweek permissions keep progress when unable to pay',()=>{
 const g=make({startMoney:0}),p=g.players[0];skills(p,'WW');rig(g,p,[['C05',0],['P01',5]]);
 const c=p.cards.find(c=>c.type==='P01');c.progress=1;finish(g);
 assert.equal(c.progress,1);assert.ok(E.findPlacement(p,c.uid));assert.equal(p.weekend,false);
});

test('elastic authorization protects selected 4h card, never an 8h card',()=>{
 for(const [type,income,caught]of [['A07',2,0],['A08',0,1]]){
  const g=make(),p=g.players[0];p.protectionFrom=1;rig(g,p,[[type,0]]);
  E.setProtection(g,0,{day:0,period:0});g.inspection.inspectionCount=1;g.diceRandom=seedFor([1]);finish(g);
  assert.equal(p.income,income);assert.equal(p.caught,caught);
 }
});

test('paid lifestyle tiers and mixed support are visible as icons with correct prices',()=>{
 for(const [id,h,price,support,upkeep]of [['B13',4,2,2,1],['C13',2,3,2,1],['W13',4,2,3,2]]){
  const d=getCard(id);assert.deepEqual([d.hours,d.price.money,d.support,d.upkeep],[h,price,support,upkeep]);
  const face=cardFace(d);assert.ok(face.includes(`购买价格 ${price}`));assert.ok(face.includes(`每周支付 ${upkeep}`));
 }
 const painting=cardFace(getCard('A13'));assert.ok(painting.includes('资金 +1'));assert.ok(painting.includes('占用日程本周理智支持 +1'));
 assert.ok(!painting.includes('每周支付'));
 for(const d of [...CARDS,...ADVANCED]){
  assert.ok(!(d.gain.money&&((d.cost.money||0)+(d.upkeep||0))),`${d.id} cannot both pay and earn cash`);
  assert.ok(!d.gain.sanity);assert.ok(!d.cost.sanity);
 }
});
