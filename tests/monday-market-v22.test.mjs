import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {getCard} from '../src/cards.js';
import {make,add,finish,next,skills} from './helpers.mjs';
const offers=g=>Object.values(g.market).flat();
const supply=g=>[...offers(g),...Object.values(g.decks).flat(),...Object.values(g.discard).flat(),...g.players.flatMap(p=>p.cards)].map(c=>c.uid).sort();
const ids=g=>offers(g).map(c=>c.uid).sort();
const rowIds=(g,row)=>E.MARKET_ROUTES.map(r=>E.marketCell(g,r,row)?.uid).filter(Boolean);
function layout(g){
 assert.equal(g.market[4].length,8);assert.equal(g.market[8].length,4);
 for(const r of E.MARKET_ROUTES)for(let row=0;row<2;row++){const c=E.marketCell(g,r,row);assert.equal(getCard(c).route,r);assert.equal(getCard(c).hours,4);}
 for(let slot=0;slot<4;slot++)assert.equal(getCard(E.marketCell(g,slot,3)).hours,8);
}
test('four I route columns and four mixed II offers use a fixed 224-card supply',()=>{
 for(const playerCount of [2,3,4])for(const seed of [1,7,42]){const g=make({playerCount,seed});layout(g);assert.equal(supply(g).length,224);assert.equal(new Set(supply(g)).size,224);}
});
test('refresh waits for all Monday actions, follows seat order, costs no action and defers all-pass settlement',()=>{
 const g=make({playerCount:4}),before=supply(g),old=ids(g);
 for(let id=0;id<4;id++){E.pass(g,id);assert.equal(g.marketRefresh?.player,id===3?0:undefined);assert.deepEqual(ids(g),old);}
 assert.equal(g.actionCount,4);assert.equal(g.phase,'planning');
 for(let id=0;id<4;id++){
  assert.equal(E.activeBuyer(g),id);const row=id>=2?3:id,slot=id>=2?id-2:null;
  const changed=row===3?[E.marketCell(g,slot,3).uid]:rowIds(g,row);
  E.chooseMarketRefresh(g,id,row,slot);assert(changed.every(uid=>!ids(g).includes(uid)));assert(E.refreshProtected(g,row,slot));
  assert.equal(g.actionCount,4);assert.deepEqual(supply(g),before);layout(g);
 }
 assert.equal(g.phase,'planning');assert.equal(g.day,1);assert(!g.endedByPass);
});
test('one Monday purchase cancels the free refresh for everyone',()=>{
 const g=make({playerCount:4,startMoney:100}),c=g.market[4].find(c=>!getCard(c).requires),r=getCard(c).route,row=c.marketRow;
 E.buy(g,0,c.uid);for(let id=1;id<4;id++)E.pass(g,id);
 assert.equal(g.marketRefresh,null);assert.equal(g.day,1);assert.notEqual(E.marketCell(g,r,row).uid,c.uid);layout(g);
});
test('Monday rejects arrangement; Wednesday movement is free until confirmed',()=>{
 const g=make(),c=add(g,g.players[0],'A06');assert.throws(()=>E.place(g,0,c.uid,{day:3,period:0}),/周四/);
 E.pass(g,0);E.pass(g,1);E.chooseMarketRefresh(g,0);E.chooseMarketRefresh(g,1);E.pass(g,0);E.pass(g,1);
 g.players[0].schedule={'3-0':[c.uid]};const n=g.actionCount;E.place(g,0,c.uid,{day:0,period:0});assert.equal(g.actionCount,n);assert.equal(E.activeBuyer(g),0);
});
test('protection rejects another refresh atomically and still permits buying after the queue',()=>{
 const g=make({startMoney:100});E.pass(g,0);E.pass(g,1);
 E.chooseMarketRefresh(g,0,0);const before=structuredClone(g);assert.throws(()=>E.chooseMarketRefresh(g,1,0),/保护/);assert.deepEqual(g,before);
 E.chooseMarketRefresh(g,1);skills(g.players[0],'WWAAABBBCCC');const target=E.marketCell(g,'A',0);E.buy(g,0,target.uid);
 assert(g.players[0].cards.some(c=>c.uid===target.uid));assert(E.refreshProtected(g,0));
});
test('II refill draws from the common deck regardless of old offer color',()=>{
 const g=make(),target=E.marketCell(g,0,3),replacement=g.decks[8].find(c=>getCard(c).route!==getCard(target).route);
 g.decks[8]=g.decks[8].filter(c=>c!==replacement);g.decks[8].push(replacement);E.pass(g,0);E.pass(g,1);
 const others=ids(g).filter(id=>id!==target.uid);E.chooseMarketRefresh(g,0,3,0);
 assert.equal(E.marketCell(g,0,3).uid,replacement.uid);assert(others.every(id=>ids(g).includes(id)));
 const before=structuredClone(g);assert.throws(()=>E.chooseMarketRefresh(g,1,3,0));assert.deepEqual(g,before);
});
test('refresh queue and protections survive reload; invalid targets do not mutate state',()=>{
 let g=make();E.pass(g,0);E.pass(g,1);E.chooseMarketRefresh(g,0,1);g=JSON.parse(JSON.stringify(g));
 for(const args of [[0,0],[1,2],[1,4],[1,3],[1,3,9],[1,0,'A']]){const before=structuredClone(g);assert.throws(()=>E.chooseMarketRefresh(g,...args));assert.deepEqual(g,before);}
 E.chooseMarketRefresh(g,1);assert.equal(g.phase,'planning');assert.equal(g.day,1);assert(E.refreshProtected(g,1));
});
test('exhausted route reuses cards without losing supply or creating duplicates',()=>{
 const g=make();g.discard[4]=g.decks[4].filter(c=>getCard(c).route==='W');g.decks[4]=g.decks[4].filter(c=>getCard(c).route!=='W');
 const before=supply(g);E.pass(g,0);E.pass(g,1);E.chooseMarketRefresh(g,0,0);layout(g);assert.deepEqual(supply(g),before);
});
test('old display migration is idempotent and preserves all cards',()=>{
 const g=make(),before=supply(g);g.marketModel='route-columns-v1';E.upgradeMarket(g);layout(g);assert.deepEqual(supply(g),before);
 const snapshot=structuredClone(g);E.upgradeMarket(g);assert.deepEqual(g,snapshot);
});
test('protection expires next week and escaped players do not join Monday refresh',()=>{
 const g=make({playerCount:3});for(let i=0;i<3;i++)E.pass(g,i);E.chooseMarketRefresh(g,0,0);E.chooseMarketRefresh(g,1);E.chooseMarketRefresh(g,2);finish(g);next(g);
 assert.deepEqual(g.marketProtected,[]);g.players[0].escaped=true;E.pass(g,1);assert.equal(g.marketRefresh,null);E.pass(g,2);assert.equal(g.marketRefresh.player,1);assert.deepEqual(g.marketRefresh.remaining,[2]);
});

test('16-offer save shrinks to 12 while preserving queue, protected rows and ownership',()=>{
 const g=make();for(const route of E.MARKET_ROUTES){const i=g.decks[4].findIndex(c=>getCard(c).route===route);const [c]=g.decks[4].splice(i,1);c.marketRow=2;g.market[4].push(c);}
 g.marketModel='mixed-II-v2';g.marketProtected=['I:0','I:2','II:1'];g.marketRefresh={player:1,remaining:[]};
 const before=supply(g),players=structuredClone(g.players),queue=structuredClone(g.marketRefresh),kept=g.market[4].filter(c=>c.marketRow<2).map(c=>c.uid);
 E.upgradeMarket(g);layout(g);assert.deepEqual(supply(g),before);assert.deepEqual(g.players,players);assert.deepEqual(g.marketRefresh,queue);assert.deepEqual(g.marketProtected,['I:0','II:1']);assert.deepEqual(g.market[4].map(c=>c.uid),kept);
 const snapshot=structuredClone(g);E.upgradeMarket(g);assert.deepEqual(g,snapshot);
});
