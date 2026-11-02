import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../src/engine.js';
import * as V from '../src/engine-v32.js';
import * as W from '../src/wellbeing.js';
import {getCard} from '../src/cards.js';
import {make,rig,lock,add,seedFor} from './helpers.mjs';
import {validatePool} from '../src/card-studio-model.js';
import {opportunityPanel} from '../src/opportunity-ui.js';
import {cardFace} from '../src/card-face.js';
const pool=JSON.parse(fs.readFileSync('data/cardpool-v31.json','utf8'));
function drain(g){
 lock(g);let guard=300;
 while(g.phase==='resolving'&&guard--){
  const q=g.opportunity,p=q&&g.players[q.player];
  if(!q)E.resolveAll(g);
  else if(q.stage==='v32')E.chooseActivity(g,p.id,V.defaultChoice(g,p,E.cardAt(p,q.uid)));
  else if(q.stage==='wellbeing')E.chooseActivity(g,p.id,W.wellbeingCandidates(g,p.id,q.effect)[0].uid);
  else if(q.stage==='lane')E.chooseOpportunityLane(g,p.id,4);
  else if(q.stage==='hire')E.chooseHire(g,p.id);
  else E.chooseOpportunity(g,p.id);
 }
 assert(guard>0);assert.equal(g.phase,'escape');
}
function board(sanity,plan){const g=make({startSanity:sanity,startMoney:60});rig(g,g.players[0],plan);return g;}
function risk(g,effect,max=2){g.inspection.wellbeing={effect,max};}

test('all focus cards have executable rewards and explicit card text',()=>{
 const cards=pool.cards.filter(c=>c.mechanic.focus);assert.equal(cards.length,14);
 for(const c of cards){assert([6,8].includes(c.mechanic.focus.min));assert(cardFace(getCard(c.id)).includes('理智≥'+c.mechanic.focus.min));}
 assert.deepEqual(validatePool(pool),[]);
});
test('income is partial below 6, full at 6; business and writing share the threshold',()=>{
 for(const [type,low,high]of [['A06',1,2],['A08',2,4],['C13',2,3]]){
  for(const [sanity,expected]of [[5,low],[6,high],[7,high]]){
   const g=board(sanity,[[type,0]]);drain(g);assert.equal(g.players[0].income,expected,type+' @'+sanity);
  }
 }
});
test('technical search rewards sanity 6 with four choices and cash, without requiring skills',()=>{
 for(const sanity of [5,6]){
  const g=board(sanity,[['B04',0]]);lock(g);E.resolveAll(g);
  assert.equal(g.opportunity.stage,'lane');assert.equal(g.opportunity.count,sanity===6?4:2);
  assert.equal(getCard('B04').requires,'');drain(g);assert.equal(g.players[0].money,60+3+(sanity===6?1:0));
 }
});
test('creative free search spends inspiration and scales from two to four candidates',()=>{
 for(const sanity of [5,6]){
  const g=board(sanity,[['A10',0]]);lock(g);E.resolveAll(g);
  E.chooseActivity(g,0,V.defaultChoice(g,g.players[0],g.players[0].cards[0]));
  assert.equal(g.opportunity.count,sanity===6?4:2);assert(g.opportunity.free);
  assert.equal(E.inspirationCount(g.players[0]),6);drain(g);
 }
});
test('below bonus upgrades to two rather than stacking three at sanity 6',()=>{
 for(const sanity of [5,6]){
  const g=board(sanity,[['B06',0],['B03',0,1]]);drain(g);assert.equal(g.players[0].income,sanity===6?4:3);
 }
});
test('mature subscription keeps a four-income ceiling at sanity 6',()=>{
 for(const sanity of [5,6]){
  const g=board(sanity,[['B09',0]]);g.players[0].cards[0].progress=getCard('B09').maturation.steps;
  drain(g);assert.equal(g.players[0].income,sanity===6?4:3);
 }
});
test('capital investment needs sanity 8 for fourth income, not just extra principal',()=>{
 for(const sanity of [7,8]){const g=board(sanity,[['C06',0]]);g.players[0].cards[0].principal=3;drain(g);assert.equal(g.players[0].income,sanity===8?4:3);}
});
test('painting rolls once below 8, twice taking higher at 8; mean is 13/9',()=>{
 for(const base of [6,7]){ // painting itself adds one sanity
  const g=board(base,[['A11',0]]);g.diceRandom=seedFor([1,6]);drain(g);
  const roll=g.diceRolls.find(r=>r.kind==='activity');assert.equal(g.players[0].income,base===7?2:0);assert.equal(roll.second,base===7?6:null);
 }
 const faces=getCard('A11').dice.faces;assert.equal(faces.flatMap(a=>faces.map(b=>Math.max(a,b))).reduce((a,b)=>a+b,0)/36,13/9);
});
test('12 physical events preserve 8 inspections, five conditional risks, one permanent loss at zero',()=>{
 const sum=f=>pool.events.filter(f).reduce((n,e)=>n+e.copies,0);
 assert.equal(sum(()=>true),12);assert.equal(sum(e=>e.inspectionCount),8);assert.equal(sum(e=>e.wellbeing),5);
 assert.equal(sum(e=>e.wellbeing?.effect==='discard'),1);assert.equal(pool.events.find(e=>e.wellbeing?.effect==='discard').wellbeing.max,0);
});
test('event eligibility uses paid support after inspection; no repeated risk checks',()=>{
 const g=board(3,[['W10',0]]),p=g.players[0];add(g,p,'A06');risk(g,'hand',3);
 lock(g);E.rollInspections(g);assert.equal(g.opportunity,null);assert.equal(p.sanity,5);
 const before=structuredClone(g);E.rollInspections(g);assert.deepEqual(g,before);
 const h=board(3,[['W10',0]]);h.players[0].money=0;add(h,h.players[0],'A06');risk(h,'hand',3);
 lock(h);E.rollInspections(h);assert.equal(h.opportunity.stage,'wellbeing');assert.equal(h.opportunity.sanity,3);
});
test('discard choices are atomic, resumable, cannot skip, and process multiple players once',()=>{
 let g=board(2,[]);for(const p of g.players)add(g,p,'A06');risk(g,'hand');lock(g);E.rollInspections(g);
 g=JSON.parse(JSON.stringify(g));const before=structuredClone(g);
 assert.throws(()=>E.chooseActivity(g,0,null));assert.deepEqual(g,before);
 assert.throws(()=>E.chooseActivity(g,1,g.players[0].cards[0].uid));assert.deepEqual(g,before);
 assert(opportunityPanel(g).includes('opp-discard'));assert(!opportunityPanel(g).includes('opp-activity-skip'));
 const c=g.players[0].cards[0];E.chooseActivity(g,0,c.uid);assert.equal(g.opportunity.player,1);
 E.chooseActivity(g,1,g.players[1].cards[0].uid);assert.equal(g.opportunity,null);
 assert.equal(g.discard[4].filter(x=>x.uid===c.uid).length,1);E.rollInspections(g);assert.equal(g.opportunity,null);drain(g);
});
test('withdraw releases principal and duty, retains maturity, excludes support and growth',()=>{
 const g=board(0,[['C06',0],['W10',1],['B02',2]]),p=g.players[0],c=p.cards[0];
 c.principal=3;c.duty=1;c.progress=1;c.auto=1;risk(g,'withdraw');lock(g);E.rollInspections(g);
 assert.deepEqual(W.wellbeingCandidates(g,0,'withdraw').map(x=>x.uid),[c.uid]);
 E.chooseActivity(g,0,c.uid);assert.equal(E.findPlacement(p,c.uid),null);assert.equal(p.principal,3);assert.equal(p.duty,1);assert.equal(c.progress,1);assert.equal(c.auto,1);
});
test('zero-sanity discard removes one board card and clears markers; no eligible target is harmless',()=>{
 const g=board(0,[['C06',0]]),p=g.players[0],c=p.cards[0];c.principal=2;c.progress=1;c.auto=1;
 risk(g,'discard',0);lock(g);E.rollInspections(g);E.chooseActivity(g,0,c.uid);
 assert(!p.cards.includes(c));assert.equal(p.principal,2);assert.equal(c.progress,undefined);assert.equal(c.auto,undefined);assert(g.discard[8].includes(c));
 const h=board(0,[]);risk(h,'discard',0);drain(h);assert.equal(h.opportunity,null);
});
test('hospital pauses all periods, refunds paused support, preserves progress and charges no fine',()=>{
 const g=board(0,[['B02',0],['W10',0,1],['A06',0,2]]),p=g.players[0];p.cards[0].progress=1;
 risk(g,'hospital');g.diceRandom=seedFor([1,2]);lock(g);E.rollInspections(g);
 assert.equal(p.hospitalDay,0);assert.equal(p.money,60);assert.equal(p.supports[0].active,false);assert.equal(p.sanity,0);
 drain(g);assert.equal(p.money,63);assert.equal(p.income,0);assert.equal(p.caught,0);assert.equal(p.cards[0].progress,1);assert.equal(p.cards.length,3);
});
test('hospital pauses an 8h card exactly once, does not leak to next week, and ignores retired seats',()=>{
 const g=board(2,[['B09',0]]),p=g.players[0];g.players[1].escaped=true;risk(g,'hospital');g.diceRandom=seedFor([1]);drain(g);
 assert.equal(p.income,0);assert.equal(p.cards[0].progress,undefined);assert.equal(g.players[1].hospitalWeek,undefined);
 assert.equal(g.logs.filter(x=>x.text.includes('订阅产品')&&x.text.includes('就医')).length,1);
 g.week++;assert.equal(W.hospitalPaused(g,p,p.cards[0],{day:0,period:0}),false);
});
test('forecast does not draw penalties or read dice, and labels the omitted event',()=>{
 const g=board(2,[['A06',0]]);risk(g,'hospital');const before=structuredClone(g),a=E.preview(g,0);
 assert.deepEqual(g,before);assert(a.uncertain);assert(a.warnings.some(x=>x.text.includes('精神状态事件')));
 g.diceRandom++;assert.deepEqual(E.preview(g,0),a);
});
test('studio rejects unsupported focus and dangerous permanent-loss thresholds',()=>{
 for(const mutate of [p=>{p.cards[0].mechanic.focus={min:6,look:4};},p=>{p.events[0].wellbeing={effect:'discard',max:2};}]){
  const p=structuredClone(pool);mutate(p);assert(validatePool(p).length>0);
 }
});
