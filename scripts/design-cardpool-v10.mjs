// Design data only. This does not replace the playable v0.9 engine or card pool.
import { writeFileSync } from 'node:fs';

const cards=[];
function add(id,name,hours,price,stress,gate,requires,kind,cost,gain,effect='',extra={}) {
  cards.push({id,name,route:id[0],hours,price,stress,minSanity:gate[0],maxSanity:gate[1],requires,kind,cost,gain,effect,...extra});
}
const any=[0,10], normal=[1,10], low=[0,2], exhausted=[0,1];
// Gain fields: profit counts toward escape; cash and salary do not.
add('W01','补齐项目文档',2,2,1,low,'','growth',{}, {salary:1},'',{professional:true});
add('W02','承担工作交接',2,2,1,low,'','growth',{}, {inspiration:1},'',{professional:true});
add('W03','完成关键交付',4,3,2,exhausted,'','growth',{}, {salary:2},'',{professional:true});
add('W04','跨组复盘会',4,5,1,low,'','growth',{money:1}, {},'归档 W；从未亮出的 8h 高级牌中找两张主色为 W 的牌，留一张。',{professional:true,search:'W'});
add('W05','主动补位',2,2,1,low,'','repeat',{}, {salary:1},'',{professional:true});
add('W06','向上管理',4,4,1,low,'','repeat',{}, {},'掷骰：1–3 老板画饼，奖金 0；4–5 兑现部分，奖金 2；6 获得认可，奖金 4。',{professional:true,dice:{resource:'salary',faces:[0,0,0,2,2,4]}});
add('W07','整理业务知识库',4,4,1,low,'','repeat',{money:1}, {inspiration:3},'',{professional:true});
add('W08','季度攻坚',8,5,2,exhausted,'','repeat',{}, {salary:3},'',{professional:true});
add('W09','关键岗位津贴',8,8,1,low,'WWW','repeat',{}, {salary:3},'',{professional:true,advanced:true});
add('W10','交付负责人',8,10,2,exhausted,'WWWW','repeat',{}, {salary:4},'',{professional:true,advanced:true});
add('W11','企业外训讲师',8,9,0,low,'WWA','repeat',{inspiration:2}, {profit:3},'',{advanced:true});
add('W12','流程咨询',8,9,1,low,'WWB','repeat',{inspiration:1}, {profit:2},'本周此前成功执行过履职活动：副业收入额外 +1。',{advanced:true,conditionalBonus:1,condition:'professional'});

add('A01','速写练习',2,2,0,normal,'','growth',{inspiration:1}, {inspiration:2});
add('A02','写作练笔',2,2,0,normal,'','growth',{}, {inspiration:1});
add('A03','作品复盘',4,3,0,normal,'','growth',{inspiration:1}, {inspiration:3});
add('A04','创作研讨会',4,5,0,normal,'','growth',{money:1}, {},'归档 A；从未亮出的 8h 高级牌中找两张主色为 A 的牌，留一张。',{search:'A'});
add('A05','听完整张专辑',2,2,0,any,'','repeat',{}, {inspiration:1});
add('A06','留白手帐',4,4,0,normal,'','repeat',{}, {},'按本周留白夜晚数获得灵感，最多 4。',{emptyNightInspirationCap:4});
add('A07','征稿投稿',4,4,1,normal,'','repeat',{inspiration:1}, {},'掷骰：1–2 未入选，收入 0；3–4 入选，收入 2；5–6 获奖，收入 4。',{dice:{resource:'profit',faces:[0,0,2,2,4,4]}});
add('A08','长篇委托',8,5,1,normal,'','repeat',{inspiration:2}, {profit:3});
add('A09','专栏连载',8,8,0,normal,'AAA','repeat',{inspiration:2}, {profit:2},'本周至少 3 个留白夜晚：副业收入额外 +1。',{advanced:true,conditionalBonus:1,condition:'emptyNights',bonusEmptyNights:3});
add('A10','独立出版',8,10,1,normal,'AAAA','repeat',{inspiration:2}, {profit:3},'本周至少 5 个留白夜晚：副业收入额外 +1。',{advanced:true,conditionalBonus:1,condition:'emptyNights',bonusEmptyNights:5});
add('A11','互动叙事',8,9,0,normal,'ABB','repeat',{inspiration:2}, {profit:2},'本周此前成功执行过主色 B 的活动：本次少支付 1 灵感。',{advanced:true,discountAfter:'B'});
add('A12','商业写作',8,9,1,normal,'ACC','repeat',{inspiration:3}, {profit:3},'本周此前成功执行过有周转本金的副业：本次副业收入额外 +1。',{advanced:true,conditionalBonus:1,condition:'capitalJob'});

add('B01','脚本练习',2,2,0,normal,'','growth',{inspiration:1}, {cash:1});
add('B02','修复小故障',2,2,0,normal,'','growth',{}, {inspiration:1});
add('B03','开发原型',4,3,0,normal,'','growth',{inspiration:1}, {cash:2});
add('B04','开发者交流',4,5,0,normal,'','growth',{money:1}, {},'归档 B；从未亮出的 8h 高级牌中找两张主色为 B 的牌，留一张。',{search:'B'});
add('B05','信息整理',2,2,0,any,'','repeat',{money:1}, {inspiration:2});
add('B06','零散开发',4,4,1,normal,'','repeat',{inspiration:1}, {profit:2});
add('B07','快捷脚本',4,4,0,normal,'','repeat',{}, {},'下一张活动若为副业收入牌，额外收入 +1；否则失效。',{boost:{type:'flat',amount:1}});
add('B08','数据清洗',8,5,1,normal,'','repeat',{inspiration:2}, {profit:3});
add('B09','自动化工具',8,8,0,normal,'BBB','repeat',{inspiration:1}, {},'下一张活动若为副业收入牌，印刷基础收入翻倍；该牌含所有加成最多收入 4。',{advanced:true,boost:{type:'double',amount:2}});
add('B10','独立软件服务',8,10,0,normal,'BBBB','repeat',{inspiration:1}, {profit:3},'',{advanced:true});
add('B11','数字素材工厂',8,9,0,normal,'AAB','repeat',{inspiration:1}, {profit:2},'本周至少 3 个留白夜晚：额外获得 1 灵感。',{advanced:true,emptyNightThreshold:3,emptyNightInspiration:1});
add('B12','电商自动化',8,8,0,normal,'BCC','repeat',{}, {},'下一张活动若为有本金的副业收入牌，印刷基础收入翻倍；该牌含所有加成最多收入 4。',{advanced:true,capital:3,boost:{type:'double',amount:2,capitalOnly:true}});

add('C01','二手试卖',2,2,0,normal,'','growth',{}, {cash:1});
add('C02','用户访谈',2,2,0,normal,'','growth',{money:1}, {inspiration:2});
add('C03','小规模试运营',4,3,0,normal,'','growth',{money:1}, {cash:2});
add('C04','商家沙龙',4,5,0,normal,'','growth',{money:1}, {},'归档 C；从未亮出的 8h 高级牌中找两张主色为 C 的牌，留一张。',{search:'C'});
add('C05','跑腿代办',2,2,1,normal,'','repeat',{inspiration:1}, {profit:1});
add('C06','快闪代购',4,4,1,normal,'','repeat',{}, {profit:1},'掷骰：1–2 额外收入 0；3–4 额外收入 1；5–6 额外收入 2。本金继续锁定。',{capital:3,dice:{resource:'profit',faces:[0,0,1,1,2,2]}});
add('C07','市场调研',4,4,0,any,'','repeat',{money:1}, {inspiration:3});
add('C08','周末摊位',8,5,1,normal,'','repeat',{}, {profit:3},'',{capital:6});
add('C09','稳定供货',8,8,0,normal,'CCC','repeat',{}, {profit:3},'',{advanced:true,capital:8});
add('C10','自有品牌',8,10,1,normal,'CCCC','repeat',{}, {profit:4},'',{advanced:true,capital:10});
add('C11','创作者商店',8,9,0,normal,'AAC','repeat',{inspiration:1}, {profit:3},'',{advanced:true,capital:6});
add('C12','企业客户长约',8,9,1,any,'CCW','repeat',{}, {profit:3},'理智 ≤1 时，副业收入额外 +1。',{advanced:true,capital:6,conditionalBonus:1,condition:'lowSanity'});

const projects=[
 {id:'P01',name:'争取双休',hours:8,price:4,stress:0,minSanity:2,maxSanity:10,requires:'WW',kind:'project',cost:{money:1},gain:{},progress:3,professional:true,effect:'每次推进须本周此前成功执行过副业。完成后永久释放周六，工资不变，自主状态 +2（一次性身份变化，不是每周回血）。'},
 {id:'P02',name:'弹性工作授权',hours:4,price:4,stress:0,minSanity:0,maxSanity:10,requires:'WWW',kind:'project',cost:{money:2},gain:{},progress:1,professional:true,effect:'完成后的下一周起，每周周初标记一个工作时段：该时段的一张 2h 非履职活动免受查岗；查岗骰落定前必须选好，本周不可移动。不保护 4h/8h、团建或熬夜。'}
];
const events=[
 {id:'E01',name:'例行巡查',copies:4,inspectionCount:1},
 {id:'E02',name:'加强巡查',copies:3,inspectionCount:2},
 {id:'E03',name:'专项整顿',copies:1,inspectionCount:3},
 {id:'E04',name:'周日晨间团建',copies:1,inspectionCount:0,blocked:{day:7,slot:'am'}},
 {id:'E05',name:'周日午后团建',copies:1,inspectionCount:0,blocked:{day:7,slot:'pm'}},
 {id:'E06',name:'发放奖金',copies:1,inspectionCount:0,cash:2},
 {id:'E07',name:'本周双休',copies:1,inspectionCount:0,temporaryWeekend:true},
];
const design={status:'playable-prototype',version:'0.10.0',routes:{W:{name:'职场',color:'无色/灰',icon:'公文包'},A:{name:'创作',color:'红',icon:'笔尖'},B:{name:'开发',color:'绿',icon:'齿轮'},C:{name:'商业',color:'黄',icon:'店铺'}},baseline:{money:8,sanity:3,inspiration:4,salary:2,passMoney:1,escapeIncomeAtLeast:10,incomeTrackMax:10,perActivityIncomeMax:4,searchEmptyCompensation:1,night4hStress:4},market:{2:5,4:4,8:3},inspection:{dieSides:6,rollAfter:'schedule-locked',sharedByAllPlayers:true,periods:['am','pm'],rerollDuplicates:false,repeatPenalty:false,finePerActivity:1,pauseCaughtActivity:true,sanityPenalty:0},events,cards,projects};
writeFileSync('docs/cardpool-v0.10.json',JSON.stringify(design,null,2)+'\n');
const amount=v=>Object.entries(v).map(([key,n])=>`${{money:'钱',inspiration:'灵感',profit:'副业',salary:'工资附加',cash:'普通现金'}[key]} ${n}`).join('、')||'—';
const gate=d=>d.maxSanity<10?`≤${d.maxSanity}`:d.minSanity?`≥${d.minSanity}`:'不限';
let md='# 四流派卡池 v0.10 · 完整牌表\n\n已接入网页 v0.10，仍需真人对局检验平衡。字段、结算与数值检查见 [设计说明](cardpool-design-v0.10.md)。由 `node scripts/design-cardpool-v10.mjs` 生成。\n\n购买价支付一次；本金在安排时锁定，撤回时返还；执行消耗/收益每次成功执行发生。归档牌成功后离开日程并留下主色技能；无任何理智恢复收益。履职牌仅工作日白天工作槽可用，不算摸鱼。副业收益才计逃离，工资附加与普通现金不计。\n\n';
md+=`试玩基准：起始资金 ${design.baseline.money}；每周固定收入 ${design.baseline.salary}，没有生活费；整备拿 ${design.baseline.passMoney}。当周收入轨道 0–${design.baseline.incomeTrackMax}，达到 ${design.baseline.escapeIncomeAtLeast} 逃离；不跨周积累。每张副业含所有加成最多收入 ${design.baseline.perActivityIncomeMax}。\n\n周初事件只预告查岗次数；日程锁定后掷对应数量的 D6，1–6 对应周一至周六，全体共用结果、重复不重掷、同牌不重复受罚，查当天白天。被查活动本周暂停、每张罚 1 钱，不影响理智，不按时长加罚。活动骰逐张独立掷，牌面骰表为额外收益，和固定执行收益相加；绿色只翻倍固定收入，最终仍封顶 4。详见 [骰子规则与概率](dice-design-v0.10.md)。\n\n`;
for(const [route,info]of Object.entries(design.routes)){
 md+=`## ${info.color} · ${info.name}\n\n| 编号／名称 | h | 买价 | 本金 | 压力 | 理智 | 技能 | 类型 | 执行消耗 | 执行收益 | 特殊效果 |\n|---|---:|---:|---:|---:|---|---|---|---|---|---|\n`;
 for(const d of cards.filter(d=>d.route===route))md+=`| ${d.id} ${d.name} | ${d.hours} | ${d.price} | ${d.capital||'—'} | ${d.stress} | ${gate(d)} | ${d.requires||'—'} | ${d.kind==='growth'?'一次归档':'常驻'}${d.professional?'·履职':''} | ${amount(d.cost)} | ${amount(d.gain)} | ${d.effect||'—'} |\n`;
 md+='\n';
}
md+='## 玩家板固定项目（每人一套，不混入市场）\n\n| 名称 | h | 启动买价 | 压力 | 理智 | 信用 | 每次消耗 | 进度 | 效果 |\n|---|---:|---:|---:|---|---|---|---|---|\n';
for(const d of projects)md+=`| ${d.id} ${d.name} | ${d.hours} | ${d.price} | ${d.stress} | ${gate(d)} | ${d.requires} | ${amount(d.cost)} | ${d.progress} | ${d.effect} |\n`;
writeFileSync('docs/cards-v0.10.md',md);
console.log(`Designed ${cards.length} market card types and ${projects.length} personal projects.`);
