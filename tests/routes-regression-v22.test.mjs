import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {getCard} from '../src/cards.js';
import {make, turn, finish, next} from './helpers.mjs';
import {offer, supplyIds, reload} from './regression-helpers-v22.mjs';

// Favourable market/no-inspection reachability, NOT a balance or win-rate test.
// Only public supply order and the event fixture are controlled. Starting cash,
// skills, ownership, schedule, action clock, project progress and escape results
// are never assigned. All cards come from the real finite fixed-copy supply.
const routes=[
 {"name":"late-a","players":3,"growth":["A-G1","A-G2"],"permission":false,"board":[["A-H",6,0],["A-H",5,0],["A-H",4,0],["A-E",0,0],["B-S",2,0]],"income":10,"sanity":7,"capital":0},
 {"name":"late-b","players":3,"growth":["B-G1","B-G2"],"permission":false,"board":[["B-H",6,0],["B-H",5,0],["B-H",4,0],["A-E",0,0],["B-S",0,1],["B-S",2,0]],"income":10,"sanity":7,"capital":0},
 {"name":"late-c","players":3,"growth":["C-G1","C-G2"],"permission":false,"board":[["C-H",6,0],["C-H",5,0],["C-H",4,0],["A-E",0,0],["B-S",2,0]],"income":10,"sanity":7,"capital":9},
 {"name":"late-w","players":3,"growth":["W-G1","W-G2"],"permission":true,"board":[["W-H",6,0],["W-H",5,0],["W-H",4,0],["A-E",0,0],["B-S",0,1]],"income":10,"sanity":6,"capital":0},
 {"name":"late-ab","players":2,"growth":["A-G1","A-G2","B-G1","B-G2","W-G1"],"permission":false,"board":[["A-H",6,0],["B-H",5,0],["B-X",0,0],["W-X",0,0],["B-S",1,0]],"income":10,"sanity":6,"capital":0},
 {"name":"late-ac","players":2,"growth":["A-G1","A-G2","C-G1"],"permission":false,"board":[["A-H",6,0],["A-H",5,0],["A-X",4,0],["A-E",0,0],["B-S",2,0]],"income":10,"sanity":8,"capital":3},
 {"name":"late-wc","players":2,"growth":["W-G1","W-G2","C-G1","B-G1"],"permission":false,"board":[["W-H",6,0],["W-H",5,0],["C-X",4,0],["W-X",0,0],["B-S",2,0]],"income":10,"sanity":7,"capital":3},
 {"name":"zero-repeat","players":2,"growth":[],"permission":false,"board":[["A-E",0,0],["A-E",0,1],["B-E",1,0],["B-E",1,1],["C-E",2,0],["C-E",2,1],["A-L",3,0],["A-L",4,0],["W-S",5,0],["W-S",6,0]],"income":10,"sanity":7,"capital":6},
 {"name":"two-player-W","players":2,"growth":["W-G1","W-G2"],"permission":false,"board":[["W-H",6,0],["W-H",5,0],["W-M",0,0],["W-M",0,1],["B-S",1,0],["B-S",2,0]],"income":10,"sanity":7,"capital":0},
 {"name":"two-player-A","players":2,"growth":["A-G1","A-G2"],"permission":false,"board":[["A-H",6,0],["A-H",5,0],["A-M",0,0],["A-M",0,1],["B-S",2,0]],"income":10,"sanity":8,"capital":0},
 {"name":"two-player-B","players":2,"growth":["B-G1","B-G2"],"permission":false,"board":[["B-H",6,0],["B-H",5,0],["B-M",0,0],["B-M",0,1],["B-S",1,0],["B-S",2,0]],"income":10,"sanity":7,"capital":0},
 {"name":"two-player-C","players":2,"growth":["C-G1","C-G2"],"permission":false,"board":[["C-H",6,0],["C-H",5,0],["C-M",0,0],["C-M",0,1],["B-S",1,0]],"income":10,"sanity":6,"capital":10}
];


for(const route of routes)test(`full acquisition: ${route.name} buys, schedules, grows and escapes from default empty start`,t=>{
  let g=make({playerCount:route.players}),p=g.players[0];
  const originalIds=supplyIds(g),bought=[],actions=[];
  assert.equal(p.money,8);assert.equal(p.sanity,3);assert.deepEqual(p.cards,[]);assert.deepEqual(p.skills,[]);assert.deepEqual(p.schedule,{});
  function check(){assert.deepEqual(supplyIds(g),originalIds);assert(p.money>=0);assert(g.week<=40,'bounded reachability fixture stalled');}
  function settle(){finish(g);assert.equal(g.opportunity,null);assert.equal(g.phase,'escape');check();}
  function advanceWeek(){
    if(g.phase==='planning'||g.phase==='resolving')settle();
    next(g);
    // quiet() controls the no-inspection fixture; no resource or action changes.
    // Reload every week, including all already earned growth and permission progress.
    g=reload(g);p=g.players[0];check();
  }
  function ready(){
    for(;;){if(g.phase!=='planning')advanceWeek();turn(g);if(g.phase==='planning')break;}
    assert.equal(E.activeBuyer(g),0);
  }
  function record(kind,uid){actions.push({week:g.week,kind,uid});check();}
  function acquire(type,day,period=0){
    const d=getCard(type);let c;
    for(;;){
      ready();const fees=E.supportPlan(g,p).filter(x=>x.active).reduce((n,x)=>n+x.fee,0);
      // Preserve next settlement's maintenance and reserve the printed principal.
      if(p.money<d.price.money+d.capital+d.upkeep+fees+(d.cost.money||0)){advanceWeek();continue;}
      c=offer(g,type);const money=p.money,action=g.actionCount;
      E.buy(g,0,c.uid);assert.equal(p.money,money-d.price.money);assert.equal(g.actionCount,action+1);assert.equal(E.findPlacement(p,c.uid),null);
      bought.push(c.uid);record('buy',c.uid);break;
    }
    for(;;){
      ready();
      if(day<g.day||(d.professional&&!E.workType(p,{day,period}))){advanceWeek();continue;}
      // No blanket retry on errors: wrong skill, sanity or occupancy must fail.
      assert.equal(E.canPlace(g,p,c.uid,{day,period}),null,`${route.name} ${type}, week ${g.week}, day ${g.day}`);
      const money=p.money,action=g.actionCount;E.place(g,0,c.uid,{day,period});
      assert.equal(g.actionCount,action+1);assert.equal(p.money,money-d.capital);record('place',c.uid);break;
    }
    return c.uid;
  }
  // Each skill is paid for and individually settled before buying its upgrade.
  for(const type of route.growth){
    const uid=acquire(type,4);for(let i=1;i<=getCard(type).progressTarget;i++){settle();if(i<getCard(type).progressTarget){assert.equal(p.cards.find(c=>c.uid===uid).progress,i);assert(!p.skills.some(c=>c.uid===uid));advanceWeek();}}assert(p.skills.some(c=>c.uid===uid));assert(!p.cards.some(c=>c.uid===uid));assert.equal(E.findPlacement(p,uid),null);advanceWeek();
  }
  assert.equal(p.skills.length,route.growth.length);
  if(route.permission){
    const uid=acquire('W-P1',4);settle();assert.equal(p.cards.find(c=>c.uid===uid).progress,1);assert(!p.weekend);advanceWeek();settle();
    assert(p.weekend);assert(p.completedActivities.some(c=>c.uid===uid&&c.progress===2));advanceWeek();
  }
  for(const [type,day,period=0]of [...route.board].sort((a,b)=>route.name==='zero-repeat'?(['A-E','B-E','C-E','W-S','A-L'].indexOf(a[0])-['A-E','B-E','C-E','W-S','A-L'].indexOf(b[0])):getCard(b[0]).support-getCard(a[0]).support))acquire(type,day,period);
  settle();
  assert.equal(p.income,route.income);assert.equal(p.sanity,route.sanity);assert(E.eligible(g,p));
  assert.equal(Object.values(p.schedule).flat().length,route.board.length);
  assert.equal(p.cards.reduce((n,c)=>n+(c.lockedCapital||0),0),route.capital||0);
  assert.equal(bought.length,route.growth.length+route.board.length+(route.permission?1:0));
  assert.equal(actions.filter(a=>a.kind==='buy').length,bought.length);
  assert.equal(actions.filter(a=>a.kind==='place').length,bought.length);
  const escapedWeek=g.week,cash=p.money;
  E.chooseEscape(g,0,true);E.closeWeek(g);assert.equal(g.phase,route.players===2?'ended':'planning');assert(p.escaped);assert.equal(p.escapedWeek,escapedWeek);assert.equal(p.money,cash);check();
  t.diagnostic(JSON.stringify({route:route.name,week:escapedWeek,purchases:bought.length,paidActions:actions.length,income:p.income,settlementSanity:route.sanity,cash,lockedCapital:route.capital||0}));
});
