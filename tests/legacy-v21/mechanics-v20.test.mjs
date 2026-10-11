import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {CARDS,ADVANCED,getCard} from '../src/cards.js';
import {make,add,turn,lock,finish,next,rig,skills,seedFor} from './helpers.mjs';
const sunday={day:6,period:0};
test('no card or player uses inspiration as a currency; only flat boosts remain',()=>{
 const p=make().players[0];assert.equal(p.inspiration,undefined);assert.equal(E.inspirationCount(p),7);
 for(const d of [...CARDS,...ADVANCED]){assert.equal(d.gain.inspiration,undefined);assert.equal(d.cost.inspiration,undefined);assert.notEqual(d.boost?.type,'double');}
});
test('placing erases a night marker; withdrawing cannot farm it; next week restores it',()=>{
 const g=make(),p=g.players[0],c=add(g,p,'A02');E.place(g,0,c.uid,{day:6,period:2});assert.equal(E.inspirationCount(p),6);turn(g);E.unplace(g,0,c.uid);assert.equal(E.inspirationCount(p),6);finish(g);next(g);assert.equal(E.inspirationCount(p),7);
});
test('completed growth does not regenerate inspiration until next week',()=>{
 const g=make(),p=g.players[0],c=add(g,p,'A02');E.place(g,0,c.uid,{day:6,period:2});finish(g);assert.equal(E.inspirationCount(p),6);next(g);assert.equal(E.inspirationCount(p),7);
});
test('multiple creative cards read the same markers without spending them',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['A07',0],['A08',6]]);finish(g);assert.equal(p.income,3);assert.equal(E.inspirationCount(p),7);
});
for(const [id,ratio] of [['C09',4],['C10',3]])test(`${id}: variable capital is locked, scalable, refundable and never income itself`,()=>{
 const g=make({startMoney:60}),p=g.players[0];skills(p,'CCCC');const c=add(g,p,id);
 E.place(g,0,c.uid,sunday,ratio*11);assert.equal(c.lockedCapital,ratio*11);assert.equal(p.money,60-ratio*11);finish(g);assert.equal(p.income,11);assert.equal(p.money,60-ratio*11+14);
 next(g);turn(g);const before=p.money;E.unplace(g,0,c.uid);assert.equal(p.money,before+ratio*11);assert.equal(p.income,0);assert.equal(c.lockedCapital,undefined);
});
test('adjusting capital consumes an action; moves retain principal; invalid inputs atomic',()=>{
 const g=make({startMoney:30}),p=g.players[0];skills(p,'CCCC');const c=add(g,p,'C10');
 for(const n of [0,1,2,4,-3,3.5,Infinity,NaN,33]){const before=structuredClone(g);assert.throws(()=>E.place(g,0,c.uid,sunday,n));assert.deepEqual(g,before);}
 E.place(g,0,c.uid,sunday,6);turn(g);const actions=g.actionCount;E.place(g,0,c.uid,sunday,12);assert.equal(g.actionCount,actions+1);assert.equal(p.money,18);turn(g);E.place(g,0,c.uid,{day:5,period:0});assert.equal(p.money,18);assert.equal(c.lockedCapital,12);
});
test('capital is unavailable for upkeep, and inspection pauses profit without losing principal',()=>{
 const g=make({startMoney:6}),p=g.players[0];skills(p,'CCCC');rig(g,p,[['W13',6]]);const c=add(g,p,'C10');E.place(g,0,c.uid,{day:0,period:0},6);assert.equal(p.sanity,4);
 g.inspection.inspectionCount=1;g.diceRandom=seedFor([1]);finish(g);assert.equal(p.income,0);assert.equal(c.lockedCapital,6);assert.equal(p.money,3);assert.equal(p.caught,1);assert.ok(E.unplacedCards(p).some(c=>c.type==='W13'));
});
test('two parallel 2h activities preserve the 2h night, but each keeps its pressure',()=>{
 const g=make(),p=g.players[0];skills(p,'BBB');const a=add(g,p,'B09'),b=add(g,p,'C05'),c=add(g,p,'A02');const slot={day:6,period:2};
 E.place(g,0,a.uid,slot);turn(g);E.place(g,0,b.uid,slot);assert.equal(E.slotHours(p,slot),2);assert.equal(p.sanity,2);turn(g);assert.match(E.canPlace(g,p,c.uid,slot),/最多两张/);finish(g);assert.equal(p.income,3);
});
test('parallel 4h nights still incur full overtime and disable their support',()=>{
 const g=make({startSanity:8}),p=g.players[0];skills(p,'ABBBB');const a=add(g,p,'B10'),b=add(g,p,'A13'),slot={day:6,period:2};E.place(g,0,a.uid,slot);turn(g);E.place(g,0,b.uid,slot);assert.equal(E.slotHours(p,slot),4);assert.equal(p.sanity,4);finish(g);assert.equal(p.sanity,4);assert.equal(p.income,4);
});
test('parallel cannot host a third card; an 8h activity resolves once with partners on each half',()=>{
 const g=make(),p=g.players[0];skills(p,'AAAABBBB');const a=add(g,p,'A08'),b=add(g,p,'B09'),c=add(g,p,'B10'),extra=add(g,p,'C05');
 E.place(g,0,a.uid,sunday);turn(g);E.place(g,0,b.uid,sunday);turn(g);E.place(g,0,c.uid,{day:6,period:1});turn(g);assert.match(E.canPlace(g,p,extra.uid,sunday),/最多一张/);finish(g);assert.equal(p.income,7);assert.equal(p.weeklyEarnings.length,3);
});
test('inspection fines both parallel cards; permission shields only the first eligible one',()=>{
 for(const protect of [false,true]){const g=make(),p=g.players[0];skills(p,'BBB');rig(g,p,[['B09',0],['C05',0]]);if(protect)p.protectedSlot='0-0';g.inspection.inspectionCount=3;g.diceRandom=seedFor([1,1,1]);finish(g);assert.equal(p.caught,protect?1:2);assert.equal(p.income,protect?2:0);assert.equal(p.money,protect?12:9);}
});
test('a protected one-time activity cannot pass protection to the next parallel card',()=>{
 const g=make(),p=g.players[0];skills(p,'BBB');rig(g,p,[['A02',0],['B09',0]]);p.protectedSlot='0-0';g.inspection.inspectionCount=1;g.diceRandom=seedFor([1]);finish(g);assert.equal(E.skillCounts(p).A,1);assert.equal(p.caught,1);assert.equal(p.income,0);
});
function hiring(){const g=make(),p=g.players[0];skills(p,'CC');rig(g,p,[['C12',0],['B06',6]]);const c={uid:'recruit',type:'W01'};lock(g);g.market[2][0]=c;E.resolveAll(g);return {g,p,c};}
test('hiring pays printed price plus two, archives immediately, never executes original effect',()=>{
 const {g,p,c}=hiring();assert.equal(g.opportunity.stage,'hire');const cash=p.money,dice=g.diceRandom;E.chooseHire(g,0,c.uid);assert.equal(p.money,cash-getCard(c).price.money-2);assert.equal(E.skillCounts(p).W,1);assert.equal(g.diceRandom,dice);assert.equal(p.cards.some(x=>x.uid===c.uid),false);assert.equal(g.market[2].length,5);assert.ok(E.findPlacement(p,p.cards.find(c=>c.type==='C12').uid));E.resolveAll(g);assert.equal(p.income,1);assert.equal(p.settlement.otherIncome,0);
});
test('hiring enforces one eligible market card, affordability, uniqueness and reload continuation',()=>{
 const {g,p,c}=hiring();for(const [id,uid] of [[1,c.uid],[0,'bad']]){const before=structuredClone(g);assert.throws(()=>E.chooseHire(g,id,uid));assert.deepEqual(g,before);}
 const m=p.money;p.money=0;const before=structuredClone(g);assert.throws(()=>E.chooseHire(g,0,c.uid));assert.deepEqual(g,before);p.money=m;const clone=structuredClone(g);for(const x of [g,clone]){E.chooseHire(x,0,c.uid);assert.throws(()=>E.chooseHire(x,0,c.uid));E.resolveAll(x);}assert.deepEqual(g,clone);
 next(g);lock(g);g.market[2][0]={uid:'duplicate',type:'W01'};E.resolveAll(g);assert.ok(!E.hireCandidates(g,0).some(c=>c.type==='W01'));E.chooseHire(g,0);E.resolveAll(g);assert.equal(g.phase,'escape');
});
test('advanced search finds developer cards in their actual 2h and 4h decks',()=>{
 const g=make(),p=g.players[0];g.phase='escape';p.drafts=[{id:'dev',pool:'B',options:null}];E.openDraft(g,0,'dev');const options=p.drafts[0].options;assert.equal(options.length,2);assert.ok(options.every(c=>getCard(c).parallel&&getCard(c).hours<=4));const rejected=options[1];E.chooseAdvanced(g,0,'dev',options[0].uid);assert.equal(g.decks[getCard(rejected).hours][0].uid,rejected.uid);
});
