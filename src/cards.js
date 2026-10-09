import design from './cardpool-data.js';

export const DAYS=['周一','周二','周三','周四','周五','周六','周日'];
export const SIZE={1:'小',2:'中',3:'大'};
export const ROUTES={
 W:{name:'职场',pool:'职场与信用',icon:'bag',family:'career'},
 A:{name:'创作',pool:'写作与创作',icon:'pen',family:'creative'},
 B:{name:'开发',pool:'开发与制作',icon:'layers',family:'technical'},
 C:{name:'商业',pool:'商业与经营',icon:'shop',family:'business'},
};
export const DEFAULTS={playerCount:3,mode:'bots',startMoney:8,startSanity:3,startInspiration:4,maxSanity:10,salary:2,restMoney:1,nightStress3:2,nightStress4:4,escapeIncome:10,inspectionFine:1,seed:20261009,starterActivity:'A02'};
export const STARTERS=['W01','A02','B02','C01'];
function adapt(d){
 const route=ROUTES[d.route||'W'];
 return {...d,kind:'activity',size:{2:1,4:2,8:3}[d.hours],category:route.name,icon:route.icon,
  price:{money:d.price},cost:{...d.cost},gain:{...(d.gain.inspiration?{inspiration:d.gain.inspiration}:{}),...((d.gain.profit||d.gain.cash||d.gain.salary)?{money:(d.gain.profit||0)+(d.gain.cash||0)+(d.gain.salary||0)}:{})},
  fixedProfit:d.gain.profit||0,salaryGain:d.gain.salary||0,income:!!d.gain.profit||d.dice?.resource==='profit',
  once:d.kind==='growth'||d.kind==='project',skill:d.kind==='growth'?d.route:null,
  tier:d.advanced?'advanced':'basic',draft:d.search||null,rule:d.dice?'':d.effect,
  progressTarget:d.progress,unlockWeekend:d.id==='P01',unlockProtection:d.id==='P02',project:d.kind==='project',route:d.route||'W',
 };
}
export const CARDS=design.cards.filter(d=>!d.advanced).map(adapt);
export const ADVANCED=design.cards.filter(d=>d.advanced).map(adapt);
export const PROJECTS=design.projects.map(adapt);
export const CARD_MAP=Object.fromEntries([...CARDS,...ADVANCED,...PROJECTS].map(d=>[d.id,d]));
export const getCard=value=>CARD_MAP[typeof value==='string'?value:value?.type];
export const MARKET_LIMITS={2:5,4:4,8:3};
export const marketLane=d=>d.hours;
export const slotKey=s=>`${s.day}-${s.period}`;
export const slotLabel=s=>`${DAYS[s.day]}${['上午','下午','夜晚'][s.period]}`;
export const EVENTS=design.events.flatMap(e=>Array.from({length:e.copies},()=>({
 name:e.name,kind:e.inspectionCount?'inspection':e.blocked?'team':e.temporaryWeekend?'weekend':'bonus',
 inspectionCount:e.inspectionCount,blockedTimes:e.blocked?[[e.blocked.day-1,e.blocked.slot==='am'?0:1]]:[],
 gain:e.cash?{money:e.cash}:{},employeesOnly:true,
 text:e.inspectionCount?`预告查岗 ${e.inspectionCount} 次；日程锁定后掷骰决定日期，查当天上午与下午。重复不重掷。`:e.blocked?`本周${e.blocked.slot==='am'?'周日上午':'周日下午'}团建，在职玩家该时段无法活动。`:e.temporaryWeekend?'本周周六临时自由；不改变长期理智，不推进双休项目。':`周末发放奖金 ${e.cash}，不计副业收入。`,
})));
export const INSPECTIONS=EVENTS;
