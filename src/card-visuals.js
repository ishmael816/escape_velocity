// Color and symbol together identify a route; color is never the only cue.
export const FAMILIES = {
  creative: { name: '创作', color: '#c95151', icon: 'pen' },
  technical: { name: '开发', color: '#378358', icon: 'layers' },
  business: { name: '商业', color: '#b57c20', icon: 'shop' },
  career: { name: '职场', color: '#627084', icon: 'bag' },
  recovery: { name: '生活', color: '#378358', icon: 'leaf' },
  inspiration: { name: '灵感', color: '#238a99', icon: 'book' },
  time: { name: '时间机会', color: '#8054b7', icon: 'moon' },
  work: { name: '工作', color: '#627084', icon: 'desk' },
};
export const hours = size => ({ 1: 2, 2: 4, 3: 8 }[size] || 4);
export function familyOf(def) {
  if (def.route) return { W: 'career', A: 'creative', B: 'technical', C: 'business' }[def.route];
  if (def.kind === 'opportunity' || def.unlockWeekend) return 'time';
  if (def.category === '生活' || def.category === '恢复') return 'recovery';
  if (def.category === '灵感') return 'inspiration';
  if (def.route) return { A: 'creative', B: 'technical', C: 'business' }[def.route];
  if (['microjob', 'freelance', 'course'].includes(def.id)) return 'technical';
  if (['stall', 'workshop'].includes(def.id)) return 'business';
  return 'creative';
}
export function specialRules(def) {
  const rules = [];
  if(def.parallel)rules.push('可与一张活动并行，时间取较长者；最多两张，各自承担压力与费用，工作格查岗分别暂停');
  if(def.capitalRatio)rules.push('安排时自选本金，须为 '+def.capitalRatio+' 的正整数倍；每 '+def.capitalRatio+' 本金产生1收入。调整需一次安排行动；撤回返还');
  if(def.inspirationRequired)rules.push('版图灵感至少 '+def.inspirationRequired+' 枚，不消耗；放牌清除该格灵感，撤回须等下周恢复');
  if(def.opportunity)rules.push('每周查看一个时长牌堆的 '+def.opportunity.count+' 张，原价买至多1张，其余放堆底；下周再安排');
  if(def.hireFee)rules.push('额外支付 '+def.hireFee+' 招聘费，原价购买市场中一张2h一次性牌直接归档，不执行原效果；同名不重复归档');
  if(def.support)rules.push(`占用日程提供理智支持 +${def.support}；${def.upkeep?`查岗揭晓后、普通活动前每周付 ${def.upkeep} 钱，多张按日程顺序支付，付不起则撤回手牌`:'无维持费'}。查停、团建或同晚超过 2h 时支持失效；其余效果按日程执行。撤回解除，不跨周累加`);
  if(!def.once&&Object.values(def.cost||{}).some(n=>n>0))rules.push('付不起执行消耗时撤回手牌，解除支持与压力并返还本金');
  if (def.rule) rules.push(def.rule);
  if (def.progressTarget) rules.push(`每周至多推进一次，共 ${def.progressTarget} 次；每次付执行消耗，满格才获得效果并离场`);
  if (def.skill) rules.push(`完成 → ${def.skill} 技能（同名只计一次）`);
  if (def.permanent) rules.push('完成后移到永久效果区，不增加技能；同名权限不叠加');
  if (def.core) rules.push('一次建成 · 下周起永久生效');
  if (def.method === 'slack') rules.push(def.workType === 'desk' ? '仅坐班 · 受抽查' : def.workType === 'meeting' ? '仅开会 · 受抽查' : def.period === 1 ? '仅下午工作 · 受抽查' : '替换工作 · 受抽查');
  if (def.method === 'night') rules.push(def.weekendOnly ? '仅周末夜晚 · 替换休息' : '替换夜间休息');
  if (def.jobBonus && !def.rule) rules.push(`本周后续 ${def.jobBonusUses} 次成功副业收入获得加成`);
  if (def.incomeBonus) rules.push('加成仅用于本槽位副业收入');
  if (def.unlockWeekend && !def.rule) rules.push('本周先完成副业 → 周末移除周六工作；执行后弃置');
  return rules;
}
