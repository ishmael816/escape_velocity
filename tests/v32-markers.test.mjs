import {placementTurn,adjustmentTurn} from './helpers.mjs';
import {passKeeping,keepMarket} from './helpers.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../src/engine.js';
import * as V from '../src/engine-v32.js';
import {getCard,CARDS,ADVANCED} from '../src/cards.js';
import {validatePool} from '../src/card-studio-model.js';
import {generateOutputs} from '../scripts/generate-v31.mjs';
const make=()=>{const g=E.createGame({playerCount:2,mode:'hotseat',startMoney:60});g.inspection={inspectionCount:0,times:[],blockedTimes:[],gain:{}};return g;};
function add(g,type,day,period=0){const p=g.players[0],c={uid:'fixture'+(++g.uid),type};p.cards.push(c);if(day!==undefined)(p.schedule[`${day}-${period}`]||=[]).push(c.uid);E.syncSanity(g,p);return c;}
function lock(g){keepMarket(g);while(g.phase==='planning')passKeeping(g,E.activeBuyer(g));}
function finish(g){lock(g);let guard=100;while(g.phase==='resolving'&&guard--){if(g.opportunity){const q=g.opportunity,p=g.players[q.player];if(q.stage==='v32')E.chooseActivity(g,p.id,V.defaultChoice(g,p,E.cardAt(p,q.uid)));else if(q.stage==='duty')E.chooseActivity(g,p.id,null);else if(q.stage==='event-split')E.chooseActivity(g,p.id,0);else if(q.stage==='lane')E.chooseOpportunityLane(g,p.id,4);else if(q.stage==='hire')E.chooseHire(g,p.id);else E.chooseOpportunity(g,p.id);}else E.resolveAll(g);}assert(guard>0);}
function next(g){for(const p of g.players)if(!Object.hasOwn(g.escapeDecisions,p.id))E.chooseEscape(g,p.id,false);E.closeWeek(g);g.inspection={inspectionCount:0,times:[],blockedTimes:[],gain:{}};}
function pending(g){lock(g);E.resolveAll(g);assert.equal(g.opportunity?.stage,'v32');return g.opportunity;}
test('56 definitions, 224 physical cards, fixed supply and generated docs agree',()=>{
 const pool=JSON.parse(fs.readFileSync('data/cardpool-v31.json','utf8'));assert.deepEqual(validatePool(pool),[]);assert.equal(pool.cards.length,56);
 assert.deepEqual(Object.fromEntries('ABWC'.split('').map(r=>[r,pool.cards.filter(c=>c.route===r).length])),{A:15,B:14,W:14,C:13});
 for(const [path,text]of Object.entries(generateOutputs(pool)))assert.equal(fs.readFileSync(path,'utf8').replaceAll('\r\n','\n'),text);
 const g=make();assert.equal(Object.values(g.market).flat().length,12);assert.equal(Object.values(g.market).flat().length+Object.values(g.decks).flat().length,224);
});
test('same empty night stacks inspiration; whole-pile conversion progresses only on success',()=>{
 const g=make(),c=add(g,'A03',0);pending(g);E.chooseActivity(g,0,{nights:['3-2','3-2']});finish(g);assert.equal(E.inspirationCount(g.players[0]),2);
 next(g);g.players[0].schedule={};const x=add(g,'A02',0);pending(g);E.chooseActivity(g,0,{night:'3-2'});finish(g);
 assert.equal(x.progress,undefined); // atomic choice replaced game objects
 assert.equal(E.cardAt(g.players[0],x.uid).progress,1);assert.equal(g.players[0].income,0);assert.equal(g.players[0].weeklyEarnings.find(e=>e.uid===x.uid).money,4);
 next(g);finish(g);assert.equal(E.cardAt(g.players[0],x.uid).progress,1);
});
test('placing on an inspired night clears the full pile and cannot restore it',()=>{
 const g=make(),p=g.players[0],c=add(g,'A06');p.inspirationSlots=['0-2','0-2','1-2'];(E.findPlacement(g.players[0],c.uid)?adjustmentTurn:placementTurn)(g);E.place(g,0,c.uid,{day:0,period:2});assert.deepEqual(p.inspirationSlots,['1-2']);
});
test('invalid choice is atomic and pending choice survives JSON reload',()=>{
 let g=make();add(g,'A15',0);const source=add(g,'B03',1);source.auto=1;pending(g);g=JSON.parse(JSON.stringify(g));const before=JSON.stringify(g);
 assert.throws(()=>E.chooseActivity(g,0,{resource:'5-2'}));assert.equal(JSON.stringify(g),before);
 E.chooseActivity(g,0,{resource:source.uid});finish(g);assert.equal(g.players[0].income,1);assert.equal(g.players[0].settlement.otherIncome,5);
});
test('automatic pipeline archives, replays and does not grant immunity',()=>{
 const g=make(),p=g.players[0],pipeline=add(g,'B05',0),target=add(g,'B02',1);pending(g);
 E.chooseActivity(g,0,{target:target.uid});finish(g);let q=g.players[0];assert.equal(E.cardAt(q,target.uid).auto,1);assert.equal(q.money,63);assert.equal(q.skills.length,1);assert.equal(E.protectedActivity(q,E.cardAt(q,target.uid),{day:1,period:0}),false);
 next(g);while(E.activeBuyer(g)!==0)passKeeping(g,E.activeBuyer(g));q=g.players[0];assert(E.unplacedCards(q).some(c=>c.uid===pipeline.uid));
 (E.findPlacement(g.players[0],pipeline.uid)?adjustmentTurn:placementTurn)(g);E.place(g,0,pipeline.uid,{day:2,period:0});assert.equal(q.skills.length,0);assert.equal(E.cardAt(q,pipeline.uid).progress,undefined);
});
test('same-name archives count once as skill but twice for sale course',()=>{
 const g=make(),p=g.players[0];p.skills=[{uid:'s1',type:'B01'},{uid:'s2',type:'B01'}];add(g,'B11',0);const tool=add(g,'B03',1);tool.auto=1;finish(g);assert.equal(E.skillCounts(g.players[0]).B,2);assert.equal(g.players[0].skills.length,3);assert.equal(g.players[0].income,1);assert.equal(g.players[0].money,69);
});
test('below bonus needs touching income and successful execution, resets each week',()=>{
 const g=make(),source=add(g,'B06',0),target=add(g,'B03',0,1);assert.deepEqual(V.neighbors(g.players[0],source,'below').map(c=>c.uid),[target.uid]);finish(g);assert.equal(g.players[0].income,2);
 next(g);g.players[0].schedule['0-0']=[];finish(g);assert.equal(g.players[0].income,1);
});
test('8h adjacency does not skip gaps and below means the night',()=>{
 const g=make(),wide=add(g,'A08',0),right1=add(g,'B03',1),right2=add(g,'A06',1,1),below=add(g,'W01',0,2);add(g,'B03',3);
 assert.deepEqual(V.neighbors(g.players[0],wide,'right').map(x=>x.uid),[right1.uid,right2.uid]);assert.deepEqual(V.neighbors(g.players[0],wide,'below').map(x=>x.uid),[below.uid]);
});
test('goods placement costs three per missing item; withdrawal restores stock',()=>{
 const g=make(),p=g.players[0],c=add(g,'C06');p.principal=1;(E.findPlacement(g.players[0],c.uid)?adjustmentTurn:placementTurn)(g);E.place(g,0,c.uid,{day:0,period:0},{capital:3});assert.equal(p.money,54);assert.equal(c.principal,3);assert.equal(p.principal,0);
 finish(g);const q=g.players[0];assert.equal(q.income,4);next(g);while(E.activeBuyer(g)!==0)passKeeping(g,E.activeBuyer(g));const before=q.money;adjustmentTurn(g);E.unplace(g,0,c.uid);assert.equal(q.money,before);assert.equal(q.principal,3);
});
test('trading sells investment tokens and revenue is not escape income',()=>{
 const g=make(),c=add(g,'C03',0),investment=add(g,'C06',1);investment.principal=3;pending(g);
 E.chooseActivity(g,0,{trade:'sell',quantity:2,capitalSource:investment.uid});finish(g);const p=g.players[0];assert.equal(E.cardAt(p,investment.uid).principal,1);assert.equal(p.income,2);assert.equal(p.money,71);
});
test('wholesale buys an indivisible batch; retail sells two and leaves one',()=>{
 const g=make();assert(!Object.hasOwn(g,'exchangeRate'));
 g.exchangeRate=4;add(g,'C08',0);add(g,'C09',1);
 pending(g);E.chooseActivity(g,0,{trade:'buy',quantity:3,capitalTarget:'reserve'});
 assert.equal(g.players[0].money,55);assert.equal(g.players[0].principal,3);
 E.resolveAll(g);E.chooseActivity(g,0,{trade:'sell',quantity:2,capitalSource:'reserve'});
 finish(g);assert.equal(g.players[0].money,66);assert.equal(g.players[0].principal,1);
 assert.equal(g.players[0].income,0);
});
test('preorder can fund its own purchase without double-crediting cash',()=>{
 const g=make(),p=g.players[0];p.money=0;p.inspirationSlots=['5-2'];add(g,'C11',0);pending(g);E.chooseActivity(g,0,{resource:'5-2',trade:'buy',quantity:1,capitalTarget:'reserve'});finish(g);assert.equal(g.players[0].money,3);assert.equal(g.players[0].principal,1);assert.equal(g.players[0].income,0);
});
test('duty stays in salary and cannot be attached during placement',()=>{
 const g=make(),p=g.players[0],c=add(g,'A06');p.duty=1;placementTurn(g);const before=JSON.stringify(g);
 assert.throws(()=>E.place(g,0,c.uid,{day:0,period:0},{duty:true}),/履职/);assert.equal(JSON.stringify(g),before);
 E.place(g,0,c.uid,{day:0,period:0});assert.equal(p.duty,1);assert(!E.protectedActivity(p,c,{day:0,period:0}));
});

test('cash placement fee is paid on deployment only, including after withdrawal',()=>{
 const g=make(),p=g.players[0],c=add(g,'W12');placementTurn(g);
 p.money=2;const before=JSON.stringify(g);assert.throws(()=>E.place(g,0,c.uid,{day:1,period:0}),/3 资金/);assert.equal(JSON.stringify(g),before);
 p.money=8;E.place(g,0,c.uid,{day:1,period:0});assert.equal(p.money,5);
 passKeeping(g,1);adjustmentTurn(g);E.place(g,0,c.uid,{day:2,period:0});assert.equal(p.money,5);
 E.unplace(g,0,c.uid);placementTurn(g);E.place(g,0,c.uid,{day:3,period:0});assert.equal(p.money,2);
});
test('artist takes one inspiration per distinct empty night on deployment and moves at most two from distinct nights and scores the same visible pile each week',()=>{
 const g=make(),p=g.players[0],artist=add(g,'A09');p.inspirationSlots=['4-2','4-2','5-2','5-2','6-2'];
 placementTurn(g);E.place(g,0,artist.uid,{day:1,period:0},{art:2});assert.equal(artist.art,2);assert.deepEqual(p.inspirationSlots,['4-2','5-2','6-2']);
 const preview=E.preview(g,0);assert.equal(preview.incomeHigh,4);assert.equal(preview.incomeLow,4);
 finish(g);assert.equal(p.income,4);
 next(g);p.inspirationSlots=['6-2'];adjustmentTurn(g);E.place(g,0,artist.uid,{day:2,period:0});finish(g);
 assert.equal(p.income,4);assert.deepEqual(p.inspirationSlots,['6-2']);
 next(g);adjustmentTurn(g);E.unplace(g,0,artist.uid);assert.equal(artist.art,undefined);assert.deepEqual(p.inspirationSlots,['6-2']);
});
test('artist with an empty pile scores its base income, and saved artist markers stay on the card',()=>{
 const g=make(),p=g.players[0],artist=add(g,'A09');placementTurn(g);E.place(g,0,artist.uid,{day:1,period:0});finish(g);assert.equal(p.income,2);
 artist.art=3;V.restoreArtistInspiration(p);assert.equal(artist.art,3);assert.deepEqual(p.inspirationSlots,[]);
});
test('a full branded counter sells one for five cash without side income',()=>{
 const g=make(),c=add(g,'C04',0);c.principal=2;pending(g);E.chooseActivity(g,0,{trade:'sell',quantity:1});finish(g);
 assert.equal(g.players[0].income,0);assert.equal(g.players[0].settlement.otherIncome,5);assert.equal(E.cardAt(g.players[0],c.uid).principal,1);
 next(g);pending(g);E.chooseActivity(g,0,{trade:'sell',quantity:1});finish(g);assert.equal(g.players[0].settlement.otherIncome,4);
});

test('a later trade changes the displayed shelf value for the same weekly bill',()=>{
 const g=make(),shelf=add(g,'C06',0);shelf.principal=3;add(g,'C03',1);pending(g);

 E.chooseActivity(g,0,{trade:'sell',quantity:2,capitalSource:shelf.uid});finish(g);
 const p=g.players[0];assert.equal(E.cardAt(p,shelf.uid).principal,1);assert.equal(p.income,2);assert.equal(p.money,71);
});
test("Agent reads other cards existing automatic markers, without creating new ones",()=>{
 const g=make();g.config.startSanity=7;add(g,'B10',0);const evening=add(g,'W01',0,2);evening.auto=1;
 finish(g);assert.equal(g.players[0].income,3);assert.equal(E.cardAt(g.players[0],evening.uid).auto,1);
 next(g);finish(g);assert.equal(g.players[0].income,3);assert.equal(E.cardAt(g.players[0],evening.uid).auto,1);
});
test('hire charges full target cost and only archives after two actual hires',()=>{
 const g=make(),h=add(g,'C07',0);g.mondayMarketBought=true;g.market[4]=[{uid:'hire1',type:'W05'},{uid:'hire2',type:'B02'}];lock(g);E.resolveAll(g);assert.equal(g.opportunity.stage,'hire');E.chooseHire(g,0,'hire1');finish(g);let p=g.players[0];assert.equal(E.cardAt(p,h.uid).progress,1);assert.equal(p.duty,0);assert.equal(p.money,56);
 next(g);g.mondayMarketBought=true;lock(g);E.resolveAll(g);E.chooseHire(g,0,'hire2');finish(g);p=g.players[0];assert.equal(p.skills.length,3);assert.equal(p.duty,0);assert.equal(p.money,55);
});
test('unaffordable support withdraws; auto discounts but never makes fees negative',()=>{
 const g=make(),p=g.players[0];p.money=0;const c=add(g,'W10',6);finish(g);assert.equal(E.findPlacement(p,c.uid),null);
 const h=make(),q=h.players[0],x=add(h,'W10',6);x.auto=1;assert.equal(E.supportPlan(h,q)[0].fee,1);assert.equal(V.effectiveCost(x,getCard(x)),0);
});
test('all 56 card definitions resolve or produce a legal resumable choice',()=>{
 for(const d of [...CARDS,...ADVANCED]){const g=make(),p=g.players[0];p.inspirationSlots=['4-2','4-2','5-2'];p.duty=3;p.principal=3;const c=add(g,d.id,d.offHours?6:0);if(d.mechanic.capital)c.principal=d.mechanic.capital;if(d.mechanic.artist)c.art=3;const neighbor=add(g,'C12',1);neighbor.auto=1;add(g,'B03',0,1);finish(g);assert.equal(g.phase,'escape',d.name);assert(Number.isFinite(g.players[0].money),d.name);assert(g.players[0].money>=0,d.name);}
});
