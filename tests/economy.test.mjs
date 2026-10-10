import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {getCard} from '../src/cards.js';
import {make,turn,finish,next} from './helpers.mjs';

// Controlled market availability isolates purchase/action costs from draw luck.
// Every activity is still bought from the market and arranged through public actions.
function offer(g,type){
 const lane=getCard(type).hours;
 const shown=g.market[lane].find(c=>c.type===type);
 if(shown)return shown;
 const index=g.decks[lane].findIndex(c=>c.type===type);
 assert.ok(index>=0,`normal copy of ${type} must exist`);
 const [card]=g.decks[lane].splice(index,1);
 g.decks[lane].unshift(g.market[lane].shift());
 g.market[lane].push(card);
 return card;
}
function acquire(g,plan){
 const p=g.players[0];
 assert.equal(p.cards.length,0);
 for(const [type,day,period] of plan){
  turn(g);const c=offer(g,type);E.buy(g,0,c.uid);
  assert.equal(E.findPlacement(p,c.uid),null);
  turn(g);E.place(g,0,c.uid,{day,period});
 }
}

for(const scenario of [
 {name:'small commercial loop',plan:[['C05',6,0]],cost:2,profit:1,cycles:2},
 {name:'developer loop',plan:[['B06',6,0]],cost:3,profit:2,cycles:2},
 {name:'large creative loop',plan:[['A08',6,0],['A05',3,2]],cost:7,profit:3,cycles:3},
 {name:'career cash loop',plan:[['W05',4,0]],cost:2,profit:0,cash:1,cycles:2},
])test(`${scenario.name}: bought from empty start, sustainably repays within three successful weeks`,()=>{
 const g=make(),p=g.players[0];acquire(g,scenario.plan);
 assert.equal(p.money,8-scenario.cost);
 assert.equal(p.actedThisWeek,true);
 const inspiration=p.inspiration;
 for(let week=1;week<=scenario.cycles;week++){
  finish(g);
  assert.equal(p.income,scenario.profit);
  assert.equal(p.inspiration,inspiration,'recurring supply covers all recurring demand');
  assert.equal(p.money,8-scenario.cost+week*(3+(scenario.cash??scenario.profit)));
  assert.ok(p.sanity>=1);
  if(week<scenario.cycles)next(g);
 }
 assert.ok(scenario.cycles*(scenario.cash??scenario.profit)>=scenario.cost);
});

test('salary three buys two different light growth activities with a reserve, but no free income',()=>{
 const g=make({startMoney:3}),p=g.players[0];
 acquire(g,[['A02',1,2],['B02',3,2]]);
 assert.equal(p.money,1);
 finish(g);
 assert.equal(p.skills.length,2);
 assert.equal(p.income,0);
 assert.equal(p.money,4);
 assert.equal(p.cards.length,0);
});

test('an eight-coin opening can fund income, supply and growth using six actions',()=>{
 const g=make(),p=g.players[0];
 acquire(g,[['A07',6,0],['A05',3,2],['B02',5,2]]);
 assert.equal(g.day,5);assert.equal(E.activeBuyer(g),1);
 assert.equal(p.money,2);
 finish(g);
 assert.equal(p.income,2);assert.equal(p.money,7);
 assert.equal(p.skills[0].type,'B02');assert.equal(p.inspiration,4);
 next(g);finish(g);
 assert.equal(p.income,2);assert.equal(p.inspiration,4);
});
