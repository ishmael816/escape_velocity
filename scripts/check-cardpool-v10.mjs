// Structure only; effect budgets use the v19 audit and settlement uses the engine.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const data=JSON.parse(readFileSync('docs/cardpool-v0.10.json','utf8'));
const cards=data.cards;
assert.equal(new Set(cards.map(c=>c.id)).size,58);
for(const route of 'WABC'){
 const group=cards.filter(c=>c.route===route);
 assert.equal(group.length,route==='W'?16:14);
 assert.equal(group.filter(c=>c.kind==='growth').length,route==='W'?6:5);
 assert.equal(group.filter(c=>c.advanced).length,4);
}
for(const [hours,n] of [[2,16],[4,21],[8,21]])assert.equal(cards.filter(c=>c.hours===hours).length,n);
for(const c of cards){
 assert([2,4,8].includes(c.hours));
 assert(c.minSanity>=0&&c.maxSanity<=10&&c.minSanity<=c.maxSanity);
 assert(c.price>=0&&c.stress>=0);
 assert(!c.gain.sanity);
 for(const bag of [c.cost,c.gain])for(const [key,value] of Object.entries(bag)){
  assert(['money','inspiration','profit','cash','salary'].includes(key));assert(value>=0);
 }
 if(c.gain.profit)assert(!c.professional&&!c.cost.money&&!c.upkeep);
 if(c.kind==='growth')assert(!c.gain.profit&&!c.requires);
 if(c.support)assert(c.kind==='repeat'&&c.upkeep>=0);
 if(c.dice){assert.equal(c.id,'W06');assert.equal(c.kind,'growth');assert.equal(c.dice.faces.length,6);}
 assert((c.gain.profit||0)+(c.conditionalBonus||0)<=4);
}
assert.equal(cards.filter(c=>c.support&&c.upkeep).length,3);
assert.equal(cards.filter(c=>c.permanent).length,2);
assert.equal(data.baseline.escapeIncomeAtLeast,10);
assert.equal(data.baseline.escapeSanityAtLeast,6);
assert.equal(data.baseline.perActivityIncomeMax,4);
assert.equal(data.baseline.salary,3);
assert.equal(data.baseline.passMoney,0);
assert(!Object.hasOwn(data.baseline,'livingCost'));
writeFileSync('docs/cardpool-check-v0.10.md','# 当前卡池结构检查（v0.19）\n\n由 `node scripts/check-cardpool-v10.mjs` 生成。58 种牌，职场 16、其余各 14；2h / 4h / 8h 各 16 / 21 / 21 种。三种付费生活支持，混合收入支持不另收现金执行费。收入上限 4、逃离收入 10 且理智 6；工资 3，无生活费，躺平不给钱。\n\n完整数值预算与特殊收益枚举见 [v0.19 校对](card-audit-v0.19.md)。合法结算由 `npm test` 检查；整局模拟见 [v0.19 报告](economy-runtime-v0.19.md)。旧版七条理想收入组合不再作为当前路线验证，以免独立计算器与网页规则分叉。结构通过不代表平衡通过。\n');
console.log('PASS: v0.19 card structure; use audit-cardpool-model-v19.mjs for effect budgets');
