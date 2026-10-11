import test from 'node:test';import assert from 'node:assert/strict';
import * as E from '../src/engine.js';import {getCard} from '../src/cards.js';
import {scenarios} from '../scripts/scenarios-v22.mjs';
import {make,add,finish} from './helpers.mjs';
const day=s=>['周一','周二','周三','周四','周五','周六','周日'].findIndex(d=>s.startsWith(d));
for(const spec of scenarios)test('real engine matches prepared design board: '+spec.id,()=>{
 const g=make({playerCount:4,startMoney:200}),p=g.players[0];p.weekend=spec.freedom===2;
 p.skills=spec.archives.map(type=>({uid:'skill-'+type,type}));
 const rows=spec.cards.map((id,i)=>({d:getCard(id),id,label:spec.placements[i]})).sort((a,b)=>b.d.support-a.d.support);
 for(const r of rows){const c=add(g,p,r.id);g.day=0;g.turn=0;g.first=0;E.place(g,0,c.uid,{day:day(r.label),period:r.label.includes('夜晚')?2:r.label.includes('下午')?1:0});}
 const defs=spec.cards.map(getCard),night=spec.placements.filter(s=>s.includes('夜晚')).length;
 const sum=k=>defs.reduce((n,d)=>n+(d[k]||0),0),expectedSanity=3+spec.freedom+sum('support')-sum('stress')-2*night;
 assert.equal(p.sanity,expectedSanity);const before=p.money;
 finish(g);assert.equal(p.income,sum('fixedProfit'));assert.equal(p.money,before-sum('upkeep')+defs.reduce((n,d)=>n+(d.gain.money||0),0)+3);
 assert.equal(p.sanity,spec.id==='night-growth'?3:expectedSanity);
 if(spec.stage==='后期'||spec.id==='zero-repeat')assert(E.eligible(g,p));
});
