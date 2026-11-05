import {getCard,slotKey,slotLabel} from './cards.js';
import * as E from './engine.js';
import {neighbors,tokenCount,tokenNames} from './engine-v32.js';

// UI-only guidance: none of these checks prohibit buying for a future plan.
export function resourceAdvice(g,p,d,owned=false){
 const m=d.mechanic||{},requirements={...(m.playResources||{})},notes=[];
 if(m.playSpend)requirements[m.playSpend]=(requirements[m.playSpend]||0)+1;
 for(const [kind,n]of Object.entries(requirements))if(tokenCount(p,kind)<n)notes.push(`打出需要${tokenNames[kind]} ${n}，当前 ${tokenCount(p,kind)}`);
 if(m.spend&&!tokenCount(p,m.spend))notes.push(`执行需要${tokenNames[m.spend]} 1，当前没有`);
 if(m.discardHand&&!E.unplacedCards(p).length)notes.push('执行需要弃一张手牌');
 if(m.playFee&&p.money-(owned?0:d.price.money)<m.playFee)notes.push(`当前预算不足以支付打出费用 ${m.playFee}`);
 const fee=(d.cost?.money||0)+(d.upkeep||0);
 if(fee&&p.money-(owned?0:d.price.money)<fee)notes.push(`当前预算不足以支付一次结算费用 ${fee}`);
 if((d.minSanity||0)>p.sanity||(d.maxSanity??10)<p.sanity)notes.push('当前理智不满足结算条件');
 return notes;
}

export function placementRelation(p,uid,s){
 const c=E.cardAt(p,uid);if(!c)return null;
 const m=getCard(c).mechanic||{},direction=m.rightAuto?'right':(m.belowBonus||m.relayBelow)?'below':m.leftAuto?'left':null;
 if(!direction)return null;
 const schedule=E.without(p.schedule,uid),anchor=getCard(c).hours===8?{day:s.day,period:0}:s;
 (schedule[slotKey(anchor)]||=[]).push(uid);
 const candidate={...p,schedule};
 const targets=neighbors(candidate,c,direction).filter(t=>direction==='right'?!t.auto:direction==='below'?(m.relayBelow?!t.auto:getCard(t).income):!!t.auto);
 const arrow={right:'→ 右邻',below:'↓ 下邻',left:'← 左邻'}[direction];
 return {targets:targets.map(t=>t.uid),text:`${slotLabel(anchor)} · ${arrow}：${targets.length?targets.map(t=>getCard(t).name).join('、'):'当前位置暂时无法触发，可为后续布局保留'}`};
}

export function remainingSteps(day){return ['周一采购','周二采购','周三调度','周四安排','周五安排'].slice(day,5);}

export function nextResolutionAction(g,running,overlay=false){
 if(!running||overlay||g.phase!=='resolving')return null;
 if(g.opportunity)return g.players[g.opportunity.player].bot?'bot':null;
 return 'step';
}

export function captureForecast(g){
 if(g.uiForecast?.week===g.week||g.inspectionResolved)return;
 g.uiForecast={week:g.week,players:g.players.filter(p=>!p.escaped).map(p=>{
  const v=E.preview(g,p.id);return {id:p.id,low:v.incomeLow,high:v.incomeHigh,sanity:v.sanity};
 })};
}
