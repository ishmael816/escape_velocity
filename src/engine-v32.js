// Data-driven marker rules. Choice payloads and pending operations are JSON-safe.
import {GOODS_PRICE} from './marker-rules.js';
import {focusedMechanic} from './sanity-rules.js';
import {getCard,slotKey,slotLabel} from './cards.js';
import {cardAt,cardsInSlot,findPlacement,workType,coveredSlots,syncSanity,inspirationCount,canBuy,
  log,pay,die,changeSchedule,without,returnToHand,fillMarket,draw,chooseOpportunityLane} from './engine.js';

export const tokenNames={inspiration:'灵感',principal:'货品',duty:'履职',auto:'自动'};
export function tokenSources(p,kind){
 if(kind==='inspiration')return [...new Set(p.inspirationSlots)].filter(k=>!cardsInSlot(p,k).length).map(key=>({key,count:p.inspirationSlots.filter(k=>k===key).length,label:slotLabel({day:+key[0],period:2})}));
 const field=kind==='principal'?'principal':kind==='duty'?'duty':'auto';
 const reserve=kind==='auto'?0:p[field]||0;
 return [...(reserve?[{key:'reserve',count:reserve,label:kind==='duty'?'工资区':'储备'}]:[]),...p.cards.filter(c=>findPlacement(p,c.uid)&&c[field]>0).map(c=>({key:c.uid,count:c[field],label:getCard(c).name}))];
}
export const tokenCount=(p,kind)=>tokenSources(p,kind).reduce((n,x)=>n+x.count,0);
export function spend(p,kind,key,count=1){
 if(!Number.isSafeInteger(count)||count<0)throw Error('指示物数量无效。');
 if(!count)return;
 const source=tokenSources(p,kind).find(x=>x.key===key);
 if(!source||source.count<count)throw Error(tokenNames[kind]+'不足。');
 if(kind==='inspiration'){for(let i=0;i<count;i++)p.inspirationSlots.splice(p.inspirationSlots.indexOf(key),1);}
 else if(key==='reserve')p[kind]-=count;else cardAt(p,key)[kind]-=count;
}
const autoSource=(p,kind)=>tokenSources(p,kind)[0]?.key;
const emptyNights=p=>Array.from({length:7},(_,d)=>d+'-2').filter(k=>!cardsInSlot(p,k).length);
export function restoreArtistInspiration(p){
 for(const c of p.cards){
  if(c.type!=='A09'||c.art===undefined||getCard(c).mechanic.artist)continue;
  const night=emptyNights(p)[0];
  if(night)p.inspirationSlots.push(...Array(c.art).fill(night));
  delete c.art;
 }
}
export function neighbors(p,c,direction){
 const s=findPlacement(p,c.uid);if(!s)return [];
 const locations=coveredSlots(getCard(c),s),delta={right:[1,0],left:[-1,0],below:[0,1]}[direction];
 const result=locations.flatMap(t=>{const n={day:t.day+delta[0],period:t.period+delta[1]};return n.day>=0&&n.day<7&&n.period>=0&&n.period<3?cardsInSlot(p,n):[];});
 return [...new Map(result.filter(x=>x.uid!==c.uid).map(x=>[x.uid,x])).values()];
}
export function effectiveCost(c,d){return Math.max(0,(d.cost.money||0)-Math.max(0,(c.auto||0)-(d.upkeep||0)));}
export function release(p,c){p.principal=(p.principal||0)+(c.principal||0);p.duty=(p.duty||0)+(c.duty||0);delete c.principal;delete c.duty;delete c.art;}
export function playOptions(p,c,g){
 const m=getCard(c).mechanic||{},old=!!findPlacement(p,c.uid);
 return {spend:!old?m.playSpend:null,capital:!old?m.capital:0,artist:!old&&typeof m.artist==='number'?m.artist:0,salaryTransfer:!old?m.salaryTransfer:0,duty:!old&&!m.salaryTransfer&&!m.projectDuty&&!c.duty&&(p.duty||0)>0,goodsPrice:GOODS_PRICE};
}
export function applyPlay(g,p,c,options={}){
 const m=getCard(c).mechanic||{},old=!!findPlacement(p,c.uid);
 if(!old){
  if(m.playFee){if(p.money<m.playFee)throw Error('打出需付 '+m.playFee+' 资金。');p.money-=m.playFee;}
  if(m.salaryTransfer){const n=options.salaryTransfer??Math.min(m.salaryTransfer,p.duty||0);if(!Number.isSafeInteger(n)||n<0||n>m.salaryTransfer||n>(p.duty||0))throw Error('工资区履职不足或超过容量。');p.duty-=n;c.duty=n;}
  if(m.playSpend)spend(p,m.playSpend,options.resource??autoSource(p,m.playSpend));
  if(m.capital){
   const n=options.capital??0;if(!Number.isSafeInteger(n)||n<0||n>m.capital)throw Error('超出货品容量。');
   const reserve=Math.min(n,p.principal||0),cost=(n-reserve)*GOODS_PRICE;
   if(p.money<cost)throw Error('资金不足，无法购入货品。');p.money-=cost;p.principal=(p.principal||0)-reserve;c.principal=n;
  }
  if(m.artist==='onePerNight'||m.artist==='all'){
   c.art=0;
   for(const pile of tokenSources(p,'inspiration')){
    const count=m.artist==='onePerNight'?1:pile.count;
    spend(p,'inspiration',pile.key,count);
    c.art+=count;
   }
  }else if(m.artist){
   const n=options.art??0;if(!Number.isSafeInteger(n)||n<0||n>m.artist||n>inspirationCount(p))throw Error('只能转入现有的至多'+m.artist+'枚灵感。');
   // A supplied list lets the player preserve particular empty-night piles.
   const keys=options.artSources??p.inspirationSlots.slice(0,n);
   if(keys.length!==n)throw Error('请选择对应数量的灵感。');
   for(const key of keys)spend(p,'inspiration',key);c.art=n;
  }
 }
 if(options.duty){if(old||m.salaryTransfer||m.projectDuty||c.duty)throw Error('只能首次安排时附上一枚履职。');spend(p,'duty','reserve');c.duty=1;}
}
export function selection(g,p,c){
 const d=getCard(c),m=focusedMechanic(d,p),s=findPlacement(p,c.uid);
 return {encore:m.encore||0,fullSale:m.fullSale&&c.principal===m.capital?m.fullSale:0,spend:m.spend||(m.finalSpend&&(c.progress||0)+1>=d.progressTarget?m.finalSpend:null),generate:m.generate||0,
  wholeNight:m.wholeNight||0,convert:m.convert||0,optionalInspirationProfit:m.optionalInspirationProfit||0,optionalInspirationCash:m.optionalInspirationCash||0,trade:m.trade||null,
  targets:m.rightAuto?neighbors(p,c,'right').filter(t=>!t.auto):m.belowBonus?neighbors(p,c,'below').filter(t=>getCard(t).income):[],
  targetRequired:!!(m.rightAuto||m.belowBonus),empty:emptyNights(p),slot:s};
}
export function defaultChoice(g,p,c){
 const f=selection(g,p,c),n=f.empty[0],t=f.trade;
 return {encoreNight:f.encore?tokenSources(p,'inspiration').sort((a,b)=>b.count-a.count)[0]?.key:undefined,sellFull:!!f.fullSale&&p.money<6,resource:f.spend?autoSource(p,f.spend):undefined,night:tokenSources(p,'inspiration')[0]?.key,
  nights:Array(f.generate).fill(n),amount:0,target:f.targets[0]?.uid,trade:t?.mode==='sell'?'sell':'buy',quantity:0,capitalTarget:'reserve'};
}
function feeFailure(g,p,c){const d=getCard(c);if(!d.once)returnToHand(g,p,c,'付不起结算费用');else log(g,p,d.name+'：付不起费用，进度保留。','warning');}
export function resolve(g,p,s,c){
 const d=getCard(c),m=d.mechanic;
 if(c.lastExecutedWeek===g.week||m.eventSplit)return;
 syncSanity(g,p);
 if(p.sanity<(d.minSanity||0)||p.sanity>(d.maxSanity??10)){const support=p.supports?.find(x=>x.uid===c.uid&&x.active);if(support){p.money+=support.fee;support.active=false;syncSanity(g,p);}log(g,p,d.name+'：理智线未满足，暂停。','warning');return;}
 if(d.professional&&coveredSlots(d,s).some(t=>!workType(p,t))||d.offHours&&coveredSlots(d,s).some(t=>workType(p,t))){log(g,p,d.name+'：时段条件不符，暂停。','warning');return;}
 if(m.completion?.weekend&&p.weekend){log(g,p,d.name+'：已获得双休。','warning');return;}
 if(p.money<effectiveCost(c,d)){feeFailure(g,p,c);return;}
 const f=selection(g,p,c);
 const failure=f.spend&&!tokenCount(p,f.spend)?tokenNames[f.spend]+'不足':f.wholeNight&&!inspirationCount(p)?'没有灵感':f.generate&&!f.empty.length?'没有空夜':f.targetRequired&&!f.targets.length?'没有符合条件的相邻牌':m.leftAuto&&!neighbors(p,c,'left').some(x=>x.auto)?'左邻没有自动指示物':null;
 if(failure){log(g,p,d.name+'：'+failure+'，不付费、不推进。','warning');return;}
 if(m.hire){if(!g.previewMode)g.opportunity={player:p.id,uid:c.uid,source:d.name,sourceType:d.id,stage:'hire',fee:d.hireFee,options:[],v32:true};return;}
 const choice=!!(f.spend||f.generate||f.wholeNight||f.convert||f.trade||f.targetRequired||f.fullSale||(f.encore||f.optionalInspirationProfit||f.optionalInspirationCash)&&inspirationCount(p));
 if(choice&&!g.previewMode){g.opportunity={player:p.id,uid:c.uid,source:d.name,sourceType:d.id,stage:'v32'};return;}
 if(choice)log(g,p,d.name+'：试算按默认指示物选择，不预判交易和新牌。','warning');
 execute(g,p,c,defaultChoice(g,p,c));
}
function validateChoice(g,p,c,v){
 const f=selection(g,p,c),d=getCard(c),m=d.mechanic;
 if(p.money<effectiveCost(c,d))throw Error('执行资金不足。');
 if(v.encoreNight&&(!f.encore||!tokenSources(p,'inspiration').some(x=>x.key===v.encoreNight)))throw Error('返场须选已有灵感的空夜。');
 if(v.sellFull&&!f.fullSale)throw Error('只有满架才能出货。');
 if(f.spend)spend(p,f.spend,v.resource);
 if(v.useInspiration&&(f.optionalInspirationProfit||f.optionalInspirationCash))spend(p,'inspiration',v.optionalSource);
 if(f.wholeNight){const source=tokenSources(p,'inspiration').find(x=>x.key===v.night);if(!source)throw Error('请选择一个有灵感的夜晚。');spend(p,'inspiration',v.night,source.count);}
 if(f.generate){if(!Array.isArray(v.nights)||v.nights.length!==f.generate||v.nights.some(n=>!f.empty.includes(n)))throw Error('请选择空夜放置灵感，可重复选择同一个夜晚。');}
 if(f.convert){if(!Number.isSafeInteger(v.amount)||v.amount<0||v.amount>inspirationCount(p))throw Error('转换数量无效。');if(v.amount){const keys=v.convertSources??p.inspirationSlots.slice(0,v.amount);if(keys.length!==v.amount)throw Error('灵感来源数量不符。');for(const k of keys)spend(p,'inspiration',k);}}
 if(f.targetRequired&&!f.targets.some(x=>x.uid===v.target))throw Error('请选择直接相邻的目标牌。');
 if(f.trade){
  const t=f.trade,n=v.quantity||0;if(!Number.isSafeInteger(n)||n<0||n>t.limit)throw Error('交易数量超出限制。');
  if(!['buy','sell'].includes(v.trade)||t.mode!=='either'&&t.mode!==v.trade)throw Error('交易方向无效。');
  if(n){const rate=t.price;
   if(v.trade==='buy'){
    if(p.money-effectiveCost(c,d)+(m.advanceCash?(d.gain.money||0):0)<n*rate)throw Error('交易资金不足。');
    const target=v.capitalTarget||'reserve';if(target!=='reserve'){const tc=cardAt(p,target);if(!tc||!findPlacement(p,target)||!getCard(tc).mechanic.capital||(tc.principal||0)+n>getCard(tc).mechanic.capital)throw Error('目标牌货架容量不足。');}
   }else spend(p,'principal',v.capitalSource,n);
  }
 }
}
function usesBoardIncome(m){return !!(m.capital||m.artist||m.salaryTransfer||m.autoProfit||m.agent);}
function boardIncome(p,c){
 const m=getCard(c).mechanic;
 const automated=m.agent?Math.min(m.agent,p.cards.filter(x=>x.auto&&findPlacement(p,x.uid)).length):0;
 const machine=m.autoProfit&&c.auto&&(!m.autoRequiresFull||c.principal===m.capital)?m.autoProfit:0;
 return (m.capital?c.principal||0:0)+(m.artist?c.art||0:0)+(m.salaryTransfer?c.duty||0:0)+machine+automated;
}
export function settleBoardIncome(p){
 for(const entry of p.weeklyEarnings){
  if(!entry.readBoard)continue;
  const c=cardAt(p,entry.uid),extra=c&&findPlacement(p,c.uid)?boardIncome(p,c):0;
  entry.money+=extra;entry.profit+=extra;delete entry.readBoard;
 }
}
function earn(p,c,money,profit=0,readBoard=false){
 if(money||profit||readBoard)p.weeklyEarnings.push({uid:c.uid,type:c.type,money,profit,...(readBoard?{readBoard:true}:{})});
}
export function advanceProgress(g,p,c){
 const d=getCard(c),m=d.mechanic;
 if(!d.progressTarget)return;
 c.progress=(c.progress||0)+1;c.lastProgressWeek=g.week;
 if(m.projectDuty)c.projectDuty=c.progress;
 log(g,p,d.name+'：'+c.progress+'/'+d.progressTarget,'progress');
 if(c.progress<d.progressTarget)return;
 const end=m.completion||{};earn(p,c,end.cash||0);awardDuty(g,p,end.duty||0);if(end.weekend)p.weekendFrom=g.week+1;delete c.projectDuty;
 release(p,c);delete c.auto;changeSchedule(g,p,without(p.schedule,c.uid));p.cards=p.cards.filter(x=>x.uid!==c.uid);p.skills.push(c);
 log(g,p,d.name+'：完成归档'+(end.weekend?'，下周起永久双休':'')+(end.duty?'，履职 +'+end.duty:''),'unlock');
}
function execute(g,p,c,v){
 const d=getCard(c),m=focusedMechanic(d,p),f=selection(g,p,c),focus=m.focus&&p.sanity>=m.focus.min?m.focus:null;
 validateChoice(g,structuredClone(p),c,v); // No partial payment on invalid input.
 const all=f.wholeNight?tokenSources(p,'inspiration').find(x=>x.key===v.night).count:0;
 const fee=effectiveCost(c,d);pay(p,{money:fee});
 if(f.spend)spend(p,f.spend,v.resource);
 if(v.useInspiration&&(f.optionalInspirationProfit||f.optionalInspirationCash))spend(p,'inspiration',v.optionalSource);
 if(all)spend(p,'inspiration',v.night,all);
 if(f.generate)p.inspirationSlots.push(...v.nights);
 if(f.convert&&v.amount)for(const key of v.convertSources??p.inspirationSlots.slice(0,v.amount))spend(p,'inspiration',key);
 if(m.rightAuto)cardAt(p,v.target).auto=1;
 if(m.belowBonus){const t=cardAt(p,v.target);t.bonusWeek=g.week;t.weekBonus=(t.weekBonus||0)+m.belowBonus;}
 let profit=d.fixedProfit||0,cash=(d.gain.money||0)-(d.fixedProfit||0)+all*(m.wholeNight||0)+(v.amount||0)*(m.convert||0);
 if(m.encore&&v.encoreNight){const pile=tokenSources(p,'inspiration').find(x=>x.key===v.encoreNight);p.inspirationSlots.push(...Array(Math.min(pile.count,m.encore)).fill(pile.key));}
 if(m.autoRestock&&c.auto&&(c.principal||0)<m.capital)c.principal=(c.principal||0)+1;
 if(f.fullSale&&v.sellFull){c.principal--;cash+=f.fullSale;}
 if(v.useInspiration&&m.optionalInspirationProfit)profit+=m.optionalInspirationProfit;
 if(v.useInspiration&&m.optionalInspirationCash)cash+=m.optionalInspirationCash;
 if(m.salaryDice){const face=g.previewMode?(g.previewMode==='low'?1:6):die(g),value=g.config.salary+(p.duty||0)+(face>3?2:0);cash+=value;if(!g.previewMode)g.diceRolls.push({week:g.week,kind:'activity',player:p.id,uid:c.uid,type:c.type,face,value});}
 if(m.relayBelow){const target=neighbors(p,c,'below').find(x=>!x.auto);if(target){target.auto=1;log(g,p,d.name+'：下邻「'+getCard(target).name+'」获得自动。','progress');}}
 if(m.sellCourse)cash+=p.skills.length*m.sellCourse;
 if(m.duty)awardDuty(g,p,m.duty);
 if(d.maturation){profit=(c.progress||0)>=d.maturation.steps?d.maturation.mature:d.maturation.initial;c.progress=Math.min(d.maturation.steps,(c.progress||0)+1);}
 if(d.dice){let value;if(g.previewMode)value=Math[g.previewMode==='low'?'min':'max'](...d.dice.faces);else{const face=die(g),second=focus?.reroll?die(g):null;value=second?Math.max(d.dice.faces[face-1],d.dice.faces[second-1]):d.dice.faces[face-1];g.diceRolls.push({week:g.week,kind:'activity',player:p.id,uid:c.uid,type:c.type,face,second,value});}if(d.dice.resource==='profit')profit+=value;else cash+=value;}
 if(focus){profit+=focus.profit||0;cash+=focus.cash||0;}
 if(d.income&&c.bonusWeek===g.week)profit+=c.weekBonus||0;
 let advance=0;
 if(m.trade&&v.quantity){
  const rate=m.trade.price,amount=rate*v.quantity;
  if(v.trade==='buy'){
   // Only this explicit card may use its own freshly earned cash before week end.
   advance=m.advanceCash?Math.min(cash,Math.max(0,amount-p.money)):0;p.money+=advance;p.money-=amount;
   const target=v.capitalTarget==='reserve'||!v.capitalTarget?p:cardAt(p,v.capitalTarget);target.principal=(target.principal||0)+v.quantity;
  }else{spend(p,'principal',v.capitalSource,v.quantity);cash+=amount;}
 }
 earn(p,c,profit+cash-advance,profit,usesBoardIncome(m));c.lastExecutedWeek=g.week;if(d.income)p.jobsDone++;
 log(g,p,d.name+'：'+(fee?'支付 '+fee+'；':'')+'副业 '+profit+(usesBoardIncome(m)?'＋周末牌面指示物':'')+'，其他资金 '+cash+(advance?'（其中已使用 '+advance+'）':''),'income');
 advanceProgress(g,p,c);syncSanity(g,p);
 if(m.focusDraw&&p.sanity>=m.focusDraw&&!g.previewMode){
  if(m.automatedLook&&c.auto){
   if(g.decks[4].length||g.discard[4].length){
    g.opportunity={player:p.id,source:d.name,sourceType:d.id,count:m.automatedLook,lane:4,free:true,stage:'lane',options:[],seen:[],bought:null};
    chooseOpportunityLane(g,p.id,4);
   }
  }
  else{const card=draw(g,4);if(card){p.cards.push(card);log(g,p,d.name+'：抽取「'+getCard(card).name+'」入手，下周可安排。','opportunity');}}
 }
 if(d.opportunity&&!g.previewMode)g.opportunity={player:p.id,source:d.name,sourceType:d.id,...d.opportunity,count:focus?.look||d.opportunity.count,stage:'lane',options:[],seen:[],bought:null};
}
function awardDuty(g,p,count){if(!count)return;p.duty=(p.duty||0)+count;if(!g.previewMode)(g.dutyAwards??=[]).push({player:p.id,count});}
export function beginDutyChoice(g){
 while(!g.opportunity&&g.dutyAwards?.length){const q=g.dutyAwards.shift(),p=g.players[q.player];if(p.cards.some(c=>findPlacement(p,c.uid)&&!c.duty&&!getCard(c).mechanic?.projectDuty&&!getCard(c).mechanic?.salaryTransfer))g.opportunity={...q,stage:'duty',source:'分配新履职'};}
}
export function chooseDuty(g,id,uid=null){
 const q=g.opportunity;if(g.phase!=='resolving'||q?.stage!=='duty'||q.player!==id)throw Error('当前没有履职分配。');
 const p=g.players[id],c=cardAt(p,uid);
 if(uid!==null){if(!c||!findPlacement(p,uid)||c.duty||getCard(c).mechanic?.projectDuty||getCard(c).mechanic?.salaryTransfer||!p.duty)throw Error('请选择无履职的普通日程牌。');p.duty--;c.duty=1;log(g,p,'新履职附于「'+getCard(c).name+'」，之后免查岗；工资不再 +1。');}
 if(uid===null||--q.count===0)g.opportunity=null;
}
export function choose(g,id,value){
 const q=g.opportunity;if(g.phase!=='resolving'||q?.stage!=='v32'||q.player!==id)throw Error('当前没有这项活动选择。');
 const p=g.players[id],c=cardAt(p,q.uid);if(!c||c.lastExecutedWeek===g.week)throw Error('活动已处理。');
 if(value===null){log(g,p,q.source+'：跳过，不付费、不推进。');g.opportunity=null;return;}
 // Execute on a clone first, including any nested opportunity; commit atomically.
 const next=structuredClone(g),np=next.players[id];next.opportunity=null;execute(next,np,cardAt(np,q.uid),value);Object.assign(g,next);
}
