// Shared, data-derived text: editing a number must also change the card preview.
import {focusText} from './sanity-rules.js';
export const GOODS_PRICE=3;
const names={inspiration:'✦',principal:'货品',duty:'履职',auto:'⚙'};
export function markerRules(d){
 const m=d.mechanic;if(!m)return d.effect||'';
 return [
  focusText(d),
  m.projectDuty?'每次在本牌放履职1；仅记进度，不能移入移出':'',
  m.salaryTransfer?`打出：从工资区转入至多${m.salaryTransfer}履职；每枚副业1`:'',
  m.salaryDice?'D6 ≤3：获得当前工资；≥4：当前工资 +2（均为奖金）':'',
  m.eventSplit?'锁定日程后、查岗前：揭示事件2张，选1替换自己的事件，另1替换其他人事件；弃置本牌':'',
  m.autoProfit?`本牌有 ⚙${m.autoRequiresFull?'且货品装满':''}：副业 +${m.autoProfit}`:'',
  m.focusDraw?`理智 ≥${m.focusDraw}：抽I级牌1张入手`+(m.automatedLook?`；本牌有 ⚙ 时改为看${m.automatedLook}张I级，免费选1张满足技能的牌`:'' ):'',
  m.encore?`返场：可将一个空夜已有的 ✦ 翻倍，最多添${m.encore}枚`:'',
  m.fullSale?`满架可卖掉架上1件，资金 +${m.fullSale}`:'',
  m.relayBelow?'给下邻牌放 ⚙1（每牌最多1）':'',
  m.autoRestock?'本牌有 ⚙：结算前免费补1件到空货架位，再计副业':'',
  m.optionalInspirationProfit?`可消耗一个空夜的 ✦1：本次牌面副业 +${m.optionalInspirationProfit}`:'',
  m.optionalInspirationCash?`可消耗 ✦1：资金 +${m.optionalInspirationCash}`:'',
  m.playFee?`打出：支付 ${m.playFee} 资金`:'',
  m.playSpend?`打出：${names[m.playSpend]} −1`:'',
  m.generate?`空夜 ✦ +${m.generate}，可叠加`:'',
  m.spend?`每次 ${names[m.spend]} −1`:'',
  m.wholeNight?`消耗一个夜晚全部 ✦，每枚 → $${m.wholeNight}`:'',
  m.convert?`可消耗任意 ✦，每枚 → $${m.convert}`:'',
  m.artist==='onePerNight'?'打出：从自己每个有 ✦ 的空夜各移1枚到本牌。每枚计1副业；撤回时移除':m.artist==='all'?'打出：将自己空夜上的全部 ✦ 移到本牌。每枚计1副业；撤回时移除':m.artist?`打出转入至多${m.artist}枚 ✦，每枚副业1；撤回清空`:'',
  m.capital?`上架至多${m.capital}件货品，库存不足时每件付${GOODS_PRICE}；牌面副业每件1`:'',
  m.rightAuto?'右邻放置 ⚙1':'',
  m.replay?'可从归档区再次安排':'',
  m.belowBonus?`下邻有副业的牌，本周成功执行时副业 +${m.belowBonus}`:'',
  m.leftAuto?'左邻有 ⚙ 才执行':'',
  m.agent?`每张带 ⚙ 的日程牌提供副业1，最多${m.agent}`:'',
  m.sellCourse?`每张已归档牌 → $${m.sellCourse}，随后本牌归档`:'',
  m.finalSpend?`最后一次 ${names[m.finalSpend]} −1`:'',
  m.duty?`每次履职 +${m.duty}`:'',
  m.completion?['完成：',m.completion.cash?`$ +${m.completion.cash}`:'',m.completion.duty?`履职 +${m.completion.duty}`:'',m.completion.weekend?'下周起永久双休、基础理智 +2':''].filter(Boolean).join(' '):'',
  m.trade?`每件${m.trade.price}资金，${{buy:'买入',sell:'卖出',either:'买入或卖出'}[m.trade.mode]}至多${m.trade.limit}件货品`:'',
  m.advanceCash?'可用本次所得资金买入货品':'',
  m.hire?`招募其他流派市场成长：牌价＋全部执行费＋${d.hireFee}，直接归档，不发奖励`:'',
 ].filter(Boolean).join('；');
}
