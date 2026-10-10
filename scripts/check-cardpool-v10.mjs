// Static design checks, not simulations of acquiring cards or competitive games.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const data=JSON.parse(readFileSync('docs/cardpool-v0.10.json','utf8'));
const cards=new Map(data.cards.map(c=>[c.id,c]));
const earns=c=>!!c.gain.profit||c.dice?.resource==='profit';
const count=s=>[...s].reduce((o,k)=>(o[k]=(o[k]||0)+1,o),{});
const qualifies=(skills,required)=>Object.entries(count(required)).every(([k,n])=>(count(skills)[k]||0)>=n);
assert.equal(cards.size,56);
assert.equal(data.baseline.escapeSanityAtLeast,6);
assert.equal(data.cards.filter(c=>c.support).length,4);
for(const route of 'WABC'){
  const group=data.cards.filter(c=>c.route===route);
  assert.equal(group.length,14);
  assert.equal(group.filter(c=>c.kind==='growth').length,5);
  assert.equal(group.filter(c=>c.advanced).length,4);
  assert.equal(group.filter(c=>!c.advanced&&c.kind==='repeat').length,5);
}
for(const [hours,n] of [[2,17],[4,19],[8,20]]) assert.equal(data.cards.filter(c=>c.hours===hours).length,n);
for(const c of [...data.cards,...data.projects]){
  assert([2,4,8].includes(c.hours));
  assert(c.minSanity>=0&&c.maxSanity<=10&&c.minSanity<=c.maxSanity);
  assert(c.price>=0&&c.stress>=0);
  for(const bag of [c.cost,c.gain]) for(const [key,value] of Object.entries(bag)){
    assert(['money','inspiration','profit','cash','salary'].includes(key));
    assert(value>=0);
  }
  assert(qualifies('WWWWAAAABBBBCCCC',c.requires));
  if(c.gain.profit) assert(!c.professional&&!c.cost.money);
  if(c.kind==='growth') assert(!c.gain.profit&&!c.requires);
  if(c.dice){
    assert(['profit','salary'].includes(c.dice.resource));
    assert.equal(c.dice.faces.length,6);
    assert(c.dice.faces.every(n=>Number.isInteger(n)&&n>=0&&n<=4));
  }
}

// Slot names are absolute weekly positions: day 1..7, morning/afternoon/night.
const at=(id,day,slot='am')=>({id,day,slot});
const scenarios=[
 {name:'纯创作',skills:'AAAA',expected:10,plan:[at('A06',1),at('A05',1,'night'),at('A05',2,'night'),at('A09',3),at('A08',5),at('A10',7)]},
 {name:'纯开发',skills:'BBBB',expected:10,plan:[at('B05',1,'night'),at('B05',2,'night'),at('B05',3,'night'),at('B09',4),at('B06',5),at('B10',6),at('B08',7)]},
 {name:'纯商业',skills:'CCCC',expected:10,plan:[at('C09',2),at('C08',4),at('C10',7)]},
 {name:'红绿',skills:'AAAB',expected:10,rolls:{A07:3},plan:[at('A06',1),at('A05',1,'night'),at('B07',2),at('B11',3),at('A09',4),at('B06',5),at('A07',7)]},
 {name:'红黄',skills:'AACC',expected:10,plan:[at('A06',1),at('C11',2),at('A12',4),at('C08',7)]},
 {name:'绿黄',skills:'BCCC',expected:10,rolls:{C06:5},plan:[at('B12',1),at('C06',2),at('C09',4),at('C08',7)]},
 {name:'职场转型',skills:'WWABCC',expected:10,plan:[at('W05',1),at('A05',1,'night'),at('A05',2,'night'),at('A05',3,'night'),at('W11',4),at('W12',5),at('C12',7)]},
];

function layout(plan,skills){
  const occupied=new Set();
  let stress=0;
  const arranged=plan.map(p=>{
    const c=cards.get(p.id);
    assert(c,`Missing card ${p.id}`);
    assert(qualifies(skills,c.requires),`${c.id}: missing skills`);
    assert(p.day>=1&&p.day<=7);
    assert(['am','pm','night'].includes(p.slot));
    // These scenarios use at most one 2h activity per night; no 4h nights.
    if(p.slot==='night') assert.equal(c.hours,2);
    if(c.professional) assert(p.day<=6&&p.slot!=='night');
    if(c.hours===8) assert.equal(p.slot,'am');
    const slots=c.hours===8?['am','pm']:[p.slot];
    for(const slot of slots){
      const key=`${p.day}-${slot}`;
      assert(!occupied.has(key),`Overlapping ${key}`);
      occupied.add(key);
    }
    stress+=c.stress;
    return {...p,c,order:p.day*3+({am:0,pm:1,night:2}[c.hours===8?'pm':p.slot])};
  }).sort((a,b)=>a.order-b.order);
  assert(data.baseline.sanity-stress>=0,'Arranged stress cannot exceed the available state');
  const sanity=data.baseline.sanity-stress;
  for(const {c}of arranged) assert(sanity>=c.minSanity&&sanity<=c.maxSanity,`${c.id}: sanity ${sanity} outside gate`);
  const emptyNights=7-arranged.filter(p=>p.slot==='night').length;
  return {arranged,sanity,emptyNights};
}

function extraProfit(c,pending,flags,sanity,diceProfit=0){
  let extra=0;
  if(c.condition==='professional'&&flags.professional) extra+=c.conditionalBonus;
  if(c.condition==='capitalJob'&&flags.capitalJob) extra+=c.conditionalBonus;
  if(c.condition==='lowSanity'&&sanity<=1) extra+=c.conditionalBonus;
  if(c.condition==='emptyNights'&&flags.emptyNights>=c.bonusEmptyNights) extra+=c.conditionalBonus;
  if(pending&&(!pending.capitalOnly||c.capital)) extra+=pending.type==='flat'?pending.amount:Math.min(c.gain.profit||0,pending.amount);
  return Math.min(extra,Math.max(0,data.baseline.perActivityIncomeMax-(c.gain.profit||0)-diceProfit));
}

function week(board,startI,startMoney,failedId=null,rolls={}){
  let inspiration=startI,money=startMoney,profit=0,pending=null,salaryExtra=0,cashCost=0;
  const flags={professional:false,capitalJob:false,routes:new Set(),emptyNights:board.emptyNights};
  const log=[];
  for(const {c}of board.arranged){
    const incoming=pending;
    pending=null; // A failed or non-income activity consumes the preceding boost.
    if(c.id===failedId){log.push(`${c.name}：失败，收入 0`);continue;}
    const discount=c.discountAfter&&flags.routes.has(c.discountAfter)?1:0;
    const payI=Math.max(0,(c.cost.inspiration||0)-discount);
    assert(inspiration>=payI,`${c.id}: inspiration shortfall`);
    assert(money>=(c.cost.money||0),`${c.id}: money shortfall`);
    inspiration-=payI;
    money-=c.cost.money||0;
    cashCost+=c.cost.money||0;
    inspiration+=(c.gain.inspiration||0)+(c.emptyNightInspirationCap?Math.min(board.emptyNights,c.emptyNightInspirationCap):0);
    if(c.emptyNightThreshold&&board.emptyNights>=c.emptyNightThreshold) inspiration+=c.emptyNightInspiration;
    if(c.dice) assert(rolls[c.id]>=1&&rolls[c.id]<=6,`${c.id}: explicit dice result required`);
    const rolled=c.dice?c.dice.faces[rolls[c.id]-1]:0;
    const diceProfit=c.dice?.resource==='profit'?rolled:0;
    const diceSalary=c.dice?.resource==='salary'?rolled:0;
    const income=earns(c)?Math.min(data.baseline.perActivityIncomeMax,(c.gain.profit||0)+diceProfit+extraProfit(c,incoming,flags,board.sanity,diceProfit)):0;
    profit+=income;
    money+=income+(c.gain.cash||0)+(c.gain.salary||0)+diceSalary;
    salaryExtra+=(c.gain.salary||0)+diceSalary;
    if(c.boost) pending=c.boost;
    flags.professional ||= !!c.professional;
    flags.capitalJob ||= !!(c.capital&&c.gain.profit);
    flags.routes.add(c.route);
    log.push(`${c.name}${c.dice?`（骰 ${rolls[c.id]}）`:''}：副业 ${income}，余灵感 ${inspiration}`);
  }
  money+=data.baseline.salary;
  return {profit,incomeTrack:Math.min(data.baseline.incomeTrackMax,profit),inspiration,money,salaryExtra,cashCost,log};
}

const results=scenarios.map(s=>{
  const board=layout(s.plan,s.skills);
  const price=board.arranged.reduce((n,p)=>n+p.c.price,0);
  const capital=board.arranged.reduce((n,p)=>n+(p.c.capital||0),0);
  let inspiration=data.baseline.inspiration,money=4;
  let first;
  for(let i=0;i<3;i++){
    const result=week(board,inspiration,money,null,s.rolls);
    assert.equal(result.profit,s.expected);
    assert(result.incomeTrack>=data.baseline.escapeIncomeAtLeast);
    assert(result.inspiration>=inspiration,'Engine consumes finite inspiration reserve');
    if(!first) first=result;
    inspiration=result.inspiration;money=result.money;
  }
  if(s.rolls) assert.equal(board.arranged.filter(p=>p.c.dice).length,1,'These probability cases enumerate exactly one independent activity die');
  const probability=s.rolls?Array.from({length:6},(_,i)=>week(board,4,4,null,Object.fromEntries(Object.keys(s.rolls).map(id=>[id,i+1])))).filter(r=>r.incomeTrack>=10).length/6:1;
  return {...s,probability,sanity:board.sanity,emptyNights:board.emptyNights,price,capital,investment:price+capital,activities:s.plan.length,incomeCards:board.arranged.filter(p=>earns(p.c)).length,weeklyInspiration:first.inspiration-data.baseline.inspiration,weeklyCashCost:first.cashCost,weeklyCashNet:first.money-4,salaryExtra:first.salaryExtra,firstLog:first.log};
});

// Optimistic upper bound: at sanity >=1 a no-weekend board can afford two
// stress-1 ordinary side jobs. Give each an unlimited-resource +1 basic boost.
const basic=data.cards.filter(c=>!c.advanced&&earns(c));
assert(basic.every(c=>c.stress===1&&c.minSanity===1));
let basicCeiling=0;
const basicMax=c=>Math.min(4,(c.gain.profit||0)+(c.dice?.resource==='profit'?Math.max(...c.dice.faces):0)+(c.conditionalBonus||0)+1);
for(const a of basic)for(const b of basic)basicCeiling=Math.max(basicCeiling,basicMax(a)+basicMax(b));
assert.equal(basicCeiling,8);
assert.throws(()=>layout([...scenarios[0].plan,at('C05',4)],'AAAA'),/sanity 0 outside gate/);
const emptyFlags={professional:false,capitalJob:false,routes:new Set()};
assert.equal(extraProfit(cards.get('A12'),{type:'double',amount:2},{...emptyFlags,capitalJob:true},1),1);
const greenBoard=layout(scenarios[1].plan,'BBBB');
assert.equal(week(greenBoard,4,4,'B06').profit,6); // Boost does not leak past failed freelance work.
const broken=layout([at('B09',1),at('B07',2),at('B10',3)],'BBBB');
assert.equal(week(broken,4,4).profit,4); // No chained double, only the final +1.
assert.equal(extraProfit(cards.get('A09'),{type:'double',amount:2,capitalOnly:true},emptyFlags,1),0);
assert(!qualifies('AAA','WW'),'Gray credit must not be a wildcard');
const earners=data.cards.filter(earns);
for(const a of earners)for(const b of earners){
  const bestFlags={professional:true,capitalJob:true,emptyNights:7,routes:new Set('WABC')};
  const best=c=>{const rolled=c.dice?.resource==='profit'?Math.max(...c.dice.faces):0;return (c.gain.profit||0)+rolled+extraProfit(c,{type:'double',amount:2},bestFlags,0,rolled);};
  assert(best(a)+best(b)<data.baseline.escapeIncomeAtLeast,'Two income cards must never suffice');
}
assert.equal(data.baseline.incomeTrackMax,10);
assert.equal(data.baseline.escapeIncomeAtLeast,10);
assert.equal(data.baseline.salary,2);
assert(!Object.hasOwn(data.baseline,'livingCost'));
assert(earners.every(c=>(c.gain.profit||0)<=4));
assert(data.cards.every(c=>(c.gain.salary||0)<=4));
assert(results.every(r=>r.incomeCards>=3));
const shortBoard=layout(scenarios[3].plan.filter(p=>p.id!=='B07'),scenarios[3].skills);
assert.equal(week(shortBoard,4,4,null,{A07:3}).incomeTrack,9);
assert(week(shortBoard,4,4,null,{A07:3}).incomeTrack<data.baseline.escapeIncomeAtLeast);
const overflow=week(layout([...scenarios[2].plan,at('C11',5)],'AACCCC'),4,4);
assert.equal(overflow.profit,13);
assert.equal(overflow.incomeTrack,10);
assert.equal(overflow.money,19); // Track saturation is not an unannounced cash confiscation.

const day=['','一','二','三','四','五','六','日'];
const position=p=>`周${day[p.day]}${cards.get(p.id).hours===8?'全天':{am:'上午',pm:'下午',night:'晚间'}[p.slot]}`;
let md='# v0.10 第四稿 · 10 点收入制静态检查\n\n由 `node scripts/design-cardpool-v10.mjs` 后运行 `node scripts/check-cardpool-v10.mjs` 生成。**这是独立的小型结算校验器，不是网页引擎，也不是完整对局模拟。保留的七条案例仅校验收入循环，不满足 v0.11 的理智 ≥6 逃离条件，也未模拟支持牌；不能作为当前获胜路线证明。**\n\n';
md+='## 检查边界\n\n所有案例均假设已经取得指定牌与不同名称的技能归档，没有双休、没有查岗或团建；起始理智 3、灵感 4。先一次支付全部买价并锁定本金，另留 4 钱支付执行开支。为检验资源循环，关闭逃离终局，将相同日程连续结算三次。有骰子牌的案例固定使用明确列出的骰点，不能据此称为每周必达标；另穷举六种结果给出单周达标率。\n\n购置总额不包含取得技能归档、寻访、过渡牌和安排操作的历史成本；起始牌也按印刷买价计入，便于比较。总额不是开局就能拿出的现金。技能列表示不同归档的最低构成，同名重复不算。\n\n';
md+='## 七条路线\n\n| 路线 | 技能 | 理智 | 收入牌/全部活动 | 买价 | 本金 | 两者合计 | 周灵感净变化 | 周执行花钱 | 副业收入 | 周资金净增 |\n|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|\n';
for(const r of results)md+=`| ${r.name} | ${r.skills} | ${r.sanity} | ${r.incomeCards}/${r.activities} | ${r.price} | ${r.capital} | ${r.investment} | ${r.weeklyInspiration} | ${r.weeklyCashCost} | ${r.expected} | ${r.weeklyCashNet} |\n`;
for(const r of results){
  md+=`\n### ${r.name}\n\n留白夜晚 ${r.emptyNights}；顺序如下。\n\n`;
  for(const p of r.plan)md+=`- ${position(p)}：${p.id} ${cards.get(p.id).name}。\n`;
  md+=`\n首周执行记录：${r.firstLog.join('；')}。\n\n没有查岗时的单周收入达标率：${(100*r.probability).toFixed(1)}%${r.rolls?'（穷举该张活动牌全部六种骰点；三周示例仅固定上述骰点检查资源）':'（仅指这些指定牌的确定性收益）'}。\n`;
}
md+='\n## 结构与边界结果\n\n- 56 种市场牌；每色 5 归档、5 基础常驻（含 1 支持）、4 高级；2h/4h/8h 分别 17/19/20 种，另有 2 种个人项目。\n- 收入轨道 0–10，每周从 0 重新结算，达到 10 仅收入达标，当前逃离还要求理智 ≥6；不是十周各赚 1 就能获胜。工资不推轨道。轨道满后不必继续记超额，但实际资金仍按成功活动结算。\n- 单项副业连同所有增强最多 4。穷举所有收入牌的两两搭配（包括同名），即使免费给予最佳条件及增强，两项合计仍最多 8，不能逃离。\n- 未双休、没有高级牌且不使用支持牌时，两项基础收入配基础增强的乐观上限为 8；高级成长的价值包含零压力业务和资源效率。已双休可以多安排基础业务，这是付出信用、行动及三周项目后的另一种路线，不禁止。\n- 纯创作终局保留起始跑腿会令理智降到 0，无法维持高级牌门槛。保留淘汰旧工作的必要性。\n- 条件奖励与增强一起结算后检查单卡总收入上限 4。增强遇到失败即消耗，不能叠乘，商业增强不能用于无本金牌。\n\n## 资金量级\n\n开局 8 钱，每周固定领取 2 钱，不设生活费；整备拿钱为 1。基础活动买价 2/4/5，高级活动 8–10，本金 3–10。低级归档买价 2/3，寻访买价 5 加执行 1。\n\n不计工资附加、罚款和支援消耗时，副业为 1/4/8 的周，资金净增分别为 3/6/10。接近逃离时一周结余大致够一张高级牌；无法仅靠基础工资每周买一张。若保持相同副业轨迹并且不消费，六周的起始资金加固定收入共 20（8＋6×2）；这仅隔离比较工资与开局资金，未计副业收益，不能当成实际期末余额。\n\n黄色三业务案例买价 23、本金 24，总投入 47。买价不会随收入等比例缩小，本金不能花第二次；旧业务撤回返还本金，但返还不是收入。寻访支付 6 并消耗买牌/安排两次行动后取得高级牌，是资金紧张时的另一入口。\n\n## 尚未证明的事\n\n这些结果仅检查指定持牌下的资源循环、活动骰达标率及两牌不能获胜，尚未测获取速度、先手、公共市场、查岗与团建。工资降低不保证所有真实对局后期都缺钱；长期卡在收入 8–9、纯工资囤积及寻访免费取牌仍须实测。零压力高级牌不会产生理智，也不应全部堆成唯一最优选择。职场混色案例需要六次不同归档，比其他案例更深，不能把同样 10 收入视作成长速度相同。\n';
writeFileSync('docs/cardpool-check-v0.10.md',md);
console.log(JSON.stringify({status:'PASS: static checks only',marketTypes:cards.size,projects:data.projects.length,basicCeiling,scenarios:results.map(({name,expected,investment,sanity,probability})=>({name,sampleWeeklyProfit:expected,calmWeekTargetProbability:probability,investment,sanity}))},null,2));
