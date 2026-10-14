import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {getCard,cardPhases} from '../src/cards.js';
import {cardFace} from '../src/card-face.js';
import {make,add,turn,finish,next,seedFor} from './helpers.mjs';
import {offer,unchanged} from './regression-helpers-v22.mjs';

test('price is paid at purchase; capital is a separate reversible play requirement',()=>{
 const g=make({startMoney:2}),p=g.players[0],c=offer(g,'C-E');
 assert.equal(E.canBuy(g,p,getCard(c)),null);E.buy(g,0,c.uid);turn(g);
 assert.equal(p.money,2-getCard(c).price.money);unchanged(g,()=>E.place(g,0,c.uid,{day:6,period:0}));
 p.money=3;E.place(g,0,c.uid,{day:6,period:0});assert.equal(p.money,0);assert.equal(c.lockedCapital,3);
 turn(g);E.unplace(g,0,c.uid);assert.equal(p.money,3);
});

test('sanity floor allows buying and arranging, then blocks execution below the line',()=>{
 const d=getCard('A-E'),previous=d.minSanity;
 try{
  d.minSanity=3;
  const low=make({startSanity:2}),available=offer(low,d.id);assert.equal(E.canBuy(low,low.players[0],d),null);E.buy(low,0,available.uid);
  const g=make(),p=g.players[0],c=offer(g,d.id);E.buy(g,0,c.uid);turn(g);
  E.place(g,0,c.uid,{day:6,period:2});assert.equal(p.sanity,1);
  finish(g);assert.equal(p.income,0);assert(E.findPlacement(p,c.uid));assert(g.logs.some(l=>l.text.includes('结算要求理智 ≥3')));
 }finally{d.minSanity=previous;}
});

test('sanity ceiling is checked at execution rather than purchase or arrangement',()=>{
 const d=getCard('A-E'),previous=d.maxSanity;
 try{
  d.maxSanity=1;
  const g=make(),p=g.players[0],c=offer(g,d.id);
  assert.equal(E.canBuy(g,p,d),null);E.buy(g,0,c.uid);turn(g);
  E.place(g,0,c.uid,{day:6,period:0});finish(g);assert.equal(p.income,0);
  assert(g.logs.some(l=>l.text.includes('结算要求理智 ≤1')));
  const eligible=make(),q=eligible.players[0],other=offer(eligible,d.id);E.buy(eligible,0,other.uid);turn(eligible);
  E.place(eligible,0,other.uid,{day:6,period:2});finish(eligible);assert.equal(q.income,1);
 }finally{d.maxSanity=previous;}
});

test('settlement projection adds payment fields without netting away receipts',()=>{
 const d={...getCard('B-S'),cost:{money:2},upkeep:1,gain:{money:4}};
 assert.deepEqual(cardPhases(d).settlement.pay,{money:3});
 assert.deepEqual(cardPhases(d).settlement.receive,{money:4});
 const face=cardFace(d),settle=face.split('data-phase="settlement"')[1].split('<footer')[0];
 assert(settle.includes('资金 −3'));assert(settle.includes('资金 +4'));
 assert(!settle.includes('资金 −2'));assert(!settle.includes('维持费'));
});

test('failed sanity line cancels positive effect and its fee, then can succeed next week',()=>{
 const d=getCard('B-S'),previous=d.minSanity;
 try{
  d.minSanity=7;
  const g=make(),p=g.players[0],c=add(g,p,d.id);E.place(g,0,c.uid,{day:6,period:0});assert.equal(p.sanity,6);
  finish(g);assert.equal(p.money,11);assert.equal(p.sanity,3);assert(E.findPlacement(p,c.uid));
  assert.equal(p.supports.find(x=>x.uid===c.uid).active,false);
  d.minSanity=6;next(g);finish(g);assert.equal(p.sanity,6);assert.equal(p.money,13);
 }finally{d.minSanity=previous;}
});

test('failed sanity line does not pay execution cost, roll dice, archive, or advance progress',()=>{
 const d=getCard('A-G1'),previous={minSanity:d.minSanity,cost:d.cost,dice:d.dice,progressTarget:d.progressTarget};
 try{
  Object.assign(d,{minSanity:4,cost:{money:2},dice:{resource:'salary',faces:[1,2,3,4,5,6]},progressTarget:2});
  const g=make(),p=g.players[0],c=add(g,p,d.id);E.place(g,0,c.uid,{day:6,period:0});finish(g);
  assert.equal(p.money,11);assert.equal(c.progress||0,0);assert.equal(p.skills.length,0);assert.equal(p.weeklyEarnings.length,0);
  assert(!g.diceRolls.some(x=>x.kind==='activity'));assert(E.findPlacement(p,c.uid));
 }finally{Object.assign(d,previous);}
});

test('sanity line uses state after inspection removes positive effects',()=>{
 const d=getCard('A-E'),previous=d.minSanity;
 try{
  d.minSanity=6;
  const g=make(),p=g.players[0],support=add(g,p,'B-S'),income=add(g,p,d.id);
  E.place(g,0,support.uid,{day:0,period:0});turn(g);E.place(g,0,income.uid,{day:6,period:0});assert.equal(p.sanity,6);
  g.inspection.inspectionCount=1;g.diceRandom=seedFor([1]);finish(g);
  assert.equal(p.sanity,3);assert.equal(p.income,0);assert.equal(p.money,10);
 }finally{d.minSanity=previous;}
});

test('card zones put skills in purchase, signed sanity in play, and sanity line and draws in settlement',()=>{
 const d={...getCard('A-H'),minSanity:6},face=cardFace(d);
 const footer=face.split('<footer')[1];
 assert(!footer.includes('理智'));assert(footer.includes('购买需要技能'));
 const settlement=face.split('data-phase="settlement"')[1].split('<footer')[0];assert(settlement.includes('结算要求理智 ≥6'));
 assert.equal(cardPhases(d).purchase.sanity,undefined);assert.deepEqual(cardPhases(d).settlement.sanity,{min:6,max:10});
 assert(!face.split('<footer')[0].includes('购买需要技能'));
 const positive=cardFace(getCard('B-S'));assert(positive.includes('打出：理智 +3'));
 const negative=cardFace(getCard('W-E'));assert(negative.includes('打出：理智 −1'));
 const search=cardFace(getCard('S-Q')).split('data-phase="settlement"')[1].split('<footer')[0];
 assert(search.includes('看 3 张，原价买至多 1 张'));
});
