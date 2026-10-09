import {writeFileSync} from 'node:fs';
import {CARDS,ADVANCED,marketLane} from '../src/cards.js';
import {specialRules} from '../src/card-visuals.js';
const names={money:'资金',sanity:'理智',inspiration:'灵感'};
const values=o=>Object.entries(o).filter(([,n])=>n).map(([k,n])=>`${names[k]} ${n}`).join('、')||'—';
const cards=[...CARDS,...ADVANCED];
const rows=cards.map(d=>`| ${d.name} | ${marketLane(d)}h | ${d.progressTarget?`${d.progressTarget} 周一次性`:d.core?'永久核心':d.skill?'一次成长':d.once?'一次性':'多次'} | ${d.price.money} | ${d.stress||0} | ${d.minSanity||0} | ${d.requires||'—'} | ${values(d.cost)} | ${values(d.gain)} | ${d.income?'副业；':''}${specialRules(d).join('；')||'—'} |`);
writeFileSync('docs/cards-v0.9.md',`# v0.9 卡牌表（${cards.length} 种）\n\n由 src/cards.js 自动生成；运行 node scripts/export-card-reference.mjs 更新。理智为 0–10 指标；技能积累不影响理智；理智按自主状态、日程压力和当周问责重算；压力列表示活动在日程中承担的负担，撤回或完成时解除；≥ 在安排后及执行前检查；买价为一次支付；多周卡的执行消耗每次推进都支付，收益及特殊效果仅在满格完成时获得。其他牌的数值收益为每次成功执行收益。成长完成留存技能，核心下周生效。\n\n| 名称 | 时长 | 类型 | 买价 | 压力 | ≥ | 技能条件 | 执行消耗 | 执行收益 | 特殊效果 |\n|---|---|---|---:|---:|---:|---|---|---|---|\n${rows.join('\n')}\n`);
console.log(`${cards.length} card types exported.`);
