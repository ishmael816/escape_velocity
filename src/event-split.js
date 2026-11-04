import {EVENTS,getCard} from './cards.js';
import {playingPlayers,findPlacement,syncSanity,eventBlocksSlot,coveredSlots,returnToHand,recycle,shuffle,log} from './engine.js';

function drawEvent(g){
 if(!g.inspectionDeck.length){g.inspectionDeck=shuffle(g,EVENTS.map((_,i)=>i));g.inspectionDiscard=[];}
 const index=g.inspectionDeck.pop();g.inspectionDiscard.push(index);const e=EVENTS[index];
 return {...e,blockedTimes:e.blockedTimes.map(([day,period])=>({day,period}))};
}
// Event replacement is resolved before inspection dice and support reservations.
export function prepare(g){
 if(g.eventSplitDone||g.opportunity)return;
 if(!g.eventSplitQueue){
  const order=Array.from({length:g.players.length},(_,i)=>g.players[(g.first+i)%g.players.length]).filter(p=>!p.escaped);
  g.eventSplitQueue=order.flatMap(p=>{syncSanity(g,p);return p.cards.filter(c=>{
   const d=getCard(c),s=findPlacement(p,c.uid);return d.mechanic?.eventSplit&&s&&p.sanity<=d.maxSanity&&!coveredSlots(d,s).some(t=>eventBlocksSlot(g,p,t));
  }).map(c=>({player:p.id,uid:c.uid}));});
 }
 while(g.eventSplitQueue.length){const q=g.eventSplitQueue.shift(),c=g.players[q.player].cards.find(c=>c.uid===q.uid);if(c){g.opportunity={...q,source:getCard(c).name,stage:'event-split',options:[drawEvent(g),drawEvent(g)]};return;}}
 g.eventSplitDone=true;
}
export function choose(g,id,index){
 const q=g.opportunity;if(g.phase!=='resolving'||q?.stage!=='event-split'||q.player!==id||![0,1].includes(index))throw Error('请选择对自己生效的事件。');
 const p=g.players[id],c=p.cards.find(c=>c.uid===q.uid);g.eventOverrides??={};
 for(const player of playingPlayers(g)){const event=structuredClone(q.options[player.id===id?index:1-index]);g.eventOverrides[player.id]=event;player.tempWeekend=event.kind==='weekend';syncSanity(g,player);log(g,player,'本周事件替换为「'+event.name+'」。','inspection');}
 returnToHand(g,p,c,'事件已生效');p.cards=p.cards.filter(x=>x!==c);recycle(g,p,c);
 g.opportunity=null;prepare(g);
}
