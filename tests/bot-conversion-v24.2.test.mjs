import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {getCard} from '../src/cards.js';
import {make,skills,add,rig} from './helpers.mjs';
import {offer,supplyIds,reload} from './regression-helpers-v22.mjs';

function fixture({pattern='AABBC',money=6,type='A-M'}={}){
 const g=make({startMoney:money}),p=g.players[0];p.bot=true;skills(p,pattern);
 const target=offer(g,type);
 for(const lane of [4,8]){g.decks[lane].push(...g.market[lane].filter(c=>c!==target));g.market[lane]=g.market[lane].filter(c=>c===target);}
 return {g,p,target};
}
function revealFirst(g,type){const lane=getCard(type).hours,pile=g.decks[lane],i=pile.findIndex(c=>c.type===type);assert(i>=0);g.market[lane].unshift(...pile.splice(i,1));}
test('v24.2 bot: turn existing skills into a playable income before unrelated learning',()=>{
 const {g,p,target}=fixture(),ids=supplyIds(g),random=g.diceRandom,actions=g.actionCount;
 E.botAct(g);assert(p.cards.some(c=>c.uid===target.uid));assert.equal(p.money,1);
 assert.equal(g.actionCount,actions+1);assert.equal(g.diceRandom,random);assert.deepEqual(supplyIds(g),ids);
 E.pass(g,1);E.botAct(g);assert(E.findPlacement(p,target.uid));
});
test('v24.2 bot: needed growth for an owned advanced card still comes first',()=>{
 const {g,p}=fixture({pattern:'AAB',money:8});add(g,p,'B-H');
 E.botAct(g);assert(p.cards.some(c=>c.type==='B-G2'));assert(!p.cards.some(c=>c.type==='A-M'));
});
test('v24.2 bot: the initial two-skill investment remains available',()=>{
 const {g,p}=fixture({pattern:'A',money:4});E.botAct(g);
 assert(p.cards.some(c=>getCard(c).skill));assert(!p.cards.some(c=>c.type==='A-M'));
});
test('v24.2 bot: printed price alone does not make a capital income executable',()=>{
 const {g,p}=fixture({pattern:'CC',money:4,type:'C-M'});revealFirst(g,'W-G1');E.botAct(g);
 assert(p.cards.some(c=>getCard(c).skill));assert(!p.cards.some(c=>c.type==='C-M'));assert.equal(p.money,2);
});
test('v24.2 bot: sufficient purchase cash plus capital allows income conversion',()=>{
 const {g,p,target}=fixture({pattern:'CC',money:5,type:'C-M'});revealFirst(g,'W-G1');E.botAct(g);
 assert(p.cards.some(c=>c.uid===target.uid));assert.equal(p.money,2);
 E.pass(g,1);E.botAct(g);assert(E.findPlacement(p,target.uid));assert.equal(target.lockedCapital,2);assert.equal(p.money,0);
});
test('v24.2 bot: missing income skill does not suppress valid growth',()=>{
 const {g,p}=fixture({pattern:'BB',type:'A-M'});E.botAct(g);
 assert(p.cards.some(c=>getCard(c).skill));assert(!p.cards.some(c=>c.type==='A-M'));
});
test('v24.2 bot: a known blocked remaining schedule cannot trigger income preference',()=>{
 const {g,p}=fixture();g.day=5;
 g.inspection.blockedTimes=[5,6].flatMap(day=>[0,1,2].map(period=>({day,period})));
 E.botAct(g);assert(p.cards.some(c=>getCard(c).skill));assert(!p.cards.some(c=>c.type==='A-M'));
});
test('v24.2 bot: reload and unseen draw order do not change this visible-offer choice',()=>{
 const {g,p,target}=fixture(),copy=reload(g),hidden=reload(g);
 for(const pile of Object.values(hidden.decks))pile.reverse();hidden.diceRandom^=12345;
 E.botAct(g);E.botAct(copy);E.botAct(hidden);assert.deepEqual(copy,g);
 assert.equal(hidden.players[0].cards[0].type,p.cards[0].type);assert.equal(p.cards[0].uid,target.uid);
});
test('v24.2 bot: support priority is unchanged by income conversion preference',()=>{
 const {g,p}=fixture({money:8});revealFirst(g,'B-S');E.botAct(g);
 assert(p.cards.some(c=>c.type==='B-S'));assert(!p.cards.some(c=>c.type==='A-M'));
});
test('v24.2 bot: an unaffordable advanced capital requirement cannot retire current income',()=>{
 const g=make({startMoney:2}),p=g.players[0];p.bot=true;skills(p,'AC');
 rig(g,p,[['A-L',6]]);const old=p.cards[0];add(g,p,'A-X');
 E.botAct(g);assert(E.findPlacement(p,old.uid));assert(!p.botRetired?.includes(old.uid));
});
test('v24.2 bot: funded upgrade retains a pressure-free capital income',()=>{
 const g=make({startMoney:6}),p=g.players[0];p.bot=true;skills(p,'AC');
 const old=add(g,p,'C-E');E.place(g,0,old.uid,{day:6,period:0});E.pass(g,1);
 assert.equal(p.money,3);assert.equal(old.lockedCapital,3);const advanced=add(g,p,'A-X');
 E.botAct(g);assert(E.findPlacement(p,old.uid));assert(E.findPlacement(p,advanced.uid));assert.equal(p.money,0);assert.equal(advanced.lockedCapital,3);
});
