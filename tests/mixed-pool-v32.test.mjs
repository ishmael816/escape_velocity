import {placementTurn,adjustmentTurn} from './helpers.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import * as V from '../src/engine-v32.js';
import {getCard,EVENTS} from '../src/cards.js';
import {make,add,lock,next,turn,skills,seedFor} from './helpers.mjs';

function scheduled(g,type,day,period=0){const p=g.players[0],c=add(g,p,type);(p.schedule[`${day}-${period}`]??=[]).push(c.uid);E.syncSanity(g,p);return c;}
function finish(g){lock(g);let guard=300;while(g.phase==='resolving'&&guard--){if(g.opportunity){const q=g.opportunity,p=g.players[q.player];if(q.stage==='v32')E.chooseActivity(g,p.id,V.defaultChoice(g,p,E.cardAt(p,q.uid)));else if(q.stage==='duty')E.chooseActivity(g,p.id);else throw Error('Unexpected choice: '+q.stage);}else E.resolveAll(g);}assert(guard>0);assert.equal(g.phase,'escape');}

test('restocking counts printed income and attached markers each week without accumulating income',()=>{
 for(const [principal,auto,expected] of [[0,0,1],[1,0,2],[2,0,3],[1,1,2],[2,1,4]]){
  const g=make({startMoney:60}),c=scheduled(g,'C12',0);c.principal=principal;c.auto=auto;
  finish(g);assert.equal(g.players[0].income,expected);
  next(g);finish(g);assert.equal(g.players[0].income,expected);
 }
});

test('focused delivery charges on both weeks and awards completion only once',()=>{
 const g=make({startMoney:60}),c=scheduled(g,'W04',0);
 finish(g);assert.equal(c.progress,1);assert.equal(g.players[0].duty||0,0);assert.equal(g.players[0].money,62);
 next(g);finish(g);assert.equal(g.players[0].duty,1);assert.equal(g.players[0].money,67);
 assert.equal(E.findPlacement(g.players[0],c.uid),null);
 next(g);finish(g);assert.equal(g.players[0].duty,1);assert.equal(g.players[0].money,71);
});

test('selling courses requires prior technical growth and free inspiration search stays in level I',()=>{
 const g=make({startMoney:60}),p=g.players[0];assert(E.canBuy(g,p,getCard('B11')));
 skills(p,'B');assert.equal(E.canBuy(g,p,getCard('B11')),null);
 assert.equal(getCard('A10').opportunity.lane,4);
});

test('payroll transferred to Dark Plans stops wages, earns income once, and returns on withdrawal',()=>{
 const g=make({startMoney:60}),p=g.players[0],c=add(g,p,'W16');p.duty=4;
 placementTurn(g);assert.match(E.canPlace(g,p,c.uid,{day:6,period:0},{salaryTransfer:4}),/容量/);
 (E.findPlacement(g.players[0],c.uid)?adjustmentTurn:placementTurn)(g);E.place(g,0,c.uid,{day:6,period:0},{salaryTransfer:3});assert.equal(p.duty,1);assert.equal(c.duty,3);
 finish(g);assert.equal(p.income,3);assert.equal(p.settlement.salary,g.config.salary+1);assert.equal(p.money,67);
 next(g);turn(g);adjustmentTurn(g);E.unplace(g,0,c.uid);assert.equal(p.duty,4);assert.equal(c.duty,undefined);assert.equal(p.money,67);
});

test('weekend project pays three times, cannot accept external duty, and unlocks next week only',()=>{
 const g=make({startMoney:60}),p=g.players[0],c=add(g,p,'W09');p.duty=5;
 placementTurn(g);assert.match(E.canPlace(g,p,c.uid,{day:0,period:0},{duty:true}),/履职/);
 (E.findPlacement(g.players[0],c.uid)?adjustmentTurn:placementTurn)(g);E.place(g,0,c.uid,{day:0,period:0});
 for(let week=1;week<=3;week++){
  const money=p.money;finish(g);assert.equal(p.money,money-2+g.config.salary+5);assert.equal(p.weekend,false);assert.equal(p.duty,5);
  if(week<3){assert.equal(c.progress,week);assert.equal(c.projectDuty,week);assert(E.findPlacement(p,c.uid));}
  else{assert.equal(p.weekendFrom,4);assert(p.skills.some(x=>x.uid===c.uid));assert.equal(E.findPlacement(p,c.uid),null);}
  next(g);
 }
 assert.equal(p.weekend,true);assert.equal(E.sanityState(g,p).baseline,5);
});

test('reporting searches only I cards and management bonus excludes escape income',()=>{
 const g=make({startMoney:60,startSanity:7}),p=g.players[0];scheduled(g,'W06',0);lock(g);E.resolveAll(g);
 assert.equal(g.opportunity.stage,'lane');const before=structuredClone(g);assert.throws(()=>E.chooseOpportunityLane(g,0,8));assert.deepEqual(g,before);
 E.chooseOpportunityLane(g,0,4);assert.equal(g.opportunity.options.length,2);assert(g.opportunity.options.every(c=>getCard(c).hours===4));E.chooseOpportunity(g,0);finish(g);assert.equal(p.income,0);assert.equal(p.settlement.otherIncome,3);
 for(const face of [2,5]){const h=make({startMoney:60}),q=h.players[0];q.duty=2;scheduled(h,'W14',0);h.diceRandom=seedFor([face]);finish(h);assert.equal(q.income,0);assert.equal(q.settlement.otherIncome,5+(face>3?2:0));assert.equal(q.money,60-2+5+q.settlement.otherIncome);}
});

test('all six mixed-route II cards require both archives and fit the 3–4 income band',()=>{
 const specs=[['A13','WA',3],['B12','WB',4],['C13','WC',3],['B14','AB',3],['A14','AC',3],['C12','BC',4]];
 for(const [id,req,profit] of specs){const g=make({startMoney:60,startSanity:7}),p=g.players[0],d=getCard(id);assert.equal(d.requires,req);assert.equal(d.hours,8);
  skills(p,req[0]);assert(E.canBuy(g,p,d));skills(p,req);assert.equal(E.canBuy(g,p,d),null);
  const c=scheduled(g,id,0);c.auto=1;if(id==='C12')c.principal=2;if(id==='B14')p.inspirationSlots=['4-2'];
  const count=p.cards.length;finish(g);const result=g.players[0];assert.equal(result.income,profit,id);if(id==='B14'){assert.equal(result.cards.length,count+1);assert.equal(getCard(result.cards.at(-1)).hours,4);assert.equal(E.findPlacement(result,result.cards.at(-1).uid),null);}
 }
});

test('publishing optional inspiration pays exactly once and rejects a missing source atomically',()=>{
 const g=make({startMoney:60}),p=g.players[0];p.inspirationSlots=['4-2'];scheduled(g,'A14',0);lock(g);E.resolveAll(g);assert.equal(g.opportunity.stage,'v32');
 const before=structuredClone(g);assert.throws(()=>E.chooseActivity(g,0,{useInspiration:true,optionalSource:'3-2'}));assert.deepEqual(g,before);
 E.chooseActivity(g,0,{useInspiration:true,optionalSource:'4-2'});finish(g);assert.equal(g.players[0].income,3);assert.equal(g.players[0].settlement.otherIncome,2);assert.equal(E.inspirationCount(g.players[0]),0);
});

test('new duty cannot undo a resolved inspection; already protected cards remain safe that week',()=>{
 const g=make({startMoney:60}),p=g.players[0],c=scheduled(g,'B03',0);g.inspection.inspectionCount=1;g.diceRandom=seedFor([1,2]);lock(g);E.rollInspections(g);
 assert(E.activityDanger(g,p,c,{day:0,period:0}));p.duty=1;g.opportunity={stage:'duty',player:0,count:1};E.chooseActivity(g,0,c.uid);assert.equal(c.duty,1);assert(E.activityDanger(g,p,c,{day:0,period:0}));finish(g);assert.equal(p.income,0);
 next(g);assert.equal(p.inspectionProtected,undefined);g.inspection.inspectionCount=1;g.diceRandom=seedFor([1]);lock(g);E.rollInspections(g);assert(!E.activityDanger(g,p,c,{day:0,period:0}));V.spend(p,'duty',c.uid);assert(!E.activityDanger(g,p,c,{day:0,period:0}));finish(g);assert.equal(p.income,1);
});

test('event split replaces own and opponents events before dice, excludes escaped players and resets weekly',()=>{
 const g=make({playerCount:3,startMoney:60,startSanity:1}),p=g.players[0],c=scheduled(g,'W15',0);g.players[2].escaped=true;
 const bonus=EVENTS.findIndex(e=>e.kind==='bonus'),check=EVENTS.findIndex(e=>e.inspectionCount===1);g.inspectionDeck=[check,bonus];lock(g);E.resolveAll(g);
 assert.equal(g.opportunity.stage,'event-split');assert.equal(g.inspectionResolved,false);const before=structuredClone(g);assert.throws(()=>E.chooseActivity(g,0,7));assert.deepEqual(g,before);
 E.chooseActivity(g,0,0);assert.equal(E.eventFor(g,p).kind,'bonus');assert.equal(E.eventFor(g,g.players[1]).inspectionCount,1);assert.equal(g.eventOverrides[2],undefined);assert(!p.cards.includes(c));assert(!p.skills.includes(c));
 finish(g);assert.equal(p.settlement.eventMoney,EVENTS[bonus].gain.money);assert.equal(g.players[1].settlement.eventMoney,0);assert.equal(g.inspection.chains.length,1);
 next(g);assert.deepEqual(g.eventOverrides,{});
});
