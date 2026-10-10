// Compare the frozen pre-calibration pool with the actual runtime pool.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import runtime from '../src/cardpool-data.js';
import {calibratePool} from './calibrate-cardpool-v19.mjs';
const sourceText=fs.readFileSync('docs/cardpool-before-v0.19.json','utf8');
const source=JSON.parse(sourceText),candidate=structuredClone(source);
const notes=calibratePool(candidate);
assert.deepEqual(candidate.cards,runtime.cards,'Runtime cards must match the numerical model');
candidate.version='0.19.0';
candidate.status='playable-prototype';
const find=id=>candidate.cards.find(c=>c.id===id);
// A limited hypothesis, not a player rule or a proven exchange rate.
const capitalCredit = c => !c.capital ? 0 : c.capital >= 6 ? 2 : 1;
const skillCredit = c => c.advanced ? Math.max(0, c.requires.length - 2) : 0;
const mean = a => a.reduce((x,y)=>x+y,0)/a.length;
const diceFaces = c => c.dice?.faces || [0];
function profit(c, face=0, condition=false, boost=null) {
  const fixed = c.gain?.profit || 0;
  let amount = fixed + (c.dice?.resource === 'profit' ? face : 0) + (condition ? c.conditionalBonus || 0 : 0);
  // Runtime only allows flat boosts on profit cards (including profit dice).
  if (boost && (fixed || c.dice?.resource === 'profit') && (!boost.capitalOnly || c.capital)) {
    amount += boost.type === 'flat' ? boost.amount : fixed;
  }
  return amount;
}
function budget(c, high=false) {
  let cash = mean(diceFaces(c).map(f=>profit(c,f,high)));
  cash += c.gain?.salary || 0;
  cash += c.gain?.cash || 0;
  if (c.dice && c.dice.resource !== 'profit') cash += mean(c.dice.faces);
  if (c.boost && high) cash += c.boost.type === 'double' ? Math.max(0,...candidate.cards.filter(t=>!c.boost.capitalOnly||t.capital).map(t=>t.gain?.profit||0)) : c.boost.amount;
  let inspiration = (c.gain?.inspiration || 0) - (c.cost?.inspiration || 0);
  if (high && c.emptyNightInspirationCap) inspiration += c.emptyNightInspirationCap;
  if (high && c.emptyNightInspiration) inspiration += c.emptyNightInspiration;
  if (high && c.discountAfter) inspiration += Math.min(1,c.cost?.inspiration || 0);
  return 2*cash+2*(c.support||0)-(c.stress||0)+inspiration-2*((c.upkeep||0)+(c.cost?.money||0));
}
function reference(c, high=false, capital=false) {
  const base = {2:{price:2,u:1},4:{price:3,u:3},8:{price:5,u:5}}[c.hours];
  return base.price+budget(c,high)-base.u-skillCredit(c)-(capital?capitalCredit(c):0);
}
function describe(c) {
  const out = [`${c.hours}h`, `购${c.price}`];
  if(c.kind==='growth') out.push('一次归档');
  if(c.gain?.profit) out.push(`副业${c.gain.profit}`);
  if(c.gain?.salary) out.push(`奖金${c.gain.salary}`);
  if(c.gain?.cash) out.push(`返款${c.gain.cash}`);
  if(c.gain?.inspiration) out.push(`灵感${c.gain.inspiration}`);
  if(c.support) out.push(`支持${c.support}`);
  if(c.stress) out.push(`压力${c.stress}`);
  if(c.cost?.inspiration) out.push(`耗灵感${c.cost.inspiration}`);
  if(c.cost?.money) out.push(`执行费${c.cost.money}`);
  if(c.upkeep) out.push(`周费${c.upkeep}`);
  if(c.capital) out.push(`锁本金${c.capital}`);
  if(c.requires) out.push(c.requires);
  if(c.maxSanity<10) out.push(`心智≤${c.maxSanity}`);
  else if(c.minSanity) out.push(`心智≥${c.minSanity}`);
  if(c.dice) out.push(`${c.dice.resource==='profit'?'收入':'奖金'}骰[${c.dice.faces.join(',')}]`);
  if(c.emptyNightInspirationCap) out.push(`留白灵感≤${c.emptyNightInspirationCap}`);
  if(c.conditionalBonus) out.push(`条件收入+${c.conditionalBonus}`);
  if(c.discountAfter) out.push(`前序${c.discountAfter}减灵感1`);
  if(c.emptyNightInspiration) out.push(`留白≥${c.emptyNightThreshold}再得灵感${c.emptyNightInspiration}`);
  if(c.boost) out.push(c.boost.type==='flat'?'后张+1':`后张基础翻倍${c.boost.capitalOnly?'（有本金）':''}`);
  if(c.search) out.push('高级二选一免费取得');
  if(c.opportunity) out.push(`翻${c.opportunity.count}张原价购一`);
  if(c.progress) out.push(`${c.progress}次完成`);
  return out.join('／');
}

const allSource = source.cards;
const allCandidate = candidate.cards;
assert.deepEqual(allCandidate.map(c=>c.id),allSource.map(c=>c.id));
assert.equal(allCandidate.length,58);
assert.equal(Object.keys(notes).length,58);
for(const route of ['W','A','B','C']) assert.equal(candidate.cards.filter(c=>c.route===route).length,route==='W'?16:14);
assert.equal(candidate.cards.filter(c=>c.advanced).length,16);
assert.equal(candidate.cards.filter(c=>c.dice&&c.kind==='repeat').length,0);
const checks=[];
for(const c of candidate.cards) {
  assert(!(c.gain?.profit || c.gain?.salary || c.gain?.cash) || !((c.cost?.money||0)+(c.upkeep||0)),`${c.id} cannot charge cash and pay cash`);
  assert(!(c.support&&c.stress),`${c.id} must normalize sanity effects`);
  if(c.kind==='repeat') {
    const target=reference(c,true,true);
    if(c.boost?.type==='double')assert(c.price<=target,`${c.id} unchanged price; uncapped boost needs balance review`);
    else assert.equal(c.price,target,`${c.id} price must match maximum budget`);
    if(!c.advanced) {
      const [lo,hi] = {2:[1,4],4:[2,6],8:[4,7]}[c.hours];
      assert(c.price>=lo&&c.price<=hi,`${c.id} basic price bounds`);
      assert((c.gain?.profit||c.gain?.salary||0)<={2:1,4:2,8:3}[c.hours],`${c.id} ordinary income cap`);
    }
    checks.push({id:c.id,budgetRange:[budget(c),budget(c,true)],skillCredit:skillCredit(c),capitalCredit:capitalCredit(c),price:c.price,formulaPrice:target,needsBalanceReview:c.price!==target});
  } else if(!c.search&&!c.opportunity) {
    const cash=(c.gain?.cash||0)+(c.gain?.salary||0)+(c.dice?.resource==='salary'?mean(c.dice.faces):0);
    assert(c.price+(c.cost?.money||0)-cash>=1-1e-9,`${c.id} expected repeat buying cash loop`);
  }
}

// Exhaustive six-face enumeration, with replacement just like the game.
function rolls(n,prefix=[]) {
  if(!n)return [prefix];
  return Array.from({length:6},(_,i)=>rolls(n-1,[...prefix,i+1])).flat();
}
const inspection= [1,2,3].map(n=>{
  const outcomes=rolls(n);
  return {dice:n,outcomes:outcomes.length,hit:outcomes.filter(r=>r.includes(1)).length/outcomes.length,
    bothSafeDifferentDays:outcomes.filter(r=>!r.includes(1)&&!r.includes(2)).length/outcomes.length};
});
const eventCount=source.events.reduce((n,e)=>n+e.copies,0);
const hit=source.events.reduce((sum,e)=>sum+e.copies*(e.inspectionCount?inspection[e.inspectionCount-1].hit:0),0)/eventCount;
const joint=source.events.reduce((sum,e)=>sum+e.copies*(e.inspectionCount?inspection[e.inspectionCount-1].bothSafeDifferentDays:1),0)/eventCount;
const boostCases=[];
for(const pool of [source,candidate]) for(const b of pool.cards.filter(c=>c.boost)) {
  for(const t of pool.cards.filter(c=>c.gain?.profit||c.dice?.resource==='profit')) for(const state of [false,true]) {
    if(state&&!t.conditionalBonus)continue;
    const increments=diceFaces(t).map(face=>profit(t,face,state,b.boost)-profit(t,face,state));
    assert(increments.every(n=>n>=0&&n<=(b.boost.type==='double'?(t.gain?.profit||0):b.boost.amount)));
    boostCases.push({pool:pool===source?'current':'candidate',booster:b.id,target:t.id,condition:state,additionalPerFace:increments,meanExtra:mean(increments)});
  }
}
const searchChecks=[];
for(const pool of [source,candidate])for(const r of ['W','A','B','C']) {
  const targets=pool.cards.filter(c=>c.advanced&&c.route===r);
  const card=pool.cards.find(c=>c.id===`${r}04`);
  const pairs=[];
  for(let i=0;i<targets.length;i++)for(let j=i+1;j<targets.length;j++)pairs.push(Math.max(targets[i].price,targets[j].price));
  const paid=card.price+(card.cost.money||0);
  const maxPrinted=Math.max(...targets.map(c=>c.price));
  const check={pool:pool===source?'current':'candidate',route:r,prices:targets.map(c=>c.price),paid,meanMaxPrinted:mean(pairs),maxPrinted,
    meanSavingVersusDirectPlusBasicArchive:mean(pairs)+1-paid,maxSavingVersusDirectPlusBasicArchive:maxPrinted+1-paid};
  if(pool===candidate)assert(check.maxSavingVersusDirectPlusBasicArchive<=2);
  searchChecks.push(check);
}
function choose(n,k) {if(k<0||k>n)return 0;let v=1;for(let i=1;i<=k;i++)v=v*(n-i+1)/i;return v;}
const opportunity=[2,3,4].map(k=>({N:20,K:5,draw:k,hit:1-choose(15,k)/choose(20,k)}));
// Independent closed-form cross-checks for the enumerations and known edge cases.
for(const x of inspection) {
  assert(Math.abs(x.hit-(1-(5/6)**x.dice))<1e-12);
  assert(Math.abs(x.bothSafeDifferentDays-(4/6)**x.dice)<1e-12);
}
assert.equal(profit({gain:{profit:3}},0,false,{type:'double'}),6);
assert.equal(profit({gain:{profit:3},conditionalBonus:1},0,true,{type:'double'}),7);
assert.equal(profit({gain:{},dice:{resource:'profit',faces:[4]}},4,false,{type:'double'}),4);
assert(Math.abs(opportunity[2].hit-(opportunity[0].hit+(1-opportunity[0].hit)*(1-choose(13,2)/choose(18,2))))<1e-12);
const growth=candidate.cards.filter(c=>c.kind==='growth'&&!c.search&&!c.opportunity).map(c=>({id:c.id,expectedNetCashCost:c.price+(c.cost.money||0)-(c.gain.cash||0)-(c.gain.salary||0)-(c.dice?.resource==='salary'?mean(c.dice.faces):0)}));
const capital=candidate.cards.filter(c=>c.capital).map(c=>({id:c.id,price:c.price,refundableCapital:c.capital,startCash:c.price+c.capital,credit:capitalCredit(c),profit:c.gain.profit}));
// Fully specified end-state arithmetic, not a simulated acquisition path or a runtime test.
// Each list is chronological. Nights contain only 2h, so no extra night pressure.
const buildInputs=[
  {name:'创作＋生活',skills:'AAAABB',emptyNights:6,expectedProfit:10,expectedSanity:6,placements:[['A10','周一白天'],['A05','周一夜晚'],['A09','周二白天'],['A11','周三白天']]},
  {name:'开发增强＋生活',skills:'BBBB',emptyNights:6,expectedProfit:10,expectedSanity:7,placements:[['B09','周一白天'],['B06','周二上午'],['A05','周二夜晚'],['B10','周三白天'],['A13','周四上午'],['A07','周五上午'],['B13','周日上午']]},
  {name:'商业本金＋生活',skills:'AACCCC',emptyNights:7,expectedProfit:10,expectedSanity:8,placements:[['C10','周一白天'],['C09','周二白天'],['C11','周三白天'],['A13','周四上午']]},
];
const builds=buildInputs.map(input=>{
  let income=0,inspiration=0,boost=null,support=0,stress=0,price=0,locked=0;
  const active=[];
  for(const [id,slot] of input.placements) {
    const c=find(id);
    for(const r of ['W','A','B','C']) assert([...c.requires].filter(x=>x===r).length<=[...input.skills].filter(x=>x===r).length,`${input.name}: ${id} skills`);
    assert(!slot.includes('夜晚')||c.hours===2);
    const condition=c.condition==='emptyNights'&&input.emptyNights>=c.bonusEmptyNights;
    const fee=Math.max(0,(c.cost.inspiration||0)-(c.discountAfter&&active.includes(c.discountAfter)?1:0));
    assert(inspiration>=fee,`${input.name}: inspiration must exist before payment`);
    inspiration-=fee;
    income+=profit(c,0,condition,boost);
    inspiration+=(c.gain.inspiration||0)+(c.emptyNightThreshold&&input.emptyNights>=c.emptyNightThreshold?c.emptyNightInspiration:0);
    boost=c.boost||null;active.push(c.route);
    support+=c.support||0;stress+=c.stress||0;price+=c.price;locked+=c.capital||0;
  }
  const sanity=Math.min(10,3+support-stress);
  assert.equal(income,input.expectedProfit);
  assert.equal(sanity,input.expectedSanity);
  return {...input,income,sanity,inspirationNet:inspiration,buyPrice:price,lockedCapital:locked,activityPurchaseAndPlaceActions:input.placements.length*2};
});
const rows=allSource.map(old=>{const next=find(old.id);return {id:old.id,name:old.name,candidateName:next.name,current:describe(old),candidate:describe(next),reason:notes[old.id],changed:JSON.stringify(old)!==JSON.stringify(next),
  currentBudget:old.kind==='repeat'?[budget(old),budget(old,true)]:null,currentTemplatePriceExcludingSpecialAdjustments:old.kind==='repeat'?[reference(old),reference(old,true)]:null};});
const report={status:'static-design-audit-not-playtest',sourceSHA256:crypto.createHash('sha256').update(sourceText).digest('hex'),runtimeMatchesCalibration:true,
  coverage:{market:candidate.cards.length,permanentActivities:candidate.cards.filter(c=>c.permanent).length,changed:rows.filter(r=>r.changed).length,unchanged:rows.filter(r=>!r.changed).map(r=>r.id),hours:Object.fromEntries([2,4,8].map(h=>[h,candidate.cards.filter(c=>c.hours===h).length]))},
  hypothesis:{capitalBudgetCredit:'3 本金补偿 1；6–10 本金补偿 2，封顶。仅候选设计假设，需流动性与整局测试。',conditional:'按可达到的最大效果计价，不假定触发率。'},
  rows,repeatBudgetChecks:checks,inspection:{byAnnouncedDice:inspection,eventCount,fixedWeekdayHit:hit,fixedDifferentWeekdaysBothSafe:joint},boostCases,searchChecks,opportunity,growth,capital,builds};

const pct=n=>`${(100*n).toFixed(2)}%`;
const num=n=>Number.isInteger(n)?String(n):n.toFixed(3);
const table=(headers,data)=>`| ${headers.join(' | ')} |\n| ${headers.map(()=>'---').join(' | ')} |\n${data.map(r=>`| ${r.join(' | ')} |`).join('\n')}\n`;
let md=`# v0.19 全卡池数值校对\n\n状态：**已接入网页 v0.19，后续已移除收入上限**。单张活动与每周收入不封顶，翻倍不再最多增加 2。卡价暂不改变；B09/B12 的旧预算不能继续视为平衡通过。静态预算校对不等同于整局平衡验证。对照校准前快照，覆盖 58 种市场牌（含 2 种永久效果活动），逐项对照运行时导出数据；不是对上一次生活牌草案进行二次估算。来源 SHA-256：\`${report.sourceSHA256}\`。\n\n`;
md+=`## 结论与适用边界\n\n校准前牌池与批准的模板不一致：基础收入牌额外消耗灵感却缺乏补偿；多数高级牌同时承担高购价、压力或灵感费；生活支持需要区分基础与高效档；增强牌按“翻倍”直觉定价会高估实际收入。本次接入保留 58 个牌位、职场 16 种、其余各 14 种、16 种高级牌，修改 ${report.coverage.changed} 种牌的字段。2h／4h／8h 数量由 17／20／21 改为 16／21／21，仅因为画画混合活动改为 4h；市场仍展示 5／4／3。\n\n这是一版幅度较大的数值调整，不能直接声称更平衡。模型统一只消除估值不一致；市场可得性、路线速度、资金过剩和全局时长仍需试玩。没有新增玩家要维护的资源、技能奖励或轨道。\n\n所有收益均指成功执行一次；压力和支持是日程状态，支持不逐周累计。混合活动没有现金执行费。仅纯生活支持保留周费，付不起应撤回手牌并撤销支持。收入牌与奖金牌按同样现金估值，但奖金不能帮助逃离，履职则免查岗，两者不宣称完全等价。\n\n## 本次采用的标尺\n\n普通重复活动预算与上轮模型一致：\n\n\`U＝2×现金收益＋2×支持−压力＋净灵感−2×周费\`\n\n2h 买价为 U＋1，4h／8h 买价为 U；三技能高级减 1，四技能高级减 2。对条件收入、留白与增强，用可达到的上限核价，同时列出条件不成立的损失，不凭空假设 50% 触发。增长、找牌、永久权限另算。\n\n本金是唯一新增的**待测估值假设**：锁定 3 钱暂允许 1 点预算补偿，锁定 6–10 钱暂允许 2 点，封顶。理由是给商业的流动性限制有限补偿，而不是把可退本金当作消费；这不是已证明的汇率。候选商业的支持／免压力就是这部分补偿。需重点对照无补偿／本方案，不能无限提高本金换收益。\n\n## 完整校对表\n\n表内为设计审计文本，不是拟印刷卡面。实际卡面仍应用图标表达；未提及的查岗、安排、归档规则沿用现行版。\n\n`;
for(const route of ['W','A','B','C']) {
  md+=`### ${source.routes[route].name}\n\n`;
  md+=table(['ID／名称','校准前数值','已接入数值','判断'],rows.filter(r=>find(r.id).route===route).map(r=>[`${r.id} ${r.name}${r.name!==r.candidateName?' → '+r.candidateName:''}`,r.current,r.candidate,r.reason]));
  md+='\n';
}
md+='## 重复活动：逐张公式复核\n\n下表的最高预算是满足条件、能付款且成功执行时的值；不是平均每周收益。压力不能为了触发低心智而在预算中重复折价。\n\n';
md+=table(['ID','最低→最高预算 U','技能补偿','本金补偿（待测）','运行时买价／公式参考价／待重验'],checks.map(c=>[c.id,`${num(c.budgetRange[0])} → ${num(c.budgetRange[1])}`,c.skillCredit,c.capitalCredit,`${c.price}／${c.formulaPrice}${c.needsBalanceReview?'／是':''}`]));
md+='\n## 特殊规则的期望与上限\n\n### 1. 收益骰：只保留一次性的向上管理\n\n现行向上管理的奖金期望为 `(0+0+0+2+2+4)/6＝4/3`；50% 没有奖金，1/6 得 4。改为一次性后，买 3 的预期净支出为 5/3，成功执行后归档 W。单次运气好能净赚 1，但重复购买同名牌不增加技能，且平均仍亏 5/3，不构成长期免费产钱。低心智与履职条件仍在。\n\n征稿原期望 2、方差 8/3；代购原总收入期望 2、方差 2/3。二者改为固定 2，保留平均数，去掉每周掷骰与波动；同时按模板调整压力／消耗。这不是把最大骰面收入当作稳定收入。\n\n### 2. 绿色增强：只计算目标真正多拿的钱\n\n';
const examples=[['固定收入 1',{gain:{profit:1}},false],['固定收入 2',{gain:{profit:2}},false],['固定收入 3',{gain:{profit:3}},false],['固定收入 4',{gain:{profit:4}},false],['基础 3＋条件 1 已触发',{gain:{profit:3},conditionalBonus:1},true],['旧版征稿：基础 0，骰子 0/2/4',source.cards.find(c=>c.id==='A07'),false],['旧版代购：基础 1，骰子 0/1/2',source.cards.find(c=>c.id==='C06'),false]];
md+=table(['目标','平加 1 的平均增量','基础翻倍的平均增量'],examples.map(([label,t,state])=>[label,...[{type:'flat',amount:1},{type:'double'}].map(b=>num(mean(diceFaces(t).map(f=>profit(t,f,state,b)-profit(t,f,state)))))]));
md+='\n增强作用于紧接的一张活动，目标暂停、无法支付或不是收入活动时都会浪费；不能跳过，也不能连乘。自动化翻倍印刷基础收入：基础 3 得 6，基础 4 得 8；条件奖励与骰面另加、不翻倍。当前卡池的最高基础收入为 4，这是目标牌数据，不是结算上限。B09/B12 按最强目标的公式参考价提高到 9，暂不调价，需按整套组合成本重新校对。候选快捷脚本买 2；高级自动化增加支持或灵感，以补偿一个 8h 工具的成本。电商自动化仍要求目标有本金，工具本身不再重复锁一份本金。\n\n例如“自动化＋零散开发”：总买价 8，副业从 2 变 4（增加 2），支持 1 抵消压力 1；共占 12h，且需 BBB。与两张基准 4h 活动总价 6、收入 4、压力 2 相比，额外 2 钱、4h 和技能投入换精神状态。不是用一张高级工具无条件拿到额外 4 收入。\n\n若增强与目标都处于同一工作日，查岗一起成功／一起失败；处于不同工作日则有联合概率。不能将下面的单日成功率直接平方。\n\n';
md+=table(['已预告查岗次数','枚举结果数','某工作日命中率','两个不同工作日均未命中'],inspection.map(x=>[x.dice,x.outcomes,pct(x.hit),pct(x.bothSafeDifferentDays)]));
md+=`\n按完整初始 ${eventCount} 张事件的构成加权，固定一个周一至周五白天位置的查岗概率为 ${pct(hit)}，两个不同工作日同时安全为 ${pct(joint)}。因此一个需要两个工作日都成功的＋2 增强，在所有其他条件满足时，单看查岗的额外收入均值为 ${num(2*joint)}。同日的共享风险只适用于能实际排进当天白天的组合，例如 4h 快捷脚本＋4h 目标，其＋1 的查岗后均值为 ${num(1-hit)}；8h 自动化与另一张白天目标不能塞进同一天。这些是固定日程的事前算例：事件提前公布、玩家可移动，不能当成真实玩家成功率。\n\n`;
md+='### 3. 留白与顺序条件\n\n';
md+=table(['留白晚数','手帐灵感','专栏收入','独立出版收入','数字素材额外灵感'],Array.from({length:8},(_,n)=>[n,Math.min(n,4),2+(n>=3?1:0),3+(n>=5?1:0),n>=3?1:0]));
md+='\n留白同时使多个红色条件成立，不能假设它们独立发生，也不能每满足一张就再次赠送预算。上表不包含查岗和缺资源造成的失败。W12 流程咨询收入为 `2＋p`，A12 商业写作为 `3＋p`，其中 p 必须来自前序履职／本金活动的真实成功率；没有日志时只报告 0≤p≤1。A11 互动叙事的灵感费为 `1−pB`，按减免成功的最好情形定价 7，仍保留开发与创作的联系。\n\n### 4. 高级牌二选一：免费取得必须计入价值\n\n每色四种高级牌全部还在暗堆时，穷举两张无放回组合，以“选印刷买价较高者”计算金额上界代理。它是省钱代理，不是实际卡牌效用；技能不匹配的贵牌可能毫无帮助。候选牌价下降后，找牌活动不能继续参考旧 7–9 的高级牌标价。\n\n';
md+=table(['版本／路线','高级买价','找牌全部现金费','二选一最高标价的均值','相对直接买牌＋基础归档1的平均省款','最大省款'],searchChecks.map(x=>[`${x.pool==='current'?'现行':'候选'} ${x.route}`,x.prices.join('/'),x.paid,num(x.meanMaxPrinted),num(x.meanSavingVersusDirectPlusBasicArchive),x.maxSavingVersusDirectPlusBasicArchive]));
md+='\n候选找牌购价 W/B/C 为 6，A 为 7，取消执行费；理想最大省款控制在 2 以内。还节约另买基础成长的一次采购行动，但仍要安排成长活动及取得的高级牌，且不能在本周使用新牌。已经归档同名牌时，不再有基础归档 1 的比较收益。只剩一张候选时选择价值更低；找不到时仅补 1 钱，不能用空池反复套利。检查脚本也记录各色实际价格，后续高级牌变价必须重算。\n\n### 5. 机会牌：翻得多，不等于免费获得牌\n\n暗堆剩 N 张，其中 K 张是当前资金和计划下合适的牌；翻 k 张遇到至少一张的概率为 `1−C(N−K,k)/C(N,k)`。技能可以尚未达标，因为允许先买后安排。以下只是假设 N=20、K=5 的敏感性例子，不是当前牌堆实测：\n\n';
md+=table(['查看张数','至少遇到一张合适牌'],opportunity.map(x=>[x.draw,pct(x.hit)]));
md+=`\n黄色第一次两张没有合适牌才付 1 再翻两张时，总命中率是上述查看 4 张的 ${pct(opportunity[2].hit)}，预期额外重翻费为 ${num(1-opportunity[0].hit)}，前提是第一次的两张在第二次翻牌完成前不会回到候选堆。它不是两次独立抽样。红色翻 3 的提升来自选择宽度，绿色整理会影响后续补牌，灰色则可在履职时安全找牌。四者最多原价购买一张，不能把“看 3 张”估为三张牌的收益，也不能花当周尚未领取的收入。\n\n`;
md+='### 6. 本金：拆开购价、锁定金额与产出\n\n';
md+=table(['ID','不可退购价','可退本金','启动资金总需求','成功执行的副业'],capital.map(c=>[c.id,c.price,c.refundableCapital,c.startCash,c.profit]));
md+='\n本金归还不是收入，不计逃离。以 C08 为例：启动需 10，其中实际买价 4、本金 6；不能说“赚回 10 才回本”，也不能说“只要 4 钱就能开摊”。开局现金 8 买不起启动总额 10，需经营或储蓄；高阶分红需 17，保留职场积累资金再转商业的空间。重点待测：后期现金充裕时锁定限制会变轻，因此本金的预算补偿暂最多只给 2；活动收入不封顶。\n\n### 7. 免查岗与永久双休\n\n';
md+=`单项活动若收益 R、每次被抓暂停并罚 1，且能支付罚款，固定工作日仅考虑查岗时净现金期望为 \`(1−h)R−h\`；免查岗的现金增量是 \`h(R＋1)\`。R=1 时约 ${num(hit*2)}／周，R=2 时约 ${num(hit*3)}／周。罚款只按活动算一次，8h 不能按两个槽收两次。\n\n原弹性授权要 4＋2＝6 钱、WWW 且只护一张 2h，以 R=1 的固定日程算例要约 ${num(6/(hit*2))} 周才靠直接现金差回收，明显落后。本候选买 2、WW、允许保护一张 4h：按 R=2 算约 ${num(2/(hit*3))} 周，另需购买/安排项目行动；还可能保护支持状态，这种门槛价值不折成固定现金。免疫不能保护团建、熬夜或相邻另一张牌，也不保 8h。\n\n双休仍是 7 现金、3 次成功推进、每次 8h，并先取得 WW，且推进前须已成功做过副业。收益为永久自主状态＋2、周六脱离工作／查岗限制；不是新生出此前不存在的两个活动槽。如果周六原本放两张收入 2 的冒险活动，仅免查岗的直接现金增量约 ${num(2*hit*3)}／周；加权已包含临时双休事件的零查岗概率，不含精神状态、槽位替代与提前知道事件后的调整。低压路线可能三周顺利完成，但不应使用简单 3/q 假设项目各周独立。暂保留费用，后续检验是否必选。\n\n`;
md+='## 终盘构筑的算术可行性\n\n额外检查三套指定持牌状态：假设技能已归档，选定牌已购入且安排，无查岗、团建或其他干扰，不用永久双休，开局理智基准仍为 3。灵感按执行顺序支付，初始库存按 0 测试；这只是终盘循环能否闭合，不是市场可得性、合法采购过程或逃离周数的模拟。\n\n';
md+=table(['组合','牌与位置（按执行顺序）','副业／理智','这些活动购价／本金','仅活动购买＋安排次数'],builds.map(b=>[b.name,b.placements.map(([id,s])=>`${id} ${s}`).join('；'),`${b.income}／${b.sanity}`,`${b.buyPrice}／${b.lockedCapital}`,b.activityPurchaseAndPlaceActions]));
md+='\n创作组合需要 AAAA＋BB，开发组合需要 BBBB，商业组合需要 CCCC＋AA；技能取得另占资金和行动，未计入表内活动购价。三套都能保持灵感不透支且达到收入 10、理智至少 6。开发的自动化之后紧接零散开发，中间不能插入供灵感的牌；供给放在目标执行后的夜晚供后续征稿使用。商业以更多锁定资金换较少的常驻活动；创作依赖留白和三张高级牌；开发用更多基础牌配增强。创作恰好心智 6，一张支持被查停就可能错过逃离，不能把理想状态等同于稳胜。\n\n';
md+='## 运行时验证\n\n已接入 v0.19。运行 `node scripts/audit-cardpool-model-v19.mjs` 复核运行时卡牌与模型一致；`npm test` 验证结算与合法操作；模拟结果另见 [试玩报告](economy-runtime-v0.19.md)。混合支持牌按日程执行其余效果；付不起费用的重复活动撤回手牌；弹性授权保护 2h / 4h。静态预算、指定终盘与机器人模拟均不能代替真人平衡测试。\n';

fs.writeFileSync('docs/cardpool-calibrated-v0.19.json',JSON.stringify(candidate,null,2)+'\n');
fs.writeFileSync('docs/card-audit-v0.19.json',JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('docs/card-audit-v0.19.md',md);
console.log(JSON.stringify({coverage:report.coverage,repeatFormulaChecks:checks.length,boostCases:boostCases.length,inspectionOutcomes:inspection.reduce((n,x)=>n+x.outcomes,0),runtimeMatchesCalibration:true},null,2));
