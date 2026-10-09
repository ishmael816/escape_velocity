import { CARDS, ADVANCED, MARKET_LIMITS, marketLane, DEFAULTS, EVENTS, STARTERS, getCard, slotKey, slotLabel } from './cards.js';
import { hours } from './card-visuals.js';
function rng(g) { let x=g.random; x^=x<<13; x^=x>>>17; x^=x<<5; g.random=x>>>0; return g.random/4294967296; }
function shuffle(g,cards) {const a=[...cards];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng(g)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const instance=(g,type)=>({uid:`c${++g.uid}`,type});
const slots=()=>Array.from({length:21},(_,i)=>({day:Math.floor(i/3),period:i%3}));
const log=(g,p,text,tone='normal',slot=null)=>g.logs.push({week:g.week,day:g.day,player:p?.id??null,text,tone,slot});
export const activeBuyer=g=>(g.first+g.turn)%g.players.length;
export const cardAt=(p,uid)=>p.cards.find(c=>c.uid===uid);
// Full-day cards have one AM anchor and a PM footprint, never a second instance.
export function cardsInSlot(p,s){const key=typeof s==='string'?s:slotKey(s),direct=(p.schedule[key]||[]).map(uid=>cardAt(p,uid)).filter(Boolean);if(key.endsWith('-1'))direct.push(...(p.schedule[key.replace('-1','-0')]||[]).map(uid=>cardAt(p,uid)).filter(c=>c&&hours(getCard(c).size)===8));return direct;}
export const slotHours=(p,s)=>cardsInSlot(p,s).reduce((n,c)=>n+Math.min(4,hours(getCard(c).size)),0);
const anchor=(d,s)=>hours(d.size)===8&&s.period!==2?{day:s.day,period:0}:s;
export const coveredSlots=(d,s)=>hours(d.size)===8?[{day:s.day,period:0},{day:s.day,period:1}]:[s];
const resolvingCards=(p,s)=>cardsInSlot(p,s).filter(c=>hours(getCard(c).size)!==8||s.period===1);
export const activityDanger=(g,p,c,s)=>coveredSlots(getCard(c),s).some(t=>inspected(g,p,t)||eventBlocksSlot(g,p,t));
export function findPlacement(p,uid){const key=Object.keys(p.schedule).find(k=>p.schedule[k].includes(uid));return key?{key,day:Number(key[0]),period:Number(key[2])}:null;}
export const unplacedCards=p=>p.cards.filter(c=>!findPlacement(p,c.uid));
export function skillCounts(p){const out={A:0,B:0,C:0};for(const type of new Set(p.skills.map(c=>c.type)))out[getCard(type).skill]++;return out;}
export function skillMissing(p,d){const have=skillCounts(p);return [...d.requires||''].filter(r=>--have[r]<0);}
export const qualified=(p,d)=>!skillMissing(p,d).length;
export const nightStress=(g,h)=>h>=4?g.config.nightStress4:h>2?g.config.nightStress3:0;
function scheduleStress(g,p,schedule=p.schedule){let n=0;for(const [key,uids]of Object.entries(schedule)){const defs=uids.map(uid=>getCard(cardAt(p,uid))).filter(Boolean);n+=defs.reduce((sum,d)=>sum+(d.stress||0),0);if(key.endsWith('-2'))n+=nightStress(g,defs.reduce((sum,d)=>sum+hours(d.size),0));}return n;}
// State is derived from circumstances. There is no spendable/recoverable sanity pool.
export function sanityState(g,p,schedule=p.schedule){
 const freedom=p.escaped?4:p.weekend?2:0;
 const baseline=Math.min(10,g.config.startSanity+freedom),pressure=scheduleStress(g,p,schedule),accountability=p.accountability||0;
 const raw=baseline-pressure-accountability;
 return {base:g.config.startSanity,freedom,baseline,pressure,accountability,raw,value:Math.max(0,Math.min(10,raw))};
}
export function syncSanity(g,p){p.sanity=sanityState(g,p).value;return p.sanity;}
function changeSchedule(g,p,schedule){p.schedule=schedule;syncSanity(g,p);}
export const canPay=(p,cost={})=>Object.entries(cost).every(([k,n])=>(p[k]||0)>=n);
const pay=(p,cost={})=>{for(const [k,n]of Object.entries(cost))p[k]-=n;};
function gain(g,p,values={}){for(const [k,n]of Object.entries(values)){if(k==='sanity')throw Error('理智不是可增减资源。');p[k]=(p[k]||0)+n;}}
function upgrade(g,p,name){return p.upgrades.find(c=>getCard(c).upgrade===name&&c.activeFrom<=g.week);}
export function workType(p,s){if(s.period===2||s.day===6||p.escaped||p.freeDays.includes(s.day)||(s.day===5&&(p.weekend||p.tempWeekend)))return null;return s.period===0?'meeting':'desk';}
export const capacity=()=>4;
export const eventBlocksSlot=(g,p,s)=>!p.escaped&&g.inspection.blockedTimes.some(t=>slotKey(t)===slotKey(s));
export const inspected=(g,p,s)=>!!workType(p,s)&&g.inspection.times.some(t=>slotKey(t)===slotKey(s));
export function createGame(options={}){
 const config={...DEFAULTS,...options};for(const [k,v]of Object.entries(DEFAULTS))if(typeof v==='number')config[k]=Number.isFinite(Number(config[k]))?Math.max(0,Math.floor(Number(config[k]))):v;
 config.playerCount=Math.min(4,Math.max(2,config.playerCount));config.maxSanity=10;config.startSanity=Math.min(10,config.startSanity);config.nightStress4=Math.max(config.nightStress3,config.nightStress4);
 const g={version:9,sanityModel:'circumstances-v1',progressModel:1,config,random:config.seed||1,uid:0,week:1,day:0,turn:0,first:0,phase:'planning',players:[],decks:{2:[],4:[],8:[]},discard:{2:[],4:[],8:[]},market:{2:[],4:[],8:[]},inspectionDeck:[],inspectionDiscard:[],logs:[],history:[],timeline:[],cursor:0,actionCount:0,escapeDecisions:{}};
 for(let id=0;id<config.playerCount;id++)g.players.push({id,name:id===0?'你':`玩家 ${id+1}`,bot:config.mode==='bots'&&id>0,money:config.startMoney,sanity:Math.min(config.startSanity,config.maxSanity),inspiration:config.startInspiration,escaped:false,escapedWeek:null,weekend:false,tempWeekend:false,freeDays:[],cards:[instance(g,STARTERS.includes(config.starterActivity)?config.starterActivity:'nap'),instance(g,'microjob'),instance(g,'music')],completedProjects:[],skills:[],upgrades:[],drafts:[],schedule:{},income:0,caught:0,accountability:0,jobsDone:0,jobBonuses:[],usedPowers:[],activeRoutes:[]});
 for(const d of [...CARDS,...ADVANCED])for(let n=0;n<(d.tier==='advanced'?1:config.playerCount);n++)g.decks[marketLane(d)].push(instance(g,d.id));
 for(const key of Object.keys(g.decks))g.decks[key]=shuffle(g,g.decks[key]);fillMarket(g);startWeek(g);return g;
}
function draw(g,lane){if(!g.decks[lane].length){g.decks[lane]=shuffle(g,g.discard[lane]);g.discard[lane]=[];}return g.decks[lane].pop();}
function fillMarket(g){for(const [lane,n]of Object.entries(MARKET_LIMITS))while(g.market[lane].length<n){const c=draw(g,lane);if(!c)break;g.market[lane].push(c);}}
function startWeek(g){
 g.phase='planning';g.day=0;g.turn=0;g.actionCount=0;g.timeline=[];g.cursor=0;
 if(!g.inspectionDeck.length){g.inspectionDeck=shuffle(g,EVENTS.map((_,i)=>i));g.inspectionDiscard=[];}
 const index=g.inspectionDeck.pop();g.inspectionDiscard.push(index);const e=EVENTS[index];g.inspection={...e,times:(e.times||[]).map(([day,period])=>({day,period})),blockedTimes:(e.blockedTimes||[]).map(([day,period])=>({day,period}))};
 for(const p of g.players){p.tempWeekend=e.kind==='weekend'&&!p.escaped;p.freeDays=upgrade(g,p,'remote')?[2]:[];p.income=0;p.caught=0;p.jobsDone=0;p.jobBonuses=[];p.usedPowers=[];p.activeRoutes=[];p.accountability=0;syncSanity(g,p);}
 log(g,null,`公开本周事件「${e.name}」：${e.text}`,'inspection');
}
function assertTurn(g,id){if(g.phase!=='planning'||activeBuyer(g)!==id)throw Error('请等待自己的日程行动。');}
function advance(g){g.actionCount++;g.turn++;if(g.turn===g.players.length){g.turn=0;g.day++;}if(g.day===7){g.phase='resolving';g.timeline=slots().filter(s=>g.players.some(p=>resolvingCards(p,s).length));g.cursor=0;}}
export function buy(g,id,uid){
 assertTurn(g,id);const p=g.players[id],lane=Object.keys(g.market).find(k=>g.market[k].some(c=>c.uid===uid)),c=g.market[lane]?.find(c=>c.uid===uid);
 if(!c)throw Error('该牌已不在市场。');if(!canPay(p,getCard(c).price))throw Error('资金不足。');pay(p,getCard(c).price);p.cards.push(c);
 g.market[lane]=g.market[lane].filter(x=>x.uid!==uid);fillMarket(g);log(g,p,`购买「${getCard(c).name}」，安排需另花一次行动。`);advance(g);
}
export function pass(g,id){assertTurn(g,id);g.players[id].money+=g.config.restMoney;log(g,g.players[id],`整备：临时零工 +${g.config.restMoney} 资金（不计副业）。`);advance(g);}
export function refresh(g,id,uid){assertTurn(g,id);const lane=Object.keys(g.market).find(k=>g.market[k].some(c=>c.uid===uid));if(!lane)throw Error('请选择一张明牌。');const c=g.market[lane].find(c=>c.uid===uid);g.market[lane]=g.market[lane].filter(c=>c.uid!==uid);const next=draw(g,lane);g.discard[lane].push(c);if(next)g.market[lane].push(next);else fillMarket(g);log(g,g.players[id],`整备：刷新「${getCard(c).name}」。`);advance(g);}
function without(schedule,uid){return Object.fromEntries(Object.entries(schedule).map(([k,a])=>[k,a.filter(x=>x!==uid)]).filter(([,a])=>a.length));}
export function canPlace(g,p,uid,s){
 if(g.phase!=='planning'||activeBuyer(g)!==p.id)return '还未轮到你。';if(!Number.isInteger(s.day)||s.day<g.day||s.day>6||![0,1,2].includes(s.period))return '只能安排今天及之后。';const c=cardAt(p,uid);if(!c)return '未持有此牌。';const old=findPlacement(p,uid),d=getCard(c);
 if(old&&old.day<g.day)return '已经过去的日程不能移动。';if(hours(d.size)===8&&s.period===2)return '8h 活动需要完整白天，不能放入夜晚。';s=anchor(d,s);if(old?.key===slotKey(s))return '已经在这个时段。';if(d.unlockWeekend&&(p.weekend||p.escaped))return '已经不需要争取双休。';if(!qualified(p,d))return `缺少技能 ${skillMissing(p,d).join('')}。`;if(coveredSlots(d,s).some(t=>eventBlocksSlot(g,p,t)))return '团建占用，不能安排。';
 const schedule=without(p.schedule,uid),key=slotKey(s),other=schedule[key]||[],candidate={...p,schedule};if(s.period!==2&&coveredSlots(d,s).some(t=>cardsInSlot(candidate,t).length))return '白天每槽仅一张；先用一次行动撤回原牌。';if(s.period===2&&other.reduce((n,x)=>n+hours(getCard(cardAt(p,x)).size),0)+hours(d.size)>4)return '夜晚最多合计 4h。';schedule[key]=[...other,uid];const after=sanityState(g,p,schedule).raw;if(after<0)return '安排后的理智不能低于 0。';if(after<(d.minSanity||0))return `安排后理智 ${after}，未达到门槛 ≥${d.minSanity}。`;return null;
}
export function place(g,id,uid,s){assertTurn(g,id);const p=g.players[id],error=canPlace(g,p,uid,s);if(error)throw Error(error);s=anchor(getCard(cardAt(p,uid)),s);const moved=!!findPlacement(p,uid);const schedule=without(p.schedule,uid);(schedule[slotKey(s)]||=[]).push(uid);changeSchedule(g,p,schedule);log(g,p,`${moved?'移动':'安排'}「${getCard(cardAt(p,uid)).name}」→ ${slotLabel(s)}。`);advance(g);}
export function unplace(g,id,uid){assertTurn(g,id);const p=g.players[id],old=findPlacement(p,uid);if(!old||old.day<g.day)throw Error('只能撤回今天及之后的日程。');changeSchedule(g,p,without(p.schedule,uid));log(g,p,`撤回「${getCard(cardAt(p,uid)).name}」，解除该安排的日程压力。`);advance(g);}
export function discardCard(g,id,uid){assertTurn(g,id);const p=g.players[id],c=cardAt(p,uid),old=findPlacement(p,uid);if(!c||old&&old.day<g.day)throw Error('不能移除已过去的日程。');changeSchedule(g,p,without(p.schedule,uid));p.cards=p.cards.filter(x=>x.uid!==uid);recycle(g,p,c);log(g,p,`移除「${getCard(c).name}」。`);advance(g);}
function recycle(g,p,c){delete c.progress;delete c.lastProgressWeek;g.discard[marketLane(getCard(c))].push(c);}
function activityCost(g,p,d){const cost={...d.cost};for(const [power,condition]of [['muse',d.route==='A'&&d.income],['automation',d.route==='B'&&d.income]])if(condition&&upgrade(g,p,power)&&!p.usedPowers.includes(power))cost.inspiration=Math.max(0,(cost.inspiration||0)-getCard(upgrade(g,p,power)).discount);return cost;}
function resolveActivity(g,p,s,c){
 syncSanity(g,p);
 const d=getCard(c);if(d.progressTarget&&c.lastProgressWeek===g.week)return;const cost=activityCost(g,p,d),failure=!qualified(p,d)?'技能不足':p.sanity<(d.minSanity||0)?'理智未达门槛':d.unlockWeekend&&(!p.jobsDone||p.weekend)?'须先完成一次副业且尚未双休':!canPay(p,cost)?'资源不足':null;
 if(failure){log(g,p,`${slotLabel(s)} · ${d.name}：${failure}，保留。`,'warning',s);return;}pay(p,cost);
 if(d.progressTarget){c.progress=(c.progress||0)+1;c.lastProgressWeek=g.week;log(g,p,`${slotLabel(s)} · ${d.name}：进度 ${c.progress}/${d.progressTarget}${c.progress<d.progressTarget?'，保留日程。':'，完成！'}`,'progress',s);if(c.progress<d.progressTarget)return;}
 gain(g,p,d.gain);let extra=0;
 if(d.income){extra=p.jobBonuses.reduce((n,b)=>n+b.amount,0);p.jobBonuses=p.jobBonuses.map(b=>({...b,remaining:b.remaining-1})).filter(b=>b.remaining>0);
 for(const [power,route]of [['muse','A'],['automation','B'],['chain','C']])if(d.route===route&&upgrade(g,p,power)&&!p.usedPowers.includes(power)){const core=getCard(upgrade(g,p,power));extra+=core.powerIncome;p.usedPowers.push(power);}p.money+=extra;p.income+=(d.gain.money||0)+extra;p.jobsDone++;}
 if(d.jobBonus)p.jobBonuses.push({amount:d.jobBonus,remaining:d.jobBonusUses});if(d.route&&!p.activeRoutes.includes(d.route))p.activeRoutes.push(d.route);if(d.unlockWeekend)p.weekend=true;if(d.draft)p.drafts.push({id:`d${++g.uid}`,pool:d.draft,source:d.name,options:null});
 if(d.once){changeSchedule(g,p,without(p.schedule,c.uid));p.cards=p.cards.filter(x=>x.uid!==c.uid);if(d.unlockWeekend)p.completedProjects.push(c);else if(d.upgrade)p.upgrades.push({...c,activeFrom:g.week+1});else if(d.skill&&!p.skills.some(x=>x.type===c.type))p.skills.push(c);else recycle(g,p,c);}
 syncSanity(g,p);const names={money:'资金',inspiration:'灵感'},result=Object.entries(d.gain).filter(([,n])=>n).map(([k,n])=>`${names[k]} +${n}`).join('，');log(g,p,`${slotLabel(s)} · ${d.name}${result?`：${result}`:''}${extra?`；收入加成 +${extra}`:''}${d.skill?`；留存 ${d.skill} 技能`:''}${d.draft?'；周末抽选高级牌':''}${d.upgrade?'；永久能力下周生效':''}${d.unlockWeekend?'；永久双休已解锁，移出日程':''}。`,d.income?'income':'normal',s);
}
function resolveSlot(g,p,s){
 const cards=resolvingCards(p,s);if(!cards.length)return;
 for(const c of cards){const d=getCard(c),coverage=coveredSlots(d,s);
  if(coverage.some(t=>eventBlocksSlot(g,p,t))){log(g,p,slotLabel(s)+' · '+d.name+'：团建占用，活动暂停保留。','warning',s);continue;}
  const caughtHours=coverage.filter(t=>inspected(g,p,t)).reduce((n)=>n+Math.min(4,hours(d.size)),0);
  if(caughtHours){const money=caughtHours*g.inspection.money,sanity=caughtHours*g.inspection.sanity;p.money=Math.max(0,p.money-money);p.accountability+=sanity;syncSanity(g,p);p.caught++;log(g,p,slotLabel(s)+' · '+d.name+'：'+caughtHours+'h 摸鱼抓包，资金 −'+money+'、当周问责压力 +'+sanity+'，整项活动暂停保留。','caught',s);continue;}
  resolveActivity(g,p,s,c);
 }
}
export function step(g){if(g.phase!=='resolving')throw Error('当前不是结算阶段。');const s=g.timeline[g.cursor];if(s)for(let i=0;i<g.players.length;i++)resolveSlot(g,g.players[(g.first+i)%g.players.length],s);g.cursor++;if(g.cursor>=g.timeline.length)finishWeek(g);return s;}
export function resolveAll(g){while(g.phase==='resolving')step(g);}
function endResources(g,p){
 for(const power of ['royalty','brand']){const core=upgrade(g,p,power);if(core&&(power!=='brand'||['A','B','C'].every(r=>p.activeRoutes.includes(r)))){const n=getCard(core).passiveIncome;p.money+=n;p.income+=n;}}
 if(!p.escaped)p.money+=g.config.salary;const shortage=Math.max(0,g.config.livingCost-p.money);p.money=Math.max(0,p.money-g.config.livingCost);if(shortage){p.accountability+=shortage;syncSanity(g,p);}if(!g.inspection.employeesOnly||!p.escaped)gain(g,p,g.inspection.gain);if(g.inspection.kind==='weekend'&&p.weekend&&!p.escaped)p.money+=2;
 log(g,p,`周结：副业 ${p.income}；工资 ${p.escaped?0:g.config.salary}；生活费 ${g.config.livingCost}${shortage?`（缺款产生 ${shortage} 当周压力）`:''}。`,'income');
}
function finishWeek(g){for(const p of g.players){endResources(g,p);}
 g.history.push({week:g.week,actions:g.actionCount,steps:g.timeline.length,event:g.inspection.name,players:g.players.map(p=>({id:p.id,income:p.income,money:p.money,sanity:p.sanity,skills:skillCounts(p),caught:p.caught}))});g.phase='escape';g.escapeDecisions={};for(let i=0;i<g.players.length;i++){const p=g.players[(g.first+i)%g.players.length];if(!eligible(g,p))g.escapeDecisions[p.id]=false;for(const draft of [...p.drafts])openDraft(g,p.id,draft.id);}}
export function openDraft(g,id,draftId){
 if(g.phase!=='escape')throw Error('周末才能抽选。');const p=g.players[id],draft=p.drafts.find(d=>d.id===draftId);if(!draft||draft.options)throw Error('候选已经揭晓。');draft.options=[];const deck=g.decks[8],seen=new Set([...p.cards,...p.upgrades,...p.drafts.flatMap(d=>d.options||[])].map(c=>c.type));
 // Scan eligible unrevealed cards top down, preserving every skipped card's order.
 for(let i=deck.length-1;i>=0&&draft.options.length<2;i--){const c=deck[i],d=getCard(c);if(d.tier==='advanced'&&(draft.pool==='any'||d.route===draft.pool)&&!seen.has(c.type)){draft.options.push(...deck.splice(i,1));seen.add(c.type);}}
 if(!draft.options.length){p.drafts=p.drafts.filter(d=>d.id!==draftId);p.money+=g.config.restMoney;log(g,p,`未亮出的牌中没有符合条件的高级牌，补偿 ${g.config.restMoney} 资金。`);}
}
export function chooseAdvanced(g,id,draftId,uid){if(g.phase!=='escape')throw Error('周末才能选牌。');const p=g.players[id],draft=p.drafts.find(d=>d.id===draftId),c=draft?.options?.find(x=>x.uid===uid);if(!c)throw Error('请选择候选牌。');p.cards.push(c);g.decks[8].unshift(...draft.options.filter(x=>x.uid!==uid));p.drafts=p.drafts.filter(d=>d.id!==draftId);log(g,p,`取得「${getCard(c).name}」。`,'unlock');}
export const eligible=(g,p)=>!p.escaped&&p.income>g.config.escapeIncome;
export const won=(_g,p)=>p.escaped;
export function chooseEscape(g,id,choice=true){if(g.phase!=='escape'||!eligible(g,g.players[id])||Object.hasOwn(g.escapeDecisions,id))throw Error('当前不能决定逃离。');g.escapeDecisions[id]=!!choice;}
export function closeWeek(g){if(g.phase!=='escape')throw Error('尚未完成周结。');if(g.players.some(p=>p.drafts.length||!Object.hasOwn(g.escapeDecisions,p.id)))throw Error('请先完成抽选与逃离决定。');for(const p of g.players)if(g.escapeDecisions[p.id]){p.escaped=true;p.escapedWeek=g.week;syncSanity(g,p);log(g,p,'逃离工位，获得胜利。','unlock');}if(g.players.filter(p=>p.escaped).length>=g.players.length-1){g.phase='ended';return;}g.week++;g.first=(g.first+1)%g.players.length;startWeek(g);}
export function preview(g,id){const clone=structuredClone(g),p=clone.players[id];clone.logs=[];p.income=0;p.jobsDone=0;p.jobBonuses=[];p.usedPowers=[];p.activeRoutes=[];for(const s of slots())resolveSlot(clone,p,s);endResources(clone,p);return {income:p.income,money:p.money,sanity:p.sanity,inspiration:p.inspiration,warnings:clone.logs.filter(l=>['warning','caught'].includes(l.tone))};}
// Automatic players see public cards and events only and spend the same daily actions.
function botValue(g,p,c){const d=getCard(c),counts=skillCounts(p),missing=skillMissing(p,d).length,owned=p.cards.some(x=>x.type===c.type);
 if(d.unlockWeekend)return p.weekend||p.escaped||owned?-10:9;
 if(d.skill){if(p.skills.some(x=>x.type===c.type)||owned)return -10;const needed=p.cards.some(x=>skillMissing(p,getCard(x)).includes(d.skill));return (needed?32:counts[d.skill]<3?18:5)+(d.draft?3:0);}if(owned)return -5;if(d.tier==='advanced')return missing>1?-1:(d.income?34:d.core?23:14)-missing*7;
 if(d.gain.inspiration&&!d.once){const supply=p.cards.reduce((n,x)=>n+(!getCard(x).once?(getCard(x).gain.inspiration||0):0),0),demand=p.cards.reduce((n,x)=>n+(getCard(x).cost.inspiration||0),0);return supply<demand+2?29:2;}if(d.income)return p.cards.filter(x=>getCard(x).income).length<3?19:3;if(d.draft)return 17;return d.gain.inspiration&&d.once?(p.inspiration<3?18:1):1;
}
function bestSlot(g,p,c){const d=getCard(c),gate=Math.max(0,...Object.values(p.schedule).flat().filter(uid=>uid!==c.uid).map(uid=>getCard(cardAt(p,uid)).minSanity||0));return slots().filter(s=>{if(canPlace(g,p,c.uid,s)||activityDanger(g,p,c,s))return false;const schedule=without(p.schedule,c.uid),key=slotKey(anchor(d,s));(schedule[key]||=[]).push(c.uid);return sanityState(g,p,schedule).value>=gate;}).sort((a,b)=>{const value=s=>s.day*3+s.period+(s.period===2?hours(d.size)>2?100:1:0);return value(a)-value(b);})[0];}
export function botAct(g){const p=g.players[activeBuyer(g)];if(g.phase!=='planning'||!p.bot)return;
 if(p.escaped){pass(g,p.id);return;}
 // Use ordinary move/remove actions to release unnecessary pressure before expanding.
 for(const c of p.cards){const old=findPlacement(p,c.uid);if(old&&old.day>=g.day&&old.period===2&&slotHours(p,old)>2){const target=bestSlot(g,p,c);if(target){place(g,p.id,c.uid,target);return;}}}
 const danger=p.cards.filter(c=>{const old=findPlacement(p,c.uid);return old&&old.day>=g.day&&activityDanger(g,p,c,old);});for(const c of danger){const target=bestSlot(g,p,c);if(target){place(g,p.id,c.uid,target);return;}unplace(g,p.id,c.uid);return;}
 if(p.sanity<1){const c=p.cards.filter(c=>{const old=findPlacement(p,c.uid);return old&&old.day>=g.day;}).sort((a,b)=>(getCard(b).stress||0)-(getCard(a).stress||0))[0];if(c&&(getCard(c).stress||findPlacement(p,c.uid).period===2)){unplace(g,p.id,c.uid);return;}}
 const blockedUpgrade=unplacedCards(p).find(c=>{const d=getCard(c);return d.tier==='advanced'&&qualified(p,d)&&(d.income||d.core)&&!bestSlot(g,p,c);});
 if(blockedUpgrade){const d=getCard(blockedUpgrade),weak=p.cards.filter(c=>{const old=findPlacement(p,c.uid),def=getCard(c);return old&&old.day>=g.day&&def.tier!=='advanced'&&def.stress&&(!d.income||(def.gain.money||0)<d.gain.money);}).sort((a,b)=>(getCard(a).gain.money||0)-(getCard(b).gain.money||0))[0];if(weak){unplace(g,p.id,weak.uid);return;}}
 const hand=unplacedCards(p).filter(c=>qualified(p,getCard(c))).sort((a,b)=>{const value=c=>{const d=getCard(c);return d.gain.inspiration&&!d.once?40:d.tier==='advanced'?35:d.skill?30:d.income?25:5;};return value(b)-value(a);});for(const c of hand){const target=bestSlot(g,p,c);if(target){place(g,p.id,c.uid,target);return;}}
 if(g.day<6){const offers=Object.values(g.market).flat().filter(c=>canPay(p,getCard(c).price)&&botValue(g,p,c)>4&&(unplacedCards(p).length<4||getCard(c).skill)).sort((a,b)=>botValue(g,p,b)-botValue(g,p,a));if(offers.length){buy(g,p.id,offers[0].uid);return;}}
 if(p.money<12){pass(g,p.id);return;}const lane=['2','4','8'][(g.week+g.day+p.id)%3];const cards=[...g.market[lane]].sort((a,b)=>botValue(g,p,a)-botValue(g,p,b));if(cards.length)refresh(g,p.id,cards[0].uid);else pass(g,p.id);
}
export function botDraft(g,id){const p=g.players[id];for(const draft of [...p.drafts]){const options=[...draft.options].sort((a,b)=>botValue(g,p,b)-botValue(g,p,a));chooseAdvanced(g,id,draft.id,options[0].uid);}}
