import test from 'node:test';
import assert from 'node:assert/strict';
import {CARD_MAP} from '../src/cards.js';
import * as E from '../src/engine.js';
import {make,skills,rig,finish} from './helpers.mjs';

// No limit on total earnings: two cards fail because of their printed yields,
// not a hard card-count escape requirement or a clamp in settlement.
test('v24.2: any pair of repeat income activities cannot alone fund escape',()=>{
 const cards=Object.values(CARD_MAP).filter(d=>d.income&&!d.once);
 for(const a of cards)for(const b of cards){
  const g=make({playerCount:4,startMoney:100}),p=g.players[0];skills(p,'WWAABBCC');
  rig(g,p,[[a.id,5],[b.id,6],['W-S',0],['W-S',1]]);
  finish(g);assert.equal(p.income,a.fixedProfit+b.fixedProfit);
  assert(p.income<10,`${a.id}+${b.id} skips engine building`);assert(!E.eligible(g,p));
 }
});

test('bot keeps beneficial night support instead of oscillating between full days',()=>{
 const g=make({playerCount:4}),p=g.players[0];p.bot=true;skills(p,'WW');
 rig(g,p,[['W-H',4],['W-H',5],['W-H',3],['B-S',4,2]]);g.day=4;
 assert.equal(p.sanity,4);
 const support=p.cards.find(c=>c.type==='B-S'),before=E.findPlacement(p,support.uid),action=g.actionCount;
 for(let i=0;i<20&&g.phase==='planning'&&E.activeBuyer(g)===0;i++)E.botAct(g);
 assert(g.actionCount>action,'bot must finish a paid action rather than reorder forever');
 assert.deepEqual(E.findPlacement(p,support.uid),before);
});
