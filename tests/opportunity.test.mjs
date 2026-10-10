import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {getCard,CARDS} from '../src/cards.js';
import {make,rig,lock,seedFor,add} from './helpers.mjs';

function search(type='A14',options={}){
 const g=make(options),p=g.players[0];rig(g,p,[[type,type==='W14'?0:6]]);lock(g);E.resolveAll(g);return g;
}
function stack(g,types){return types.map(type=>({uid:'deck-'+(++g.uid),type}));}
function unchanged(g,fn,pattern){const before=structuredClone(g);assert.throws(fn,pattern);assert.deepEqual(g,before);}

test('four one-time searches fit the shared pool and archive model',()=>{
 const cards=CARDS.filter(d=>d.opportunity);assert.equal(cards.length,4);
 for(const d of cards){assert.equal(d.price.money,3);assert.equal(d.stress,0);assert.ok(d.once);assert.equal(d.skill,d.route);assert.equal(d.draft,null);}
 assert.deepEqual(cards.map(d=>d.id).sort(),['A14','B14','C14','W14']);
 assert.equal(getCard('B14').hours,4);assert.equal(getCard('W14').maxSanity,3);
});
test('execution pauses before salary, archives once and preserves public market',()=>{
 const g=search(),p=g.players[0],market=structuredClone(g.market);
 assert.equal(g.phase,'resolving');assert.equal(g.opportunity.stage,'lane');assert.equal(p.inspiration,3);
 assert.ok(p.skills.some(c=>c.type==='A14'));assert.equal(p.cards.length,0);assert.equal(g.history.length,0);
 const m=p.money,actions=g.actionCount;E.chooseOpportunityLane(g,0,2);assert.equal(g.opportunity.options.length,3);
 E.chooseOpportunity(g,0);E.resolveAll(g);assert.equal(g.phase,'escape');assert.equal(p.money,m+2);
 assert.equal(g.actionCount,actions);assert.deepEqual(g.market,market);assert.equal(p.skills.length,1);
});
test('advanced opportunity purchase pays full price without skills and cannot arrange this week',()=>{
 const g=search(),p=g.players[0],c=stack(g,['A09'])[0];g.decks[8]=[c];g.discard[8]=[];
 E.chooseOpportunityLane(g,0,8);const m=p.money;E.chooseOpportunity(g,0,c.uid);
 assert.equal(p.money,m-8);assert.ok(p.cards.includes(c));assert.equal(E.qualified(p,getCard(c)),false);
 assert.match(E.canPlace(g,p,c.uid,{day:6,period:0}),/轮到/);assert.equal(g.actionCount,14);
});
test('invalid ownership, deck and unaffordable choice leave pending state untouched',()=>{
 const g=search();unchanged(g,()=>E.chooseOpportunityLane(g,1,2),/当前/);unchanged(g,()=>E.chooseOpportunityLane(g,0,3),/牌堆/);
 E.chooseOpportunityLane(g,0,8);g.players[0].money=0;
 unchanged(g,()=>E.chooseOpportunity(g,0,g.opportunity.options[0].uid),/资金不足/);
 unchanged(g,()=>E.chooseOpportunity(g,0,'fake'),/候选/);unchanged(g,()=>E.step(g),/寻找/);
 unchanged(g,()=>E.retryOpportunity(g,0),/只有/);unchanged(g,()=>E.chooseOpportunityLane(g,0,2),/当前/);
 E.chooseOpportunity(g,0);assert.equal(g.opportunity,null);
});
test('yellow pays initial fee and only one retry; first batch cannot reappear',()=>{
 const g=search('C14'),p=g.players[0];assert.equal(p.money,14); // 8 + 7 passes - 1 fee, before salary
 const cards=stack(g,['A01','A02','B01']);g.decks[2]=cards.slice();g.discard[2]=[];
 E.chooseOpportunityLane(g,0,2);const first=g.opportunity.options.map(c=>c.uid),m=p.money;
 E.retryOpportunity(g,0);assert.equal(p.money,m-1);assert.equal(g.opportunity.options.length,1);
 assert.ok(g.opportunity.options.every(c=>!first.includes(c.uid)));
 unchanged(g,()=>E.retryOpportunity(g,0),/一次/);
 E.chooseOpportunity(g,0);assert.deepEqual(new Set(g.decks[2].map(c=>c.uid)),new Set(cards.map(c=>c.uid)));
 assert.equal(g.opportunityHistory[0].seen.length,2);assert.equal(g.opportunityHistory[0].retried,true);
});
test('yellow cannot retry without a second coin',()=>{
 const g=search('C14');E.chooseOpportunityLane(g,0,2);g.players[0].money=0;
 unchanged(g,()=>E.retryOpportunity(g,0),/资金/);
});
test('unselected ordinary candidates go below the existing deck',()=>{
 const g=search(),cards=stack(g,['A01','A02','B01','B02']);g.decks[2]=cards.slice();
 E.chooseOpportunityLane(g,0,2);const first=g.opportunity.options[0];E.chooseOpportunity(g,0);
 assert.equal(g.decks[2].pop().uid,cards[0].uid);assert.equal(g.decks[2].pop().uid,first.uid);
});
test('green orders top and bottom, then subsequent red search sees that order',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['B14',0],['A14',0,1]]);lock(g);E.resolveAll(g);
 const cards=stack(g,['A01','A02','B01','B02','C01']);g.decks[2]=cards.slice();
 E.chooseOpportunityLane(g,0,2);const [first,second,third]=g.opportunity.options;E.chooseOpportunity(g,0);
 E.orderOpportunity(g,0,third.uid,'top',0);E.orderOpportunity(g,0,first.uid,'top',0);
 assert.deepEqual(g.opportunity.top,[first.uid,third.uid]);
 unchanged(g,()=>E.orderOpportunity(g,0,third.uid,'top',9),/顺序/);
 E.finishOpportunityOrder(g,0);assert.equal(g.decks[2].at(0).uid,second.uid);
 E.resolveAll(g);assert.equal(g.opportunity.sourceType,'A14');E.chooseOpportunityLane(g,0,2);
 assert.deepEqual(g.opportunity.options.map(c=>c.uid),[first.uid,third.uid,cards[1].uid]);
});
test('green purchase happens once and ordering survives serialization',()=>{
 const g=search('B14');E.chooseOpportunityLane(g,0,2);const bought=g.opportunity.options[0],m=g.players[0].money;
 E.chooseOpportunity(g,0,bought.uid);assert.equal(g.players[0].money,m-getCard(bought).price.money);
 unchanged(g,()=>E.chooseOpportunity(g,0,bought.uid),/当前/);
 E.orderOpportunity(g,0,g.opportunity.options[0].uid,'top',0);
 const clone=JSON.parse(JSON.stringify(g));E.finishOpportunityOrder(g,0);E.finishOpportunityOrder(clone,0);
 E.resolveAll(g);E.resolveAll(clone);assert.deepEqual(clone,g);
 assert.equal(g.players[0].cards.filter(c=>c.uid===bought.uid).length,1);
});
test('same-slot remaining card and next player wait; reload never re-executes source',()=>{
 const g=make({startSanity:8}),p=g.players[0];rig(g,p,[['A14',0,2],['A05',0,2]]);rig(g,g.players[1],[['A14',0,2]]);
 lock(g);E.resolveAll(g);assert.equal(g.opportunity.player,0);assert.equal(p.inspiration,3);
 assert.equal(g.players[1].inspiration,4);const clone=JSON.parse(JSON.stringify(g));
 for(const x of [g,clone]){
  E.chooseOpportunityLane(x,0,2);E.chooseOpportunity(x,0);E.resolveAll(x);
  assert.equal(x.players[0].inspiration,4);assert.equal(x.opportunity.player,1);
  E.chooseOpportunityLane(x,1,2);E.chooseOpportunity(x,1);E.resolveAll(x);
 }
 assert.deepEqual(g,clone);assert.equal(g.players[0].skills.length,1);assert.equal(g.history.length,1);
});
test('public preview cannot reveal or depend on hidden cards and consumes no choices',()=>{
 const g=make();rig(g,g.players[0],[['A14',6]]);const before=structuredClone(g),preview=E.preview(g,0);
 assert.equal(preview.uncertain,true);assert.ok(preview.warnings.some(l=>l.text.includes('寻找机会')));assert.deepEqual(g,before);
 for(const lane of [2,4,8])g.decks[lane].reverse();assert.deepEqual(E.preview(g,0),preview);
});
test('caught or unaffordable search stays scheduled, with no search and no archive',()=>{
 for(const type of ['A14','C14']){
  const g=make(),p=g.players[0];rig(g,p,[[type,0]]);g.inspection.inspectionCount=1;g.diceRandom=seedFor([1]);lock(g);const m=p.money;E.resolveAll(g);
  assert.equal(g.opportunity,null);assert.equal(p.skills.length,0);assert.equal(p.money,m+1);assert.equal(p.inspiration,4);assert.equal(p.cards.length,1);
 }
 const g=make(),p=g.players[0];rig(g,p,[['A14',6]]);p.inspiration=0;lock(g);E.resolveAll(g);assert.equal(g.opportunity,null);assert.equal(p.skills.length,0);
});
test('internal exchange is work only, immune to inspection and checks low sanity',()=>{
 const g=make(),p=g.players[0],c=add(g,p,'W14');assert.match(E.canPlace(g,p,c.uid,{day:6,period:0}),/履职/);
 E.place(g,0,c.uid,{day:0,period:0});g.inspection.inspectionCount=1;g.diceRandom=seedFor([1]);lock(g);E.resolveAll(g);
 assert.equal(g.opportunity.sourceType,'W14');assert.equal(p.caught,0);assert.equal(p.sanity,3);
 for(const options of [{startSanity:4},{}]){
  const x=make(options);rig(x,x.players[0],[['W14',5]]);if(!options.startSanity)x.players[0].tempWeekend=true;
  lock(x);E.resolveAll(x);assert.equal(x.opportunity,null);assert.equal(x.players[0].skills.length,0);
 }
});
test('empty deck ends cleanly without compensation; discarded cards can refill a search',()=>{
 for(const type of ['A14','B14','C14','W14']){
  const g=search(type);g.decks[8]=[];g.discard[8]=[];E.chooseOpportunityLane(g,0,8);assert.equal(g.opportunity.options.length,0);
  const m=g.players[0].money;E.chooseOpportunity(g,0);assert.equal(g.players[0].money,m);E.resolveAll(g);assert.equal(g.phase,'escape');
 }
 const g=search();g.decks[2]=[];const cards=stack(g,['A01','B01']);g.discard[2]=cards.slice();
 E.chooseOpportunityLane(g,0,2);assert.equal(g.opportunity.options.length,2);assert.equal(g.discard[2].length,0);E.chooseOpportunity(g,0);assert.equal(g.decks[2].length,2);
});
test('bots resolve every search mode while human choices stay pending',()=>{
 for(const type of ['A14','B14','C14','W14']){
  const g=search(type);unchanged(g,()=>{E.botOpportunity(g);throw Error('human');},/human/);
  g.players[0].bot=true;E.botOpportunity(g);assert.equal(g.opportunity,null);E.resolveAll(g);assert.equal(g.phase,'escape');
 }
});

test('bots still arrange search activities after the same skill has been archived',()=>{
 for(const type of ['A14','B14','C14','W14']){
  const g=make(),p=g.players[0];p.cards=[];p.skills=[{uid:'archived',type}];
  const c=add(g,p,type);p.bot=true;E.botAct(g);
  assert.ok(E.findPlacement(p,c.uid),type);
 }
});
