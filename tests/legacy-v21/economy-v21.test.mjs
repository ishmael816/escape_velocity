import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {getCard} from '../src/cards.js';
import {make,rig,finish,add,turn,next} from './helpers.mjs';
import {scenarios,acquireScenario} from '../scripts/economy-scenarios-v21.mjs';

test('the old six-card zero-skill engine cannot escape even without inspections',()=>{
 const g=make(),p=g.players[0];
 rig(g,p,[['A08',6],['B08',5],['B06',1],['A07',1,1],['W13',4],['C13',0,2]]);
 finish(g);assert.equal(p.income,6);assert.equal(p.sanity,6);assert(!E.eligible(g,p));
 assert.deepEqual(E.skillCounts(p),{W:0,A:0,B:0,C:0});
});

test('shared inspiration cannot reproduce the old repeated-card income shortcut',()=>{
 const g=make({playerCount:3}),p=g.players[0];
 rig(g,p,[['A07',6],['A07',6,1],['A07',1],['A06',1,1],['A06',3],['C13',0,2],['A05',2,2]]);
 finish(g);assert.equal(p.income,3);assert.equal(E.inspirationCount(p),5);
 assert.equal(p.sanity,8);assert(!E.eligible(g,p));
});

test('painting unlocks after one real archive, rather than bypassing early growth',()=>{
 const g=make(),p=g.players[0],painting=add(g,p,'A13'),growth=add(g,p,'A02');
 assert.match(E.canPlace(g,p,painting.uid,{day:6,period:0}),/技能/);
 E.place(g,0,growth.uid,{day:6,period:2});finish(g);next(g);turn(g);
 E.place(g,0,painting.uid,{day:6,period:0});assert.equal(p.sanity,4);finish(g);assert.equal(p.income,1);
});

test('free lifestyle support reads markers and reverses without accumulating sanity',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['A06',6]]);
 for(let i=0;i<3;i++){
  const cash=p.money;finish(g);assert.equal(p.sanity,4);assert.equal(p.income,0);assert.equal(p.money,cash+3);
  next(g);
 }
 p.inspirationSlots=[];E.syncSanity(g,p);assert.equal(p.sanity,3);
});

for(const scenario of scenarios)test(`favourable market: ${scenario.name} buys and builds from an empty start`,()=>{
 const r=acquireScenario(scenario),last=r.weeks.at(-1);
 assert(r.escapeWeek&&r.escapeWeek<=12);
 assert(last.income>=10&&last.sanity>=6);
 assert(r.weeks.every(w=>w.cash>=0));
 for(let week=1;week<=r.escapeWeek;week++){
  const used=r.actions.filter(a=>a.week===week);assert(used.length<=7);
  assert.equal(new Set(used.map(a=>a.day)).size,used.length);
 }
 if(scenario.id==='basic'){
  assert(r.weeks.every(w=>Object.values(w.skills).every(n=>n===0)));
  assert(last.scheduled.length>=9,'basic route pays for additional scheduled cards');
  assert(r.escapeWeek>4,'the old four-week favourable-market path no longer closes');
 }else{
  assert(Object.values(last.skills).some(n=>n>=2));
  assert(r.actions.some(a=>a.action==='buy'&&getCard(a.type).skill));
 }
 if(scenario.draft)assert(!r.actions.some(a=>a.action==='buy'&&a.type===scenario.draft),'seminar reward must not be charged twice');
 if(scenario.id==='career-commercial'){
  assert(r.actions.some(a=>a.action==='remove'&&a.type==='W07'));
  assert(!last.scheduled.includes('W07'));
 }
});
