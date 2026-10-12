export const FAMILIES={
 creative:{name:'创作',color:'#c95151',icon:'pen'},technical:{name:'开发',color:'#378358',icon:'layers'},business:{name:'商业',color:'#b57c20',icon:'shop'},career:{name:'职场',color:'#627084',icon:'bag'},shared:{name:'共享',color:'#8054b7',icon:'layers'},
};
export const hours=size=>({2:4,3:8}[size]||4);
export const familyOf=def=>({W:'career',A:'creative',B:'technical',C:'business',S:'shared'}[def.route]||'shared');
export function specialRules(d){return [
 d.parallel?'仅白天与另一张4h同槽，最多两张；各自结算。8h不能叠放。':'',
 d.capital?'安排时锁定本金 '+d.capital+'，不能消费；撤回全额返还。':'',
 d.opportunity?(d.once?'一次性':'每周')+'看'+d.opportunity.count+'张，原价买至多1张，下周安排。':'',
 d.hireFee?'原价＋全部执行费＋1：明牌中尚未持有或归档的4h成长牌直接归档，不执行返现。可免费放弃。':'',
 d.support?'日程理智 +'+d.support+'；'+(d.upkeep?'结算资金 −'+d.upkeep+'，付不起撤回。':'')+'查停或团建时失效，不逐周累加。':'',
 d.stress?'日程理智 −'+d.stress+'，撤回解除。':'',
 d.professional?'仅工作白天，免查岗；放假时暂停。':'',d.offHours?'仅非上班时间。':'',d.inspirationRequired?'结算需空置夜晚的灵感≥'+d.inspirationRequired+'，不消耗。':'',d.rule||'',
 d.progressTarget?'每周最多推进一次，共'+d.progressTarget+'次；每次支付牌面消耗，完成后获得奖励并离场。':'',
 d.skill?'完成归档'+d.skill+'技能，同名只计一次。':'',d.permanent?'移到永久效果区，不增加技能，同名权限不叠加。':''
].filter(Boolean);}
