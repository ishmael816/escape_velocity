import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {MARKET_LIMITS} from '../src/cards.js';
import {make,add,finish,next} from './helpers.mjs';

const ids=g=>Object.values(g.market).flat().map(c=>c.uid);
const poolIds=g=>[...Object.values(g.market).flat(),...Object.values(g.decks).flat(),...Object.values(g.discard).flat()].map(c=>c.uid).sort();
function finishMonday(g){while(g.phase==='planning'&&g.day===0)E.pass(g,E.activeBuyer(g));}

test('2–4 players: refresh only after every Monday action, with no extra money or action',()=>{
 for(const playerCount of [2,3,4]){
  const g=make({playerCount}),before=ids(g),pool=poolIds(g),money=g.players.map(p=>p.money);
  for(let n=0;n<playerCount-1;n++){E.pass(g,E.activeBuyer(g));assert.deepEqual(ids(g),before);}
  E.pass(g,E.activeBuyer(g));assert.equal(g.day,1);assert.equal(g.actionCount,playerCount);
  assert.equal(g.mondayMarketRefreshed,true);assert.ok(ids(g).every(uid=>!before.includes(uid)));
  assert.deepEqual(poolIds(g),pool);assert.deepEqual(g.players.map(p=>p.money),money);
  for(const [lane,n]of Object.entries(MARKET_LIMITS))assert.equal(g.market[lane].length,n);
  assert.equal(g.logs.filter(l=>l.tone==='market').length,1);
 }
});

test('a public purchase by either the first or last Monday player prevents the refresh',()=>{
 for(const buyer of [0,1]){
  const g=make();if(buyer===1)E.pass(g,0);
  E.buy(g,buyer,g.market[2][0].uid);const market=structuredClone(g.market);
  finishMonday(g);assert.equal(g.mondayMarketBought,true);assert.equal(g.mondayMarketRefreshed,false);
  assert.deepEqual(g.market,market);
 }
});

test('arranging, moving and withdrawing do not veto refresh',()=>{
 for(const action of ['place','move','withdraw']){
  const g=make(),p=g.players[0],c=add(g,p,'A05');
  if(action==='move'||action==='withdraw')p.schedule={'1-0':[c.uid]};
  if(action==='withdraw')E.unplace(g,0,c.uid);
  else E.place(g,0,c.uid,{day:2,period:0});
  finishMonday(g);assert.equal(g.mondayMarketRefreshed,true,action);
 }
});

test('escaped players cannot prevent refresh by purchasing',()=>{
 const g=make({playerCount:3});g.players[0].escaped=true;
 E.buy(g,0,g.market[2][0].uid);assert.equal(g.mondayMarketBought,false);
 finishMonday(g);assert.equal(g.mondayMarketRefreshed,true);
});

test('failed purchase is atomic and does not count as a Monday purchase',()=>{
 const g=make({startMoney:0}),before=structuredClone(g);
 assert.throws(()=>E.buy(g,0,g.market[2][0].uid),/资金不足/);assert.deepEqual(g,before);
 finishMonday(g);assert.equal(g.mondayMarketRefreshed,true);
});

test('old offers go below remaining deck; depleted lanes reuse old offers without loss',()=>{
 const g=make(),old=structuredClone(g.market);
 const remaining=g.decks[2].slice(0,-MARKET_LIMITS[2]);finishMonday(g);
 assert.deepEqual(g.decks[2].slice(old[2].length),remaining);
 assert.deepEqual(g.decks[2].slice(0,old[2].length),old[2].slice().reverse());
 const depleted=make();for(const lane of [2,4,8]){depleted.decks[lane]=[];depleted.discard[lane]=[];}
 const pool=poolIds(depleted);finishMonday(depleted);
 assert.deepEqual(poolIds(depleted),pool);assert.deepEqual(ids(depleted).sort(),pool);
});

test('discard supplies replacements before set-aside old offers are returned',()=>{
 const g=make(),old=ids(g),replacement=g.decks[2].splice(0,2);
 g.decks[2]=[];g.discard[2]=replacement;
 finishMonday(g);assert.deepEqual(g.market[2].slice(0,2).map(c=>c.uid).sort(),replacement.map(c=>c.uid).sort());
 assert.equal(g.market[2].filter(c=>old.includes(c.uid)).length,3);
});

test('purchase status survives reload, resets next week, and later days never trigger a refresh',()=>{
 const g=make();E.buy(g,0,g.market[2][0].uid);
 const restored=JSON.parse(JSON.stringify(g));finishMonday(g);finishMonday(restored);assert.deepEqual(restored,g);
 const market=structuredClone(g.market);finish(g);assert.deepEqual(g.market,market);
 next(g);assert.equal(g.mondayMarketBought,false);assert.equal(g.mondayMarketRefreshed,false);
 assert.equal(E.activeBuyer(g),1);finishMonday(g);assert.equal(g.mondayMarketRefreshed,true);
 const refreshed=structuredClone(g.market),clone=JSON.parse(JSON.stringify(g));
 finish(g);finish(clone);assert.deepEqual(g,clone);assert.deepEqual(g.market,refreshed);
 assert.equal(g.logs.filter(l=>l.week===2&&l.tone==='market').length,1);
});
