import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import * as V from '../src/engine-v32.js';
import {getCard} from '../src/cards.js';
import {keepMarket,passKeeping,placementTurn} from './helpers.mjs';
const make=()=>{const g=E.createGame({playerCount:2,mode:'hotseat',startMoney:60});g.inspection={inspectionCount:0,times:[],blockedTimes:[],gain:{}};return g;};
const add=(g,type,day,period=0)=>{const c={uid:'u'+(++g.uid),type};g.players[0].cards.push(c);if(day!==undefined)(g.players[0].schedule[day+'-'+period]??=[]).push(c.uid);E.syncSanity(g,g.players[0]);return c;};
const lock=g=>{keepMarket(g);while(g.phase==='planning')passKeeping(g,E.activeBuyer(g));};
function finish(g){lock(g);let n=200;while(g.phase==='resolving'&&n--){if(!g.opportunity)E.resolveAll(g);else{const q=g.opportunity,p=g.players[q.player];if(q.stage==='v32')E.chooseActivity(g,p.id,V.defaultChoice(g,p,E.cardAt(p,q.uid)));else if(q.stage==='choose')E.chooseOpportunity(g,p.id);else throw Error(q.stage);}}assert(n>0);}
const next=g=>{for(const p of g.players)if(!Object.hasOwn(g.escapeDecisions,p.id))E.chooseEscape(g,p.id,false);E.closeWeek(g);g.inspection={inspectionCount:0,times:[],blockedTimes:[],gain:{}};};

test('automatic replenishment reaches four from visible base and goods, not eight',()=>{
 const g=make(),c=add(g,'C12',0);c.auto=1;c.principal=1;finish(g);assert.equal(g.players[0].income,4);assert.equal(E.cardAt(g.players[0],c.uid).principal,2);assert.equal(g.players[0].money,67);
});
test('selling after replenishment removes its full-stock bonus in the same week',()=>{
 const g=make(),c=add(g,'C12',0);c.auto=1;c.principal=1;add(g,'C09',1);lock(g);E.resolveAll(g);assert.equal(g.opportunity.stage,'v32');E.chooseActivity(g,0,{trade:'sell',quantity:1,capitalSource:c.uid});finish(g);assert.equal(g.players[0].income,2);assert.equal(g.players[0].settlement.otherIncome,4);assert.equal(E.cardAt(g.players[0],c.uid).principal,1);
});
test('Agent counts at most two OTHER placed automatic cards, never hand markers',()=>{
 const g=make(),agent=add(g,'B10',0);agent.auto=1;add(g,'B03',1).auto=1;add(g,'A06',2).auto=1;add(g,'B03',3).auto=1;add(g,'B03').auto=1;
 finish(g);assert.equal(g.players[0].weeklyEarnings.find(e=>e.uid===agent.uid).profit,4);
});
test('paid progress coins are returned once, on completion only',()=>{
 const g=make(),c=add(g,'B01',0);finish(g);assert.equal(g.players[0].money,62);assert.equal(E.cardAt(g.players[0],c.uid).progressCoins,1);
 next(g);finish(g);assert.equal(g.players[0].money,64);
 next(g);finish(g);assert.equal(g.players[0].money,69);assert.equal(g.players[0].skills[0].progressCoins,0);
 next(g);finish(g);assert.equal(g.players[0].money,72);
});
test('free progress takes coins from supply, then returns them on completion',()=>{
 const g=make();const c=add(g,'W12',0);finish(g);assert.equal(g.players[0].money,63);assert.equal(E.cardAt(g.players[0],c.uid).progressCoins,1);
 next(g);finish(g);assert.equal(g.players[0].money,74);assert.equal(g.players[0].duty,1);
});
test('route-specific search never includes other routes and returns no candidates on depletion',()=>{
 const g=make();add(g,'A07',0);lock(g);E.resolveAll(g);assert.equal(g.opportunity.stage,'choose');assert.equal(g.opportunity.options.length,2);assert(g.opportunity.options.every(c=>getCard(c).route==='A'));E.chooseOpportunity(g,0);finish(g);
 const h=make();add(h,'B04',0);h.decks[4]=[];h.discard[4]=[];lock(h);E.resolveAll(h);assert.equal(h.opportunity.stage,'choose');assert.equal(h.opportunity.options.length,0);E.chooseOpportunity(h,0);finish(h);assert.equal(h.phase,'escape');
});
test('multi-resource deployment is atomic when the second resource is missing',()=>{
 const g=make(),p=g.players[0],c=add(g,'B14');p.inspirationSlots=['4-2','5-2'];placementTurn(g);const before=JSON.stringify(g);assert.throws(()=>E.place(g,0,c.uid,{day:0,period:0}));assert.equal(JSON.stringify(g),before);
});
test('artist cannot take two inspiration from one night or exceed two',()=>{
 const g=make(),p=g.players[0],c=add(g,'A09');p.inspirationSlots=['4-2','4-2','5-2'];placementTurn(g);const before=JSON.stringify(g);
 assert.throws(()=>E.place(g,0,c.uid,{day:0,period:0},{art:2,artSources:['4-2','4-2']}),/每个空夜/);assert.equal(JSON.stringify(g),before);
 assert.throws(()=>E.place(g,0,c.uid,{day:0,period:0},{art:3}));assert.equal(JSON.stringify(g),before);
});
