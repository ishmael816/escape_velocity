import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {getCard} from '../src/cards.js';
import {make,add,finish,next,passKeeping,keepMarket} from './helpers.mjs';
const offers=g=>Object.values(g.market).flat();
const supply=g=>[...offers(g),...Object.values(g.decks).flat(),...Object.values(g.discard).flat(),...g.players.flatMap(p=>p.cards)].map(c=>c.uid).sort();
const ids=g=>offers(g).map(c=>c.uid).sort();
const rowIds=(g,row)=>E.MARKET_ROUTES.map(r=>E.marketCell(g,r,row)?.uid).filter(Boolean);
function layout(g){
 assert.equal(g.market[4].length,12);assert.equal(g.market[8].length,3);
 for(const r of E.MARKET_ROUTES)for(let row=0;row<4;row++){
  const c=E.marketCell(g,r,row);if(r==='W'&&row===3){assert.equal(c,undefined);continue;}
  assert.equal(getCard(c).route,r);assert.equal(getCard(c).hours,row===3?8:4);
 }
}

test('route columns have 3 I + 1 II, W II stays empty; fixed supply for 2–4 players',()=>{
 for(const playerCount of [2,3,4])for(const seed of [1,7,42]){const g=make({playerCount,seed});layout(g);assert.equal(supply(g).length,220);assert.equal(new Set(supply(g)).size,220);}
});
test('each Monday non-buyer gets one optional row refresh before the next player',()=>{
 const g=make({playerCount:4}),before=supply(g);
 for(let id=0;id<4;id++){
  const old=ids(g),changed=id===3?[E.marketCell(g,'A',3).uid]:rowIds(g,id),actions=g.actionCount;
  E.pass(g,id);assert.equal(g.marketRefresh.player,id);assert.equal(E.activeBuyer(g),id);assert.equal(g.actionCount,actions+1);assert.deepEqual(ids(g),old);
  const pending=structuredClone(g);assert.throws(()=>E.buy(g,id,offers(g)[0].uid));assert.throws(()=>E.chooseMarketRefresh(g,(id+1)%4,0));assert.throws(()=>E.chooseMarketRefresh(g,id,4));assert.deepEqual(g,pending);
  E.chooseMarketRefresh(g,id,id,id===3?'A':null);assert.equal(g.actionCount,actions+1);
  assert(old.filter(uid=>!changed.includes(uid)).every(uid=>ids(g).includes(uid)));
  assert((id===3?[E.marketCell(g,'A',3).uid]:rowIds(g,id)).every(uid=>!old.includes(uid)));layout(g);assert.deepEqual(supply(g),before);
  assert.throws(()=>E.chooseMarketRefresh(g,id,0));
 }
 assert.equal(g.phase,'resolving');assert(g.endedByPass);assert.equal(g.actionCount,4);
});
test('purchase fills the same route/row, forbids refresh for buyer but not opponent',()=>{
 const g=make(),c=offers(g).find(c=>!E.canBuy(g,g.players[0],getCard(c))),d=getCard(c),row=c.marketRow,before=ids(g),pool=supply(g);
 E.buy(g,0,c.uid);assert.equal(g.marketRefresh,null);assert.equal(E.activeBuyer(g),1);
 const replacement=E.marketCell(g,d.route,row);assert(replacement&&replacement.uid!==c.uid);assert(before.filter(id=>id!==c.uid).every(id=>ids(g).includes(id)));
 assert.throws(()=>E.chooseMarketRefresh(g,0,0));E.pass(g,1);assert.equal(g.marketRefresh.player,1);E.chooseMarketRefresh(g,1,0);
 assert.equal(g.day,1);assert.deepEqual(supply(g),pool);layout(g);
 E.pass(g,0);assert.equal(g.marketRefresh,null);assert.equal(E.activeBuyer(g),1);
});
test('placing earns refresh; free moves do not; failed purchase leaves choice unspent',()=>{
 const g=make(),p=g.players[0],c=add(g,p,'A06');p.schedule={'1-0':[c.uid]};
 E.place(g,0,c.uid,{day:2,period:0});assert.equal(g.marketRefresh,null);assert.equal(g.actionCount,0);
 E.unplace(g,0,c.uid);assert.equal(g.marketRefresh,null);
 p.money=0;const before=structuredClone(g);assert.throws(()=>E.buy(g,0,offers(g)[0].uid));assert.deepEqual(g,before);
 E.place(g,0,c.uid,{day:3,period:0});assert.equal(g.marketRefresh.player,0);
 const old=ids(g);E.chooseMarketRefresh(g,0);assert.deepEqual(ids(g),old);assert.equal(E.activeBuyer(g),1);
});
test('growth cards use ordinary market supply; no direct growth purchase channel',()=>{
 const g=make({startMoney:100}),c=offers(g).find(c=>getCard(c).skill&&!E.canBuy(g,g.players[0],getCard(c)));assert(c);
 assert.equal(E.learningOffers,undefined);assert.equal(E.learn,undefined);
 E.buy(g,0,c.uid);assert.equal(g.marketRefresh,null);assert.equal(E.activeBuyer(g),1);
});

test('II refresh requires one existing route and rejects an entire row or empty W cell atomically',()=>{
 const g=make();E.pass(g,0);const before=structuredClone(g),pool=supply(g),old=ids(g),target=E.marketCell(g,'B',3).uid;
 for(const args of [[3],[3,'W'],[3,'Z'],[0,'A']]){assert.throws(()=>E.chooseMarketRefresh(g,0,...args));assert.deepEqual(g,before);}
 E.chooseMarketRefresh(g,0,3,'B');assert.equal(ids(g).filter(id=>!old.includes(id)).length,1);
 assert(!ids(g).includes(target));assert(old.filter(id=>id!==target).every(id=>ids(g).includes(id)));assert.deepEqual(supply(g),pool);
 assert.equal(g.actionCount,1);assert.equal(E.activeBuyer(g),1);assert.throws(()=>E.chooseMarketRefresh(g,0,0));
});
test('pending refresh survives JSON reload; skipping all retains market and ends week',()=>{
 const g=make(),before=ids(g);E.pass(g,0);const restored=JSON.parse(JSON.stringify(g));
 for(const x of [g,restored]){E.chooseMarketRefresh(x,0);E.pass(x,1);assert.equal(x.phase,'planning');E.chooseMarketRefresh(x,1);}
 assert.deepEqual(g,restored);assert.equal(g.phase,'resolving');assert.deepEqual(ids(g),before);
});
test('exhausted route recycles only its own discarded cards, then reuses old offers without duplicates',()=>{
 const g=make();g.decks[4]=g.decks[4].filter(c=>getCard(c).route!=='A');g.discard[4]=[];
 const before=supply(g),old=E.marketCell(g,'A',0).uid;E.pass(g,0);E.chooseMarketRefresh(g,0,0);
 assert.equal(E.marketCell(g,'A',0).uid,old);assert.deepEqual(supply(g),before);layout(g);
 const c=g.decks[4].find(c=>getCard(c).route==='B');g.decks[4]=g.decks[4].filter(x=>getCard(x).route!=='B');g.discard[4]=[c];
 E.pass(g,1);E.chooseMarketRefresh(g,1,1);assert.equal(E.marketCell(g,'B',1).uid,c.uid);layout(g);
});
test('old market migration preserves ownership and supply; migration is idempotent',()=>{
 const g=make(),pool=supply(g),players=structuredClone(g.players);delete g.marketModel;
 for(const lane of [4,8]){g.decks[lane].push(...g.market[lane]);g.market[lane]=g.decks[lane].splice(-Number(lane===4?8:4));g.market[lane].forEach(c=>delete c.marketRow);}
 E.upgradeMarket(g);layout(g);assert.deepEqual(supply(g),pool);assert.deepEqual(g.players,players);
 const before=structuredClone(g);E.upgradeMarket(g);assert.deepEqual(g,before);
});
test('aging replaces stale cells and keeps recent offers; rotated active players retain refresh rights',()=>{
 const g=make(),recent=E.marketCell(g,'A',1);recent.marketSince=3;g.week=2;const old=ids(g);
 finish(g);next(g);assert.equal(E.activeBuyer(g),1);layout(g);assert(ids(g).includes(recent.uid));assert.equal(old.filter(id=>ids(g).includes(id)).length,1);
 E.pass(g,1);assert.equal(g.marketRefresh.player,1);keepMarket(g);
 passKeeping(g,0);assert.equal(g.phase,'resolving');
});
