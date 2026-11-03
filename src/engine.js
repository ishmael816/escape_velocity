import * as Wellbeing from './wellbeing.js';
import * as V32 from './engine-v32.js';
import * as Split from './event-split.js';
import {CARDS,ADVANCED,MARKET_LIMITS,marketLane,DEFAULTS,EVENTS,getCard,slotKey,slotLabel,DAYS,cardCopies,cardPhases} from './cards.js';
import {hours} from './card-visuals.js';

function rng(g,key='random'){let x=g[key];x^=x<<13;x^=x>>>17;x^=x<<5;g[key]=x>>>0;return g[key]/4294967296;}
function shuffle(g,cards){const a=[...cards];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng(g)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const die=g=>Math.floor(rng(g,'diceRandom')*6)+1;
const instance=(g,type)=>({uid:`c${++g.uid}`,type});
const slots=()=>Array.from({length:21},(_,i)=>({day:Math.floor(i/3),period:i%3}));
const log=(g,p,text,tone='normal',slot=null)=>g.logs.push({week:g.week,day:g.day,player:p?.id??null,text,tone,slot});
const without=(schedule,uid)=>Object.fromEntries(Object.entries(schedule).map(([k,a])=>[k,a.filter(x=>x!==uid)]).filter(([,a])=>a.length));
export const playingPlayers=g=>g.players.filter(p=>!p.escaped);
const turnOrder=g=>Array.from({length:g.players.length},(_,i)=>g.players[(g.first+i)%g.players.length]).filter(p=>!p.escaped);
export const activeBuyer=g=>g.weekendReserve?.player??g.marketRefresh?.player??turnOrder(g)[g.turn]?.id;
export const planningStage=g=>g.weekendReserve?'reserve':g.day<2?'purchase':g.day===2?'adjust':'arrange';
export const planningLabel=g=>g.weekendReserve?'周末 · 锁牌':`${DAYS[g.day]} · ${g.day<2?'采购':g.day===2?'调度':'安排'}`;
export const canReserve=(g,p)=>!p.escaped&&!p.reserved&&(!cardsInSlot(p,{day:6,period:0}).length||(p.weekend&&!cardsInSlot(p,{day:5,period:0}).length));
export const cardAt=(p,uid)=>p.cards.find(c=>c.uid===uid)||p.skills.find(c=>c.uid===uid&&getCard(c).mechanic?.replay);
export function cardsInSlot(p,s){const key=typeof s==='string'?s:slotKey(s),direct=(p.schedule[key]||[]).map(uid=>cardAt(p,uid)).filter(Boolean);if(key.endsWith('-1'))direct.push(...(p.schedule[key.replace('-1','-0')]||[]).map(uid=>cardAt(p,uid)).filter(c=>c&&hours(getCard(c).size)===8));return direct;}
export function occupiedHours(defs,daytime=false){const ns=defs.map(d=>daytime?Math.min(4,d.hours):d.hours);return defs.length===2&&defs.some(d=>d.parallel)?Math.max(...ns):ns.reduce((a,b)=>a+b,0);}
export const slotHours=(p,s)=>occupiedHours(cardsInSlot(p,s).map(getCard),!(typeof s==='string'?s.endsWith('-2'):s.period===2));
export const inspirationCount=p=>(p.inspirationSlots||[]).filter(key=>/^[0-6]-2$/.test(key)&&!cardsInSlot(p,key).length).length;
function refreshInspiration(p){
 clearOccupiedInspiration(p);
}
function clearOccupiedInspiration(p){p.inspirationSlots=(p.inspirationSlots||[]).filter(key=>/^[0-6]-2$/.test(key)&&!cardsInSlot(p,key).length);}
const anchor=(d,s)=>d.hours===8&&s.period!==2?{day:s.day,period:0}:s;
export const coveredSlots=(d,s)=>d.hours===8?[{day:s.day,period:0},{day:s.day,period:1}]:[s];
const resolvingCards=(p,s)=>cardsInSlot(p,s).filter(c=>getCard(c).hours!==8||s.period===1);
export function findPlacement(p,uid){const key=Object.keys(p.schedule).find(k=>p.schedule[k].includes(uid));return key?{key,day:Number(key[0]),period:Number(key[2])}:null;}
export const unplacedCards=p=>[...p.cards.filter(c=>!findPlacement(p,c.uid)),...p.skills.filter(c=>getCard(c).mechanic?.replay)];
export function skillCounts(p){const out={W:0,A:0,B:0,C:0};for(const type of new Set(p.skills.map(c=>c.type))){const r=getCard(type)?.skill;if(r)out[r]++;}return out;}
export function skillMissing(p,d){const have=skillCounts(p);return [...d.requires||''].filter(r=>--have[r]<0);}
export const qualified=(p,d)=>!skillMissing(p,d).length;
export function canBuy(g,p,d,extra=0){
 const check=cardPhases(d).purchase;
 if(!canPay(p,{...check.price,money:(check.price.money||0)+extra}))return '资金不足。';
 if(!qualified(p,d))return '购买缺少技能 '+skillMissing(p,d).join('')+'。';
 return null;
}
export const nightStress=(g,h)=>h?g.config.nightStress4:0;
export function sundayStress(g,p,schedule=p.schedule){const planned={...p,schedule};return slotHours(planned,{day:6,period:0})+slotHours(planned,{day:6,period:1})>=8?(g.config.sundayStress??2):0;}
function scheduleStress(g,p,schedule=p.schedule){let n=sundayStress(g,p,schedule);for(const [key,uids]of Object.entries(schedule)){const defs=uids.map(uid=>getCard(cardAt(p,uid))).filter(Boolean);n+=defs.reduce((sum,d)=>sum+(d.stress||0),0);if(key.endsWith('-2'))n+=nightStress(g,occupiedHours(defs));}return n;}
// Planning previews reserve support fees in chronological order; settlement freezes
// which supports were actually funded before any ordinary activity can earn money.
export function supportPlan(g,p,schedule=p.schedule){
 let money=p.money;
 return Object.entries(schedule).sort(([a],[b])=>a.localeCompare(b)).flatMap(([key,uids])=>uids.map(uid=>{
  const c=cardAt(p,uid),d=getCard(c);if(!d?.support)return null;
  const s={day:Number(key[0]),period:Number(key[2])};
  const fee=Math.max(0,(d.upkeep||0)-(c.auto||0));
  const invalidTime=d.offHours&&coveredSlots(d,s).some(t=>workType(p,t))||d.professional&&coveredSlots(d,s).some(t=>!workType(p,t));
  const reason=invalidTime?'时段条件不符':activityDanger(g,p,c,s)?'查岗或团建暂停':money<fee?'结算资金不足':null;
  if(!reason)money-=fee;
  return {uid,amount:d.support+(s.day===6&&d.hours===8?(d.sundayRelief||0):0),fee,active:!reason,reason};
 }).filter(Boolean));
}
export function sanityState(g,p,schedule=p.schedule){if(p.escaped&&p.escapeSanityState)return {...p.escapeSanityState};const freedom=p.weekend?2:0,baseline=Math.min(10,g.config.startSanity+freedom),pressure=scheduleStress(g,p,schedule),funded=p.supportWeek===g.week&&g.phase!=='planning'?p.supports||[]:supportPlan(g,p,schedule),support=funded.filter(x=>x.active&&Object.values(schedule).some(ids=>ids.includes(x.uid))).reduce((n,x)=>n+x.amount,0),raw=baseline+support-pressure;return {base:g.config.startSanity,freedom,baseline,support,upkeep:funded.filter(x=>x.active).reduce((n,x)=>n+x.fee,0),pressure,raw,value:Math.max(0,Math.min(10,raw))};}
function settleSupport(g,p){
 if(p.supportWeek===g.week)return;
 p.supports=supportPlan(g,p);p.supportWeek=g.week;
 for(const x of p.supports){
  const c=cardAt(p,x.uid);
  if(x.active)p.money-=x.fee;
  log(g,p,`「${getCard(c).name}」：${x.active?`${x.fee?`资金 −${x.fee}，`:''}日程理智 +${x.amount}（不累加）`:x.reason+'，正理智影响失效，不扣资金'}。`,x.active?'normal':'warning');
  if(x.reason==='结算资金不足')returnToHand(g,p,c,'付不起结算资金');
 }
 syncSanity(g,p);
}
export function syncSanity(g,p){p.sanity=sanityState(g,p).value;return p.sanity;}
function changeSchedule(g,p,schedule){p.schedule=schedule;clearOccupiedInspiration(p);syncSanity(g,p);}
export const canPay=(p,cost={})=>Object.entries(cost).every(([k,n])=>(p[k]||0)>=n);
const pay=(p,cost={})=>{for(const [k,n]of Object.entries(cost))p[k]-=n;};
function gain(p,values={}){for(const [k,n]of Object.entries(values)){if(k==='sanity')throw Error('理智不是可增减资源。');p[k]=(p[k]||0)+n;}}
export function workType(p,s){if(s.period===2||s.day===6||p.escaped||p.freeDays.includes(s.day)||(s.day===5&&(p.weekend||p.tempWeekend)))return null;return s.period===0?'meeting':'desk';}
export const capacity=()=>4;
export const eventFor=(g,p)=>g.eventOverrides?.[p.id]||g.inspection;
export const eventBlocksSlot=(g,p,s)=>!p.escaped&&(eventFor(g,p).blockedTimes||[]).some(t=>slotKey(t)===slotKey(s));
export const inspected=(g,p,s)=>!!workType(p,s)&&(g.inspection.playerTimes?.[p.id]||g.inspection.times||[]).some(t=>slotKey(t)===slotKey(s));
export function protectedActivity(p,c,s){return !!c.duty||p.protectedSlot===slotKey(s)&&(p.protectedUid!==undefined?p.protectedUid:cardsInSlot(p,s).find(x=>getCard(x).hours<=4&&!getCard(x).professional)?.uid)===c.uid;}
function inspectionProtection(g,p,c,s){return g.inspectionResolved&&p.inspectionProtected?p.inspectionProtected.includes(c.uid):protectedActivity(p,c,s);}
export function activityDanger(g,p,c,s){if(Wellbeing.hospitalPaused(g,p,c,s))return true;const d=getCard(c);return coveredSlots(d,s).some(t=>eventBlocksSlot(g,p,t)||(!d.professional&&inspected(g,p,t)&&!inspectionProtection(g,p,c,t)));}

export function createGame(options={}){
 const config={...DEFAULTS,...options};for(const [k,v]of Object.entries(DEFAULTS))if(typeof v==='number')config[k]=Number.isFinite(Number(config[k]))?Math.max(0,Math.floor(Number(config[k]))):v;
 config.playerCount=Math.min(4,Math.max(2,config.playerCount));config.maxSanity=10;config.escapeSanity=Math.min(10,config.escapeSanity);config.startSanity=Math.min(10,config.startSanity);config.escapeIncome=Math.min(10,Math.max(1,config.escapeIncome));delete config.nightStress3;delete config.livingCost;delete config.starterActivity;delete config.startInspiration;
 const g={version:32,marketModel:'mixed-II-v2',planningModel:'fixed-week-v1',weekendReserve:null,marketRefresh:null,exchangeRate:3,opportunity:null,opportunityHistory:[],resolutionQueue:null,sanityModel:'support-v1',progressModel:2,config,random:config.seed||1,diceRandom:((config.seed^0x9e3779b9)>>>0)||1,uid:0,week:1,day:0,turn:0,first:0,phase:'planning',players:[],decks:{4:[],8:[]},discard:{4:[],8:[]},market:{4:[],8:[]},inspectionDeck:[],inspectionDiscard:[],logs:[],history:[],timeline:[],cursor:0,actionCount:0,escapeDecisions:{},diceRolls:[]};
 for(let id=0;id<config.playerCount;id++)g.players.push({id,name:id===0?'你':`玩家 ${id+1}`,bot:config.mode==='bots'&&id>0,money:config.startMoney,sanity:config.startSanity,inspirationSlots:[],principal:0,duty:0,escaped:false,escapedWeek:null,weekend:false,tempWeekend:false,freeDays:[],reserved:null,cards:[],completedActivities:[],skills:[],upgrades:[],drafts:[],schedule:{},income:0,caught:0,jobsDone:0,activeRoutes:[]});
 for(const d of [...CARDS,...ADVANCED])for(let n=0;n<(cardCopies(d,config.playerCount));n++)g.decks[marketLane(d)].push(instance(g,d.id));
 for(const key of Object.keys(g.decks))g.decks[key]=shuffle(g,g.decks[key]);fillMarket(g);startWeek(g);return g;
}
function draw(g,lane){if(!g.decks[lane].length){g.decks[lane]=shuffle(g,g.discard[lane]);g.discard[lane]=[];}return g.decks[lane].pop();}
export const MARKET_ROUTES=['W','A','B','C'];
export const marketCell=(g,route,row)=>row===3?g.market[8].find(c=>c.marketSlot===Number(route)):g.market[4].find(c=>getCard(c).route===route&&c.marketRow===row);
export const refreshProtected=(g,row,slot=null)=>(g.marketProtected||[]).includes(row===3?'II:'+slot:'I:'+row);
function drawRoute(g,lane,route){
 const matches=c=>getCard(c).route===route;
 if(!g.decks[lane].some(matches)){
  g.decks[lane].push(...shuffle(g,g.discard[lane].filter(matches)));
  g.discard[lane]=g.discard[lane].filter(c=>!matches(c));
 }
 const i=g.decks[lane].findLastIndex(matches);
 return i<0?null:g.decks[lane].splice(i,1)[0];
}
function fillMarket(g){
 for(const route of MARKET_ROUTES)for(let row=0;row<3;row++){
  if(marketCell(g,route,row))continue;
  const lane=row===3?8:4,c=drawRoute(g,lane,route);if(!c)continue;
  c.marketRow=row;c.marketSince=g.week;g.market[lane].push(c);
 }
 for(let slot=0;slot<4;slot++)if(!marketCell(g,slot,3)){
  const c=draw(g,8);if(c){c.marketRow=3;c.marketSlot=slot;c.marketSince=g.week;g.market[8].push(c);}
 }
}
// Preserve players and card ownership when opening a save with the old display.
export function upgradeMarket(g){
 if(g.marketModel==='mixed-II-v2')return;
 const old=g.market;g.market={4:[],8:[]};
 for(const lane of [4,8])for(const c of old[lane]){
  const row=(lane===4?[0,1,2]:[0,1,2,3]).find(r=>!marketCell(g,lane===4?getCard(c).route:r,lane===4?r:3));
  if(row===undefined)returnBottom(g,lane,[c]);
  else{c.marketRow=lane===4?row:3;if(lane===8)c.marketSlot=row;g.market[lane].push(c);}
 }
 fillMarket(g);g.marketModel='mixed-II-v2';g.marketRefresh=null;g.marketProtected=[];
 g.mondayMarketBought=g.day!==0||g.actionCount>0;
}
function clearStaleMarket(g){
 const stale={};
 for(const lane of Object.keys(g.market)){
  stale[lane]=g.market[lane].filter(c=>g.week-(c.marketSince??g.week)>=2);
  g.market[lane]=g.market[lane].filter(c=>!stale[lane].includes(c));
 }
 const n=Object.values(stale).flat().length;if(!n)return;
 // Draw replacements with old offers set aside; reuse only if supply runs out.
 fillMarket(g);for(const lane of Object.keys(stale))returnBottom(g,lane,stale[lane]);fillMarket(g);
 log(g,null,`清理 ${n} 张连续两周未售出的牌；展示位独立计龄。`,'market-aging');
}
export function chooseMarketRefresh(g,id,row=null,route=null){
 if(g.phase!=='planning'||g.marketRefresh?.player!==id||activeBuyer(g)!==id)throw Error('请等待自己的市场刷新选择。');
 if(row!==null&&(!Number.isInteger(row)||row<0||row>3))throw Error('请选择市场中的一行。');
 if(row===3&&(route===null||!Number.isInteger(Number(route))||!marketCell(g,route,3)))throw Error('请选择一张现有II级牌。');
 if(row!==3&&route!==null)throw Error('I级牌只能整行刷新。');
 if(row!==null&&refreshProtected(g,row,route))throw Error('本周该行或牌已被保护，不能再次刷新。');
 if(row!==null){
  const lane=row===3?8:4,old=g.market[lane].filter(c=>c.marketRow===row&&(row!==3||c.marketSlot===Number(route)));
  g.market[lane]=g.market[lane].filter(c=>!old.includes(c));
  fillMarket(g);returnBottom(g,lane,old);fillMarket(g);
  (g.marketProtected??=[]).push(row===3?'II:'+Number(route):'I:'+row);
  log(g,g.players[id],`全员周一未购牌：${row===3?'刷新「'+getCard(old[0]).name+'」':'刷新I级第 '+(row+1)+' 行'}，新展示受保护，旧牌回牌堆底。`,'market');
 }else log(g,g.players[id],'保留市场，不刷新。','market');
 const queue=g.marketRefresh.remaining;
 if(queue.length)g.marketRefresh={player:queue[0],remaining:queue.slice(1)};
 else{g.marketRefresh=null;finishTurn(g);}
}
function resetExecution(p){for(const c of p.cards){delete c.weekBonus;delete c.bonusWeek;}p.income=0;p.weeklyEarnings=[];p.settlement=null;p.jobsDone=0;p.activeRoutes=[];p.pendingBoost=null;p.professionalDone=false;p.capitalJobDone=false;}
function startWeek(g){
 g.phase='planning';g.weekendReserve=null;g.day=0;g.turn=0;g.actionCount=0;g.dayPasses=0;g.endedByPass=false;g.timeline=[];g.cursor=0;g.resolutionQueue=null;g.inspectionResolved=false;g.wellbeingQueue=[];g.marketRefresh=null;g.marketProtected=[];g.mondayMarketBought=false;g.mondayRefreshOffered=false;g.eventOverrides={};g.eventSplitQueue=null;g.eventSplitDone=false;g.dutyAwards=[];
 clearStaleMarket(g);
 if(!g.inspectionDeck.length){g.inspectionDeck=shuffle(g,EVENTS.map((_,i)=>i));g.inspectionDiscard=[];}
 const index=g.inspectionDeck.pop();g.inspectionDiscard.push(index);const e=EVENTS[index];g.inspection={...e,times:[],rolls:[],blockedTimes:(e.blockedTimes||[]).map(([day,period])=>({day,period}))};
 if(g.week>1)g.exchangeRate=Math.max(2,Math.min(4,(g.exchangeRate||3)+(e.exchangeDelta||0)));
 log(g,null,'本金汇率：'+g.exchangeRate+' 资金 / 枚','exchange');
 for(const p of playingPlayers(g)){if(p.weekendFrom&&p.weekendFrom<=g.week)p.weekend=true;p.tempWeekend=e.kind==='weekend';resetExecution(p);p.caught=0;p.protectedSlot=null;delete p.protectedUid;delete p.inspectionProtected;p.protectionChosen=false;p.actedThisWeek=false;p.emptyNights=null;p.emptyNightSlots=[];clearOccupiedInspiration(p);syncSanity(g,p);}
 log(g,null,`公开本周事件「${e.name}」：${e.text}`,'inspection');
}
function assertTurn(g,id){if(g.weekendReserve)throw Error('请先选择待买牌或跳过锁牌。');if(g.marketRefresh)throw Error('请先刷新一行或保留市场。');if(g.phase!=='planning'||activeBuyer(g)!==id)throw Error('请等待自己的日程行动。');}
function advance(g,passed=false,bought=false){
 for(const p of playingPlayers(g))syncSanity(g,p);
 g.players[activeBuyer(g)].actedThisWeek=true;g.actionCount++;g.dayPasses=(g.dayPasses||0)+(passed?1:0);
 if(g.day===0&&bought)g.mondayMarketBought=true;
 if(g.day===0&&g.turn===playingPlayers(g).length-1&&!g.mondayMarketBought&&!g.mondayRefreshOffered){
  const order=turnOrder(g).map(p=>p.id);g.mondayRefreshOffered=true;
  g.marketRefresh={player:order[0],remaining:order.slice(1)};return;
 }
 finishTurn(g);
}
function finishTurn(g){
 g.turn++;
 if(g.turn===playingPlayers(g).length){
  g.turn=0;g.dayPasses=0;
  g.day++;
 }
 if(g.day===5){
  const queue=turnOrder(g).filter(p=>canReserve(g,p)).map(p=>p.id);
  if(queue.length&&Object.values(g.market).some(a=>a.length))g.weekendReserve={player:queue[0],remaining:queue.slice(1)};
  else beginResolution(g);
 }
}
function beginResolution(g){g.weekendReserve=null;g.day=7;g.phase='resolving';g.timeline=slots().filter(s=>playingPlayers(g).some(p=>resolvingCards(p,s).length));g.cursor=0;for(const p of playingPlayers(g)){p.emptyNightSlots=Array.from({length:7},(_,day)=>day+'-2').filter(key=>!cardsInSlot(p,key).length);p.emptyNights=p.emptyNightSlots.length;}log(g,null,'日程已锁定，接下来掷公共查岗骰。','inspection');}
export function chooseReserve(g,id,uid=null){
 if(g.phase!=='planning'||g.weekendReserve?.player!==id)throw Error('请等待自己的周末锁牌选择。');
 const p=g.players[id];if(!canReserve(g,p))throw Error('待买区须为空，且周日上午或永久双休后的周六上午空闲。');
 if(uid!==null){
  const lane=Object.keys(g.market).find(k=>g.market[k].some(c=>c.uid===uid)),c=g.market[lane]?.find(c=>c.uid===uid);
  if(!c)throw Error('该牌已不在市场。');
  p.reserved=c;g.market[lane]=g.market[lane].filter(x=>x.uid!==uid);fillMarket(g);log(g,p,`保留「${getCard(c).name}」到待买区；购买前不可替换或丢弃。`,'market');
 }else log(g,p,'跳过本周锁牌。','market');
 const queue=g.weekendReserve.remaining;
 if(queue.length)g.weekendReserve={player:queue[0],remaining:queue.slice(1)};else beginResolution(g);
}
export function buy(g,id,uid){assertTurn(g,id);if(planningStage(g)!=='purchase')throw Error('只能在周一、周二采购。');const p=g.players[id],reserved=p.reserved?.uid===uid,lane=Object.keys(g.market).find(k=>g.market[k].some(c=>c.uid===uid)),c=reserved?p.reserved:g.market[lane]?.find(c=>c.uid===uid);if(!c)throw Error('该牌不在市场或自己的待买区。');const error=canBuy(g,p,getCard(c));if(error)throw Error(error);pay(p,getCard(c).price);p.cards.push(c);if(reserved)p.reserved=null;else{g.market[lane]=g.market[lane].filter(x=>x.uid!==uid);fillMarket(g);}log(g,p,`购买「${getCard(c).name}」，周四、周五可安排。`);advance(g,false,true);}
export function setProtection(g,id,s){assertTurn(g,id);const p=g.players[id];if(!p.protectionFrom||p.protectionFrom>g.week||p.actedThisWeek||p.protectionChosen||!Number.isInteger(s.day)||s.day<0||s.day>5||![0,1].includes(s.period)||!workType(p,s))throw Error('须在本周首次行动前，选择一个工作白天时段。');p.protectedSlot=slotKey(s);p.lastProtectedSlot=p.protectedSlot;p.protectionChosen=true;log(g,p,`弹性授权保护 ${slotLabel(s)} 中的一张I级牌，本周锁定。`);}
export function pass(g,id){assertTurn(g,id);log(g,g.players[id],g.day===2?'完成调度。':'跳过本次'+(g.day<2?'采购':'安排')+'。');advance(g,true);}
export const planningDone=(g,id)=>g.phase==='planning'&&g.players[id]?.planningDoneWeek===g.week;
export function setPlanningDone(g,id,done){
 const p=g.players[id];if(g.phase!=='planning'||!p||p.bot)throw Error('只能设置玩家本周的安排状态。');
 if(done){assertTurn(g,id);p.planningDoneWeek=g.week;}else delete p.planningDoneWeek;
}
export function autoPassPlanning(g){
 if(g.phase!=='planning'||g.opportunity||g.weekendReserve)return false;const id=activeBuyer(g);
 if(g.players[id].bot||!planningDone(g,id))return false;
 if(g.marketRefresh)chooseMarketRefresh(g,id);else pass(g,id);
 while(g.marketRefresh&&!g.players[g.marketRefresh.player].bot&&planningDone(g,g.marketRefresh.player))chooseMarketRefresh(g,g.marketRefresh.player);
 return true;
}
export function canPlace(g,p,uid,s,investment){
 if(g.weekendReserve)return '日程已锁定，请选择待买牌。';
 if(g.marketRefresh)return '请先刷新一行或保留市场。';
 if(g.phase!=='planning'||activeBuyer(g)!==p.id)return '还未轮到你。';
 if(!Number.isInteger(s.day)||s.day<0||s.day>6||![0,1,2].includes(s.period))return '请选择有效日程时段。';
 const c=cardAt(p,uid);if(!c)return '未持有此牌。';const old=findPlacement(p,uid),d=getCard(c);
 if(old&&g.day!==2)return '只能在周三调度时移动已有日程。';
 if(!old&&![3,4].includes(g.day))return '只能在周四、周五安排手牌。';
 if(d.hours===8&&s.period===2)return 'II级牌需要完整白天，不能放入夜晚。';s=anchor(d,s);
 const options=typeof investment==='object'&&investment?investment:{};
 let planned=p;if(d.mechanic){planned=structuredClone(p);try{V32.applyPlay(g,planned,cardAt(planned,uid),options);}catch(e){return e.message;}}
 const capital=d.capitalRatio?(investment??c.lockedCapital??d.capitalRatio):(d.capital||0);
 if(!Number.isSafeInteger(capital)||capital<0||d.capitalRatio&&(capital<d.capitalRatio||capital%d.capitalRatio))return '本金须为 '+d.capitalRatio+' 的正整数倍。';
 if(capital>(p.money+(c.lockedCapital||0)))return '资金不足，无法锁定本金。';
 if(old?.key===slotKey(s)&&capital===(c.lockedCapital||0))return '已经在这个时段。';
 if(d.unlockWeekend&&(p.weekend||p.escaped))return '已经不需要争取双休。';if(d.unlockProtection&&p.protectionFrom)return '已经获得弹性工作授权。';
 if(coveredSlots(d,s).some(t=>eventBlocksSlot(g,p,t)))return '团建占用，不能安排。';
 if(d.professional&&coveredSlots(d,s).some(t=>!workType(p,t)))return '职场履职只能放在工作白天。';
 if(d.offHours&&coveredSlots(d,s).some(t=>workType(p,t)))return '加班只能安排在非上班时间。';
 const schedule=without(p.schedule,uid),key=slotKey(s);(schedule[key]||=[]).push(uid);
 const candidate={...planned,schedule};
 for(const t of coveredSlots(d,s)){
  const defs=cardsInSlot(candidate,t).map(getCard);
  if(t.period!==2&&defs.length>1&&(defs.length>2||defs.some(x=>x.hours!==4)||!defs.some(x=>x.parallel)))return '白天只允许两张I级牌并行，且至少一张有并行图标；II级牌独占全天。';
  if(t.period===2&&(defs.length>1||defs.some(x=>x.hours!==4)))return '每个夜晚最多一张I级牌，不能并行。';
 }
 const after=sanityState(g,{...candidate,money:planned.money+(c.lockedCapital||0)-capital},schedule);
 if(after.raw<0)return '安排后的理智不能低于 0。';return null;
}
export function place(g,id,uid,s,investment){
 assertTurn(g,id);const p=g.players[id],error=canPlace(g,p,uid,s,investment);if(error)throw Error(error);
 const c=cardAt(p,uid),d=getCard(c);s=anchor(d,s);const moved=!!findPlacement(p,uid),capital=d.capitalRatio?(investment??c.lockedCapital??d.capitalRatio):(d.capital||0);
 if(d.mechanic){V32.applyPlay(g,p,c,typeof investment==='object'&&investment?investment:{});if(!p.cards.includes(c)){p.skills=p.skills.filter(x=>x.uid!==uid);delete c.progress;delete c.lastProgressWeek;delete c.lastExecutedWeek;p.cards.push(c);}}
 p.money+=(c.lockedCapital||0)-capital;if(capital)c.lockedCapital=capital;
 const schedule=without(p.schedule,uid);(schedule[slotKey(s)]||=[]).push(uid);changeSchedule(g,p,schedule);
 log(g,p,(moved?'调整':'安排')+'「'+d.name+'」→ '+slotLabel(s)+(capital?'，锁定本金 '+capital:''));if(!moved)advance(g);
}
function releaseCapital(p,c){if(getCard(c).mechanic)V32.release(p,c);p.money+=c.lockedCapital||0;delete c.lockedCapital;}
function returnToHand(g,p,c,reason){
 releaseCapital(p,c);
 const support=p.supports?.find(x=>x.uid===c.uid);
 if(support){support.active=false;support.reason=reason;}
 changeSchedule(g,p,without(p.schedule,c.uid));
 log(g,p,`「${getCard(c).name}」：${reason}，撤回手牌，解除理智影响并返还本金。`,'warning');
}
export function unplace(g,id,uid){assertTurn(g,id);const p=g.players[id],old=findPlacement(p,uid);if(!old||![2,3,4].includes(g.day))throw Error('只能在调度或安排阶段撤回日程。');releaseCapital(p,cardAt(p,uid));changeSchedule(g,p,without(p.schedule,uid));log(g,p,`撤回「${getCard(cardAt(p,uid)).name}」，解除理智影响并返还本金。`);}
function recycle(g,p,c){for(const key of ['progress','lastProgressWeek','lastExecutedWeek','auto','weekBonus','principal','duty','art','projectDuty'])delete c[key];g.discard[marketLane(getCard(c))].push(c);}
export function discardCard(g,id,uid){assertTurn(g,id);const p=g.players[id],c=cardAt(p,uid);if(!c||g.day!==2)throw Error('只能在周三调度时丢弃自己的活动牌，待买牌不能丢弃。');releaseCapital(p,c);changeSchedule(g,p,without(p.schedule,uid));p.cards=p.cards.filter(x=>x.uid!==uid);p.skills=p.skills.filter(x=>x.uid!==uid);recycle(g,p,c);}

// The inspection draw is a separate, idempotent step AFTER schedule lock.
export function rollInspections(g){
 if(g.phase!=='resolving')throw Error('日程确定后才能掷查岗骰。');
 if(!g.eventSplitDone){Split.prepare(g);if(g.opportunity)return [];}
 if(g.inspectionResolved){for(const p of playingPlayers(g))settleSupport(g,p);return g.inspection.rolls;}
 const players=playingPlayers(g),hit=Object.fromEntries(players.map(p=>[p.id,new Set()]));
 for(const p of players)p.protectedUid=p.protectedSlot?cardsInSlot(p,p.protectedSlot).find(c=>getCard(c).hours===4&&!getCard(c).professional)?.uid??null:null;
 for(const p of players)p.inspectionProtected=p.cards.filter(c=>{const s=findPlacement(p,c.uid);return s&&coveredSlots(getCard(c),s).some(t=>protectedActivity(p,c,t));}).map(c=>c.uid);
 const exposed=(p,day)=>[0,1].some(period=>{
  const t={day,period};return !!workType(p,t)&&cardsInSlot(p,t).some(c=>!getCard(c).professional&&!protectedActivity(p,c,t)&&!coveredSlots(getCard(c),t).some(x=>eventBlocksSlot(g,p,x)));
 });
 const chains=[],rolls=[];
 for(let i=0;i<Math.max(0,...players.map(p=>eventFor(g,p).inspectionCount||0));i++){
  let active=players.filter(p=>(eventFor(g,p).inspectionCount||0)>i);const chain=[];
  while(active.length){
   const face=die(g),day=face-1,affected=[];rolls.push(face);
   active=active.filter(p=>{if(hit[p.id].has(day)||!exposed(p,day))return false;hit[p.id].add(day);affected.push(p.id);return true;});
   chain.push({face,players:affected});
  }
  chains.push(chain);
 }
 g.inspection.rolls=rolls;g.inspection.chains=chains;g.inspection.times=[];
 g.inspection.playerTimes=Object.fromEntries(players.map(p=>[p.id,[...hit[p.id]].flatMap(day=>[0,1].map(period=>({day,period})))]));
 g.inspectionResolved=true;g.diceRolls.push({week:g.week,kind:'inspection',faces:rolls,chains});
 log(g,null,chains.length?'查岗 / 追查：'+chains.map(c=>c.map(x=>x.face+'['+(x.players.map(id=>id+1).join(',')||'落空')+']').join(' → ')).join('；')+'。方括号为被命中的玩家；各自落空后退出本轮。':'本周无查岗骰。','dice');
 for(const p of players)settleSupport(g,p);Wellbeing.beginWellbeing(g);return rolls;
}
function activityCost(p,d){return {...d.cost};}
function resolveActivity(g,p,s,c,incoming){
 if(getCard(c).mechanic){V32.resolve(g,p,s,c);return;}
 syncSanity(g,p);const d=getCard(c);if(c.lastExecutedWeek===g.week)return;
 const line=cardPhases(d).settlement.sanity;
 if(p.sanity<line.min||p.sanity>line.max){
  const required=p.sanity<line.min?'≥'+line.min:'≤'+line.max;
  // Support fees are reserved at the start of resolution. A failed sanity check
  // cancels this week's positive effect and returns that reservation once.
  const support=p.supports?.find(x=>x.uid===c.uid&&x.active);
  if(support){p.money+=support.fee;support.active=false;support.reason='结算理智线未满足';syncSanity(g,p);}
  log(g,p,`${slotLabel(s)} · ${d.name}：结算要求理智 ${required}，本周不执行、不收费，保留。`,'warning',s);
  return;
 }
 const cost=activityCost(p,d),failure=inspirationCount(p)<(d.inspirationRequired||0)?'版图灵感不足':d.professional&&coveredSlots(d,s).some(t=>!workType(p,t))?'本周该时段放假，履职暂停':d.offHours&&coveredSlots(d,s).some(t=>workType(p,t))?'本周该时段上班，加班暂停':d.unlockWeekend&&p.weekend?'已获得双休':!canPay(p,cost)?'资源不足':null;
 if(failure){
  if(failure==='资源不足'&&!d.once)returnToHand(g,p,c,'付不起结算费用');
  else log(g,p,`${slotLabel(s)} · ${d.name}：${failure}，保留。`,'warning',s);
  return;
 }
 if(d.inspirationGenerate){
  if(inspirationSpaces(p).length<d.inspirationGenerate){log(g,p,d.name+'：没有足够空夜，不付费、不生成。','warning',s);return;}
  if(g.previewMode){log(g,p,d.name+'：生成位置和费用由执行时选择，试算未假定生成。','warning',s);return;}
  c.lastExecutedWeek=g.week;g.opportunity={player:p.id,source:d.name,sourceType:d.id,stage:'inspire',uid:c.uid,count:d.inspirationGenerate,cost,selected:[]};return;
 }
 if(d.inspirationSpend){
  if(inspirationCount(p)<d.inspirationSpend){log(g,p,d.name+'：没有可消耗的灵感，保留。','warning',s);return;}
  if(g.previewMode){log(g,p,d.name+'：可消耗灵感找牌，未计入试算。','warning',s);return;}
  c.lastExecutedWeek=g.week;g.opportunity={player:p.id,source:d.name,sourceType:d.id,stage:'spend-inspiration',uid:c.uid,...d.opportunity,count:d.opportunity?.count||3,options:[],seen:[],bought:null};return;
 }
 pay(p,cost);c.lastExecutedWeek=g.week;
 if(d.progressTarget){c.progress=(c.progress||0)+1;c.lastProgressWeek=g.week;log(g,p,`${slotLabel(s)} · ${d.name}：进度 ${c.progress}/${d.progressTarget}。`,'progress',s);if(c.progress<d.progressTarget){p.professionalDone ||= !!d.professional;return;}}
 let rolled=0,face=null;
 if(d.dice){if(g.previewMode)rolled=Math[g.previewMode==='low'?'min':'max'](...d.dice.faces);else{face=die(g);rolled=d.dice.faces[face-1];g.diceRolls.push({week:g.week,kind:'activity',player:p.id,uid:c.uid,type:d.id,face,value:rolled,resource:d.dice.resource});log(g,p,`${d.name} · 骰 ${face} → ${rolled}${d.dice.resource==='salary'?' 奖金（不计副业）':' 骰面副业收入'}${d.id==='W06'&&rolled===0?'，老板画饼':''}。`,'dice',s);}}
 let extra=0;
 if(d.condition==='professional'&&p.professionalDone)extra+=d.conditionalBonus;
 if(d.condition==='capitalJob'&&p.capitalJobDone)extra+=d.conditionalBonus;
 if(d.condition==='lowSanity'&&p.sanity<=(d.lowSanityAt??1))extra+=d.conditionalBonus;
 if(d.condition==='inspiration'&&inspirationCount(p)>=d.inspirationBonusAt)extra+=d.conditionalBonus;
 if(d.income&&incoming&&(!incoming.capitalOnly||c.lockedCapital))extra+=incoming.amount;
 let baseProfit=d.fixedProfit;
 if(d.maturation){baseProfit=(c.progress||0)>=d.maturation.steps?d.maturation.mature:d.maturation.initial;c.progress=Math.min(d.maturation.steps,(c.progress||0)+1);log(g,p,d.name+'：成熟进度 '+c.progress+'/'+d.maturation.steps+'，本次收入 '+baseProfit+'。','progress',s);}
 const profit=d.income?(d.capitalRatio?Math.floor((c.lockedCapital||0)/d.capitalRatio):baseProfit)+(d.dice?.resource==='profit'?rolled:0)+extra:0;
 const gains={...d.gain};gains.money=(gains.money||0)-d.fixedProfit+profit+(d.dice?.resource==='salary'?rolled:0)+(d.income?0:extra);
 // Cash is recorded per successful activity and paid once after the whole schedule.
  // Inspiration is a persistent board marker, generated only by explicit activity choices.
 const {money=0,...immediate}=gains;gain(p,immediate);
 p.weeklyEarnings.push({uid:c.uid,type:c.type,money,profit});if(d.income)p.jobsDone++;
 p.pendingBoost=d.boost||null;p.professionalDone ||= !!d.professional;p.capitalJobDone ||= !!(c.lockedCapital&&d.income);if(d.route&&!p.activeRoutes.includes(d.route))p.activeRoutes.push(d.route);
 if(d.unlockWeekend)p.weekendFrom=g.week+1;if(d.unlockProtection)p.protectionFrom=g.week+1;if(d.draft)p.drafts.push({id:`d${++g.uid}`,pool:d.draft,source:d.name,options:null});
 if(d.once){releaseCapital(p,c);changeSchedule(g,p,without(p.schedule,c.uid));p.cards=p.cards.filter(x=>x.uid!==c.uid);if(d.permanent)p.completedActivities.push(c);else if(d.skill&&!p.skills.some(x=>x.type===c.type))p.skills.push(c);else if(!d.opportunity)recycle(g,p,c);}
 syncSanity(g,p);const result=Object.entries(gains).filter(([,n])=>n).map(([k,n])=>`${k==='money'?'周末待收资金':'灵感'} +${n}`).join('，');log(g,p,`${slotLabel(s)} · ${d.name}：${result||'已执行'}${d.income?`；其中副业 ${profit}`:''}${d.skill?`；归档 ${d.skill}`:''}${d.unlockWeekend?'；完成离场，下周起永久双休':''}${d.unlockProtection?'；下周起获得弹性保护':''}${d.draft?'；周末高级牌二选一':''}。`,d.income?'income':'normal',s);
 if(d.hireFee){
  if(g.previewMode)log(g,p,'招募：购牌与招聘费由执行时选择，未计入试算。','warning',s);
  else {
   g.opportunity={player:p.id,source:d.name,sourceType:d.id,stage:'hire',fee:d.hireFee,options:[],fromDeck:!!d.hireDrawCount};
   if(d.hireDrawCount)for(let i=0;i<d.hireDrawCount;i++){const target=draw(g,4);if(target)g.opportunity.options.push(target);}
  }
 }
 if(d.handDiscardBonus){if(g.previewMode)log(g,p,'可弃手牌增加收入，未计入试算。','warning',s);else if(unplacedCards(p).length)g.opportunity={player:p.id,source:d.name,sourceType:d.id,stage:'discard-hand',uid:c.uid,bonus:d.handDiscardBonus};}
 if(d.opportunity){
  if(g.previewMode)log(g,p,'寻找机会：候选与花费待执行时决定，未计入试算。','warning',s);
  else {g.opportunity={player:p.id,source:d.name,sourceType:d.id,sourceCard:d.once?c:null,...d.opportunity,stage:'lane',lane:null,options:[],retried:false,seen:[],bought:null};if(!Object.keys(g.decks).some(k=>g.decks[k].length||g.discard[k].length))finishOpportunity(g);}
 }
}
function resolveSlot(g,p,s,onlyUid){for(const c of resolvingCards(p,s).filter(c=>onlyUid===undefined||c.uid===onlyUid)){
 if(Wellbeing.hospitalPaused(g,p,c,s)){log(g,p,getCard(c).name+'：就医，当天暂停。','warning',s);continue;}
 const d=getCard(c),coverage=coveredSlots(d,s),incoming=p.pendingBoost;p.pendingBoost=null;
 if(coverage.some(t=>eventBlocksSlot(g,p,t))){log(g,p,`${slotLabel(s)} · ${d.name}：团建占用，暂停保留。`,'warning',s);continue;}
 const caught=!d.professional&&coverage.some(t=>inspected(g,p,t)&&!inspectionProtection(g,p,c,t));
 if(caught){const fine=g.config.inspectionFine;p.money=Math.max(0,p.money-fine);p.caught++;log(g,p,`${slotLabel(s)} · ${d.name}：${d.hours}h 摸鱼抓包，资金 −${fine}；整项暂停，仅处罚一次。`,'caught',s);continue;}
 resolveActivity(g,p,s,c,incoming);
}}
export function step(g){
 if(g.phase!=='resolving')throw Error('当前不是结算阶段。');
 if(g.opportunity)throw Error('请先完成当前结算选择。');
 V32.beginDutyChoice(g);if(g.opportunity)return null;
 if(!g.inspectionResolved){rollInspections(g);return null;}
 const s=g.timeline[g.cursor];
 if(s){
  // Persist the remaining card IDs before executing a card that may pause.
  g.resolutionQueue ??= turnOrder(g).flatMap(p=>resolvingCards(p,s).map(c=>({player:p.id,uid:c.uid})));
  while(g.resolutionQueue.length&&!g.opportunity){const task=g.resolutionQueue.shift();resolveSlot(g,g.players[task.player],s,task.uid);}
  if(g.opportunity)return s;
 }
 g.resolutionQueue=null;g.cursor++;
 V32.beginDutyChoice(g);if(g.cursor>=g.timeline.length&&!g.opportunity)finishWeek(g);
 return s;
}
export function resolveAll(g){while(g.phase==='resolving'&&!g.opportunity)step(g);}

// Choices use existing board markers and hand cards. All validation precedes mutation.
export const inspirationSpaces=p=>Array.from({length:7},(_,day)=>day+'-2').filter(k=>!cardsInSlot(p,k).length&&!(p.inspirationSlots||[]).includes(k));
export function chooseActivity(g,id,value=null){
 if(g.opportunity?.stage==='event-split')return Split.choose(g,id,value);
 if(g.opportunity?.stage==='duty')return V32.chooseDuty(g,id,value);
 if(g.opportunity?.stage==='wellbeing')return Wellbeing.chooseWellbeing(g,id,value);
 if(g.opportunity?.stage==='v32')return V32.choose(g,id,value);
 const q=g.opportunity,p=g.players[id];
 if(g.phase!=='resolving'||!q||q.player!==id||!['inspire','spend-inspiration','discard-hand'].includes(q.stage))throw Error('当前没有这项活动选择。');
 if(value===null){log(g,p,q.source+'：放弃可选效果。','opportunity');g.opportunity=null;return;}
 if(q.stage==='inspire'){
  const keys=Array.isArray(value)?value:[value],available=inspirationSpaces(p);
  if(keys.length!==q.count||new Set(keys).size!==q.count||keys.some(k=>!available.includes(k)))throw Error('请选择足够数量的不同空夜。');
  if(!canPay(p,q.cost))throw Error('资金不足。');
  pay(p,q.cost);p.inspirationSlots.push(...keys);log(g,p,q.source+'：资金 −'+(q.cost.money||0)+'，放置灵感于 '+keys.map(k=>DAYS[Number(k[0])]).join('、')+'。','opportunity');
 }else if(q.stage==='spend-inspiration'){
  if(!p.inspirationSlots.includes(value)||cardsInSlot(p,value).length)throw Error('请选择一枚现有灵感。');
  if(!Object.keys(g.decks).some(k=>g.decks[k].length||g.discard[k].length))throw Error('牌堆已空，不必消耗灵感。');
  p.inspirationSlots=p.inspirationSlots.filter(k=>k!==value);q.stage='lane';log(g,p,q.source+'：消耗 '+DAYS[Number(value[0])]+' 夜晚灵感。','opportunity');return;
 }else{
  const c=unplacedCards(p).find(c=>c.uid===value);if(!c)throw Error('只能弃掉一张手牌。');
  p.cards=p.cards.filter(x=>x.uid!==value);recycle(g,p,c);
  p.weeklyEarnings.push({uid:q.uid,type:q.sourceType,money:q.bonus,profit:q.bonus});log(g,p,q.source+'：弃「'+getCard(c).name+'」，本周收入 +'+q.bonus+'。','income');
 }
 g.opportunity=null;
}
export function hireCandidates(g,id){
 const p=g.players[id],q=g.opportunity;
 if(q?.v32)return Object.values(g.market).flat().filter(c=>getCard(c).skill&&getCard(c).route!=='C');
 const candidates=q?.fromDeck?q.options:[...Object.values(g.market).flat(),...unplacedCards(p)];
 return candidates.filter(c=>{const d=getCard(c);return d.hours===4&&d.once&&d.skill&&!p.skills.some(x=>x.type===c.type)&&!p.cards.some(x=>x.type===c.type&&x.uid!==c.uid);});
}
export const hireCost=(d,fee=1,owned=false)=>(owned?0:d.price.money)+fee+(d.cost?.money||0)*(d.progressTarget||1);
export function chooseHire(g,id,uid=null){
 const q=pendingOpportunity(g,id,'hire'),p=g.players[id],c=hireCandidates(g,id).find(c=>c.uid===uid);
 if(uid!==null&&!c)throw Error('请选择本次候选中的可招募成长牌。');
 if(c){
  const cost=hireCost(getCard(c),q.fee,p.cards.includes(c)),error=canBuy(g,p,getCard(c),cost-getCard(c).price.money);if(error)throw Error(error);
  p.money-=cost;p.skills.push({...c,hired:true});p.cards=p.cards.filter(x=>x!==c);
  if(!q.fromDeck){const lane=marketLane(getCard(c));g.market[lane]=g.market[lane].filter(x=>x.uid!==uid);fillMarket(g);}
 }
 if(q.fromDeck)for(const other of q.options.filter(x=>x!==c))recycle(g,p,other);
 g.opportunityHistory.push({week:g.week,player:id,source:q.source,sourceType:q.sourceType,hired:c?{...c}:null,fee:c?q.fee:0,seen:q.fromDeck?q.options.map(c=>c.type):[]});
 log(g,p,c?'招募「'+getCard(c).name+'」直接归档，不执行原效果。':'放弃本次招募。','opportunity');g.opportunity=null;
 if(c&&q.v32){const source=cardAt(p,q.uid);source.lastExecutedWeek=g.week;V32.advanceProgress(g,p,source);}
}

function pendingOpportunity(g,id,stage){
 const q=g.opportunity;
 if(g.phase!=='resolving'||!q||q.player!==id||q.stage!==stage)throw Error('当前不能进行这项找牌操作。');
 return q;
}
function revealOpportunity(g,q){
 q.options=[];
 for(let i=0;i<q.count;i++){const c=draw(g,q.lane);if(!c)break;q.options.push(c);}
 q.seen.push(q.options.map(c=>({...c})));q.stage='choose';
 log(g,g.players[q.player],`「${q.source}」公开 ${q.lane}h 候选：${q.options.map(c=>getCard(c).name).join('、')||'牌堆已空'}。`,'opportunity');
}
// Arrays are listed in future draw order; deck.pop() takes the top card.
function returnBottom(g,lane,cards){g.decks[lane].unshift(...[...cards].reverse());}
function finishOpportunity(g){
 const q=g.opportunity;
 if(q.sourceCard)recycle(g,g.players[q.player],q.sourceCard);
 g.opportunityHistory.push({week:g.week,player:q.player,source:q.source,sourceType:q.sourceType,lane:q.lane,seen:q.seen,bought:q.bought,retried:!!q.retried,free:!!q.free,discarded:q.discarded||[]});
 log(g,g.players[q.player],`「${q.source}」完成：${q.bought?(q.free?'免费取得「':'原价买入「')+getCard(q.bought).name+'」，下周才可安排':'放弃购买'}；其余牌已弃置。`,'opportunity');
 g.opportunity=null;
}
export function chooseOpportunityLane(g,id,lane){
 const q=pendingOpportunity(g,id,'lane');
 if(q.lane&&Number(lane)!==q.lane)throw Error('本牌只能查看I级牌堆。');
 if(!Object.hasOwn(g.decks,Number(lane)))throw Error('请选择I级牌或II级牌堆。');
 if(!g.decks[lane].length&&!g.discard[lane].length)throw Error('该牌堆已空，请选择另一堆。');
 q.lane=Number(lane);revealOpportunity(g,q);
}
export function chooseOpportunity(g,id,uid=null){
 const q=pendingOpportunity(g,id,'choose'),p=g.players[id],c=q.options.find(c=>c.uid===uid);
 if(uid!==null&&!c)throw Error('请选择本次公开的候选牌。');
 if(c){const error=canBuy(g,p,getCard(c),q.free?-getCard(c).price.money:0);if(error)throw Error(error);}
 if(c){if(!q.free)pay(p,getCard(c).price);p.cards.push(c);q.bought={...c};}
 q.options=q.options.filter(x=>x!==c);
 q.discarded=q.options.map(c=>c.uid);for(const other of q.options)recycle(g,p,other);finishOpportunity(g);
}
export function botOpportunity(g){
 const q=g.opportunity;if(!q||!g.players[q.player].bot)return;
 const p=g.players[q.player];
 if(q.stage==='event-split'){chooseActivity(g,p.id,q.options[0].inspectionCount<q.options[1].inspectionCount?0:1);return;}
 if(q.stage==='duty'){chooseActivity(g,p.id,null);return;}
 if(q.stage==='wellbeing'){const candidates=Wellbeing.wellbeingCandidates(g,p.id,q.effect).sort((a,b)=>botValue(g,p,a)-botValue(g,p,b));chooseActivity(g,p.id,candidates[0]?.uid);return;}
 if(q.stage==='v32'){const c=cardAt(p,q.uid);chooseActivity(g,p.id,V32.defaultChoice(g,p,c));return;}
 if(q.stage==='inspire'){const need=Math.max(0,...p.cards.map(c=>getCard(c).inspirationRequired||0))+(p.cards.some(c=>getCard(c).inspirationSpend)?1:0);chooseActivity(g,p.id,p.money>=(q.cost.money||0)&&inspirationCount(p)<need?inspirationSpaces(p).slice(0,q.count):null);return;}
 if(q.stage==='spend-inspiration'){const reserve=Math.max(0,...p.cards.filter(c=>findPlacement(p,c.uid)).map(c=>getCard(c).inspirationRequired||0));chooseActivity(g,p.id,inspirationCount(p)>reserve?p.inspirationSlots.at(-1):null);return;}
 if(q.stage==='discard-hand'){const weak=unplacedCards(p).filter(c=>botValue(g,p,c)<5||p.skills.some(x=>x.type===c.type)).sort((a,b)=>botValue(g,p,a)-botValue(g,p,b))[0];chooseActivity(g,p.id,weak?.uid??null);return;}
 if(q.stage==='hire'){const candidates=hireCandidates(g,p.id).filter(c=>!canBuy(g,p,getCard(c),hireCost(getCard(c),q.fee,p.cards.includes(c))-getCard(c).price.money)&&!p.skills.some(x=>x.type===c.type));candidates.sort((a,b)=>botValue(g,p,b)-botValue(g,p,a));chooseHire(g,p.id,candidates[0]?.uid??null);return;}
 if(q.stage==='lane'){const lanes=Object.keys(g.decks).map(Number).filter(k=>(!q.lane||q.lane===k)&&(g.decks[k].length||g.discard[k].length));if(!lanes.length){finishOpportunity(g);return;}const preferred=p.money>=5&&Object.values(skillCounts(p)).some(n=>n>=2)?8:4;chooseOpportunityLane(g,p.id,lanes.includes(preferred)?preferred:lanes[0]);}
 if(q.stage==='choose'){
  const best=()=>[...q.options].filter(c=>!canBuy(g,p,getCard(c),q.free?-getCard(c).price.money:0)&&p.money>=(q.free?0:getCard(c).price.money)+supportPlan(g,p).filter(x=>x.active).reduce((n,x)=>n+x.fee,0)+(getCard(c).upkeep||0)&&botValue(g,p,c)>4).sort((a,b)=>botValue(g,p,b)-botValue(g,p,a))[0];
  const c=best();
  chooseOpportunity(g,p.id,c?.uid??null);
 }
}
function endResources(g,p){
 if(p.settlement?.week===g.week)return;
 const activityMoney=p.weeklyEarnings.reduce((sum,x)=>sum+x.money,0),salary=p.escaped?0:g.config.salary+(p.duty||0),event=eventFor(g,p),eventGain=!event.employeesOnly||!p.escaped?event.gain||{}:{};
 p.income=p.weeklyEarnings.reduce((sum,x)=>sum+x.profit,0);refreshInspiration(p);
 const other=activityMoney-p.income,eventMoney=eventGain.money||0,total=activityMoney+salary+eventMoney;
 gain(p,{...eventGain,money:total});
 p.settlement={week:g.week,sideIncome:p.income,otherIncome:other,salary,eventMoney,total};
 log(g,p,`周结总账：副业 ${p.income} + 工资 ${salary} + 其他活动收入 ${other} + 事件 ${eventMoney} = 领取 ${total} 资金。`,'income');
}
function finishWeek(g){for(const p of playingPlayers(g))endResources(g,p);g.history.push({week:g.week,actions:g.actionCount,steps:g.timeline.length,event:g.inspection.name,inspectionRolls:[...g.inspection.rolls||[]],players:g.players.map(p=>({id:p.id,income:p.income,money:p.money,sanity:p.sanity,skills:skillCounts(p),caught:p.caught,escaped:p.escaped,escapedWeek:p.escapedWeek}))});g.phase='escape';g.escapeDecisions={};for(const p of turnOrder(g)){if(!eligible(g,p))g.escapeDecisions[p.id]=false;for(const draft of [...p.drafts])openDraft(g,p.id,draft.id);}}
export function openDraft(g,id,draftId){if(g.phase!=='escape'||g.players[id].escaped)throw Error('周末未逃离玩家才能抽选。');const p=g.players[id],draft=p.drafts.find(d=>d.id===draftId);if(!draft||draft.options)throw Error('候选已经揭晓。');draft.options=[];const seen=new Set([...p.cards,...p.drafts.flatMap(d=>d.options||[])].map(c=>c.type));for(const deck of Object.values(g.decks))for(let i=deck.length-1;i>=0&&draft.options.length<2;i--){const c=deck[i],d=getCard(c);if(d.tier==='advanced'&&(draft.pool==='any'||d.route===draft.pool)&&!seen.has(c.type)){draft.options.push(...deck.splice(i,1));seen.add(c.type);}}if(!draft.options.length){p.drafts=p.drafts.filter(d=>d.id!==draftId);p.money+=1;log(g,p,'未亮出的牌中没有符合条件的高级牌，补偿 1 资金。');}}
export function chooseAdvanced(g,id,draftId,uid){if(g.phase!=='escape'||g.players[id].escaped)throw Error('周末未逃离玩家才能选牌。');const p=g.players[id],draft=p.drafts.find(d=>d.id===draftId),c=draft?.options?.find(x=>x.uid===uid);if(!c)throw Error('请选择候选牌。');p.cards.push(c);for(const other of draft.options.filter(x=>x.uid!==uid))g.decks[marketLane(getCard(other))].unshift(other);p.drafts=p.drafts.filter(d=>d.id!==draftId);log(g,p,`取得「${getCard(c).name}」。`,'unlock');}
export const eligible=(g,p)=>g.phase==='escape'&&!p.escaped&&p.income>=g.config.escapeIncome&&sanityState(g,p).value>=g.config.escapeSanity;
export const won=(_g,p)=>p.escaped;
export function chooseEscape(g,id,choice=true){if(g.phase!=='escape'||!eligible(g,g.players[id])||Object.hasOwn(g.escapeDecisions,id))throw Error('当前不能决定逃离。');g.escapeDecisions[id]=!!choice;}
export function closeWeek(g){
 if(g.phase!=='escape')throw Error('尚未完成周结。');
 if(playingPlayers(g).some(p=>p.drafts.length||!Object.hasOwn(g.escapeDecisions,p.id)))throw Error('请先完成抽选与逃离决定。');
 for(const p of turnOrder(g))if(g.escapeDecisions[p.id]){
  // Preserve the winning board and its funded sanity before retiring it.
  p.escapeSanityState=sanityState(g,p);p.sanity=p.escapeSanityState.value;
  p.escaped=true;p.escapedWeek=g.week;
  log(g,p,'逃离工位，获得胜利，退出后续行动与结算。','unlock');
 }
 if(playingPlayers(g).length<=1){g.phase='ended';return;}
 g.week++;g.first=(g.first+1)%g.players.length;g.first=turnOrder(g)[0].id;startWeek(g);
}
// Public preview never reads the random stream or predicts hidden inspection dates.
export function preview(g,id){const retired=g.players[id];if(retired.escaped)return {income:retired.income,money:retired.money,sanity:retired.sanity,inspiration:inspirationCount(retired),warnings:[],incomeLow:retired.income,incomeHigh:retired.income,uncertain:false,retired:true};const run=mode=>{const clone=structuredClone(g),p=clone.players[id];clone.logs=[];clone.previewMode=mode;clone.inspection.times=[];clone.inspection.playerTimes={};clone.phase='resolving';delete p.supportWeek;resetExecution(p);for(const c of p.cards)delete c.lastExecutedWeek;p.emptyNightSlots=Array.from({length:7},(_,day)=>day+'-2').filter(key=>!cardsInSlot(p,key).length);p.emptyNights=p.emptyNightSlots.length;settleSupport(clone,p);for(const s of slots())resolveSlot(clone,p,s);if(clone.inspection.wellbeing)log(clone,p,'试算未扣除精神状态事件造成的停工、撤回或弃牌损失；按周初预告安排。','warning');endResources(clone,p);return {income:p.income,money:p.money,sanity:p.sanity,inspiration:inspirationCount(p),warnings:clone.logs.filter(l=>l.tone==='warning')};};const low=run('low'),high=run('high');return {...high,incomeLow:low.income,incomeHigh:high.income,uncertain:!!g.inspection.inspectionCount||!!g.inspection.wellbeing||g.players[id].cards.some(c=>findPlacement(g.players[id],c.uid)&&(getCard(c).dice||getCard(c).opportunity||getCard(c).hireFee||getCard(c).inspirationGenerate||getCard(c).handDiscardBonus||getCard(c).mechanic?.eventSplit||getCard(c).mechanic?.salaryDice||getCard(c).mechanic?.focusDraw))};}

function expectedIncome(d){return (d.maturation?.mature??d.fixedProfit)+(d.dice?.resource==='profit'?d.dice.faces.reduce((a,b)=>a+b,0)/6:0)+(d.conditionalBonus||0)*.5;}
function botValue(g,p,c){const d=getCard(c),counts=skillCounts(p),missing=skillMissing(p,d).length,ownedCount=p.cards.filter(x=>x.type===c.type).length,owned=ownedCount>0;
 // Repeated search activities still have utility even after their skill is archived.
 if(d.inspirationGenerate)return owned?-5:p.cards.some(c=>getCard(c).inspirationRequired||getCard(c).inspirationSpend)?36:1;
 if(d.inspirationRequired&&inspirationCount(p)<d.inspirationRequired&&!p.cards.some(c=>getCard(c).inspirationGenerate))return owned?-5:5;
 if(d.opportunity){if(d.inspirationSpend&&!inspirationCount(p)&&!p.cards.some(c=>getCard(c).inspirationGenerate))return 1;if(owned||d.professional&&p.sanity>d.maxSanity)return -10;return p.money>=d.price.money+3?24:8;}
 if(d.draft){if(owned)return -10;return p.cards.filter(x=>getCard(x).tier==='advanced'&&(d.draft==='any'||getCard(x).route===d.draft)).length<4?24:1;}
 if(d.support&&!d.income&&!d.boost)return ownedCount>=2||p.sanity>=g.config.escapeSanity?-5:missing?0:p.money>=d.price.money+(d.upkeep||0)?32:2;
 if(d.permanent)return !owned&&qualified(p,d)&&!(d.unlockWeekend&&p.weekend)&&!(d.unlockProtection&&p.protectionFrom)?15:-10;
 if(d.skill){if(p.skills.some(x=>x.type===c.type)||owned)return -10;const needed=p.cards.some(x=>skillMissing(p,getCard(x)).includes(d.skill));return (needed?38:counts[d.skill]===1?29:counts[d.skill]<3?21:counts[d.skill]<4?13:1)+(d.draft?2:0);}
 if(ownedCount>=(d.income?(d.tier==='advanced'?3:2):1))return -5;if(d.tier==='advanced')return missing>1?-1:(d.income?(missing?35:18+expectedIncome(d)):d.boost?12:4)-missing*8;
 if(d.income)return preview(g,p.id).income<12?18+expectedIncome(d):2;
 return d.professional&&!d.skill&&p.money<8?7:1;
}
function bestSlot(g,p,c){const d=getCard(c);return slots().filter(s=>{
 if(canPlace(g,p,c.uid,s)||activityDanger(g,p,c,s))return false;
 const proposed=without(p.schedule,c.uid),key=slotKey(anchor(d,s));(proposed[key]||=[]).push(c.uid);
 const sanity=sanityState(g,p,proposed).value;return sanity>=(d.minSanity||0)&&sanity<=(d.maxSanity??10);
 }).sort((a,b)=>{const value=s=>s.day*3+s.period+(s.period===2?d.hours>2?100:-3:0)+(g.inspection.inspectionCount&&workType(p,s)&&!d.professional?8:0);return value(a)-value(b);})[0];}
function botIncomeReady(g,p,c){
 const d=getCard(c);if(!d.income||!qualified(p,d))return false;
 // Check only the visible offer, printed price, current cash and public schedule.
 // A card requiring unaffordable capital or lacking room is not a conversion.
 const clone=structuredClone(g),buyer=clone.players[p.id];clone.day=3;pay(buyer,d.price);buyer.cards.push(structuredClone(c));
 return !!bestSlot(clone,buyer,c);
}
export function botAct(g){const p=g.players[activeBuyer(g)];if(g.phase!=='planning'||!p?.bot)return;
 if(g.weekendReserve){const offers=Object.values(g.market).flat().filter(c=>botValue(g,p,c)>4&&skillMissing(p,getCard(c)).length<=1).sort((a,b)=>botValue(g,p,b)-botValue(g,p,a));chooseReserve(g,p.id,offers[0]?.uid??null);return;}
 if(g.marketRefresh){const choices=[...[0,1,2].map(row=>({row,cards:MARKET_ROUTES.map(r=>marketCell(g,r,row)).filter(Boolean)})),...[0,1,2,3].map(route=>({row:3,route,cards:[marketCell(g,route,3)].filter(Boolean)}))].filter(x=>x.cards.length&&!refreshProtected(g,x.row,x.route));const useful=choices.some(x=>x.cards.some(c=>!canBuy(g,p,getCard(c))&&botValue(g,p,c)>4));const choice=useful?null:choices.sort((a,b)=>a.cards.reduce((v,c)=>v+botValue(g,p,c),0)/a.cards.length-b.cards.reduce((v,c)=>v+botValue(g,p,c),0)/b.cards.length)[0];chooseMarketRefresh(g,p.id,choice?.row??null,choice?.route??null);return;}
 if(p.protectionFrom<=g.week&&!p.actedThisWeek&&!p.protectionChosen){const s=slots().find(s=>workType(p,s)&&cardsInSlot(p,s).some(c=>getCard(c).hours<=4&&!getCard(c).professional))||slots().find(s=>workType(p,s));if(s)setProtection(g,p.id,s);}

 if(g.day<2){ if(g.day<2){const pendingGrowth=p.cards.filter(c=>getCard(c).skill).length,executionReserve=p.cards.filter(c=>findPlacement(p,c.uid)).reduce((n,c)=>n+(getCard(c).cost.money||0),0)+supportPlan(g,p).filter(x=>x.active).reduce((n,x)=>n+x.fee,0);
 const offers=[...Object.values(g.market).flat(),...(p.reserved?[p.reserved]:[])].filter(c=>{const d=getCard(c);return !canBuy(g,p,d)&&p.money>=d.price.money+executionReserve+(d.cost.money||0)+(d.upkeep||0)&&(!d.skill||pendingGrowth<2)&&botValue(g,p,c)>4&&(unplacedCards(p).length<4||d.skill);}).sort((a,b)=>botValue(g,p,b)-botValue(g,p,a));if(offers.length){let c=offers[0];
  const skill=getCard(c).skill,needed=skill&&p.cards.some(x=>skillMissing(p,getCard(x)).includes(skill));
  // After an initial two-skill investment, use an executable income offer before
  // collecting unrelated skills. Growth unlocking an owned card stays ahead.
  if(skill&&!needed&&Object.values(skillCounts(p)).reduce((a,b)=>a+b,0)>=2)c=offers.find(x=>botIncomeReady(g,p,x))||c;
  buy(g,p.id,c.uid);return;}}
pass(g,p.id);return;}
 if(g.day===2){
  for(const c of [...p.cards]){const old=findPlacement(p,c.uid);if(!old)continue;
   const d=getCard(c),needsRest=old.period===2&&sanityState(g,p).value<g.config.escapeSanity&&d.support<g.config.nightStress4;
   if(activityDanger(g,p,c,old)||needsRest){const target=bestSlot(g,p,c);if(target&&(!needsRest||target.period!==2))place(g,p.id,c.uid,target);else unplace(g,p.id,c.uid);}
  }
  for(const c of [...p.cards]){if(!findPlacement(p,c.uid)||!getCard(c).stress)continue;
   const clone=structuredClone(g),other=clone.players[p.id];other.schedule=without(other.schedule,c.uid);syncSanity(clone,other);const after=preview(clone,p.id);
   if(after.income>=g.config.escapeIncome&&after.sanity>=g.config.escapeSanity){(p.botRetired||=[]).push(c.uid);unplace(g,p.id,c.uid);}
  }
  pass(g,p.id);return;
 }
 const hand=unplacedCards(p).filter(c=>{if(p.botRetired?.includes(c.uid))return false;const d=getCard(c);if(d.skill&&!d.opportunity&&!d.draft&&p.skills.some(x=>x.type===c.type))return false;if(d.support&&!d.income&&!d.boost)return p.sanity<g.config.escapeSanity&&p.money>=(d.upkeep||0);if(!d.once&&!d.income&&!d.boost){if(d.professional&&!d.opportunity)return p.money<8;}return true;}).sort((a,b)=>{const value=c=>{const d=getCard(c);return d.support?44:d.tier==='advanced'?45:d.skill?35:d.income?25:5;};return value(b)-value(a);});for(const c of hand){const target=bestSlot(g,p,c);if(target){place(g,p.id,c.uid,target);return;}}
 pass(g,p.id);
}
export function botDraft(g,id){const p=g.players[id];if(p.escaped)return;for(const draft of [...p.drafts]){const options=[...draft.options].sort((a,b)=>botValue(g,p,b)-botValue(g,p,a));chooseAdvanced(g,id,draft.id,options[0].uid);}}

// Internal hooks shared with the marker-rule module.
export {log,pay,die,changeSchedule,without,returnToHand,fillMarket,recycle,draw,shuffle};
