// Shared by the browser editor and the local write API. No game state is edited here.
export const clone = value => JSON.parse(JSON.stringify(value));
export const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
export function newCard(cards, route='A') {
 let n=1; while(cards.some(c=>c.id===`${route}-NEW${n}`))n++;
 return {id:`${route}-NEW${n}`,name:'未命名活动',route,hours:4,price:3,requires:'',kind:'repeat',copies:4,stress:0,support:0,upkeep:0,capital:0,minSanity:0,maxSanity:10,professional:false,parallel:false,advanced:false,cost:{},gain:{profit:1}};
}
export function changedEntries(base,pool) {
 return ['cards','events'].flatMap(group=>{
  const before=new Map(base[group].map(c=>[c.id,c])),after=new Map(pool[group].map(c=>[c.id,c]));
  return [...new Set([...before.keys(),...after.keys()])].filter(id=>!same(before.get(id),after.get(id))).map(id=>({group,id,before:before.get(id),after:after.get(id)}));
 });
}
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export function validatePool(pool) {
 const errors=[];
 const fail=(name,message)=>errors.push(`${name}：${message}`);
 if(!object(pool)||!Array.isArray(pool.cards)||!Array.isArray(pool.events))return ['文件必须是包含 cards 和 events 的完整卡池。'];
 if(![31,32].includes(pool.rulesVersion)||pool.rules?.version!==pool.rulesVersion||!object(pool.defaults)||!object(pool.market)||pool.copiesPerCard!==4)return ['只支持 v0.31/v0.32 完整卡池格式。'];
 if(!pool.cards.length||pool.cards.length>300||!pool.events.length||pool.events.length>100)return ['活动牌须为 1–300 种，事件牌须为 1–100 种。'];
 function integer(v,name,key,min=0,max=99){if(!Number.isSafeInteger(v)||v<min||v>max)fail(name,`${key}须为 ${min}–${max} 的整数`);}
 const ids=new Set();
 function common(c){
  if(!object(c)){fail('卡牌','格式错误');return false;}
  if(typeof c.id!=='string'||!/^[A-Za-z0-9_-]{1,40}$/.test(c.id))fail('ID','仅限 1–40 位字母、数字、横线');
  if(ids.has(c.id))fail(c.id,'ID 重复');ids.add(c.id);
  if(typeof c.name!=='string'||!c.name.trim()||c.name.length>40)fail(c.id,'名称须为 1–40 字');
  return true;
 }
 const numbers=['price','stress','support','upkeep','capital','minSanity','maxSanity','progress','inspirationRequired','inspirationGenerate','inspirationSpend','handDiscardBonus','hireFee','hireDrawCount','capitalRatio','lowSanityAt','conditionalBonus','inspirationBonusAt','sundayRelief'];
 const booleans=['professional','offHours','parallel','advanced','permanent'];
 const fields=new Set(['id','name','route','hours','requires','kind','copies','cost','gain','permission','condition','opportunity','dice','maturation','effect','boost','mechanic',...numbers,...booleans]);
 for(const c of pool.cards){
  if(!common(c))continue; const name=c.name||c.id;
  for(const key of Object.keys(c))if(!fields.has(key))fail(name,`当前引擎不支持字段 ${key}`);
  if(!['W','A','B','C'].includes(c.route))fail(name,'流派须为 W / A / B / C');
  if(![4,8].includes(c.hours))fail(name,'时长仅支持 4h / 8h');
  if(c.copies!==4)fail(name,'活动牌固定每种 4 张');
  if(!['repeat','growth','once'].includes(c.kind))fail(name,'持久度无效');
  for(const key of numbers)if(c[key]!==undefined)integer(c[key],name,key,0,['minSanity','maxSanity','stress','support','lowSanityAt'].includes(key)?10:99);
  integer(c.price,name,'价格');
  for(const key of booleans)if(c[key]!==undefined&&typeof c[key]!=='boolean')fail(name,`${key}须为布尔值`);
  if(typeof c.requires!=='string'||!/^[WABC]{0,12}$/.test(c.requires))fail(name,'技能只接受 W / A / B / C');
  else for(const r of 'WABC')if([...c.requires].filter(x=>x===r).length>pool.cards.filter(x=>x?.route===r&&x.kind==='growth').length)fail(name,`${r} 技能门槛超过该流派成长牌种数`);
  if((c.minSanity||0)>(c.maxSanity??10))fail(name,'理智下限不能高于上限');
  if(c.stress&&c.support)fail(name,'理智影响用正负单一数值，不同时填写压力和支持');
  for(const [key,allowed] of [['cost',['money']],['gain',['profit','cash','salary']]]){
   if(!object(c[key])){fail(name,`${key}须为对象`);continue;}
   for(const [k,v] of Object.entries(c[key])){if(!allowed.includes(k))fail(name,`不支持 ${key}.${k}`);integer(v,name,`${key}.${k}`);}
  }
  if(pool.rulesVersion===31&&c.kind==='growth'&&(![2,3].includes(c.progress)||!(c.cost?.money>0)||!(c.minSanity>0)))fail(name,'成长牌需要 2/3 次进度、执行费和正理智门槛');
  if(c.kind==='growth'&&(!Number.isInteger(c.progress)||c.progress<1||c.progress>12))fail(name,'归档需要1–12次进度');
  if(c.mechanic!==undefined){
   const m=c.mechanic;
   if(!object(m))fail(name,'mechanic须为对象');
   else{
    const numeric=['encore','fullSale','automatedLook','playFee','generate','wholeNight','convert','artist','belowBonus','agent','sellCourse','capital','duty','salaryTransfer','autoProfit','focusDraw','optionalInspirationProfit','optionalInspirationCash'];
    const flags=['autoRestock','relayBelow','rightAuto','replay','leftAuto','hire','advanceCash','projectDuty','salaryDice','eventSplit','autoRequiresFull'];
    const tokens=['spend','playSpend','finalSpend'];
    for(const k of Object.keys(m))if(![...numeric,...flags,...tokens,'completion','trade','focus'].includes(k))fail(name,'未知规则 '+k);
    if(m.focus!==undefined){
     const f=m.focus;
     if(!object(f))fail(name,'高理智奖励须为对象');
     else{
      integer(f.min,name,'高理智门槛',1,10);
      for(const k of Object.keys(f))if(!['min','profit','cash','look','belowBonus','reroll'].includes(k))fail(name,'未知高理智奖励 '+k);
      for(const k of ['profit','cash','look','belowBonus'])if(f[k]!==undefined)integer(f[k],name,'focus.'+k,1,k==='look'?12:10);
      if(f.reroll!==undefined&&typeof f.reroll!=='boolean')fail(name,'重掷须为布尔值');
      if(f.reroll&&!c.dice)fail(name,'重掷需要收益骰');
      if(f.look&&!c.opportunity)fail(name,'看牌奖励需要过牌效果');
      if(f.belowBonus&&!m.belowBonus)fail(name,'下邻奖励需要基础下邻效果');
      if(f.profit&&!(c.gain?.profit||c.dice?.resource==='profit'||m.agent||m.artist||m.capital||c.maturation))fail(name,'副业奖励需要基础副业效果');
      if(c.kind!=='repeat')fail(name,'高理智奖励当前仅用于多次活动');
     }
    }
    for(const k of numeric)if(m[k]!==undefined&&!(k==='artist'&&['onePerNight','all'].includes(m[k])))integer(m[k],name,'mechanic.'+k,1,k==='generate'?7:20);
    for(const k of flags)if(m[k]!==undefined&&typeof m[k]!=='boolean')fail(name,k+'须为布尔值');
    if((m.fullSale||m.autoRestock)&&!m.capital)fail(name,'满架出货或自动补货需要货架');
    if(m.automatedLook&&(!m.focusDraw||c.opportunity))fail(name,'自动选牌需要高理智抽牌，不能叠加其他找牌');
    for(const k of tokens)if(m[k]!==undefined&&!['inspiration','principal','duty','auto'].includes(m[k]))fail(name,k+'指示物无效');
    if(m.completion!==undefined){
     if(!object(m.completion))fail(name,'完成奖励须为对象');
     else for(const [k,v]of Object.entries(m.completion)){
      if(k==='weekend'){if(typeof v!=='boolean')fail(name,'双休须为布尔值');}
      else if(['cash','duty'].includes(k))integer(v,name,'completion.'+k);
      else fail(name,'未知完成奖励 '+k);
     }
    }
    if((m.replay||m.completion||m.finalSpend)&&c.kind!=='growth')fail(name,'重打、完成奖励、末次费用须有归档进度');
    if(m.trade!==undefined){
     if(!object(m.trade))fail(name,'交易须为对象');
     else{
      integer(m.trade.limit,name,'交易数量',1,10);integer(m.trade.price,name,'货品单价',1,99);
      if(!['buy','sell','either'].includes(m.trade.mode))fail(name,'交易方向无效');
      if(Object.keys(m.trade).some(k=>!['limit','price','mode'].includes(k)))fail(name,'未知交易字段');
     }
    }
    if(m.hire&&(!(c.hireFee>0)||c.kind!=='growth'||c.opportunity||m.spend||m.trade||m.completion))fail(name,'招募需要归档进度及招聘费，不能叠加其他选择或完成奖励');
    if(m.advanceCash&&(!m.trade||m.trade.mode!=='buy'||!(c.gain?.cash>0)))fail(name,'预付收益只支持本次现金进货');
    if([m.artist,m.agent,m.capital,c.maturation].filter(Boolean).length>1)fail(name,'只能选一种动态收入机制');
    if(m.rightAuto&&m.belowBonus)fail(name,'每次只支持一种相邻目标');
    if(m.spend&&m.finalSpend)fail(name,'不能同时设置每次与末次消耗');
    if(c.inspirationGenerate||c.inspirationSpend||c.hireDrawCount||c.handDiscardBonus||c.boost||c.condition||c.parallel||c.capitalRatio||c.capital||c.permission)fail(name,'指示物规则不能混用旧版特殊效果字段');
   }
  }
  if(c.kind==='repeat'&&c.progress)fail(name,'重复牌不能同时设置完成离场进度，请使用成熟机制');
  if(c.progress>12)fail(name,'完成进度最多 12');
  if(c.parallel&&c.hours!==4)fail(name,'当前并行仅支持 4h');
  if(c.professional&&c.offHours)fail(name,'仅工作白天与仅非上班时间不能并存');
  if(c.capitalRatio&&c.capital)fail(name,'固定占款和浮动占款只能选一种');
  if(c.permission&&!['weekend','protection'].includes(c.permission))fail(name,'权限类型无效');
  if(c.permission&&(c.kind!=='once'||!c.permanent))fail(name,'权限牌须为一次性并启用永久效果');
  if(c.effect!==undefined&&(typeof c.effect!=='string'||c.effect.length>500))fail(name,'补充说明最多 500 字');
  if(c.dice){
   if(!object(c.dice)||!['profit','salary'].includes(c.dice.resource)||!Array.isArray(c.dice.faces)||c.dice.faces.length!==6)fail(name,'骰子需选择收益类型并填写六个骰面');
   else c.dice.faces.forEach(v=>integer(v,name,'骰面'));
  }
  if(c.opportunity){
   if(!object(c.opportunity))fail(name,'过牌格式错误');
   else{integer(c.opportunity.count,name,'看牌数',1,12);if(c.opportunity.free!==undefined&&typeof c.opportunity.free!=='boolean')fail(name,'免费拿牌须为布尔值');}
  }
  if(c.inspirationSpend&&(!c.opportunity||c.inspirationSpend!==1))fail(name,'当前灵感过牌支持消耗 1 灵感，需启用过牌');
  if(c.boost){
   if(!object(c.boost))fail(name,'下一张联动须为包含 amount 的对象');
   else {integer(c.boost.amount,name,'下一张额外收入',1,99);if(c.boost.capitalOnly!==undefined&&typeof c.boost.capitalOnly!=='boolean')fail(name,'占款联动须为布尔值');}
  }
  if([!!c.hireFee,!!c.handDiscardBonus,!!c.opportunity].filter(Boolean).length>1)fail(name,'招聘、弃牌变现、过牌一次只能启用一种');
  if(c.inspirationGenerate||c.inspirationSpend){
   if(c.kind!=='repeat'||c.progress||c.permission||c.maturation||c.dice||c.boost||c.condition||c.hireFee||c.handDiscardBonus||Object.values(c.gain||{}).some(Boolean))fail(name,'放置灵感与灵感过牌须为独立重复效果，不能叠加收入、归档或其他结算效果');
   if(c.inspirationGenerate&&(c.inspirationSpend||c.opportunity))fail(name,'生成灵感不能同时启用过牌');
   if(c.inspirationSpend&&(c.cost?.money||c.upkeep))fail(name,'当前灵感过牌仅支持消耗灵感，不能附加执行费');
  }
  if(c.inspirationGenerate>7||c.inspirationRequired>7)fail(name,'版图最多 7 枚灵感');
  if(c.hireDrawCount&&!c.hireFee)fail(name,'猎头找牌需启用招聘费用');
  if(c.maturation){
   if(!object(c.maturation)||c.kind!=='repeat'||c.progress)fail(name,'成熟机制只用于无完成进度的重复牌');
   else{integer(c.maturation.steps,name,'成熟进度',1,12);integer(c.maturation.initial,name,'成熟前收入');integer(c.maturation.mature,name,'成熟后收入');}
  }
  if(c.condition){
   if(!['lowSanity','inspiration','professional','capitalJob'].includes(c.condition))fail(name,'条件收益类型无效');
   integer(c.conditionalBonus,name,'条件奖励');
   if(c.condition==='lowSanity')integer(c.lowSanityAt,name,'低理智门槛',0,10);
   if(c.condition==='inspiration')integer(c.inspirationBonusAt,name,'灵感门槛',1,7);
  }
 }
 for(const c of pool.events){
  if(!common(c))continue;const name=c.name||c.id;
  for(const k of Object.keys(c))if(!['id','name','copies','inspectionCount','blocked','cash','temporaryWeekend','wellbeing'].includes(k))fail(name,`未知事件字段 ${k}`);
  if(c.wellbeing!==undefined){
   const r=c.wellbeing;
   if(!object(r))fail(name,'理智事件须为对象');
   else{
    integer(r.max,name,'事件理智上限',0,3);
    if(!['hospital','hand','withdraw','discard'].includes(r.effect))fail(name,'未知理智惩罚');
    if(r.effect==='discard'&&r.max!==0)fail(name,'永久弃置日程仅限理智0');
    if(Object.keys(r).some(k=>!['max','effect'].includes(k)))fail(name,'未知理智事件字段');
   }
  }
  integer(c.copies,name,'张数',1,20);integer(c.inspectionCount??0,name,'查岗轮数',0,6);
  if(c.cash!==undefined)integer(c.cash,name,'奖金');
  if(c.temporaryWeekend!==undefined&&typeof c.temporaryWeekend!=='boolean')fail(name,'双休须为布尔值');
  if(c.blocked&&(!object(c.blocked)||c.blocked.day!==7||!['am','pm'].includes(c.blocked.slot)))fail(name,'当前团建支持周日上午/下午');
  if([!!c.inspectionCount,!!c.blocked,!!c.cash,!!c.temporaryWeekend].filter(Boolean).length!==1)fail(name,'每张事件须选择一个效果');
 }
 return errors;
}
export function migrateGoods(pool){
 if(pool?.rulesVersion!==32)return pool;
 for(const event of Array.isArray(pool.events)?pool.events:[])if(object(event))delete event.exchangeDelta;
 for(const card of Array.isArray(pool.cards)?pool.cards:[]){
  const trade=card?.mechanic?.trade;
  if(object(trade)&&Number.isInteger(trade.delta)){
   trade.price??=3+trade.delta;
   delete trade.delta;
  }
 }
 return pool;
}
export function parsePool(text){const pool=migrateGoods(JSON.parse(text));const errors=validatePool(pool);if(errors.length)throw Error(errors.join('\n'));return pool;}
