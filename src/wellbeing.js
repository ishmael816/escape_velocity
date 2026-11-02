import {getCard,DAYS} from './cards.js';
import {playingPlayers,findPlacement,coveredSlots,syncSanity,die,log,returnToHand,recycle} from './engine.js';
import {riskNames} from './sanity-rules.js';

export function wellbeingCandidates(g,id,effect){
 const p=g.players[id];
 return p.cards.filter(c=>effect==='hand'?!findPlacement(p,c.uid):
  findPlacement(p,c.uid)&&!getCard(c).once&&!getCard(c).support);
}
export function hospitalPaused(g,p,c,s){
 return p.hospitalWeek===g.week&&coveredSlots(getCard(c),s).some(t=>t.day===p.hospitalDay);
}
// Snapshot everyone before applying consequences: removing a card never draws another penalty.
export function beginWellbeing(g){
 if(g.wellbeingWeek===g.week)return;
 g.wellbeingWeek=g.week;g.wellbeingQueue=[];
 const risk=g.inspection.wellbeing;if(!risk)return;
 for(const p of playingPlayers(g)){
  syncSanity(g,p);
  if(p.sanity<=risk.max)g.wellbeingQueue.push({player:p.id,effect:risk.effect,sanity:p.sanity});
 }
 continueWellbeing(g);
}
export function continueWellbeing(g){
 while(!g.opportunity&&g.wellbeingQueue?.length){
  const q=g.wellbeingQueue.shift(),p=g.players[q.player];
  if(q.effect==='hospital'){
   const face=die(g);p.hospitalDay=face-1;p.hospitalWeek=g.week;
   g.diceRolls.push({week:g.week,kind:'hospital',player:p.id,face});
   // Supports on this day do not run: release the reservation and positive effect.
   for(const x of p.supports||[]){const c=p.cards.find(c=>c.uid===x.uid),s=c&&findPlacement(p,c.uid);if(x.active&&s&&hospitalPaused(g,p,c,s)){p.money+=x.fee;x.active=false;x.reason='就医暂停';}}
   syncSanity(g,p);log(g,p,`临时就医：理智 ${q.sanity}，骰 ${face}，${DAYS[face-1]}全部活动暂停，不清进度、不罚款。`,'warning');
  }else{
   const candidates=wellbeingCandidates(g,p.id,q.effect);
   if(candidates.length)g.opportunity={...q,stage:'wellbeing',source:riskNames[q.effect]};
   else log(g,p,riskNames[q.effect]+'：没有符合条件的牌，略过。','warning');
  }
 }
}
export function chooseWellbeing(g,id,uid){
 const q=g.opportunity;
 if(g.phase!=='resolving'||q?.stage!=='wellbeing'||q.player!==id)throw Error('当前没有这项事件选择。');
 const p=g.players[id],c=wellbeingCandidates(g,id,q.effect).find(c=>c.uid===uid);
 if(!c)throw Error('请选择一张符合条件的牌；事件不能跳过。');
 if(q.effect!=='hand')returnToHand(g,p,c,q.source);
 if(q.effect!=='withdraw'){p.cards=p.cards.filter(x=>x.uid!==uid);recycle(g,p,c);log(g,p,q.source+'：弃置「'+getCard(c).name+'」。','warning');}
 g.opportunity=null;continueWellbeing(g);
}
