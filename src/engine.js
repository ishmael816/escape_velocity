import {CARDS,ADVANCED,PROJECTS,MARKET_LIMITS,marketLane,DEFAULTS,EVENTS,getCard,slotKey,slotLabel,DAYS} from './cards.js';
import {hours} from './card-visuals.js';

function rng(g,key='random'){let x=g[key];x^=x<<13;x^=x>>>17;x^=x<<5;g[key]=x>>>0;return g[key]/4294967296;}
function shuffle(g,cards){const a=[...cards];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng(g)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const die=g=>Math.floor(rng(g,'diceRandom')*6)+1;
const instance=(g,type)=>({uid:`c${++g.uid}`,type});
const slots=()=>Array.from({length:21},(_,i)=>({day:Math.floor(i/3),period:i%3}));
const log=(g,p,text,tone='normal',slot=null)=>g.logs.push({week:g.week,day:g.day,player:p?.id??null,text,tone,slot});
const without=(schedule,uid)=>Object.fromEntries(Object.entries(schedule).map(([k,a])=>[k,a.filter(x=>x!==uid)]).filter(([,a])=>a.length));
export const activeBuyer=g=>(g.first+g.turn)%g.players.length;
export const cardAt=(p,uid)=>p.cards.find(c=>c.uid===uid);
export function cardsInSlot(p,s){const key=typeof s==='string'?s:slotKey(s),direct=(p.schedule[key]||[]).map(uid=>cardAt(p,uid)).filter(Boolean);if(key.endsWith('-1'))direct.push(...(p.schedule[key.replace('-1','-0')]||[]).map(uid=>cardAt(p,uid)).filter(c=>c&&hours(getCard(c).size)===8));return direct;}
export const slotHours=(p,s)=>cardsInSlot(p,s).reduce((n,c)=>n+Math.min(4,hours(getCard(c).size)),0);
const anchor=(d,s)=>d.hours===8&&s.period!==2?{day:s.day,period:0}:s;
export const coveredSlots=(d,s)=>d.hours===8?[{day:s.day,period:0},{day:s.day,period:1}]:[s];
const resolvingCards=(p,s)=>cardsInSlot(p,s).filter(c=>getCard(c).hours!==8||s.period===1);
export function findPlacement(p,uid){const key=Object.keys(p.schedule).find(k=>p.schedule[k].includes(uid));return key?{key,day:Number(key[0]),period:Number(key[2])}:null;}
export const unplacedCards=p=>p.cards.filter(c=>!findPlacement(p,c.uid));
export function skillCounts(p){const out={W:0,A:0,B:0,C:0};for(const type of new Set(p.skills.map(c=>c.type))){const r=getCard(type)?.skill;if(r)out[r]++;}return out;}
export function skillMissing(p,d){const have=skillCounts(p);return [...d.requires||''].filter(r=>--have[r]<0);}
export const qualified=(p,d)=>!skillMissing(p,d).length;
export const nightStress=(g,h)=>h>=4?g.config.nightStress4:h>2?g.config.nightStress3:0;
function scheduleStress(g,p,schedule=p.schedule){let n=0;for(const [key,uids]of Object.entries(schedule)){const defs=uids.map(uid=>getCard(cardAt(p,uid))).filter(Boolean);n+=defs.reduce((sum,d)=>sum+(d.stress||0),0);if(key.endsWith('-2'))n+=nightStress(g,defs.reduce((sum,d)=>sum+d.hours,0));}return n;}
// Planning previews reserve support fees in chronological order; settlement freezes
// which supports were actually funded before any ordinary activity can earn money.
export function supportPlan(g,p,schedule=p.schedule){
 let money=p.money;
 return Object.entries(schedule).sort(([a],[b])=>a.localeCompare(b)).flatMap(([key,uids])=>uids.map(uid=>{
  const c=cardAt(p,uid),d=getCard(c);if(!d?.support)return null;
  const s={day:Number(key[0]),period:Number(key[2])};
  const reason=activityDanger(g,p,c,s)?'查岗或团建暂停':s.period===2&&uids.reduce((n,id)=>n+getCard(cardAt(p,id)).hours,0)>2?'熬夜支持失效':!qualified(p,d)?'技能不足':money<d.upkeep?'维持费不足':null;
  if(!reason)money-=d.upkeep;
  return {uid,amount:d.support,fee:d.upkeep,active:!reason,reason};
 }).filter(Boolean));
}
export function sanityState(g,p,schedule=p.schedule){const freedom=p.escaped?4:p.weekend?2:0,baseline=Math.min(10,g.config.startSanity+freedom),pressure=scheduleStress(g,p,schedule),funded=p.supportWeek===g.week&&g.phase!=='planning'?p.supports||[]:supportPlan(g,p,schedule),support=funded.filter(x=>x.active&&Object.values(schedule).some(ids=>ids.includes(x.uid))).reduce((n,x)=>n+x.amount,0),raw=baseline+support-pressure;return {base:g.config.startSanity,freedom,baseline,support,upkeep:funded.filter(x=>x.active).reduce((n,x)=>n+x.fee,0),pressure,raw,value:Math.max(0,Math.min(10,raw))};}
function settleSupport(g,p){
 if(p.supportWeek===g.week)return;
 p.supports=supportPlan(g,p);p.supportWeek=g.week;
 for(const x of p.supports){if(x.active)p.money-=x.fee;log(g,p,`「${getCard(cardAt(p,x.uid)).name}」：${x.active?`维持费 −${x.fee}，本周理智支持 +${x.amount}（不累加）`:x.reason+'，本周无支持、不收费'}。`,x.active?'normal':'warning');}
 syncSanity(g,p);
}
export function syncSanity(g,p){p.sanity=sanityState(g,p).value;return p.sanity;}
function changeSchedule(g,p,schedule){p.schedule=schedule;syncSanity(g,p);}
export const canPay=(p,cost={})=>Object.entries(cost).every(([k,n])=>(p[k]||0)>=n);
const pay=(p,cost={})=>{for(const [k,n]of Object.entries(cost))p[k]-=n;};
function gain(p,values={}){for(const [k,n]of Object.entries(values)){if(k==='sanity')throw Error('理智不是可增减资源。');p[k]=(p[k]||0)+n;}}
export function workType(p,s){if(s.period===2||s.day===6||p.escaped||p.freeDays.includes(s.day)||(s.day===5&&(p.weekend||p.tempWeekend)))return null;return s.period===0?'meeting':'desk';}
export const capacity=()=>4;
export const eventBlocksSlot=(g,p,s)=>!p.escaped&&(g.inspection.blockedTimes||[]).some(t=>slotKey(t)===slotKey(s));
export const inspected=(g,p,s)=>!!workType(p,s)&&(g.inspection.times||[]).some(t=>slotKey(t)===slotKey(s));
export function activityDanger(g,p,c,s){const d=getCard(c);return coveredSlots(d,s).some(t=>eventBlocksSlot(g,p,t)||(!d.professional&&inspected(g,p,t)&&!(d.hours===2&&p.protectedSlot===slotKey(t))));}

export function createGame(options={}){
 const config={...DEFAULTS,...options};for(const [k,v]of Object.entries(DEFAULTS))if(typeof v==='number')config[k]=Number.isFinite(Number(config[k]))?Math.max(0,Math.floor(Number(config[k]))):v;
 config.playerCount=Math.min(4,Math.max(2,config.playerCount));config.maxSanity=10;config.escapeSanity=Math.min(10,config.escapeSanity);config.startSanity=Math.min(10,config.startSanity);config.escapeIncome=Math.min(10,Math.max(1,config.escapeIncome));config.nightStress4=Math.max(config.nightStress3,config.nightStress4);delete config.livingCost;delete config.starterActivity;
 const g={version:17,opportunity:null,opportunityHistory:[],resolutionQueue:null,sanityModel:'support-v1',progressModel:1,config,random:config.seed||1,diceRandom:((config.seed^0x9e3779b9)>>>0)||1,uid:0,week:1,day:0,turn:0,first:0,phase:'planning',players:[],decks:{2:[],4:[],8:[]},discard:{2:[],4:[],8:[]},market:{2:[],4:[],8:[]},inspectionDeck:[],inspectionDiscard:[],logs:[],history:[],timeline:[],cursor:0,actionCount:0,escapeDecisions:{},diceRolls:[]};
 for(let id=0;id<config.playerCount;id++)g.players.push({id,name:id===0?'你':`玩家 ${id+1}`,bot:config.mode==='bots'&&id>0,money:config.startMoney,sanity:config.startSanity,inspiration:config.startInspiration,escaped:false,escapedWeek:null,weekend:false,tempWeekend:false,freeDays:[],cards:[],projects:PROJECTS.map(d=>instance(g,d.id)),completedProjects:[],skills:[],upgrades:[],drafts:[],schedule:{},income:0,caught:0,jobsDone:0,activeRoutes:[]});
 for(const d of [...CARDS,...ADVANCED])for(let n=0;n<(d.tier==='advanced'?1:config.playerCount);n++)g.decks[marketLane(d)].push(instance(g,d.id));
 for(const key of Object.keys(g.decks))g.decks[key]=shuffle(g,g.decks[key]);fillMarket(g);startWeek(g);return g;
}
function draw(g,lane){if(!g.decks[lane].length){g.decks[lane]=shuffle(g,g.discard[lane]);g.discard[lane]=[];}return g.decks[lane].pop();}
function fillMarket(g){for(const [lane,n]of Object.entries(MARKET_LIMITS))while(g.market[lane].length<n){const c=draw(g,lane);if(!c)break;g.market[lane].push(c);}}
function refreshMondayMarket(g){
 // Set all old offers aside so replacements cannot immediately draw them again.
 const previous=g.market;g.market={2:[],4:[],8:[]};fillMarket(g);
 const fresh=Object.values(g.market).flat().length;
 for(const lane of Object.keys(previous))returnBottom(g,lane,previous[lane]);
 // Exhausted pools may need old offers to fill the remaining display spaces.
 fillMarket(g);g.mondayMarketRefreshed=true;
 log(g,null,`周一无人购买公共牌，刷新市场：补出 ${fresh} 张其他牌，旧明牌放回对应牌堆底；牌源不足时用旧牌补足。`,'market');
}
function resetExecution(p){p.income=0;p.weeklyEarnings=[];p.settlement=null;p.jobsDone=0;p.activeRoutes=[];p.pendingBoost=null;p.professionalDone=false;p.capitalJobDone=false;}
function startWeek(g){
 g.phase='planning';g.day=0;g.turn=0;g.actionCount=0;g.timeline=[];g.cursor=0;g.resolutionQueue=null;g.inspectionResolved=false;g.mondayMarketBought=false;g.mondayMarketRefreshed=false;
 if(!g.inspectionDeck.length){g.inspectionDeck=shuffle(g,EVENTS.map((_,i)=>i));g.inspectionDiscard=[];}
 const index=g.inspectionDeck.pop();g.inspectionDiscard.push(index);const e=EVENTS[index];g.inspection={...e,times:[],rolls:[],blockedTimes:(e.blockedTimes||[]).map(([day,period])=>({day,period}))};
 for(const p of g.players){p.tempWeekend=e.kind==='weekend'&&!p.escaped;resetExecution(p);p.caught=0;p.protectedSlot=null;p.protectionChosen=false;p.actedThisWeek=false;p.emptyNights=null;syncSanity(g,p);}
 log(g,null,`公开本周事件「${e.name}」：${e.text}`,'inspection');
}
function assertTurn(g,id){if(g.phase!=='planning'||activeBuyer(g)!==id)throw Error('请等待自己的日程行动。');}
function advance(g){for(const p of g.players)syncSanity(g,p);g.players[activeBuyer(g)].actedThisWeek=true;g.actionCount++;g.turn++;if(g.turn===g.players.length){if(g.day===0&&!g.mondayMarketBought)refreshMondayMarket(g);g.turn=0;g.day++;}if(g.day===7){g.phase='resolving';g.timeline=slots().filter(s=>g.players.some(p=>resolvingCards(p,s).length));g.cursor=0;for(const p of g.players)p.emptyNights=7-Object.keys(p.schedule).filter(k=>k.endsWith('-2')).length;log(g,null,'日程已锁定，接下来掷公共查岗骰。','inspection');}}
export function buy(g,id,uid){assertTurn(g,id);const p=g.players[id],lane=Object.keys(g.market).find(k=>g.market[k].some(c=>c.uid===uid)),c=g.market[lane]?.find(c=>c.uid===uid);if(!c)throw Error('该牌已不在市场。');if(!canPay(p,getCard(c).price))throw Error('资金不足。');pay(p,getCard(c).price);p.cards.push(c);g.market[lane]=g.market[lane].filter(x=>x.uid!==uid);fillMarket(g);if(g.day===0&&!p.escaped)g.mondayMarketBought=true;log(g,p,`购买「${getCard(c).name}」，安排需另花一次行动。`);advance(g);}
export function buyProject(g,id,uid){assertTurn(g,id);const p=g.players[id],c=p.projects.find(c=>c.uid===uid),d=getCard(c);if(!d||!qualified(p,d)||!canPay(p,d.price))throw Error('项目需要对应职场信用及资金。');pay(p,d.price);p.projects=p.projects.filter(x=>x!==c);p.cards.push(c);log(g,p,`启动信用项目「${d.name}」，仍需安排行动。`);advance(g);}
export function setProtection(g,id,s){assertTurn(g,id);const p=g.players[id];if(!p.protectionFrom||p.protectionFrom>g.week||p.actedThisWeek||p.protectionChosen||!Number.isInteger(s.day)||s.day<0||s.day>5||![0,1].includes(s.period)||!workType(p,s))throw Error('须在本周首次行动前，选择一个工作白天时段。');p.protectedSlot=slotKey(s);p.protectionChosen=true;log(g,p,`弹性授权保护 ${slotLabel(s)} 中的 2h 活动，本周锁定。`);}
export function pass(g,id){assertTurn(g,id);log(g,g.players[id],`躺平：跳过本次行动。`);advance(g);}
export function canPlace(g,p,uid,s){
 if(g.phase!=='planning'||activeBuyer(g)!==p.id)return '还未轮到你。';if(!Number.isInteger(s.day)||s.day<g.day||s.day>6||![0,1,2].includes(s.period))return '只能安排今天及之后。';const c=cardAt(p,uid);if(!c)return '未持有此牌。';const old=findPlacement(p,uid),d=getCard(c);
 if(old&&old.day<g.day)return '已经过去的日程不能移动。';if(d.hours===8&&s.period===2)return '8h 活动需要完整白天，不能放入夜晚。';s=anchor(d,s);if(old?.key===slotKey(s))return '已经在这个时段。';if(d.unlockWeekend&&(p.weekend||p.escaped))return '已经不需要争取双休。';if(!qualified(p,d))return `缺少技能 ${skillMissing(p,d).join('')}。`;if(coveredSlots(d,s).some(t=>eventBlocksSlot(g,p,t)))return '团建占用，不能安排。';if(d.professional&&coveredSlots(d,s).some(t=>!workType(p,t)))return '履职活动只能安排在仍需上班的白天。';if(!old&&(d.capital||0)>p.money)return `需要锁定本金 ${d.capital}。`;
 const schedule=without(p.schedule,uid),key=slotKey(s),other=schedule[key]||[],candidate={...p,schedule};if(s.period!==2&&coveredSlots(d,s).some(t=>cardsInSlot(candidate,t).length))return '白天每槽仅一张；先用一次行动撤回原牌。';if(s.period===2&&other.reduce((n,x)=>n+getCard(cardAt(p,x)).hours,0)+d.hours>4)return '夜晚最多合计 4h。';schedule[key]=[...other,uid];const state=sanityState(g,{...p,money:p.money-(!old?(d.capital||0):0)},schedule),after=state.value;if(state.raw<0)return '安排后的理智不能低于 0。';if(after<d.minSanity)return `安排后理智 ${after}，未达到门槛 ≥${d.minSanity}。`;if(after>d.maxSanity)return `安排后理智 ${after}，未达到门槛 ≤${d.maxSanity}。`;return null;
}
export function place(g,id,uid,s){assertTurn(g,id);const p=g.players[id],error=canPlace(g,p,uid,s);if(error)throw Error(error);const c=cardAt(p,uid),d=getCard(c);s=anchor(d,s);const moved=!!findPlacement(p,uid);if(!moved&&d.capital){p.money-=d.capital;c.lockedCapital=d.capital;}const schedule=without(p.schedule,uid);(schedule[slotKey(s)]||=[]).push(uid);changeSchedule(g,p,schedule);log(g,p,`${moved?'移动':'安排'}「${d.name}」→ ${slotLabel(s)}${!moved&&d.capital?`，锁定本金 ${d.capital}`:''}。`);advance(g);}
function releaseCapital(p,c){p.money+=c.lockedCapital||0;delete c.lockedCapital;}
export function unplace(g,id,uid){assertTurn(g,id);const p=g.players[id],old=findPlacement(p,uid);if(!old||old.day<g.day)throw Error('只能撤回今天及之后的日程。');releaseCapital(p,cardAt(p,uid));changeSchedule(g,p,without(p.schedule,uid));log(g,p,`撤回「${getCard(cardAt(p,uid)).name}」，释放压力及本金。`);advance(g);}
function recycle(g,p,c){delete c.progress;delete c.lastProgressWeek;if(getCard(c).project)p.projects.push(c);else g.discard[marketLane(getCard(c))].push(c);}
export function discardCard(g,id,uid){assertTurn(g,id);const p=g.players[id],c=cardAt(p,uid),old=findPlacement(p,uid);if(!c||old&&old.day<g.day)throw Error('不能移除已过去的日程。');releaseCapital(p,c);changeSchedule(g,p,without(p.schedule,uid));p.cards=p.cards.filter(x=>x.uid!==uid);recycle(g,p,c);advance(g);}

// The inspection draw is a separate, idempotent step AFTER schedule lock.
export function rollInspections(g){if(g.phase!=='resolving')throw Error('日程确定后才能掷查岗骰。');if(g.inspectionResolved){for(const p of g.players)settleSupport(g,p);return g.inspection.rolls;}const count=g.inspection.inspectionCount||0;const rolls=Array.from({length:count},()=>die(g));g.inspection.rolls=rolls;g.inspection.times=[...new Set(rolls)].flatMap(face=>[0,1].map(period=>({day:face-1,period})));g.inspectionResolved=true;g.diceRolls.push({week:g.week,kind:'inspection',faces:rolls});log(g,null,count?`查岗骰 ${rolls.join('、')} → ${[...new Set(rolls)].map(n=>DAYS[n-1]).join('、')}的上午与下午；重复不重掷。`:'本周无查岗骰。','dice');for(const p of g.players)settleSupport(g,p);return rolls;}
function activityCost(p,d){const cost={...d.cost};if(d.discountAfter&&p.activeRoutes.includes(d.discountAfter))cost.inspiration=Math.max(0,(cost.inspiration||0)-1);return cost;}
function resolveActivity(g,p,s,c,incoming){
 syncSanity(g,p);const d=getCard(c);if(d.support){log(g,p,`${slotLabel(s)} · ${d.name}：${p.supports?.find(x=>x.uid===c.uid)?.active?'支持已在周结前付费，本时段不重复收费':'本周支持未生效'}。`,'normal',s);return;}if(d.progressTarget&&c.lastProgressWeek===g.week)return;
 const cost=activityCost(p,d),failure=!qualified(p,d)?'技能不足':p.sanity<d.minSanity||p.sanity>d.maxSanity?'理智未达门槛':d.professional&&coveredSlots(d,s).some(t=>!workType(p,t))?'本周该时段放假，履职暂停':d.unlockWeekend&&(!p.jobsDone||p.weekend)?'须先完成一次副业且尚未双休':!canPay(p,cost)?'资源不足':null;
 if(failure){log(g,p,`${slotLabel(s)} · ${d.name}：${failure}，保留。`,'warning',s);return;}pay(p,cost);
 if(d.progressTarget){c.progress=(c.progress||0)+1;c.lastProgressWeek=g.week;log(g,p,`${slotLabel(s)} · ${d.name}：进度 ${c.progress}/${d.progressTarget}。`,'progress',s);if(c.progress<d.progressTarget){p.professionalDone ||= !!d.professional;return;}}
 let rolled=0,face=null;
 if(d.dice){if(g.previewMode)rolled=Math[g.previewMode==='low'?'min':'max'](...d.dice.faces);else{face=die(g);rolled=d.dice.faces[face-1];g.diceRolls.push({week:g.week,kind:'activity',player:p.id,uid:c.uid,type:d.id,face,value:rolled,resource:d.dice.resource});log(g,p,`${d.name} · 骰 ${face} → ${rolled}${d.dice.resource==='salary'?' 奖金（不计副业）':' 骰面副业收入'}${d.id==='W06'&&rolled===0?'，老板画饼':''}。`,'dice',s);}}
 let extra=0;
 if(d.condition==='professional'&&p.professionalDone)extra+=d.conditionalBonus;
 if(d.condition==='capitalJob'&&p.capitalJobDone)extra+=d.conditionalBonus;
 if(d.condition==='lowSanity'&&p.sanity<=1)extra+=d.conditionalBonus;
 if(d.condition==='emptyNights'&&p.emptyNights>=d.bonusEmptyNights)extra+=d.conditionalBonus;
 if(d.income&&incoming&&(!incoming.capitalOnly||d.capital))extra+=incoming.type==='flat'?incoming.amount:Math.min(d.fixedProfit,incoming.amount);
 const profit=d.income?Math.min(4,d.fixedProfit+(d.dice?.resource==='profit'?rolled:0)+extra):0;
 const gains={...d.gain};gains.money=(gains.money||0)-d.fixedProfit+profit+(d.dice?.resource==='salary'?rolled:0);
 if(d.emptyNightInspirationCap)gains.inspiration=(gains.inspiration||0)+Math.min(p.emptyNights,d.emptyNightInspirationCap);
 if(d.emptyNightThreshold&&p.emptyNights>=d.emptyNightThreshold)gains.inspiration=(gains.inspiration||0)+d.emptyNightInspiration;
 // Cash is recorded per successful activity and paid once after the whole schedule.
 // Inspiration remains immediate so chronological card combinations still work.
 const {money=0,...immediate}=gains;gain(p,immediate);
 p.weeklyEarnings.push({uid:c.uid,type:c.type,money,profit});if(d.income)p.jobsDone++;
 p.pendingBoost=d.boost||null;p.professionalDone ||= !!d.professional;p.capitalJobDone ||= !!(d.capital&&d.income);if(d.route&&!p.activeRoutes.includes(d.route))p.activeRoutes.push(d.route);
 if(d.unlockWeekend)p.weekend=true;if(d.unlockProtection)p.protectionFrom=g.week+1;if(d.draft)p.drafts.push({id:`d${++g.uid}`,pool:d.draft,source:d.name,options:null});
 if(d.once){releaseCapital(p,c);changeSchedule(g,p,without(p.schedule,c.uid));p.cards=p.cards.filter(x=>x.uid!==c.uid);if(d.project)p.completedProjects.push(c);else if(d.skill&&!p.skills.some(x=>x.type===c.type))p.skills.push(c);else recycle(g,p,c);}
 syncSanity(g,p);const result=Object.entries(gains).filter(([,n])=>n).map(([k,n])=>`${k==='money'?'周末待收资金':'灵感'} +${n}`).join('，');log(g,p,`${slotLabel(s)} · ${d.name}：${result||'已执行'}${d.income?`；其中副业 ${profit}`:''}${d.skill?`；归档 ${d.skill}`:''}${d.unlockWeekend?'；永久双休，完成离场':''}${d.unlockProtection?'；下周起获得弹性保护':''}${d.draft?'；周末高级牌二选一':''}。`,d.income?'income':'normal',s);
 if(d.opportunity){
  if(g.previewMode)log(g,p,'寻找机会：候选与花费待执行时决定，未计入试算。','warning',s);
  else g.opportunity={player:p.id,source:d.name,sourceType:d.id,...d.opportunity,stage:'lane',lane:null,options:[],retried:false,seen:[],bought:null};
 }
}
function resolveSlot(g,p,s,onlyUid){for(const c of resolvingCards(p,s).filter(c=>onlyUid===undefined||c.uid===onlyUid)){
 const d=getCard(c),coverage=coveredSlots(d,s),incoming=p.pendingBoost;p.pendingBoost=null;
 if(coverage.some(t=>eventBlocksSlot(g,p,t))){log(g,p,`${slotLabel(s)} · ${d.name}：团建占用，暂停保留。`,'warning',s);continue;}
 const caught=!d.professional&&coverage.some(t=>inspected(g,p,t)&&!(d.hours===2&&p.protectedSlot===slotKey(t)));
 if(caught){const fine=g.config.inspectionFine;p.money=Math.max(0,p.money-fine);p.caught++;log(g,p,`${slotLabel(s)} · ${d.name}：${d.hours}h 摸鱼抓包，资金 −${fine}；整项暂停，仅处罚一次。`,'caught',s);continue;}
 resolveActivity(g,p,s,c,incoming);
}}
export function step(g){
 if(g.phase!=='resolving')throw Error('当前不是结算阶段。');
 if(g.opportunity)throw Error('请先完成寻找机会。');
 if(!g.inspectionResolved){rollInspections(g);return null;}
 const s=g.timeline[g.cursor];
 if(s){
  // Persist the remaining card IDs before executing a card that may pause.
  g.resolutionQueue ??= Array.from({length:g.players.length},(_,i)=>g.players[(g.first+i)%g.players.length]).flatMap(p=>resolvingCards(p,s).map(c=>({player:p.id,uid:c.uid})));
  while(g.resolutionQueue.length&&!g.opportunity){const task=g.resolutionQueue.shift();resolveSlot(g,g.players[task.player],s,task.uid);}
  if(g.opportunity)return s;
 }
 g.resolutionQueue=null;g.cursor++;
 if(g.cursor>=g.timeline.length)finishWeek(g);
 return s;
}
export function resolveAll(g){while(g.phase==='resolving'&&!g.opportunity)step(g);}

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
 g.opportunityHistory.push({week:g.week,player:q.player,source:q.source,sourceType:q.sourceType,lane:q.lane,seen:q.seen,bought:q.bought,retried:q.retried,top:q.top||[],bottom:q.bottom||[]});
 log(g,g.players[q.player],`「${q.source}」完成：${q.bought?'原价买入「'+getCard(q.bought).name+'」，下周才可安排':'放弃购买'}；其余牌已放回。`,'opportunity');
 g.opportunity=null;
}
export function chooseOpportunityLane(g,id,lane){
 const q=pendingOpportunity(g,id,'lane');
 if(![2,4,8].includes(Number(lane)))throw Error('请选择 2h、4h 或 8h 牌堆。');
 q.lane=Number(lane);revealOpportunity(g,q);
}
export function retryOpportunity(g,id){
 const q=pendingOpportunity(g,id,'choose'),p=g.players[id];
 if(q.mode!=='yellow'||q.retried)throw Error('只有付费寻商可以重选一次。');
 if(p.money<1)throw Error('重选需要 1 资金。');
 p.money--;q.retried=true;
 // Keep the first batch aside until the second batch has been drawn.
 const previous=q.options;revealOpportunity(g,q);returnBottom(g,q.lane,previous);
 log(g,p,'付费寻商：另付 1 资金，弃选首批并翻新候选。','opportunity');
}
export function chooseOpportunity(g,id,uid=null){
 const q=pendingOpportunity(g,id,'choose'),p=g.players[id],c=q.options.find(c=>c.uid===uid);
 if(uid!==null&&!c)throw Error('请选择本次公开的候选牌。');
 if(c&&!canPay(p,getCard(c).price))throw Error('资金不足，须支付印刷原价。');
 if(c){pay(p,getCard(c).price);p.cards.push(c);q.bought={...c};}
 q.options=q.options.filter(x=>x!==c);
 if(q.mode==='green'&&q.options.length){q.stage='order';q.top=[];q.bottom=q.options.map(c=>c.uid);return;}
 q.bottom=q.options.map(c=>c.uid);returnBottom(g,q.lane,q.options);finishOpportunity(g);
}
export function orderOpportunity(g,id,uid,destination,index){
 const q=pendingOpportunity(g,id,'order');
 if(!['top','bottom'].includes(destination)||!q.options.some(c=>c.uid===uid))throw Error('请选择剩余候选及放回位置。');
 const top=q.top.filter(x=>x!==uid),bottom=q.bottom.filter(x=>x!==uid),target=destination==='top'?top:bottom;
 if(!Number.isInteger(index)||index<0||index>target.length)throw Error('无效的放回顺序。');
 target.splice(index,0,uid);q.top=top;q.bottom=bottom;
}
export function finishOpportunityOrder(g,id){
 const q=pendingOpportunity(g,id,'order');
 const byUid=uid=>q.options.find(c=>c.uid===uid);
 returnBottom(g,q.lane,q.bottom.map(byUid));g.decks[q.lane].push(...q.top.map(byUid).reverse());
 finishOpportunity(g);
}
export function botOpportunity(g){
 const q=g.opportunity;if(!q||!g.players[q.player].bot)return;
 const p=g.players[q.player];
 if(q.stage==='lane')chooseOpportunityLane(g,p.id,p.money>=8&&Object.values(skillCounts(p)).some(n=>n>=2)?8:p.money>=4&&p.cards.filter(c=>getCard(c).income).length<3?4:2);
 if(q.stage==='choose'){
  const best=()=>[...q.options].filter(c=>canPay(p,getCard(c).price)&&botValue(g,p,c)>4).sort((a,b)=>botValue(g,p,b)-botValue(g,p,a))[0];
  let c=best();if(!c&&q.mode==='yellow'&&!q.retried&&p.money>=4){retryOpportunity(g,p.id);c=best();}
  chooseOpportunity(g,p.id,c?.uid??null);
 }
 if(g.opportunity?.stage==='order')finishOpportunityOrder(g,p.id);
}
function endResources(g,p){
 if(p.settlement?.week===g.week)return;
 const activityMoney=p.weeklyEarnings.reduce((sum,x)=>sum+x.money,0),salary=p.escaped?0:g.config.salary,eventGain=!g.inspection.employeesOnly||!p.escaped?g.inspection.gain||{}:{};
 p.income=p.weeklyEarnings.reduce((sum,x)=>sum+x.profit,0);
 const other=activityMoney-p.income,eventMoney=eventGain.money||0,total=activityMoney+salary+eventMoney;
 gain(p,{...eventGain,money:total});
 p.settlement={week:g.week,sideIncome:p.income,otherIncome:other,salary,eventMoney,total};
 log(g,p,`周结总账：副业 ${p.income} + 工资 ${salary} + 其他活动收入 ${other} + 事件 ${eventMoney} = 领取 ${total} 资金。`,'income');
}
function finishWeek(g){for(const p of g.players)endResources(g,p);g.history.push({week:g.week,actions:g.actionCount,steps:g.timeline.length,event:g.inspection.name,inspectionRolls:[...g.inspection.rolls||[]],players:g.players.map(p=>({id:p.id,income:p.income,money:p.money,sanity:p.sanity,skills:skillCounts(p),caught:p.caught}))});g.phase='escape';g.escapeDecisions={};for(let i=0;i<g.players.length;i++){const p=g.players[(g.first+i)%g.players.length];if(!eligible(g,p))g.escapeDecisions[p.id]=false;for(const draft of [...p.drafts])openDraft(g,p.id,draft.id);}}
export function openDraft(g,id,draftId){if(g.phase!=='escape')throw Error('周末才能抽选。');const p=g.players[id],draft=p.drafts.find(d=>d.id===draftId);if(!draft||draft.options)throw Error('候选已经揭晓。');draft.options=[];const deck=g.decks[8],seen=new Set([...p.cards,...p.drafts.flatMap(d=>d.options||[])].map(c=>c.type));for(let i=deck.length-1;i>=0&&draft.options.length<2;i--){const c=deck[i],d=getCard(c);if(d.tier==='advanced'&&(draft.pool==='any'||d.route===draft.pool)&&!seen.has(c.type)){draft.options.push(...deck.splice(i,1));seen.add(c.type);}}if(!draft.options.length){p.drafts=p.drafts.filter(d=>d.id!==draftId);p.money+=1;log(g,p,'未亮出的牌中没有符合条件的高级牌，补偿 1 资金。');}}
export function chooseAdvanced(g,id,draftId,uid){if(g.phase!=='escape')throw Error('周末才能选牌。');const p=g.players[id],draft=p.drafts.find(d=>d.id===draftId),c=draft?.options?.find(x=>x.uid===uid);if(!c)throw Error('请选择候选牌。');p.cards.push(c);g.decks[8].unshift(...draft.options.filter(x=>x.uid!==uid));p.drafts=p.drafts.filter(d=>d.id!==draftId);log(g,p,`取得「${getCard(c).name}」。`,'unlock');}
export const eligible=(g,p)=>g.phase==='escape'&&!p.escaped&&p.income>=g.config.escapeIncome&&sanityState(g,p).value>=g.config.escapeSanity;
export const won=(_g,p)=>p.escaped;
export function chooseEscape(g,id,choice=true){if(g.phase!=='escape'||!eligible(g,g.players[id])||Object.hasOwn(g.escapeDecisions,id))throw Error('当前不能决定逃离。');g.escapeDecisions[id]=!!choice;}
export function closeWeek(g){if(g.phase!=='escape')throw Error('尚未完成周结。');if(g.players.some(p=>p.drafts.length||!Object.hasOwn(g.escapeDecisions,p.id)))throw Error('请先完成抽选与逃离决定。');for(const p of g.players)if(g.escapeDecisions[p.id]){p.escaped=true;p.escapedWeek=g.week;for(const c of p.cards)if(getCard(c).professional){releaseCapital(p,c);p.schedule=without(p.schedule,c.uid);}syncSanity(g,p);log(g,p,'逃离工位，获得胜利。','unlock');}if(g.players.filter(p=>p.escaped).length>=g.players.length-1){g.phase='ended';return;}g.week++;g.first=(g.first+1)%g.players.length;startWeek(g);}
// Public preview never reads the random stream or predicts hidden inspection dates.
export function preview(g,id){const run=mode=>{const clone=structuredClone(g),p=clone.players[id];clone.logs=[];clone.previewMode=mode;clone.inspection.times=[];clone.phase='resolving';delete p.supportWeek;resetExecution(p);settleSupport(clone,p);p.emptyNights=7-Object.keys(p.schedule).filter(k=>k.endsWith('-2')).length;for(const s of slots())resolveSlot(clone,p,s);endResources(clone,p);return {income:p.income,money:p.money,sanity:p.sanity,inspiration:p.inspiration,warnings:clone.logs.filter(l=>l.tone==='warning')};};const low=run('low'),high=run('high');return {...high,incomeLow:low.income,incomeHigh:high.income,uncertain:!!g.inspection.inspectionCount||g.players[id].cards.some(c=>findPlacement(g.players[id],c.uid)&&(getCard(c).dice||getCard(c).opportunity))};}

function expectedIncome(d){return d.fixedProfit+(d.dice?.resource==='profit'?d.dice.faces.reduce((a,b)=>a+b,0)/6:0)+(d.conditionalBonus||0)*.5;}
function botValue(g,p,c){const d=getCard(c),counts=skillCounts(p),missing=skillMissing(p,d).length,owned=p.cards.some(x=>x.type===c.type);
 // Repeated search activities still have utility even after their skill is archived.
 if(d.opportunity){if(owned||d.professional&&p.sanity>d.maxSanity)return -10;return p.money>=d.price.money+3?24:8;}
 if(d.draft){if(owned)return -10;return p.cards.filter(x=>getCard(x).tier==='advanced'&&(d.draft==='any'||getCard(x).route===d.draft)).length<4?24:1;}
 if(d.support)return p.sanity>=g.config.escapeSanity||owned? -5 : p.money>=d.price.money+d.upkeep?32:2;
 if(d.project)return qualified(p,d)&&!p.weekend?15:-10;
 if(d.skill){if(p.skills.some(x=>x.type===c.type)||owned)return -10;const needed=p.cards.some(x=>skillMissing(p,getCard(x)).includes(d.skill));return (needed?38:counts[d.skill]<3?21:counts[d.skill]<4?13:1)+(d.draft?2:0);}
 if(owned)return -5;if(d.tier==='advanced')return missing>1?-1:(d.income?35:d.boost?12:4)-missing*8;
 if(d.emptyNightInspirationCap)return 30;
 if(d.gain.inspiration&&!d.once){const supply=p.cards.reduce((n,x)=>n+(getCard(x).gain.inspiration||0)+(getCard(x).emptyNightInspirationCap||0),0),demand=p.cards.reduce((n,x)=>n+(getCard(x).cost.inspiration||0),0);return supply<demand+1?30:1;}
 if(d.income)return p.cards.filter(x=>getCard(x).income).length<3?18+expectedIncome(d):2;
 return d.professional&&!d.skill&&p.money<8?7:1;
}
function bestSlot(g,p,c){const d=getCard(c);return slots().filter(s=>{if(canPlace(g,p,c.uid,s)||activityDanger(g,p,c,s))return false;const schedule=without(p.schedule,c.uid),key=slotKey(anchor(d,s));(schedule[key]||=[]).push(c.uid);const state=sanityState(g,p,schedule).value;return Object.values(schedule).flat().every(uid=>{const def=getCard(cardAt(p,uid));return state>=def.minSanity&&state<=def.maxSanity;});}).sort((a,b)=>{const value=s=>s.day*3+s.period+(s.period===2?d.hours>2?100:-3:0)+(g.inspection.inspectionCount&&workType(p,s)&&!d.professional?8:0);return value(a)-value(b);})[0];}
export function botAct(g){const p=g.players[activeBuyer(g)];if(g.phase!=='planning'||!p.bot)return;if(p.escaped){pass(g,p.id);return;}
 if(p.protectionFrom<=g.week&&!p.actedThisWeek&&!p.protectionChosen){const s=slots().find(s=>workType(p,s)&&cardsInSlot(p,s).some(c=>getCard(c).hours===2&&!getCard(c).professional))||slots().find(s=>workType(p,s));if(s)setProtection(g,p.id,s);}
 for(const c of p.cards){const old=findPlacement(p,c.uid);if(old&&old.day>=g.day&&(activityDanger(g,p,c,old)||old.period===2&&slotHours(p,old)>2)){const target=bestSlot(g,p,c);if(target)place(g,p.id,c.uid,target);else unplace(g,p.id,c.uid);return;}}
 const blocked=unplacedCards(p).find(c=>{const d=getCard(c);return qualified(p,d)&&d.income&&d.tier==='advanced'&&!bestSlot(g,p,c);});
 if(blocked){const d=getCard(blocked),weak=p.cards.filter(c=>{const old=findPlacement(p,c.uid),def=getCard(c);return old&&old.day>=g.day&&def.stress&&(expectedIncome(def)<expectedIncome(d)||def.professional);}).sort((a,b)=>expectedIncome(getCard(a))-expectedIncome(getCard(b)))[0];if(weak){unplace(g,p.id,weak.uid);return;}}
 const scheduled=p.cards.filter(c=>findPlacement(p,c.uid)).map(getCard),supply=scheduled.reduce((n,d)=>n+(d.gain.inspiration||0)+(d.emptyNightInspirationCap||0),0),demand=scheduled.reduce((n,d)=>n+(d.cost.inspiration||0),0);
 const hand=unplacedCards(p).filter(c=>{const d=getCard(c);if(!qualified(p,d)||d.skill&&!d.opportunity&&!d.draft&&p.skills.some(x=>x.type===c.type))return false;if(d.support)return p.sanity<g.config.escapeSanity&&p.money>=d.upkeep;if(!d.once&&!d.income&&!d.boost){if(d.gain.inspiration||d.emptyNightInspirationCap)return p.inspiration<4||supply<demand;if(d.professional)return p.money<8;}return true;}).sort((a,b)=>{const value=c=>{const d=getCard(c);return d.support?44:d.tier==='advanced'?45:(d.gain.inspiration||d.emptyNightInspirationCap)&&!d.once?40:d.skill?35:d.income?25:5;};return value(b)-value(a);});for(const c of hand){const target=bestSlot(g,p,c);if(target){place(g,p.id,c.uid,target);return;}}
 if(g.day<6){const offers=Object.values(g.market).flat().filter(c=>canPay(p,getCard(c).price)&&botValue(g,p,c)>4&&(unplacedCards(p).length<4||getCard(c).skill)).sort((a,b)=>botValue(g,p,b)-botValue(g,p,a));if(offers.length){buy(g,p.id,offers[0].uid);return;}const project=p.projects.find(c=>qualified(p,getCard(c))&&canPay(p,getCard(c).price)&&getCard(c).unlockWeekend&&!p.weekend);if(project){buyProject(g,p.id,project.uid);return;}}
 pass(g,p.id);
}
export function botDraft(g,id){const p=g.players[id];for(const draft of [...p.drafts]){const options=[...draft.options].sort((a,b)=>botValue(g,p,b)-botValue(g,p,a));chooseAdvanced(g,id,draft.id,options[0].uid);}}
