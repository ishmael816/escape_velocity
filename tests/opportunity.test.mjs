import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {getCard,CARDS} from '../src/cards.js';
import {make,rig,lock,next,seedFor,add} from './helpers.mjs';
function search(type='A14',options={}){const g=make(options);rig(g,g.players[0],[[type,type==='W14'?0:6]]);lock(g);E.resolveAll(g);return g;}
const stack=(g,types)=>types.map(type=>({uid:'deck-'+(++g.uid),type}));
function unchanged(g,fn,pattern){const before=structuredClone(g);assert.throws(fn,pattern);assert.deepEqual(g,before);}
test('five reusable searches share ordinary pools and never archive',()=>{
 const cards=CARDS.filter(d=>d.opportunity);assert.equal(cards.length,5);
 for(const d of cards){assert.equal(d.once,false);assert.equal(d.skill,null);assert.equal(d.draft,null);}
 for(const [id,n,price] of [['W14',2,2],['A14',3,3],['B14',3,2],['C14',4,3],['C07',2,2]]){assert.equal(getCard(id).price.money,price);assert.equal(getCard(id).opportunity.count,n);}
});
test('search pauses before salary, stays scheduled and repeats across weeks',()=>{
 const g=search(),p=g.players[0],market=structuredClone(g.market),actions=g.actionCount;
 for(let week=1;week<=2;week++){
  assert.equal(g.phase,'resolving');assert.equal(g.opportunity.stage,'lane');assert.equal(E.inspirationCount(p),7);
  const m=p.money;E.chooseOpportunityLane(g,0,2);assert.equal(g.opportunity.options.length,3);E.chooseOpportunity(g,0);E.resolveAll(g);
  assert.equal(p.money,m+3);assert.equal(p.skills.length,0);assert.equal(p.cards.length,1);assert.ok(E.findPlacement(p,p.cards[0].uid));
  if(week===1){assert.equal(g.actionCount,actions);assert.deepEqual(g.market,market);next(g);lock(g);E.resolveAll(g);}
 }assert.equal(g.opportunityHistory.length,2);
});
test('advanced search purchase pays full price without skill and waits until next week',()=>{
 const g=search(),p=g.players[0],c=stack(g,['A09'])[0];g.decks[8]=[c];g.discard[8]=[];E.chooseOpportunityLane(g,0,8);const m=p.money;E.chooseOpportunity(g,0,c.uid);
 assert.equal(p.money,m-getCard(c).price.money);assert.ok(p.cards.includes(c));assert.equal(E.qualified(p,getCard(c)),false);assert.match(E.canPlace(g,p,c.uid,{day:6,period:0}),/轮到/);
});
test('invalid ownership, lane and unaffordable purchase are atomic',()=>{
 const g=search();unchanged(g,()=>E.chooseOpportunityLane(g,1,2),/当前/);unchanged(g,()=>E.chooseOpportunityLane(g,0,3),/牌堆/);E.chooseOpportunityLane(g,0,8);g.players[0].money=0;
 unchanged(g,()=>E.chooseOpportunity(g,0,g.opportunity.options[0].uid),/资金不足/);unchanged(g,()=>E.chooseOpportunity(g,0,'fake'),/候选/);unchanged(g,()=>E.step(g),/寻找/);unchanged(g,()=>E.chooseOpportunityLane(g,0,2),/当前/);E.chooseOpportunity(g,0);assert.equal(g.opportunity,null);
});
test('commercial search pays one to see four, without retry',()=>{
 const g=search('C14'),p=g.players[0];assert.equal(p.money,7);E.chooseOpportunityLane(g,0,2);assert.equal(g.opportunity.options.length,4);E.chooseOpportunity(g,0);E.resolveAll(g);assert.equal(p.money,10);assert.equal(E.retryOpportunity,undefined);assert.equal(E.orderOpportunity,undefined);
 const poor=search('C14',{startMoney:0});assert.equal(poor.opportunity,null);assert.equal(E.unplacedCards(poor.players[0]).length,1);
});
test('every route returns remaining cards to bottom automatically',()=>{
 for(const type of ['W14','A14','B14','C14']){const g=search(type),cards=stack(g,['A01','A02','B01','B02','C01']);g.decks[2]=cards.slice();g.discard[2]=[];E.chooseOpportunityLane(g,0,2);const n=g.opportunity.options.length,revealed=g.opportunity.options.map(c=>c.uid);E.chooseOpportunity(g,0);assert.equal(g.opportunity,null);assert.equal(g.decks[2].at(-1).uid,cards[cards.length-n-1].uid);assert.deepEqual(g.decks[2].slice(0,n).reverse().map(c=>c.uid),revealed);}
});
test('search resumes remaining same-slot activity and reload is identical',()=>{
 const g=make({startSanity:8}),p=g.players[0];rig(g,p,[['A14',6,2],['A02',6,2]]);rig(g,g.players[1],[['B14',6,2]]);lock(g);E.resolveAll(g);const clone=structuredClone(g);
 for(const x of [g,clone]){E.chooseOpportunityLane(x,0,2);E.chooseOpportunity(x,0);E.resolveAll(x);assert.equal(x.opportunity.player,1);assert.equal(E.inspirationCount(x.players[0]),6);assert.equal(E.skillCounts(x.players[0]).A,1);E.chooseOpportunityLane(x,1,2);E.chooseOpportunity(x,1);E.resolveAll(x);}assert.deepEqual(g,clone);assert.equal(g.history.length,1);
});
test('preview cannot reveal or depend on hidden candidates',()=>{
 const g=make();rig(g,g.players[0],[['A14',6]]);const before=structuredClone(g),preview=E.preview(g,0);assert.equal(preview.uncertain,true);assert.ok(preview.warnings.some(l=>l.text.includes('寻找机会')));assert.deepEqual(g,before);for(const deck of Object.values(g.decks))deck.reverse();assert.deepEqual(E.preview(g,0),preview);
});
test('inspection or missing markers pauses search without archiving',()=>{
 for(const type of ['A14','C14']){const g=make(),p=g.players[0];rig(g,p,[[type,0]]);g.inspection.inspectionCount=1;g.diceRandom=seedFor([1]);lock(g);E.resolveAll(g);assert.equal(g.opportunity,null);assert.equal(p.skills.length,0);assert.equal(p.money,10);assert.equal(p.cards.length,1);}
 const g=make(),p=g.players[0];rig(g,p,[['A14',6]]);p.inspirationSlots=[];lock(g);E.resolveAll(g);assert.equal(g.opportunity,null);assert.ok(E.findPlacement(p,p.cards[0].uid));
});
test('work search is work-only, immune to inspection, low sanity gated',()=>{
 const g=make(),p=g.players[0],c=add(g,p,'W14');assert.match(E.canPlace(g,p,c.uid,{day:6,period:0}),/履职/);E.place(g,0,c.uid,{day:0,period:0});g.inspection.inspectionCount=1;g.diceRandom=seedFor([1]);lock(g);E.resolveAll(g);assert.equal(g.opportunity.sourceType,'W14');assert.equal(p.caught,0);const high=search('W14',{startSanity:4});assert.equal(high.opportunity,null);
});
test('empty deck and recycled discard resolve cleanly',()=>{
 for(const type of ['A14','B14','C14','W14']){const g=search(type);g.decks[8]=[];g.discard[8]=[];E.chooseOpportunityLane(g,0,8);assert.equal(g.opportunity.options.length,0);const m=g.players[0].money;E.chooseOpportunity(g,0);assert.equal(g.players[0].money,m);E.resolveAll(g);assert.equal(g.phase,'escape');}
 const g=search();g.decks[2]=[];g.discard[2]=stack(g,['A01','B01']);E.chooseOpportunityLane(g,0,2);assert.equal(g.opportunity.options.length,2);E.chooseOpportunity(g,0);assert.equal(g.decks[2].length,2);
});
test('bots arrange repeat searches and finish choices; humans remain pending',()=>{
 for(const type of ['A14','B14','C14','W14']){const g=search(type),before=structuredClone(g);E.botOpportunity(g);assert.deepEqual(g,before);g.players[0].bot=true;E.botOpportunity(g);assert.equal(g.opportunity,null);E.resolveAll(g);assert.equal(g.phase,'escape');const h=make(),p=h.players[0],c=add(h,p,type);p.bot=true;E.botAct(h);assert.ok(E.findPlacement(p,c.uid));}
});
