// Fixed-board audit, NOT a replay of the reported game or acquisition win rates.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../src/engine.js';
import {getCard, CARDS, CARD_MAP} from '../src/cards.js';
import {make, add, lock, seedFor} from '../tests/helpers.mjs';

// Historical audit: use the frozen v0.20 definitions with the same engine.
// Update existing references so deck construction and getCard agree.
for(const definition of JSON.parse(fs.readFileSync('scripts/fixtures/economy-v20.json','utf8'))){
  const target=CARD_MAP[definition.id];
  for(const key of Object.keys(target))delete target[key];
  Object.assign(target,definition);
}

const specs = [
  {id:'reported-compatible', name:'与试玩结局相容的九张牌', cash:8,
    note:'征稿投稿假设在周二上午；画画、代购分占周三上下午，咨询在周五上午。其余日期来自用户记录。只核对终局结算，不重放购牌历史。',
    plan:[['A08',6],['B06',3,1],['A13',2],['C06',2,1],['A07',1],['B08',5],['W13',4],['C13',0,2],['C14',1,2]]},
  {id:'six-card', name:'四张收入牌加两张支持牌', cash:8,
    note:'把零散开发与征稿投稿集中在周二，减少暴露日期。',
    plan:[['A08',6],['B08',5],['B06',1],['A07',1,1],['W13',4],['C13',0,2]]},
  {id:'no-pressure', name:'无压力的六张牌', cash:8,
    note:'不用心理咨询，也不需要开发并行；靠五个白天收入活动及夜间健身。',
    plan:[['A08',6],['A07',1],['A06',1,1],['C06',3],['A13',3,1],['C13',0,2]]},
  {id:'no-three-income', name:'不用任何收入三的牌', cash:8,
    note:'三人牌池允许三张同名基础牌；取得这些重复牌的难度不在本实验内。',
    plan:[['A07',6],['A07',6,1],['A07',1],['A06',1,1],['A06',3],['C13',0,2],['A05',2,2]]},
];

function prepare(spec) {
  const g=make({playerCount:3,startMoney:200}), p=g.players[0];
  for (const id of new Set(spec.plan.map(x=>x[0]))) {
    assert(CARDS.some(d=>d.id===id), 'Only basic cards in this audit');
    assert(spec.plan.filter(x=>x[0]===id).length<=g.config.playerCount, 'Respect printed copy count');
  }
  // Supply cards/cash to isolate placement legality and settlement.
  // Support first makes every placement legal without temporary sanity gifts.
  const ordered=[...spec.plan].sort((a,b)=>(getCard(b[0]).support||0)-(getCard(a[0]).support||0));
  for (const [id,day,period=0] of ordered) {
    const c=add(g,p,id);g.day=0;g.turn=0;g.phase='planning';g.dayPasses=0;
    assert.equal(E.canPlace(g,p,c.uid,{day,period}),null,`${spec.id}: ${id}`);
    E.place(g,0,c.uid,{day,period});
  }
  p.money=spec.cash;g.day=0;g.turn=0;g.dayPasses=0;g.actionCount=0;g.phase='planning';
  E.syncSanity(g,p);assert.equal(p.skills.length,0);
  return g;
}
function settle(spec, faces) {
  const g=prepare(spec);g.inspection.inspectionCount=faces.length;
  g.diceRandom=faces.length?seedFor(faces):1;lock(g);
  while (g.phase==='resolving') {
    E.resolveAll(g);
    if(g.opportunity) {
      const id=g.opportunity.player;
      if(g.opportunity.stage==='lane') E.chooseOpportunityLane(g,id,2);
      E.chooseOpportunity(g,id,null); // Pay search fee, decline additional purchases.
    }
  }
  assert.equal(g.phase,'escape');
  assert.deepEqual(g.inspection.rolls,faces);
  const p=g.players[0];
  return {income:p.income,sanity:p.sanity,cash:p.money,eligible:E.eligible(g,p),skills:E.skillCounts(p)};
}
function sequences(n) {
  return n===0?[[]]:sequences(n-1).flatMap(a=>Array.from({length:6},(_,i)=>[...a,i+1]));
}
const routes=specs.map(spec=>({
  ...spec,
  purchasePrice:spec.plan.reduce((n,[id])=>n+getCard(id).price.money,0),
  lockedCapital:spec.plan.reduce((n,[id])=>n+(getCard(id).capital||0),0),
  daytimeHours:spec.plan.reduce((n,[id,,period=0])=>n+(period===2?0:getCard(id).hours),0),
  nightHours:spec.plan.reduce((n,[id,,period=0])=>n+(period===2?getCard(id).hours:0),0),
  quiet:settle(spec,[]),
  inspections:[1,2,3].map(checks=>{
    const results=sequences(checks).map(faces=>settle(spec,faces));
    const passed=results.filter(x=>x.eligible).length;
    return {checks,passed,cases:results.length,fraction:passed/results.length};
  }),
}));
const reportedCompatible=settle(specs[0],[3]);
assert.deepEqual([reportedCompatible.income,reportedCompatible.sanity,reportedCompatible.cash],[10,6,15]);
const report={
  note:'v0.20 固定版图实验：零技能、合法安置、供应卡牌及结算前现金。不是逐周重放，也不是路线胜率。没有模拟市场争夺、购买时机或团建。查岗次数固定，独立六面骰，重复不重掷；搜索不购买新牌。',
  reportedCompatible, routes,
};
fs.writeFileSync('docs/zero-skill-review-v0.20.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({reportedCompatible,routes:routes.map(({id,purchasePrice,lockedCapital,daytimeHours,nightHours,quiet,inspections})=>({id,purchasePrice,lockedCapital,daytimeHours,nightHours,quiet,inspections}))},null,2));
