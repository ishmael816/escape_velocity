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
  if(def.support)rules.push(`占用日程提供理智支持 +${def.support}；查岗揭晓后、普通活动前每周付 ${def.upkeep} 钱。多张按日程顺序支付；付不起、查停、团建或同晚超过 2h 时失效且不收费。撤回解除，不跨周累加`);
  if (def.rule) rules.push(def.rule);
  if (def.progressTarget) rules.push(`每周至多推进一次，共 ${def.progressTarget} 次；每次付执行消耗，满格才获得效果并离场`);
  if (def.skill) rules.push(`完成 → ${def.skill} 技能（同名只计一次）`);
  if (def.core) rules.push('一次建成 · 下周起永久生效');
  if (def.method === 'slack') rules.push(def.workType === 'desk' ? '仅坐班 · 受抽查' : def.workType === 'meeting' ? '仅开会 · 受抽查' : def.period === 1 ? '仅下午工作 · 受抽查' : '替换工作 · 受抽查');
  if (def.method === 'night') rules.push(def.weekendOnly ? '仅周末夜晚 · 替换休息' : '替换夜间休息');
  if (def.jobBonus && !def.rule) rules.push(`本周后续 ${def.jobBonusUses} 次成功副业收入获得加成`);
  if (def.incomeBonus) rules.push('加成仅用于本槽位副业收入');
  if (def.unlockWeekend && !def.rule) rules.push('本周先完成副业 → 周末移除周六工作；执行后弃置');
  return rules;
}
