// Controlled economic comparisons and legal prepared boards; not route win rates.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {getCard} from '../src/cards.js';
import {make,add,skills,lock,next,seedFor} from '../tests/helpers.mjs';

const ratios=[2,3,4].map(ratio=>{
 let capital=12,cash=2;const reinvest=[];
 for(let week=1;week<=6;week++){
  // Same starting capital and two-coin upkeep reserve; weekly wage 3, upkeep 2.
  const income=capital/ratio;cash+=3-2+income;
  const topUp=Math.floor((cash-2)/ratio)*ratio;cash-=topUp;capital+=topUp;
  reinvest.push({week,income,capitalAfterTopUp:capital,cash});
 }
 return {ratio,profitAt12:12/ratio,capitalForTen:ratio*10,
  principalEquivalentWeeks:ratio,reinvest,
  inspections:[0,1,2,3].map(n=>({checks:n,survival:(5/6)**n,
   expectedProfitAt12:12/ratio*(5/6)**n,
   expectedFine:1-(5/6)**n,
   principalEquivalentWeeks:ratio/(5/6)**n}))};
});

const specs=[
 {id:'AB',name:'创作 × 开发：并行保留空夜',skills:'AAAABBBB',plan:[['A08',0],['B10',0],['A10',6],['C13',2,2],['B09',2,2]]},
 {id:'AC',name:'创作 × 商业：投资带动创作',skills:'ACCC',plan:[['C09',0,0,12],['A12',2],['A08',6],['C13',1,2],['A13',3]]},
 {id:'BC',name:'开发 × 商业：并行经营',skills:'BCCCC',plan:[['C08',0],['B12',0],['C10',6,0,12],['A13',2],['C13',1,2]]},
 {id:'WC',name:'职场 → 商业：工资积累后投入本金',skills:'WWCCC',plan:[['W12',1],['W05',0],['C09',6,0,24],['A13',2],['C13',3,2],['W13',4]]},
];
// WC uses WWB, not WWCCC, for W12; archive both so the fixture proves legality.
specs[3].skills='WWBCCC';
function prepare(spec){
 const g=make({startMoney:200}),p=g.players[0];skills(p,spec.skills);
 const purchaseCost=spec.plan.reduce((n,[id])=>n+getCard(id).price.money,0);
 p.money-=purchaseCost;
 const ordered=[...spec.plan].sort((a,b)=>(getCard(b[0]).support||0)-(getCard(a[0]).support||0));
 for(const [id,day,period=0,capital] of ordered){
  const c=add(g,p,id);g.day=0;g.turn=0;g.phase='planning';g.dayPasses=0;
  assert.equal(E.canPlace(g,p,c.uid,{day,period},capital),null,`${spec.id}: ${id}`);
  E.place(g,0,c.uid,{day,period},capital);
 }
 // Cash fixed after assembly; this deliberately excludes the acquisition game.
 p.money=12;g.day=0;g.turn=0;g.dayPasses=0;g.actionCount=0;g.phase='planning';E.syncSanity(g,p);
 return g;
}
const faces=n=>n===0?[[]]:faces(n-1).flatMap(a=>Array.from({length:6},(_,i)=>[...a,i+1]));
const sequences=[0,1,2,3].map(n=>faces(n).map(f=>f.length?seedFor(f):1));
const routes=specs.map(spec=>{
 const g=prepare(spec),p=g.players[0],continuity=[];
 for(let i=0;i<3;i++){
  lock(g);E.resolveAll(g);assert.equal(g.phase,'escape');
  continuity.push({income:p.income,sanity:p.sanity,inspiration:E.inspirationCount(p),cash:p.money});
  assert(E.eligible(g,p),`${spec.id} week ${i+1}`);if(i<2)next(g);
 }
 const archive=p.skills.map(c=>getCard(c));
 return {...spec,boardPrice:spec.plan.reduce((n,[id])=>n+getCard(id).price.money,0),
  archivePrice:archive.reduce((n,d)=>n+d.price.money,0),
  capital:spec.plan.reduce((n,[id,,,amount])=>n+(amount||getCard(id).capital||0),0),continuity,
  inspections:sequences.map((seq,checks)=>{
   const outcomes=seq.map(seed=>{const x=prepare(spec);x.inspection.inspectionCount=checks;x.diceRandom=seed;lock(x);E.resolveAll(x);return {income:x.players[0].income,win:E.eligible(x,x.players[0])};});
   return {checks,cases:seq.length,meanIncome:outcomes.reduce((n,x)=>n+x.income,0)/seq.length,escapeFraction:outcomes.filter(x=>x.win).length/seq.length};
  })};
});
const report={note:'Prepared boards are legal placement/settlement experiments with supplied skills and cash; not full-game acquisition or route win rates. Reinvestment assumes safe execution and one top-up action each week.',ratios,routes};
fs.writeFileSync('docs/model-v0.20.json',JSON.stringify(report,null,2)+'\n');
const table=ratios.map(x=>`| ${x.ratio}→1 | ${x.profitAt12} | ${x.capitalForTen} | ${x.reinvest.at(-1).income} |`).join('\n');
const routeTable=routes.map(x=>`| ${x.id} | ${x.boardPrice} + ${x.archivePrice} | ${x.capital} | ${x.continuity[0].income} / ${x.continuity[0].sanity} | ${(100*x.inspections[1].escapeFraction).toFixed(1)}% | ${(100*x.inspections[3].escapeFraction).toFixed(1)}% |`).join('\n');
fs.writeFileSync('docs/model-v0.20.md',`# v0.20 数值推演与接入规则

由 \`node scripts/analyze-model-v20.mjs\` 生成。完整数据见 [JSON](model-v0.20.json)。

## 本金：中级 4→1，高级 3→1

基础普通收入模板保持：2h 买价 2 / 收入 1 / 压力 1；4h 买价 3 / 收入 2 / 压力 1；8h 买价 5 / 收入 3 / 压力 1。新增规则用购牌溢价、技能、时间或锁资支付，不增加全局收入上限。

| 本金→收入 | 本金 12 的周收入 | 独立提供收入 10 所需本金 | 连续复投第六周收入 |
|---|---:|---:|---:|
${table}

复投对照统一从本金 12、现金 2 开始，每周工资 3、维持费 2，将超过现金储备 2 的余额按整份投入，且每周花一次安排行动；不含购牌与技能取得、查岗。它隔离比例的差异，并非完整开局预测。2→1 的边际周收益率为 50%，3→1 为 33.3%，4→1 为 25%。本金能取回，不能把这些周数称为收回不可逆购牌成本。

C09：8h、购价 4、CCC、每 4 本金收入 1、支持 1。C10：8h、购价 6、CCCC、每 3 本金收入 1、支持 1。以本金 12 比较，分别收入 3 / 4，高级卡多花 2 购牌款并多需一种商业归档，换取每周多 1 收入；忽略额外归档成本，至少成功执行两周才能赚回这 2 钱差价。本金不算收入，不付维持费；安排和调整本金各花一个行动；撤回返还本金。单张能够超过收入 10，但必须积攒足够资金，并承担 8h 日程、技能与生活支持要求。

单个工作日被 n 次独立查岗漏过的概率为 (5/6)^n；本金 12 的理论期望收入相应乘此系数，命中罚款期望为 1−(5/6)^n。这只适用于没有额外理智门槛失效的单卡；多卡组合以下直接用引擎枚举。重复命中不重复罚同一张牌。周日投资安全但会占掉最宝贵的整日空间。

## 其他机制的成本边界

- 灵感：每周开始在空夜晚各放一个，最多七个；放牌即清除，当周撤回不补。创作牌读取数量，不花掉指示物。A06/A07/A08 分别需 4/2/3；A10 的额外收入需 5 个。门槛的成本是留白空间，不应按可花费货币逐周扣款。多个创作共用指示物，收益已控制在每张 2–4；这是同路线协同。
- 并行：仅 B09–B12 自带，购价 5/7/6/6、分别收入 1/2/1/2。所在槽最多两张，时间取较长者；支持与压力仍各算。2h 并行 2h 保留普通夜晚，4h 夜晚仍承受完整熬夜压力且支持失效。收益不能翻倍，也不能叠三张。与 8h 配对时，上下午分别检查容量，8h 仅结算一次。按相同收入普通牌比较，并行的购牌溢价约 3–4，另需高级技能，主要收益为省一个时段，不能把省下的时间再直接算成保证收入。
- 雇人：C12 为 4h、购价 4、CC；每次从公共市场选一张 2h 一次性技能牌，支付原价 +2，直接归档，不执行原牌。玩家支付溢价来省安排和等待，不免费获牌、不偷取他人牌、不雇 4h 研讨会绕开高级卡取得。归档同名仍只算一次。
- 多次过牌：W14/A14/B14/C14 分别看 2/3/3/4 张，最多原价买一张；C14 每次另付 1。A14 需两个灵感；W14 有低理智门槛。C07 亦为重复看二。余牌统一放回底，不排序、不重抽；找牌占日程，实际购买仍花钱。雇人和找牌不能使用本周尚未到账的收入。

## 组合验证

这些是供应归档、资金后以真实 canPlace/place 搭出的中后期版图。表中“牌款”分别为版图牌与归档牌的打印价总和，未抵扣一次性执行收益；未证明从随机市场取得它们所需周数。没有赠送起始牌。

| 组合 | 牌款：版图 + 归档 | 锁定本金 | 平静周收入 / 理智 | 1 次查岗可逃离比例 | 3 次查岗可逃离比例 |
|---|---:|---:|---:|---:|---:|
${routeTable}

四套版图连续三周结算合法且达到逃离线；查岗枚举覆盖 0/1/2/3 次，共每套 259 个骰面序列。AB 用并行保留夜晚灵感，AC 用投资触发创作收入，BC 将商业与开发同槽，WC 保留工资起步工具并转入投资。查岗比例是固定版图面对骰面的结果，不能当作路线胜率。

4→1 / 3→1 是首轮校准值，仍需真人测试资本取得速度、商业独赢风险、并行集中被查风险和公共市场争夺。保留取消收入上限的设计。
`);
console.log(JSON.stringify({ratios:ratios.map(x=>({ratio:x.ratio,sixth:x.reinvest.at(-1).income})),routes:routes.map(x=>({id:x.id,...x.continuity[0]}))},null,2));
