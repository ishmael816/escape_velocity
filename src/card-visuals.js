export const FAMILIES={
 creative:{name:'创作',color:'#c95151',icon:'pen'},technical:{name:'开发',color:'#378358',icon:'layers'},business:{name:'商业',color:'#b57c20',icon:'shop'},career:{name:'职场',color:'#627084',icon:'bag'},shared:{name:'共享',color:'#8054b7',icon:'layers'},
};
export const hours=size=>({2:4,3:8}[size]||4);
export const familyOf=def=>({W:'career',A:'creative',B:'technical',C:'business',S:'shared'}[def.route]||'shared');
export function specialRules(d){return [
 d.parallel?'仅白天可与另一张4h同槽，最多两张；各自计算压力、费用、收入与查岗。8h不能叠放。':'',
 d.capital?'安排时锁定本金 '+d.capital+'，不能消费；撤回全额返还。':'',
 d.opportunity?'一次性查看4h或8h牌堆的3张，原价买至多1张，余牌回底；所得下周安排。成功执行后工具离场，不留技能。':'',
 d.hireFee?'招聘费1＋目标原价：明牌中尚未持有或归档的4h成长牌直接归档，不执行返现。可免费放弃。':'',
 d.support?'理智支持 +'+d.support+'；'+(d.upkeep?'查岗后、收益入账前每周付'+d.upkeep+'，付不起退回手牌。':'无维护费。')+'查停/团建时失效，夜间照常生效并另计夜压。支持不逐周累加，同名正常相加。':'',
 d.professional?'仅工作白天履职，免查岗；放假时暂停。':'',d.rule||'',
 d.progressTarget?'每周最多推进一次，共'+d.progressTarget+'次；每次支付牌面消耗，完成后离场。':'',
 d.skill?'完成归档'+d.skill+'技能，同名只计一次。':'',d.permanent?'移到永久效果区，不增加技能，同名权限不叠加。':''
].filter(Boolean);}
