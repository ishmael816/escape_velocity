// Exact probability checks for the paper design; not a demo integration test.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const data=JSON.parse(readFileSync('docs/cardpool-v0.10.json','utf8'));
const sequences=n=>n===0?[[]]:sequences(n-1).flatMap(s=>[1,2,3,4,5,6].map(face=>[...s,face]));
const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
const pct=p=>`${(p*100).toFixed(1)}%`;
assert.equal(data.inspection.rerollDuplicates,false);
assert.equal(data.inspection.repeatPenalty,false);
assert.equal(data.events.reduce((n,e)=>n+e.copies,0),12);
assert.equal(data.events.filter(e=>e.inspectionCount).reduce((n,e)=>n+e.copies,0),8);
assert(data.events.every(e=>e.inspectionCount>=0&&e.inspectionCount<=3));
const risks=[1,2,3].map(n=>{
 const all=sequences(n);
 const hit=all.filter(s=>s.includes(1)).length/all.length;
 assert(Math.abs(hit-(1-(5/6)**n))<1e-12);
 const anyHit=[1,2,3].map(k=>all.filter(s=>s.some(d=>d<=k)).length/all.length);
 return {n,hit,anyHit};
});
// Each array entry is a distinct physical card, including an 8h card.
function caught(plan,rolls,{weekend=false,protectedSlot=null}={}){
 const days=new Set(rolls);
 const protectedCard=plan.find(p=>p.hours<=4&&!p.professional&&protectedSlot===`${p.day}-${p.slot}`);
 return plan.filter(p=>{
  if(!days.has(p.day)||p.day===7||p.slot==='night'||p.professional||(weekend&&p.day===6))return false;
  return p!==protectedCard;
 });
}
const schedule=[
 {day:1,slot:'am',hours:2},{day:1,slot:'pm',hours:4},
 {day:1,slot:'night',hours:4},{day:2,slot:'am',hours:8},
 {day:3,slot:'am',hours:4,professional:true},
 {day:6,slot:'am',hours:4},{day:7,slot:'am',hours:4},
];
assert.equal(caught(schedule,[1,1]).length,2);
assert.equal(caught(schedule,[2,2,2]).length,1);
assert.equal(caught(schedule,[3]).length,0);
assert.equal(caught(schedule,[6],{weekend:true}).length,0);
assert.equal(caught(schedule,[1],{protectedSlot:'1-am'}).length,1);
assert.equal(caught(schedule,[1],{protectedSlot:'1-pm'}).length,1);
assert.equal(caught(schedule,[2],{protectedSlot:'2-am'}).length,1);
assert.equal(caught([{day:1,slot:'am',hours:2},{day:1,slot:'am',hours:4}],[1],{protectedSlot:'1-am'}).length,1);
const diceCards=data.cards.filter(c=>c.dice);
assert.equal(diceCards.length,1);
const expected={W06:4/3};
const payouts=diceCards.map(c=>{
 const base=c.gain[c.dice.resource]||0;
 const values=c.dice.faces.map(n=>base+n);
 assert(Math.abs(mean(values)-expected[c.id])<1e-12);
 assert(values.every(n=>Number.isInteger(n)&&n>=0));
 assert.deepEqual(values,[0,0,0,2,2,4]); // Printed W06 die faces, not a global income cap.
 return {c,values,average:mean(values),zero:values.filter(n=>n===0).length/6};
});
for(const id of ['A07','C06']){const c=data.cards.find(c=>c.id===id);assert(!c.dice);assert.equal(c.gain.profit,2);}
let md='# v0.20 骰子概率检查\n\n由 `node scripts/check-dice-v10.mjs` 生成。穷举查岗骰与活动骰；这是数学检查，不是网页引擎测试或完整对局。\n\n';
md+='## 查岗\n\n次数表示掷骰次数，重复日不重掷。下表为至少一个暴露日期被查到的概率；不是逃离失败率，也未包括暂停与固定罚款造成的经济损失。\n\n| 掷骰次数 | 暴露 1 天 | 暴露 2 天 | 暴露 3 天 |\n|---|---:|---:|---:|\n';
for(const r of risks)md+=`| ${r.n} | ${r.anyHit.map(pct).join(' | ')} |\n`;
md+='\n公式为 1−((6−k)/6)^n，k 为暴露的不同工作日数，n 为掷骰次数。同一天上午和下午一起查；重复只算一次，8h 活动不因占两槽处罚两次。集中日程降低被波及的概率，但命中时会同时损失更多活动。\n\n12 张暂定事件中有 8 张查岗：4 张查一次、3 张查两次、1 张查三次。其余为 2 张团建、1 张奖金、1 张临时双休。团建另行阻断时段，不能把非查岗周全部当成安全周。\n\n';
md+='## 活动收益\n\n下表假设该牌通过门槛、未被查停并支付执行消耗。均值未扣购置、占时或本金机会成本。\n\n| 牌 | 1–6 点对应总收益 | 平均收益 | 零收益概率 | 计入逃离 |\n|---|---|---:|---:|---|\n';
for(const p of payouts)md+=`| ${p.c.name} | ${p.values.join(' / ')} | ${p.average.toFixed(3)} | ${pct(p.zero)} | ${p.c.dice.resource==='profit'?'是':'否，属于工资奖金'} |\n`;
md+='\n向上管理为一次性成长，执行后归档，不每周掷骰；平均奖金 4/3，不计逃离收入。征稿、代购改为固定收入 2，绿色基础增强可使紧接的一张收入 +1；高级开发改为并行，不再翻倍。\n\n## 已检查与未检查\n\n通过：查岗 6、36、216 种结果；重复日期、同日双槽、8h 单次命中、履职豁免、双休周六豁免、2h/4h 定点保护（不保护 8h）；同槽只保护一张；向上管理的全部骰面、均值及牌面最大奖金（无全局收入上限）。\n\n未证明：活动暂停与固定罚款后的经济节奏、市场获取速度、先手差异、完整逃离周数与实体结算耗时。若两项关键副业分布在两个工作日，查三次时至少一日命中的概率为 70.4%。\n';
writeFileSync('docs/dice-check-v0.10.md',md);
console.log(JSON.stringify({status:'PASS: exact probabilities, not full games',risks,payouts:payouts.map(p=>({id:p.c.id,average:p.average}))},null,2));
