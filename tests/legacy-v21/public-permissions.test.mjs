import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {getCard} from '../src/cards.js';
import {make,add,skills,turn,finish,rig,lock} from './helpers.mjs';

function offer(g,type){
 const lane=getCard(type).hours;
 let c=g.market[lane].find(c=>c.type===type);
 if(!c){const index=g.decks[lane].findIndex(c=>c.type===type);assert.ok(index>=0);[c]=g.decks[lane].splice(index,1);g.decks[lane].unshift(g.market[lane].pop());g.market[lane].push(c);}
 return c;
}

test('2–4 players: permissions are shared ordinary cards, with no private reserve',()=>{
 for(const playerCount of [2,3,4]){
  const g=make({playerCount});
  for(const [type,hours]of [['P01',8],['P02',4]]){
   const pool=[...g.market[hours],...g.decks[hours]];
   assert.equal(pool.filter(c=>c.type===type).length,playerCount);
   const d=getCard(type);assert.ok(d.once&&d.permanent);assert.equal(d.skill,null);assert.equal(d.tier,'basic');
  }
  for(const p of g.players){assert.equal(p.projects,undefined);assert.deepEqual(p.completedActivities,[]);assert.deepEqual(p.cards,[]);}
 }
 assert.equal(E.buyProject,undefined);
});

test('public permissions can be bought before credit, refill market and count as Monday purchases',()=>{
 for(const type of ['P01','P02']){
  const g=make(),p=g.players[0],c=offer(g,type),lane=getCard(c).hours,n=g.market[lane].length,money=p.money;
  E.buy(g,0,c.uid);assert.equal(p.money,money-getCard(c).price.money);assert.ok(p.cards.includes(c));
  assert.equal(g.market[lane].length,n);assert.equal(g.mondayMarketBought,true);
  turn(g);assert.equal(g.mondayMarketRefreshed,false);assert.equal(E.findPlacement(p,c.uid),null);
  assert.match(E.canPlace(g,p,c.uid,{day:5,period:0}),/缺少技能/);
  skills(p,getCard(c).requires);assert.equal(E.canPlace(g,p,c.uid,{day:5,period:0}),null);
 }
});

test('opportunity activities find permissions in normal hidden duration decks',()=>{
 for(const type of ['P01','P02']){
  const g=make(),p=g.players[0];rig(g,p,[['A14',6]]);lock(g);E.resolveAll(g);
  const lane=getCard(type).hours,c={uid:'hidden-permission',type};g.decks[lane]=[c];g.discard[lane]=[];
  E.chooseOpportunityLane(g,0,lane);assert.ok(g.opportunity.options.includes(c));E.chooseOpportunity(g,0,c.uid);
  assert.ok(p.cards.includes(c));assert.equal(E.qualified(p,getCard(c)),false);
 }
});

test('permission withdrawal retains progress; discarding resets it into public discard',()=>{
 const g=make(),p=g.players[0],c=add(g,p,'P01');skills(p,'WW');c.progress=1;c.lastProgressWeek=0;
 E.place(g,0,c.uid,{day:5,period:0});turn(g);E.unplace(g,0,c.uid);assert.equal(c.progress,1);
 turn(g);E.discardCard(g,0,c.uid);assert.ok(g.discard[8].includes(c));assert.equal(c.progress,undefined);assert.equal(c.lastProgressWeek,undefined);
});

test('completed permission leaves schedule, retains a permanent card and adds no skill',()=>{
 const g=make(),p=g.players[0];skills(p,'WWW');const count=p.skills.length,c=add(g,p,'P02');
 E.place(g,0,c.uid,{day:5,period:0});finish(g);
 assert.deepEqual(p.completedActivities,[c]);assert.equal(p.skills.length,count);assert.equal(E.findPlacement(p,c.uid),null);
 assert.ok(!p.cards.includes(c));assert.ok(!Object.values(g.discard).flat().includes(c));assert.equal(p.protectionFrom,2);
 const saved=JSON.parse(JSON.stringify(g));assert.equal(saved.players[0].completedActivities[0].type,'P02');
});

test('already unlocked permissions cannot be scheduled again',()=>{
 for(const type of ['P01','P02']){
  const g=make(),p=g.players[0],c=add(g,p,type);skills(p,'WWW');
  if(type==='P01')p.weekend=true;else p.protectionFrom=g.week+1;
  assert.match(E.canPlace(g,p,c.uid,{day:4,period:0}),/已经/);
 }
});
