export const FAMILIES={
 creative:{name:'创作',color:'#c95151',icon:'pen'},technical:{name:'开发',color:'#378358',icon:'layers'},business:{name:'商业',color:'#b57c20',icon:'shop'},career:{name:'职场',color:'#627084',icon:'bag'},shared:{name:'共享',color:'#8054b7',icon:'layers'},
};
export const hours=size=>({2:4,3:8}[size]||4);
export const familyOf=def=>({W:'career',A:'creative',B:'technical',C:'business',S:'shared'}[def.route]||'shared');
export function specialRules(d){return [
 d.inspirationGenerate?'可付费在'+d.inspirationGenerate+'个不同空夜各放1灵感；不足则不执行不收费。':'',
 d.maturation?'前两次成功收入'+d.maturation.initial+'，第三次起收入'+d.maturation.mature+'；撤回保留进度，不归档。':'',
 d.handDiscardBonus?'基础收入1，可弃一张手牌，另加收入'+d.handDiscardBonus+'。':'',
 d.condition==='lowSanity'?'理智≤'+d.lowSanityAt+'，奖金另加'+d.conditionalBonus+'。':'',
 d.unlockWeekend?'完成撤下，下周起永久双休，基础理智+2。':'',
 d.unlockProtection?'完成撤下，下周起每周保护一张4h活动。':'',
 d.parallel?'仅白天与另一张4h同槽，最多两张；各自结算。8h不能叠放。':'',
 d.capital?'安排时锁定本金 '+d.capital+'，不能消费；撤回全额返还。':'',
 d.opportunity?(d.inspirationSpend?'可消耗1灵感，':'')+'看'+d.opportunity.count+'张，'+(d.opportunity.free?'免费取得':'原价买')+'至多1张，检查技能；余牌弃置，下周安排。':'',
 d.hireFee?'买价＋全部执行费＋1，招聘4h成长直接归档；自有手牌免买价，不执行完成奖励。猎头限暗堆候选，伙伴限明牌/手牌。':'',
 d.support?'日程理智 +'+d.support+'；'+(d.upkeep?'结算资金 −'+d.upkeep+'，付不起撤回。':'')+'查停或团建时失效，不逐周累加。':'',
 d.stress?'日程理智 −'+d.stress+'，撤回解除。':'',
 d.professional?'仅工作白天，免查岗；放假时暂停。':'',d.offHours?'仅非上班时间。':'',d.inspirationRequired?'结算需空置夜晚的灵感≥'+d.inspirationRequired+'，不消耗。':'',d.rule||'',
 d.progressTarget?'每周最多推进一次，共'+d.progressTarget+'次；每次支付牌面消耗，完成后获得奖励并离场。':'',
 d.skill?'完成归档'+d.skill+'技能，同名只计一次。':'',d.permanent?'移到永久效果区，不增加技能，同名权限不叠加。':''
].filter(Boolean);}
