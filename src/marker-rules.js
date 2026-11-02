// Shared, data-derived text: editing a number must also change the card preview.
const names={inspiration:'✦',principal:'本金',duty:'履职',auto:'⚙'};
export function markerRules(d){
 const m=d.mechanic;if(!m)return d.effect||'';
 return [
  m.playSpend?`打出：${names[m.playSpend]} −1`:'',
  m.generate?`空夜 ✦ +${m.generate}，可叠加`:'',
  m.spend?`每次 ${names[m.spend]} −1`:'',
  m.wholeNight?`消耗一个夜晚全部 ✦，每枚 → $${m.wholeNight}`:'',
  m.convert?`可消耗任意 ✦，每枚 → $${m.convert}`:'',
  m.artist?`打出转入至多${m.artist}枚 ✦，每枚副业1；撤回清空`:'',
  m.capital?`打出装入至多${m.capital}本金，不足按汇率购买；每枚副业1`:'',
  m.rightAuto?'右邻放置 ⚙1':'',
  m.replay?'可从归档区再次安排':'',
  m.belowBonus?`下邻有副业的牌，本周成功执行时副业 +${m.belowBonus}`:'',
  m.leftAuto?'左邻有 ⚙ 才执行':'',
  m.agent?`每张带 ⚙ 的日程牌提供副业1，最多${m.agent}`:'',
  m.sellCourse?`每张已归档牌 → $${m.sellCourse}，随后本牌归档`:'',
  m.finalSpend?`最后一次 ${names[m.finalSpend]} −1`:'',
  m.duty?`每次履职 +${m.duty}`:'',
  m.completion?['完成：',m.completion.cash?`$ +${m.completion.cash}`:'',m.completion.duty?`履职 +${m.completion.duty}`:'',m.completion.weekend?'下周起永久双休、基础理智 +2':''].filter(Boolean).join(' '):'',
  m.trade?`按当前汇率${m.trade.delta>0?' +'+m.trade.delta:m.trade.delta<0?' '+m.trade.delta:''}${{buy:'买入',sell:'卖出',either:'买入或卖出'}[m.trade.mode]}至多${m.trade.limit}本金（成交价最低1）`:'',
  m.advanceCash?'可用本次所得资金买入本金':'',
  m.hire?`招募其他流派市场成长：牌价＋全部执行费＋${d.hireFee}，直接归档，不发奖励`:'',
 ].filter(Boolean).join('；');
}
