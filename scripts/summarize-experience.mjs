import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
const load=name=>{const head=JSON.parse(fs.readFileSync('docs/'+name,'utf8'));return head.details?JSON.parse(gunzipSync(fs.readFileSync('docs/'+head.details))):head;};
const baseline=load('experience-baseline-v0.22.json'),candidate=load('experience-candidate-v0.23.json');
if(baseline.evaluatorRevision!==5||candidate.evaluatorRevision!==5)throw Error('Both engines must use policy revision 5');
const fmt=n=>n===null?'—':Number(n).toFixed(2),pct=n=>(n*100).toFixed(1)+'%';
const rows=Object.keys(candidate.summary).map(k=>{const a=baseline.summary[k],b=candidate.summary[k];return `| ${k} | ${fmt(a.escapeWeekMean)} → ${fmt(b.escapeWeekMean)} | ${fmt(a.cardsMean)} → ${fmt(b.cardsMean)} | ${fmt(b.maintenanceMean)} | ${a.longestIdleP90} → ${b.longestIdleP90} | ${pct(b.firstShare2p)} | ${b.escaped}/${b.samples} | ${b.unresolved} |`;});
const paired=[];
for(const opponent of ['basic','W','A','B','C','repeat','mixed']){
 const cases=candidate.games.filter(g=>g.n===2).flatMap(g=>g.players.filter(p=>p.policy==='mixed'&&g.players[1-p.id].policy===opponent));
 paired.push(`| mixed 对 ${opponent} | ${cases.length} | ${cases.length?pct(cases.reduce((s,p)=>s+p.winShare,0)/cases.length):'—'} |`);
}
const ended24=r=>r.games.filter(g=>g.ended&&g.weeks<=24).length;
const unresolved=candidate.games.filter(g=>!g.ended),growthOnly=unresolved.filter(g=>!g.roster.includes('repeat'));
const growth=Object.entries(candidate.summary).filter(([k])=>['W','A','B','C','mixed'].includes(k));
const text=`# v0.23 候选 C1：同策略对照结果

基线规则22与候选规则23使用同一个策略修订5；种子为 ${candidate.seeds.join('、')}。各跑 ${candidate.totalGames} 个配置，包含 ${candidate.uniqueConfigurations} 个不同的“人数＋种子＋整桌策略”组合；少数配置因焦点／座次遍历重复。数据不可当作 ${candidate.totalGames} 个独立随机样本或真人胜率。

| 指标 | v0.22 | v0.23候选 |
| --- | ---: | ---: |
| 30周测试上限内结束 | ${baseline.ended}/${baseline.totalGames} | ${candidate.ended}/${candidate.totalGames} |
| 24周内结束 | ${ended24(baseline)}/${baseline.totalGames} | ${ended24(candidate)}/${candidate.totalGames} |
| 展示计龄最大值 | ${baseline.maxMarketAge}周 | ${candidate.maxMarketAge}周 |
| 同一UID连续可见最大值 | ${baseline.maxContinuousMarketAge}周 | ${candidate.maxContinuousMarketAge}周 |

展示计龄重置并不保证新实体出现：供给耗尽时旧牌可补位，因此另报同UID连续可见龄。所有候选策略的付费重排均为0，基线相应动作付费；两者购买与首次安排仍付费。

| 策略 | 逃离周均值：旧→新 | 逃离时在场牌均值：旧→新 | 新版维护均值 | 最长连续无有效动作周P90：旧→新 | 新版2人首胜份额 | 逃离样本/全部 | 未完局中的未逃离样本 |
| --- | --- | --- | ---: | --- | ---: | --- | ---: |
${rows.join('\n')}

逃离周、牌数、维护均值只含实际逃离者；末位被N−1结束规则截断单列为censored，不当作超时。首次预测达标、实际结算达标、实际逃离、逐周收入／现金／技能／牌数／维护／重排及行动流水都在压缩详细记录中。测试策略总是实际达标后立即逃离，所以首次实际达标周与实际逃离周相同；预测达标可能更早、随后被检查打断。

## 验收判断

- 24周结束目标至少95%：${pct(ended24(candidate)/candidate.totalGames)}，${ended24(candidate)/candidate.totalGames>=.95?'达到':'未达到'}。它没有消除所有长局。
- 展示计龄目标不超过3周：${candidate.maxMarketAge}周，${candidate.maxMarketAge<=3?'达到':'未达到'}；有限供给重新展示的例外完整保留。
- 成长构筑相对永不成长重复牌少至少1张：${growth.every(([,v])=>v.cardsMean<=candidate.summary.repeat.cardsMean-1)?'各成长策略均达到':'存在未达标路线'}。基础优先策略第5周后允许转A成长，不能把它与纯零技能对照混为一谈。
- 连续无有效动作P90目标不超过2周：${Object.entries(candidate.summary).filter(([,v])=>v.longestIdleP90>2).map(([k,v])=>k+'='+v.longestIdleP90).join('、')||'所有策略达到'}。未达标项不能隐藏；永不成长对照是故意保留的压力样本。
- 2人首胜份额超过70%的调查标记：${Object.entries(candidate.summary).filter(([,v])=>v.firstShare2p>.7).map(([k,v])=>k+' '+pct(v.firstShare2p)).join('、')||'无'}。这仍需独立实玩，不能据此宣布最终平衡。
- 30周未结束配置共${unresolved.length}个，其中不含repeat的有${growthOnly.length}个。具体种子、整桌策略及最终手牌／日程／市场见摘要JSON的failures，完整过程见详细记录。

## 混合路线调查

| 配对 | 2人角色样本数 | mixed首胜份额（并列分摊） |
| --- | ---: | ---: |
${paired.join('\n')}

每个具体配对仍是小样本；自由选取多色机会与强制专色不是同等灵活的策略约束。当前没有把领先全部归因于某张牌，也没有以机器人单次选择来改价格。候选先交付独立云端试混合对专色、B维护与多人支持争抢；不宣称“平衡已完成”。

## 策略校准与复现

初版错误地拒绝重复中阶／支持，随后发现夜间搬移、分步撤回以及“刚撤回又放回”的策略盲区。每次都同时重跑旧／新引擎；早期汇总保存在policy-v1至v4-summary文件，仅作校准历史，不与最终表混用。策略修订5允许所有策略使用有用重复牌，以外部记忆停用已淘汰牌，仍保留独立的永不成长重复牌策略。无直接修改资源、技能、行动钟或游戏输赢。

- 摘要：\`experience-baseline-v0.22.json\`、\`experience-candidate-v0.23.json\`。
- 所有配置与逐周/逐动作记录：同名\`-details.json.gz\`，标准gzip压缩JSON。
- 自动对抗：\`scripts/evaluate-experience.mjs\`；本表生成：\`node scripts/summarize-experience.mjs\`。
- 静态组合验算、152项回归、自带机器人9局与真人浏览器体验是独立证据，不能互相替代。
`;
fs.writeFileSync('docs/experience-comparison-v0.23.md',text);console.log('Wrote paired experience comparison.');
