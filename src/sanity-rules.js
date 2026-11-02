// Shared data rules for cards, editor previews and settlement.
export const riskNames={hospital:'临时就医',hand:'精力涣散',withdraw:'无力维持',discard:'项目中断'};
export function riskText(r){
 if(!r)return '';
 const effect={hospital:'掷D6决定周一至周六，当天全部活动暂停',hand:'自选弃1张手牌',withdraw:'自选1张非正理智多次活动撤回手牌',discard:'自选弃置1张非正理智多次活动'}[r.effect];
 return `理智≤${r.max}：${effect}。没有目标则略过；每周仅检查一次。`;
}
export function focusText(d){
 const f=d.mechanic?.focus;if(!f)return '';
 return `理智≥${f.min}：`+[
  f.profit?`副业 +${f.profit}`:'',f.cash?`资金 +${f.cash}`:'',
  f.look?`看牌数改为${f.look}`:'',f.belowBonus?`下邻加成改为 +${f.belowBonus}`:'',
  f.reroll?'收益骰掷2取高':'',
 ].filter(Boolean).join('；');
}
export function focusedMechanic(d,p){
 const m=d.mechanic||{},f=m.focus;
 return f&&p.sanity>=f.min?{...m,...(f.belowBonus?{belowBonus:f.belowBonus}:{})}:m;
}
