// Standalone design audit. Reads the shipped pool; never imports/writes demo code.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const live = JSON.parse(fs.readFileSync('data/cardpool-v31.json', 'utf8'));
const byId = Object.fromEntries(live.cards.map(c => [c.id, c]));
const cards = [];
function card(id, name, options) {
  const b = byId[id] || {};
  cards.push({id, name, route:id[0], grade:b.hours===8?'II':'I', price:b.price??5,
    req:b.requires||'', copies:4, sanity:0, income:0, cash:0, fee:0, steps:0,
    playCash:0, completionCash:0, play:'—', text:'', resources:'—', ...options});
}
card('A01','灵感管理',{text:'✦＋1',resources:'每次产✦1'});
card('A02','集中创作',{steps:3,fee:1,text:'💰−1；消耗一个夜晚全部✦，每枚💰＋2',cash:2,resources:'计算列按每次消耗✦1；可集中更多，按实际来源另算',changed:'执行费0→1，完成仍退3枚钱币；消除归档路径额外白送3现金'});
card('A03','冥思苦想',{sanity:-1,text:'✦＋2',resources:'每次产✦2'});
card('A04','阅读',{steps:3,fee:1,text:'💰−1；✦＋1',resources:'完成共产✦3'});
card('A05','日常写作',{cash:3,text:'弃手牌1张 → 💰＋3',resources:'每次手牌−1，不含待买/归档/日程牌'});
card('A06','专栏写作',{price:3,income:1,text:'副业1',changed:'统一零配置I级收入模板：购价3→副业1'});
card('A07','灵感搜寻',{steps:2,fee:1,text:'💰−1；看2张创作I级，买1',search:2,resources:'完成共搜索2次；购入费用另计',changed:'定向搜创作，提高找关键牌的真实命中率，不补现金'});
card('A08','专栏签约',{income:3,text:'副业3'});
card('A09','流窜艺人',{income:4,play:'从不同空夜各移1枚✦，最多2枚',text:'副业＝2＋本牌✦数',resources:'打出锁✦2；计算按满配；离场清除',changed:'新增两个灵感位，删除附赠理智1；保留基础副业2，避免两张过10及终端免费兼顾支持'});
card('A10','灵感采风',{text:'✦−1；看2免费取1。理智≥6改看3',search:2,free:true,resources:'每次✦−1；实际手牌产出与命中率另列'});
card('A11','画画',{price:9,sanity:1,income:1,cash:2,text:'副业1；可✦−1掷骰，4–6：💰＋4',resources:'现金列按每次消耗✦1、骰子均值2；不消耗则无现金奖励',changed:'购价5→9；基础收入价3＋理智1的三周预算6；骰子另付灵感，资源源牌与占时须同时计入'});
card('A12','城市出游',{sanity:4,fee:4,tag:'闲',text:'💰−4',changed:'加非上班标签；费用5→4，按两个I级支持的占位与费用核算'});
card('A13','带薪驻留',{price:8,sanity:1,income:2,text:'副业2',changed:'改为价8／副业2／理智1；相对价5副业3，牺牲1收入换理智，并支付3额外购价'});
card('A14','自费出版',{price:2,income:3,play:'消耗■1',text:'副业3',resources:'打出消耗■1；不含货品取得成本',changed:'购价4→2；直接买货部署合计5，与专栏签约对照'});
card('A15','作品发行',{cash:5,text:'⚙−1 → 💰＋5',resources:'每次⚙−1；必须反复配置，不是免费常驻5现金'});
card('B01','学习技术',{steps:3,fee:1,text:'💰−1'});
card('B02','买课',{steps:2,fee:1,text:'💰−1'});
card('B03','零散开发',{price:3,income:1,text:'副业1',changed:'统一零配置I级收入模板：购价3→副业1'});
card('B04','技术交流',{text:'看2张开发I级，买1。理智≥6改看4',search:2,resources:'搜索；买到的牌另付原价',changed:'改为定向开发牌堆，强化检索质量而非附赠现金'});
card('B05','自动管线',{req:'B',steps:1,fee:1,play:'可从归档区再次安排',text:'💰−1；右邻牌⚙＋1',resources:'每次产⚙1；再次配置需再次打出'});
card('B06','数据收集',{price:4,text:'下邻牌副业＋1；理智≥6改为＋2',resources:'加成1/2；必须本牌与下邻都成功，不计入自身基础副业',changed:'购价2→4；高理智常驻加成2计入预算，保持双牌成功条件'});
card('B07','日志分析',{steps:2,text:'左邻有⚙：看3买1',search:3,resources:'要求左邻保有⚙；不消耗；取得卡另付钱'});
card('B08','兴趣编程',{price:9,sanity:1,income:1,text:'副业1',changed:'购价3→9：基础收入牌3＋理智1的三周预算6；防止廉价混合牌替代所有生活支持'});
card('B09','订阅产品',{income:3,text:'副业1；本牌有⚙时为3',resources:'满配列要求本牌⚙1；无配置时副业1'});
card('B10','Agent商业化',{income:4,text:'副业2；其他日程牌每有⚙1，再＋1，最多＋2',resources:'满配要求另外两张日程牌各有⚙1；未配置基础2'});
card('B11','工具交付',{steps:1,fee:1,cash:5,text:'💰−1；⚙−1 → 💰＋5',resources:'消耗⚙1；归档后不能重放'});
card('B12','企业试点',{tag:'工',income:3,text:'副业3'});
card('B13','云端托管',{req:'BB',income:2,play:'消耗⚙1',text:'副业2',resources:'打出消耗⚙1；不占额外位置'});
card('B14','创意原型',{req:'AAB',income:4,play:'消耗✦2、⚙1',text:'副业4',resources:'打出消耗✦2与日程牌上的⚙1；撤回重放须重付',changed:'删除反复付灵感与高理智搜牌附注；改为一次投入灵感和工具的固定4副业混合终端，不增加新牌型'});
card('C01','社交',{steps:2,fee:1,text:'💰−1'});
card('C02','小额进货',{text:'💰2 → ■1',fee:2,trade:true,resources:'每次产■1；买货交易费不享受自动化减费'});
card('C03','摆摊换货',{text:'每件💰3，买入或卖出至多■2',cash:6,trade:true,resources:'现金列为卖2件；买2件则付6，不能同次买卖'});
card('C04','品牌专柜',{price:3,play:'可放■2',text:'卖本牌■1得💰4；售前有■2时得💰5',cash:5,resources:'每次耗■1；表按满货售价5，另留展示货1'});
card('C05','市场调研',{steps:1,fee:2,text:'💰−2；看2张商业I级，买1',search:2,resources:'候选购价另计'});
card('C06','经营卖场',{play:'可放■3',income:4,text:'副业＝1＋本牌■数',resources:'计算按锁■3；无货副业1；货可回收'});
card('C07','招募伙伴',{steps:2,externalFee:5,text:'招募其他流派可归档牌1张',resources:'每次实付目标购价＋全部原执行费＋1；本账按阅读与学习技术各5，其他目标另计；只取得归档资格'});
card('C08','批发进货',{fee:5,trade:true,text:'💰5 → ■3',resources:'整批交易，不拆分；不享受自动化减费'});
card('C09','零售出货',{cash:8,trade:true,text:'每件💰4，卖出至多■2',resources:'计算按每次消耗■2；不能忽略进货与滞销'});
card('C10','兴趣小店',{price:6,sanity:1,play:'可放■1',income:1,text:'副业＝本牌■数',resources:'锁■1；卖掉则无副业，理智保留',changed:'购价2→6；加直接购货3后启动9，与收入1＋理智1模板对照；留货可回收，长窗仍更有优势'});
card('C11','概念预售',{text:'✦−1 → ■＋1',resources:'每次消耗✦1、产■1'});
card('C12','自动补货',{play:'可放■2',income:4,text:'有⚙：本牌■＋1。副业＝1＋■数；有⚙且满货时为4',resources:'满配要求⚙1＋■2；空货启动按逐周1→2单独核算',changed:'保留满配4，撤销上一轮纯文案导致的削弱'});
card('C13','企业团购',{price:2,play:'消耗■1',income:3,text:'副业3',resources:'打出消耗■1',changed:'购价4→2；直接买货总部署5，与免查岗企业试点对照'});
card('W01','加班',{tag:'闲',cash:1,text:'💰＋1'});
card('W02','猛烈加班',{tag:'闲',sanity:-1,cash:3,text:'💰＋3'});
card('W03','极其猛烈加班',{tag:'闲',sanity:-2,cash:5,text:'💰＋5'});
card('W04','集中攻坚',{tag:'工',steps:2,fee:1,completionCash:2,duty:1,text:'理智≥2：💰−1。完成💰＋2、★＋1',resources:'完成获★1；工资后续价值另列'});
card('W05','工作交接',{tag:'工',steps:2,fee:2,duty:2,text:'💰−2；★＋1',resources:'每次★1，完成共2；工资在获得当周即可结算'});
card('W06','例行汇报',{tag:'工',sanity:-1,cash:2,search:2,text:'💰＋2；看2买1',resources:'购入卡另付钱'});
card('W09','争取双休',{tag:'工',steps:3,fee:2,text:'💰−2。完成：下周起永久双休、基础理智＋2',resources:'完成前不提前记理智或安全位置收益'});
card('W10','下楼遛弯',{tag:'闲',sanity:2,fee:2,text:'💰−2'});
card('W11','提案汇报',{tag:'工',steps:2,cash:2,duty:1,text:'✦−1 → 💰＋2。完成★＋1',resources:'完成消耗✦2、获得★1'});
card('W12','垫资推进',{tag:'工',steps:2,playCash:3,play:'💰−3',completionCash:5,duty:1,text:'完成💰＋5、★＋1',resources:'前付3；完成★1，未完成不可提前套回'});
card('W13','流程验收',{tag:'工',steps:2,cash:2,duty:2,text:'⚙−1 → 💰＋2、★＋1',resources:'完成消耗⚙2、获得★2'});
card('W14','向上管理',{tag:'工',fee:2,cash:4,text:'💰−2；获得等于工资的资金；骰4–6再💰＋2',resources:'现金列以工资3计算；每枚工资区★另使本牌现金＋1'});
card('W15','砸烂地球',{steps:0,oneShot:true,text:'查岗前，理智≤1：揭示事件2张，一张对自己、一张对其他玩家；弃置',resources:'事件效果逐情景审计，不以虚构固定金币估价',status:'保留实验牌，不计入经济平衡已校准范围'});
card('W16','暗图大事',{tag:'闲',sanity:2,play:'从工资区移至多★3到本牌',income:3,text:'副业＝本牌★数',resources:'满配转移★3，同时工资−3；总现金并未增加3'});

assert.equal(cards.length,56);
assert.equal(new Set(cards.map(c=>c.id)).size,56);
assert.ok(live.cards.every(c=>cards.some(n=>n.id===c.id)));

// Exact inspection: each initial check gets at most one follow-up; hit dates
// cannot be hit twice in the same week. Enumerate masks, never independent cards.
const pc=n=>n.toString(2).replaceAll('0','').length;
const memo=new Map();
function masks(exposed, rounds) {
  const key=exposed+','+rounds;if(memo.has(key))return memo.get(key);
  let states=new Map([[0,1]]);
  for(let r=0;r<rounds;r++){
    const next=new Map();const add=(m,p)=>next.set(m,(next.get(m)||0)+p);
    for(const [mask,p] of states)for(let a=0;a<6;a++){
      const bit=1<<a;
      if(!(exposed&bit)||(mask&bit)){add(mask,p/6);continue;}
      const first=mask|bit;
      for(let b=0;b<6;b++){const second=1<<b;add((exposed&second)&&!(first&second)?first|second:first,p/36);}
    }
    states=next;
  }
  assert.ok(Math.abs([...states.values()].reduce((a,b)=>a+b,0)-1)<1e-10);
  memo.set(key,states);return states;
}
const weights=Array(4).fill(0);for(const e of live.events)weights[e.inspectionCount]+=e.copies;
const eventCount=weights.reduce((a,b)=>a+b,0);
function risk(days,rounds){if(!days)return 0;return [...masks((1<<days)-1,rounds)].reduce((s,[m,p])=>s+p*pc(m),0)/days;}
const mixRisk=days=>weights.reduce((s,w,r)=>s+w*risk(days,r),0)/eventCount;
const riskTable=Array.from({length:6},(_,i)=>({days:i+1,q1:risk(i+1,1),q2:risk(i+1,2),q3:risk(i+1,3),mixed:mixRisk(i+1)}));
for(let d=1;d<=6;d++)assert.ok(Math.abs(risk(d,1)-(d+5)/36)<1e-10);

// Finite calendar-window cash ledger. Configured operation is conditional on
// tokens, gates and liquidity; required resources remain explicit, never valued 0.
function ledger(c,H,work=false){
  const q=work&&c.tag!=='工'?mixRisk(3):0,s=1-q;
  let states=new Map([[0,1]]),out=-(c.price+c.playCash),executions=0,completion=0,fines=0;
  const cap=c.steps||(c.oneShot?1:H+1);
  for(let w=0;w<H;w++){
    const next=new Map();const add=(n,p)=>next.set(n,(next.get(n)||0)+p);
    for(const [n,p]of states){
      if(n>=cap){add(n,p);continue;}
      fines+=p*q;out-=p*q;add(n,p*q);
      out+=p*s*(c.income+c.cash-c.fee-(c.externalFee||0));executions+=p*s;
      if(c.steps&&n+1===cap){out+=p*s*(c.steps+c.completionCash);completion+=p*s;}
      add(n+1,p*s);
    }
    states=next;
  }
  return {cash:out,executions,completionProbability:completion,fines};
}
const audit=cards.map(c=>({...c,
  completedCashCost:c.steps?c.price+c.playCash+c.steps*(c.fee+(c.externalFee||0))-c.steps-c.completionCash-c.steps*c.cash:null,
  safe3:ledger(c,3),safe5:ledger(c,5),work3:ledger(c,3,true),work5:ledger(c,5,true),
  unit:c.grade==='I'?1:2,
  allocation:'共享归档仅在整套组合计一次；不自动作为本牌免费收益预算'
}));

// Exact target-density search, without replacement, including four copies.
function hit(N,K,n){let miss=1;for(let i=0;i<n;i++)miss*=Math.max(0,N-K-i)/(N-i);return 1-miss;}
const search=[];
for(const req of ['', 'A','AA','B','BB','C','CC','W']){
  const available=r=>[...'ABCW'].every(k=>[...r].filter(x=>x===k).length<=[...req].filter(x=>x===k).length);
  const pool=cards.filter(c=>c.grade==='I'),eligible=pool.filter(c=>available(c.req));
  for(const n of [2,3,4]){
    // Price maximum is an avoided-purchase upper bound, not cash income.
    const max=Math.max(...eligible.map(c=>c.price));let value=0;
    for(let p=1;p<=max;p++)value+=hit(pool.length*4,eligible.filter(c=>c.price>=p).length*4,n);
    search.push({req:req||'none',n,pool:pool.length*4,eligible:eligible.length*4,
      any:hit(pool.length*4,eligible.length*4,n),maxAvoidedPrice:value,
      target1:hit(pool.length*4,4,n),target3:hit(pool.length*4,12,n)});
  }
}
const targetedSearch=['A','B','C'].flatMap(route=>{
  const pool=cards.filter(c=>c.grade==='I'&&c.route===route);
  return [2,3,4].map(n=>({route,n,N:pool.length*4,target1:hit(pool.length*4,4,n)}));
});

// Greedy append benchmark. Real support cards have capacity/copies and occupy
// time. Fixed earlier aggregate placements, packed workdays; no free rearranging.
function solve(n,{income=1,units=1,target=3,aux=true,checks=1,previous=null}={}){
  const types=aux?[{id:'G',count:2,u:1,r:0,f:1},{id:'Q',count:1,u:1,r:0,f:0}]:[];
  types.push({id:'R',count:n,u:units,r:income,f:0});
  let best=null;
  function rec(i,rows,sun,night,work){
    if(i<types.length){const t=types[i];for(let a=0;a<=Math.min(t.count,Math.floor((2-sun)/t.u));a++){
      for(let b=0;b<=(t.u===1?Math.min(t.count-a,7-night):0);b++){
        const w=t.count-a-b;if(work+w*t.u>12)continue;
        // Search kept safe; G counts ongoing training, not permanent occupations.
        if(t.id==='Q'&&w)continue;
        const old=previous?.placement[i];if(old&&(a<old.sun||b<old.night||w<old.work))continue;
        rec(i+1,[...rows,{id:t.id,sun:a,night:b,work:w}],sun+a*t.u,night+b,work+w*t.u);
      }
    }return;}
    for(let ss=0;ss<=Math.min(2-sun,4);ss++)for(let sn=0;sn<=Math.min(4-ss,7-night);sn++){
      if(previous&&(ss<previous.supportSunday||sn<previous.supportNights))continue;
      const sanity=3+2*(ss+sn)-(night+sn)-((sun+ss)===2?2:0);
      if(sanity<target)continue;
      const D=Math.ceil(work/2),q=risk(D,checks);
      let cost=2*(ss+sn),side=0;
      rows.forEach((p,k)=>{const t=types[k],ok=p.sun+p.night+p.work*(1-q);cost+=t.f*ok+(t.r+1)*p.work*q;side+=t.r*ok;});
      const candidate={n,cost,side,sanity,days:D,q,supportSunday:ss,supportNights:sn,placement:rows};
      if(!best||cost<best.cost-1e-9||(Math.abs(cost-best.cost)<1e-9&&sn+ss<best.supportNights+best.supportSunday))best=candidate;
    }
  }
  rec(0,[],0,0,0);return best;
}
const curves={};
for(const [name,opts,max]of [
  ['I_income1_training_san3',{income:1},12],
  ['I_income2_training_san3',{income:2},12],
  ['II_income3_training_san3',{income:3,units:2},6],
  ['II_income4_training_san6',{income:4,units:2,target:6},6],
  ['I_income1_training_checks2',{income:1,checks:2},12]]){
  const rows=[];let prev=null;
  for(let n=0;n<=max;n++){const r=solve(n,{...opts,previous:prev});if(!r)break;r.marginal=prev?r.cost-prev.cost:0;rows.push(r);prev=r;}
  curves[name]=rows;
}

// Archive paths: actual printed costs, coin return, no hidden per-card skill tax.
const paths={A:['A04','A07','A02'],B:['B02','B05','B07'],W:['W04','W05']};
const archivePaths=Object.entries(paths).map(([route,ids])=>{
  const cs=ids.map(id=>cards.find(c=>c.id===id));return {route,ids,
    price:cs.reduce((s,c)=>s+c.price,0),grossFees:cs.reduce((s,c)=>s+c.steps*c.fee,0),
    coinReturn:cs.reduce((s,c)=>s+c.steps,0),completionCash:cs.reduce((s,c)=>s+c.completionCash,0),
    conditionalCash:cs.reduce((s,c)=>s+c.steps*c.cash,0),
    successExecutions:cs.reduce((s,c)=>s+c.steps,0),
    notes:route==='A'?'阅读产✦3可供集中创作消耗3；两次原价找牌另计；总8次执行非8个连续周':
      route==='B'?'买课→管线→日志；管线需另一张目标牌，日志需目标位于左邻；需调度，目标另计':
      '两张可同期执行，各占自己的槽位；共★3，不重复当现金奖励减去'};});
archivePaths.push({route:'C',ids:['C01','C05','C07'],price:7,grossFees:4,coinReturn:5,
  hireOutlay:10,netCash:16,successExecutions:5,
  notes:'社交与市场调研先得CC；招聘阅读与学习技术各5，取得C及额外A/B。总净16，不把整笔费用同时分摊给C、A、B三次；不领取被招聘牌奖励'});
const hire=cards.filter(c=>c.steps).map(c=>({id:c.id,name:c.name,
  directCashCost:c.price+c.playCash+c.steps*c.fee-c.steps-c.completionCash-c.steps*c.cash,
  hirePrice:c.price+c.steps*c.fee+1,stepsSaved:c.steps,
  note:'只归档，不能领目标卡钱币/现金/指示物；招聘本身仍占时、付购价'}));

// Full board end-state probes. Named card + day 0..6 + period 0..2.
function board(name,placements,{weekend=false,duty=0,transfer=0,extraSetup=0,notes=''}={}){
  const rows=placements.map(([id,day,period,override={}])=>({...cards.find(c=>c.id===id),day,period,...override}));
  const occupied=new Set();for(const c of rows){assert.ok(c.grade==='I'||c.period===0);assert.ok(!(c.tag==='闲'&&c.day<6&&c.period<2&&!(weekend&&c.day===5)));assert.ok(!(c.tag==='工'&&(c.day===6||c.period===2||(weekend&&c.day===5))));for(let p=c.period;p<c.period+(c.grade==='II'?2:1);p++){const k=c.day+','+p;assert.ok(!occupied.has(k));occupied.add(k);}}
  for(const c of cards)assert.ok(rows.filter(r=>r.id===c.id).length<=c.copies);
  const sanity=3+(weekend?2:0)+rows.reduce((s,c)=>s+c.sanity,0)-rows.filter(c=>c.period===2).length-(occupied.has('6,0')&&occupied.has('6,1')?2:0);
  const exposed=rows.filter(c=>c.day<6&&c.period<2&&c.tag!=='工'&&!(weekend&&c.day===5));
  const bits=exposed.reduce((m,c)=>m|1<<c.day,0);let evSide=0,evNet=0,pWin=0;
  for(let rounds=0;rounds<weights.length;rounds++)for(const [mask,p]of masks(bits,rounds)){
    const prob=p*weights[rounds]/eventCount;let side=0,fees=0,fines=0,cash=0;
    const active=c=>!(exposed.includes(c)&&!!(mask&(1<<c.day)));
    for(const c of rows){if(!active(c)){fines++;continue;}side+=c.income+(c.boostSource&&rows.some(r=>r.id===c.boostSource&&active(r))?c.bonus:0);fees+=c.fee;cash+=c.cash;}
    evSide+=prob*side;evNet+=prob*(3+duty-transfer+side+cash-fees-fines);if(sanity>=6&&side>=10)pWin+=prob;
  }
  return {name,placements,side:rows.reduce((s,c)=>s+c.income+(c.bonus||0),0),sanity,
    purchase:rows.reduce((s,c)=>s+c.price+c.playCash,0),extraSetup,
    evSide,evNet,pWin,notes};
}
const supports=[['W10',0,2],['W10',1,2],['W10',2,2]];
const boards=[
  board('开发：两订阅＋Agent',[['B09',0,0],['B09',1,0],['B10',2,0],...supports],{notes:'2枚自动化仍在两订阅上；BBB一次共享，源牌与归档另计'}),
  board('创作开发：原型＋两订阅',[['B14',0,0],['B09',1,0],['B09',2,0],...supports],{notes:'AAB；原型消耗2灵感与1工具，订阅另留2工具；共需3次配置，不重复记同一枚'}),
  board('创作：艺人＋签约＋驻留＋专栏',[['A09',0,0],['A08',1,0],['A13',2,0],['A06',3,0],['W10',0,2],['W10',1,2]],{notes:'艺人锁2灵感；驻留理智1＋两支持夜晚净2；AAA＋W；四张收入牌'}),
  board('商业：两卖场＋团购',[['C06',0,0],['C06',1,0],['C13',2,0],...supports],{extraSetup:21,notes:'锁货6＋消耗货1；21为按直接3/件计的资金需求，不全是沉没成本；CCC＋W'}),
  board('混合：驻留＋试点＋原型＋云端',[['A13',0,0],['B12',1,0],['B14',2,0],['B13',3,0],['W10',0,2],['W10',1,2]],{notes:'W＋AA＋BB共享归档；原型与云端合计消耗2自动化及2灵感；试点免查岗'}),
  board('职场转型：暗图＋试点＋团购＋云端',[['W16',6,0],['B12',0,0],['C13',1,0],['B13',2,0],...supports],{duty:3,transfer:3,notes:'工资区3枚转入暗图；工资仍按3计算，不能再多记3；暗图的+2抵消周日占满−2'}),
  board('无维持费：三兴趣编程＋两订阅＋云端',[['B08',0,0],['B08',0,1],['B08',1,0],['B09',2,0],['B09',3,0],['B13',1,1]],{notes:'静态11/6，6张收入牌；两枚保留自动化＋一枚部署消耗；不宣称必须付支持费'}),
  board('高理智开发：数据＋兴趣＋两订阅＋云端',[['B06',0,0],['B08',0,1,{boostSource:'B06',bonus:2}],['B09',1,0],['B09',2,0],['B13',3,0],['W10',0,2],['W10',1,2]],{notes:'BB；数据与兴趣为真实上下邻，必须同时执行；两订阅各留工具1，云端消耗工具1；三张产品与数据组合'}),
];

// Closed resource loops, not summing isolated configured-card rewards.
const loops=[];
function goodsLoop(H){let stock=0,spend=0,sales=0;const rows=[];for(let w=1;w<=H;w++){let buy=stock<2?3:0;if(buy){stock+=3;spend+=5;}const sell=Math.min(stock,2);stock-=sell;sales+=sell*4;rows.push({week:w,buy,sell,stock,cumulativeCash:sales-spend-6});}return rows;}
loops.push({name:'批发＋零售',price:6,rows:goodsLoop(6),steadyCash:14/3,side:0,units:2});
loops.push({name:'小额进货＋摆摊',price:4,steadyCash:1,side:0,units:2});
loops.push({name:'小额进货＋零售',price:5,steadyCash:2,side:0,units:2});
loops.push({name:'小额进货＋专柜（留货1）',price:5,stockCapital:3,steadyCash:3,side:0,units:2});
loops.push({name:'灵感管理＋采风＋写作',price:6,steadyCash:3,side:0,units:3,notes:'稳态每周消耗1张前周免费所得手牌；首周最多0现金，搜不到或留牌时更低'});
loops.push({name:'灵感管理＋画画',price:11,steadyCash:3,side:1,sanity:1,units:2,variance:4,notes:'每次骰额外现金0/4各半；实际现金1/5，不是稳定3副业'});
loops.push({name:'灵感管理＋预售＋专柜',price:8,stockCapital:3,steadyCash:5,side:0,units:3,notes:'有展示货；每周1灵感→1货→售5；未扣时间支持查岗'});
loops.push({name:'管线重放＋作品发行',price:6,steadyCash:5,side:0,units:2,notes:'每周重放管线，费用1完成返还；还需目标牌和相邻位置；两张源牌不是免费工资'});
loops.push({name:'自动补货＋零售（每周取1）',price:7,steadyCash:6,side:2,units:3,notes:'补货先发生、随后取走1，周末余1：副业2＋卖货4；先卖后补且保持满货时可到副业4＋卖货4；需库存与合法时序'});
loops.push({name:'配置管线＋工具交付',price:6,oneShotCash:5,coinRefund:2,side:0,units:2,notes:'两次费合计2并退回；净−1，换B归档与管线复用。须另有目标，不能自己放标记；工具交付不可重放'});

// Five-week trade stress: draw check counts without replacement from the 12-event
// deck; those layouts stay at sanity 3, have no hand, never occupy Sunday/Saturday.
// Thus the other printed event effects do not damage these particular activities.
// Both market acquisition and archive prerequisites are paid before this probe.
function tradeProbe(kind,spread,H=5){
  const sourceCost=kind==='bulk'?5:2,initialStock=kind==='brand'?1:0;
  const price=kind==='bulk'?6:kind==='brand'?5:4;
  const initialFloat=sourceCost;
  let states=new Map([[JSON.stringify([weights,initialStock,initialFloat]),1]]);
  let skipped=0;const trajectory=[];
  for(let week=1;week<=H;week++){
    const next=new Map();const add=(k,p)=>next.set(k,(next.get(k)||0)+p);
    for(const [key,prob]of states){const [counts,stock,cash]=JSON.parse(key),remaining=counts.reduce((s,n)=>s+n,0);
      for(let r=0;r<counts.length;r++)if(counts[r])for(const [mask,p]of masks(spread?3:1,r)){
        const weight=prob*counts[r]/remaining*p;let goods=stock,money=cash,earnings=0;
        const hitSource=!!(mask&1),hitSink=!!(mask&(spread?2:1));
        const wantsBuy=kind==='bulk'?goods<2:goods<(kind==='brand'?2:1);
        if(hitSource)money=Math.max(0,money-1);
        else if(wantsBuy&&money>=sourceCost){money-=sourceCost;goods+=kind==='bulk'?3:1;}
        else if(wantsBuy)skipped+=weight;
        if(hitSink)money=Math.max(0,money-1);
        else if(kind==='brand'){if(goods>=2){goods--;earnings=5;}}
        else {const sell=Math.min(goods,kind==='bulk'?2:1);goods-=sell;earnings=sell*(kind==='bulk'?4:3);}
        money+=3+earnings;const cs=[...counts];cs[r]--;add(JSON.stringify([cs,goods,money]),weight);
      }
    }
    states=next;let expectedCash=0,expectedStock=0,mass=0;
    for(const [key,p]of states){const [,goods,money]=JSON.parse(key);expectedCash+=p*money;expectedStock+=p*goods;mass+=p;}
    assert.ok(Math.abs(mass-1)<1e-8);
    trajectory.push({week,expectedCash,expectedStock,tradeNetAfterCardPrice:expectedCash-initialFloat-3*week-price});
  }
  return {kind,spread,H,price,initialFloat,initialStock,initialStockCash:initialStock*3,trajectory,expectedCashShortageExecutions:skipped,
    note:'工资逐周到账，采购先付、销售周末到账；净交易列扣购牌，不扣可回收展示货3；没有把归档取得或市场等待当免费已完成。品牌策略保留最后一件展示货'};
}
const tradeStress=['bulk','small','brand'].flatMap(k=>[false,true].map(s=>tradeProbe(k,s)));

// Automatic replenishment and one sale per week. Two workdays are necessary:
// the II card occupies both daytime slots. End-week stock decides its income.
function restockProbe(sellFirst,H=5){
  let states=new Map([[JSON.stringify([weights,2,2]),1]]);const rows=[];
  for(let week=1;week<=H;week++){
    const next=new Map();let evSide=0;
    for(const [key,prob]of states){const [counts,stock,cash]=JSON.parse(key),remaining=counts.reduce((s,n)=>s+n,0);
      for(let r=0;r<counts.length;r++)if(counts[r])for(const [mask,p]of masks(3,r)){
        const weight=prob*counts[r]/remaining*p;let goods=stock,money=cash,sales=0;
        const hitRestock=!!(mask&(sellFirst?2:1)),hitSale=!!(mask&(sellFirst?1:2));
        const restock=()=>{if(hitRestock)money=Math.max(0,money-1);else goods=Math.min(2,goods+1);};
        const sale=()=>{if(hitSale)money=Math.max(0,money-1);else if(goods>0){goods--;sales=4;}};
        if(sellFirst){sale();restock();}else{restock();sale();}
        const income=hitRestock?0:goods===2?4:1+goods;evSide+=weight*income;
        money+=3+sales+income;const cs=[...counts];cs[r]--;
        const k=JSON.stringify([cs,goods,money]);next.set(k,(next.get(k)||0)+weight);
      }
    }
    states=next;let cash=0,goods=0,mass=0;
    for(const [key,p]of states){const [,g,m]=JSON.parse(key);cash+=p*m;goods+=p*g;mass+=p;}
    assert.ok(Math.abs(mass-1)<1e-8);
    rows.push({week,evSide,cash,goods,netAfterTwoCardPrices:cash-2-3*week-7});
  }
  return {sellFirst,rows,scope:'预先配置完成并锁货2；两牌购价7已扣，货款6、管线3、BCC取得、支持及市场等待另计；周末按实际剩货结算，没有先计满额再卖货'};
}
const restockStress=[restockProbe(false),restockProbe(true)];

// Concrete event-free four-week development of AAA and BBB: not victory times.
// The two buy/two play weekly action caps hold; weekly fees are funded BEFORE payouts.
function archiveBuild(route){
  const plans=route==='A'?[
    {buy:['A04','A07'],place:['A04','A07']},
    {buy:['A02'],place:['A02']},{buy:[],place:[]},{buy:[],place:[]},
  ]:[
    {buy:['B02','B03'],place:['B02','B03']},{buy:[],place:[]},
    {buy:['B05','B07'],place:['B05','B07']},{buy:[],place:[]},
  ];
  let money=8,inspiration=0,auto=0,side=0;const active=[],skills=[],progress={};const rows=[];
  for(let i=0;i<plans.length;i++){
    const plan=plans[i];assert.ok(plan.buy.length<=2&&plan.place.length<=2);
    const buyCost=plan.buy.reduce((s,id)=>s+cards.find(c=>c.id===id).price,0);
    assert.ok(money>=buyCost);money-=buyCost;
    for(const id of plan.buy){const c=cards.find(c=>c.id===id);assert.ok([...c.req].every(r=>skills.filter(s=>s[0]===r).length>=[...c.req].filter(x=>x===r).length));}
    active.push(...plan.place);const fee=active.reduce((s,id)=>s+cards.find(c=>c.id===id).fee,0);
    assert.ok(money>=fee);money-=fee;let rewards=0;side=0;const done=[];
    for(const id of [...active]){
      const c=cards.find(c=>c.id===id);
      if(id==='A04')inspiration++;
      if(id==='A02'){assert.ok(inspiration>0);inspiration--;rewards+=2;}
      if(id==='B05')auto++;
      if(id==='B07')assert.ok(auto>0);
      side+=c.income;
      if(c.steps){progress[id]=(progress[id]||0)+1;if(progress[id]===c.steps){rewards+=c.steps+c.completionCash;done.push(id);skills.push(id);}}
    }
    for(const id of done)active.splice(active.indexOf(id),1);
    money+=3+side+rewards;rows.push({week:i+1,buy:plan.buy,place:plan.place,buyCost,fees:fee,rewards,side,money,skills:[...skills],inspiration,auto});
  }
  return {route,rows,scope:'无查停、候选牌恰好可买、主动搜牌不买任何候选；AAA灵感分放空夜，集中创作每次只取一个夜晚的1枚；BBB使用Mon管线→Tue目标→Wed日志。不是市场可达性或胜率证明'};
}
const earlyBuilds=[archiveBuild('A'),archiveBuild('B')];

const wellbeing=[0,1,2,3,4,6].map(sanity=>({sanity,
  exposure:live.events.filter(e=>e.wellbeing&&sanity<=e.wellbeing.max).reduce((s,e)=>s+e.copies,0)/eventCount,
  kinds:live.events.filter(e=>e.wellbeing&&sanity<=e.wellbeing.max).map(e=>e.wellbeing.effect)}));
const result={date:'2026-11-05',scope:'设计核算，不改demo；56种×4；算术非多人试玩结论',eventCount,weights,riskTable,
  model:{horizons:[3,5],salary:3,startMoney:8,baseSanity:3,escapeSanity:6,escapeIncome:10,
    referenceTimeCost:1,sanityShadow:2,warning:'影子价仅用于筛查；整盘直接扣支持与风险后绝不再扣影子价。'},
  audit,search,targetedSearch,curves,archivePaths,hire,boards,loops,tradeStress,restockStress,earlyBuilds,wellbeing};
fs.writeFileSync('docs/cardpool-unified-audit-2026-11.json',JSON.stringify(result,null,2)+'\n');
fs.writeFileSync('docs/cardpool-unified-proposal-2026-11.json',JSON.stringify({date:result.date,status:'draft-not-in-demo',cards},null,2)+'\n');
const f=n=>Number(n.toFixed(2));
let md='# 全卡池统一核算：逐牌账本\n\n2026-11-05。由 `node scripts/audit-cardpool-unified-draft.mjs` 生成。设计稿，未接入 demo。\n\n';
md+='## 口径\n\n每张牌包含购价、打出费用、运行费用、完成钱币返还；货品/灵感/自动化/手牌/工资转移和归档前置必须另看资源列，不能把裸现金余额当净利润。满配牌按满配状态列账，不假设配置免费。表不含工资、支持配套、时间机会成本、目标卡购价。执行条件、资源和期初现金充足；不含团建、精神事件、市场等待。归档牌完成后不继续运行，自动管线按一次部署而非自动重放。工作情景：覆盖3日、当前事件牌检查次数加权；工标签免查岗；闲标签不列非法工作情景。3/5周是评估窗口，不是游戏结束期限。\n\n';
md+='## 全部牌的条件现金账\n\n|牌|级/购价/要求|日程理智|打出|执行与归档|额外资源/前置|安全3周余额|安全5周余额|工作5周余额|\n|---|---|---:|---|---|---|---:|---:|---:|\n';
for(const c of audit)md+=`|${c.id} ${c.name}|${c.grade}/${c.price}/${c.req||'—'}|${c.sanity}|${c.tag?c.tag+'；':''}${c.play}|${c.text}${c.steps?'；归档'+c.steps:''}|${c.resources}|${f(c.safe3.cash)}|${f(c.safe5.cash)}|${c.tag==='闲'?'不适用':f(c.work5.cash)}|\n`;
md+='\n## 精确查岗概率\n\n|暴露日数|1轮|2轮|3轮|现事件配比加权|\n|---:|---:|---:|---:|---:|\n';
for(const r of riskTable)md+=`|${r.days}|${f(100*r.q1)}%|${f(100*r.q2)}%|${f(100*r.q3)}%|${f(100*r.mixed)}%|\n`;
md+='\n每轮最多追加一次，周内不重复查同日；同日多牌相关停牌。事件配比只用于查岗，不代表团建与精神事件也已估价。\n';
for(const [name,rows]of Object.entries(curves)){
  md+=`\n## 固定已有摆法的贪心曲线：${name}\n\n|收入牌数|每周成本|边际成本|暴露日|夜晚支持|周日支持|理智|\n|---:|---:|---:|---:|---:|---:|---:|\n`;
  for(const r of rows)md+=`|${r.n}|${f(r.cost)}|${f(r.marginal)}|${r.days}|${r.supportNights}|${r.supportSunday}|${r.sanity}|\n`;
}
md+='\n曲线含两张进行中的归档牌（执行费各1，退款尚未计入周常）、一张安全过牌牌、支持实际占位与每人至多4份W10。牌数是当前同时在场数，不是周数。支持保持安全，工作位按天紧凑填充；是受约束贪心而非所有牌实际排程的全局最优。永久双休和免疫牌不在这张通用曲线中；没有用旧无限追查曲线。\n';
md+='\n## 完成归档的直接现金投入\n\n|牌|成功次数|净直接成本|资源与奖励未货币化项|招募价格|\n|---|---:|---:|---|---:|\n';
for(const c of audit.filter(c=>c.steps))md+=`|${c.name}|${c.steps}|${f(c.completedCashCost)}|${c.resources}|${hire.find(h=>h.id===c.id).hirePrice}|\n`;
md+='\n负值表示牌面条件奖励超过直接支付，不代表免费获利；例如流程验收须消耗两枚工具。工资区履职的后续收益不得再重复当一次性现金减成本。聘请仅获归档，不领取以上奖励。\n';
md+='\n## 合法终局盘面：条件概率\n\n|组合|牌面副业|理智|在场购价|额外货款|期望副业|工资后净现金/周|本周过双线概率|\n|---|---:|---:|---:|---:|---:|---:|---:|\n';
for(const b of boards)md+=`|${b.name}|${b.side}|${b.sanity}|${b.purchase}|${b.extraSetup}|${f(b.evSide)}|${f(b.evNet)}|${f(b.pWin*100)}%|\n`;
md+='\n均计实际夜晚/周日理智、支持费用、查停与每牌罚1；忽略团建/精神事件、保护消耗和市场达成过程。额外货款21含18可回收留货和3消耗；其他组合的灵感/工具/归档投入见下文与JSON，不是0。本周概率不是逃离周数，更不是对局胜率。零归档收入只有A06、B03各4份，极端全收齐也只有8副业；这是本版牌表容量，不新增全局上限。\n';
for(const b of boards)md+=`\n- ${b.name}：${b.notes}。位置：${b.placements.map(([id,d,p])=>`${id}@${d+1}日${['上午','下午','夜晚'][p]}`).join('，')}。\n`;
md+='\n## 经济循环\n\n```json\n'+JSON.stringify(loops,null,2)+'\n```\n';
md+='\n## 交易压力测试\n\n|循环|布局|5周净交易现金（已扣购牌）|期末平均货品|因缺钱跳过采购次数|\n|---|---|---:|---:|---:|\n';
for(const t of tradeStress)md+=`|${t.kind}|${t.spread?'跨两日':'同一日'}|${f(t.trajectory.at(-1).tradeNetAfterCardPrice)}|${f(t.trajectory.at(-1).expectedStock)}|${f(t.expectedCashShortageExecutions)}|\n`;
md+='\n12张事件不放回抽取，精确枚举5周的查岗和库存现金状态；工资3在周末到账，进货须当时付得起。已先支付购牌并备好首批周转金，不模拟市场及解锁。实际布局理智3、无手牌、无周日活动，现有精神/团建事件对这些探针没有额外目标；不应用于其他布局。展示货另需可回收的3现金。\n';
md+='\n## 起步现金与归档路径\n\n```json\n'+JSON.stringify(earlyBuilds,null,2)+'\n```\n';
md+='\n## 自动补货与零售的五周库存核算\n\n|顺序|扣两牌购价后5周现金|第5周期望副业|期末货品|\n|---|---:|---:|---:|\n';
for(const r of restockStress){const t=r.rows.at(-1);md+=`|${r.sellFirst?'先卖再补':'先补再卖'}|${f(t.netAfterTwoCardPrices)}|${f(t.evSide)}|${f(t.goods)}|\n`;}
md+='\n初始两件货、预先配置自动化。扣两牌价格7，不扣可回收货款6、管线3、BCC取得成本与早期部署延迟；均为两个工作日，同一日放不下II级补货与I级零售。结算副业以实际剩货为准。\n';
md+='\n## 搜索、归档路径、精神事件\n\n完整数值见同名JSON的search、targetedSearch、archivePaths、hire、wellbeing。搜索按本设计I级牌实际份数，不抽有放回；最大购价只代表避免支出的上界，不是现金。单牌工作3/5周列使用固定边际概率的独立周近似；不放回事件的精确跨周枚举仅用于明确标注的交易/补货探针。\n';
fs.writeFileSync('docs/cardpool-unified-ledger-2026-11.md',md);
let review=`# 统一数值模型与卡池建议

2026-11-05。设计提案，未修改 demo。以《卡牌文案整理稿：公共规则与钱币归档》为待审对象，而不是把该稿当作已上线规则。56种全部保留ID，每种4张；没有新增牌型、公共资源轨道或并行规则。

## 结论与证据边界

上一版做过局部算术检查，没有完成整套组合平衡。此次完成56种逐牌账本、3/5周收益窗口、限定一次追查的精确概率、受约束贪心摆法、闭合资源循环、8个合法终局盘面，以及不放回事件下的5周交易/补货计算。两条起步路径核对了开局8钱、每周3工资、每周两次购牌及两次打牌、先支付费用再领取周末收益。

这些结果能排除重复记收益、免费配置和部分明显的支配关系；不能证明各路线多人胜率相同，也不等于实际试玩。终局盘面从已经准备好的局面开始，不含市场争抢、获取等待和完整部署过程。砸烂地球仍属于实验牌，不冒充已完成经济标定；建议不放进第一轮标准平衡测试。

## 统一模型

I级零配置收入锚点：购买3，副业1；II级占两个白天时段，先按两个I级估价。不是“有归档就免费多给收入”：先计归档、配置、源牌及部署延迟，再对整套组合比较。

每套组合同时记七项：购牌/打出资金、每周净现金、可见副业、理智、实际占位、解锁投入、剩余资源。工资和卖货等额外现金不算副业；锁住的货品不是已花掉的消耗品；消耗的灵感和自动化不能同时继续给其他牌加成。

现金账＝−购价−打出资金＋各周（实际副业＋额外现金＋工资增量−实付费用−采购/招聘费−罚款）＋归档回款。资源源牌也进入整套账。既有工资3用于流动性验证，但不冒充某张牌创造的收益。

理智1的参考影子价为每周2钱，来自夜晚下楼遛弯：牌面+2，夜晚占用−1，费用2。它不是所有局面的固定兑换率。安全白天、永久双休、自动化减费会改变实际价格；已经扣了真实支持费，就不再重复扣影子价。

以3周作为购价调整参考，同时看5周敏感性：副业1＋永久理智1的牌，参考购价是3＋3×2＝9。若预计只剩1周，不应为永久支持付这个价格；若可经营5周，永久支持更合算。这正是低价付费支持与高价混合支持的选择。9不是由模型唯一解出的“正确价格”。

两张I级与一张II级并不完全相同：后者不能夜放、要占连续白天；但被查停只罚1，不是两张各罚1。模型保留这些实际差别，不把II级简单当成“双倍收益免费升级”。

## 查岗与时间成本

每轮首查命中才追加一次。暴露D天时，一张工作牌在一轮中的命中率为(D+5)/36。现有12张事件的查岗次数为0/1/2/3轮，对应4/4/3/1张；一张牌的加权命中率从暴露1天的16.71%升到6天的27.28%。同一天的牌一起停，不能当独立风险。

受约束贪心场景：两张进行中的归档牌、一张过牌牌，以实际支持牌保持理智至少3；新增牌按最便宜位置放，已有牌不免费重排。副业1的I级牌，第1至12张的边际周成本约为：0.39、0.39、0.56、0.44、0.72、0.50、0.89、0.56、1.06、0.61、2、2。

曲线呈台阶与锯齿，不会每张严格递增：同一工作日的第二张牌不再扩大暴露日数；安全/便宜位置耗尽后，新增夜晚需要支持，成本跃升。这里的12张是模型同时在场数量，不是本卡池提供12张零门槛收入牌。当前两种基础收入各4张，全收齐也只有8副业；不另设收入上限。

## 归档、检索和资源不能当免费

|路线实例|净直接现金投入|成功执行次数|额外产出/限制|
|---|---:|---:|---|
|阅读＋搜寻＋集中创作 → AAA|0|8|阅读产3灵感全部投入创作；搜索买牌另付钱；现金净0仍需购牌、槽位和4周的示例安排|
|买课＋管线＋日志 → BBB|6|5|另需目标牌，例如零散开发3；管线需真右邻；日志需左邻保有工具|
|攻坚＋交接 → WW|5|4|产生3履职，后续每周工资+3；不是只换资格|
|社交＋调研＋招聘 → CCC|16|5|按招聘阅读和学习技术各5计算，同时得到A/B；费用不能再对A/B重复全额收取|

上述均已扣归档钱币返还。免费执行的牌从公共供应取得钱币，完成返还实际是现金奖励；不会因为叫“进度钱币”就从账里消失。完成一次自动管线的费1全部返还，仍有购价3、安排一次、合适目标及执行风险。安装在支持牌上可每周省1；每张支持牌都需要各自安装，不能一枚工具抵扣所有维持费。

招募不是免费抄一张技能。按本稿规则，招募价＝目标购价＋原执行费总额＋1，不领被招募牌的任何奖励及回款。招聘阅读/学习技术分别为5，招聘集中攻坚为6。商业CCC这条路径现金最重，但同时取得别的流派归档，适合跨路线经营，不应把它宣传成最快的纯终端速攻。

在完整I级池中，目标牌只有4份时，“看2找某一张”的命中率约4.83%；看4也只有9.49%。定向看开发I级看2命中同一目标约19%，看4约36%。因此灵感搜寻、技术交流改为本流派定向找牌。免费取得的牌可以使用、留手、卖给日常写作，三种用途不能同时计价。买到好牌也须等下周安排。

## 组合收益

下表均是来源闭合、正常执行后的值。占位以I级为1，II级为2。尚未扣实际日程支持/查岗；涉及前置归档的取得成本另外明确列出，不假装为0。

|组合|购牌投入|额外准备|占位|每周资金贡献|其中副业|
|---|---:|---|---:|---:|---:|
|小额进货＋摆摊|4|周转金2|2|1|0|
|小额进货＋零售|5|C、周转金2|2|2|0|
|小额进货＋品牌专柜|5|C、展示货1、周转金2|2|3|0|
|批发＋零售|6|C、首批周转金5|2|3周合计14，均值4.67|0|
|灵感管理＋采风＋日常写作|6|A；首周先建立手牌|3|上界3；没搜到可取牌则更低|0|
|灵感管理＋画画|11|A|2|均值3，实际1或5|1|
|灵感管理＋预售＋专柜|8|C、展示货1|3|5|0|
|管线重放＋作品发行|6|AB、第三张目标牌、每周一次重放|2＋目标|5|0|
|自动补货＋零售，先卖后补|7|BCC、管线3、工具1、起始满货2|3|稳态上界8|4|
|自动补货＋零售，先补后卖|7|同上|3|稳态上界6|2|

“自动补货弱”不能靠单看卡面的3来判断。保留原本满配4，不再削成3。空货且已配置时，单独经营为第1周副业2，第2周起4；原理是免费补到一件、再补到两件。与零售组合后，先卖后补可以保留满货，形成4副业＋4现金；这已是强终端。查停任一环节都会改变库存，不能在每种风险状态都照记8。

五周精确库存计算（事件不放回、每次最多一次追加查岗）：批发＋零售同日布局，扣购牌后净交易现金9.67，分两日7.47；自动补货＋零售先卖后补为21.88，先补后卖15.84。后者还没有扣货款6、管线3与BCC解锁，不可拿21.88直接与9.67称作同投入比较。自动补货第5周期望副业分别仅2.76和1.63，不是永远稳定4。

## 终局构筑与完整投入

|构筑|静态副业|理智|在场牌购价|额外准备|
|---|---:|---:|---:|---|
|订阅×2＋Agent＋遛弯×3|10|6|20|BBB路径净6、目标牌3；两订阅分别再完成配置；完整直接现金至少29，未含前期支持/查岗|
|原型＋订阅×2＋遛弯×3|10|6|20|AAB，原型消耗灵感2/工具1，订阅分别留工具1；不能重复使用工具|
|艺人＋签约＋驻留＋专栏＋遛弯×2|10|6|27|AAA路径净0，攻坚得W净1，另购灵感管理2产艺人所需2灵感；示例总直接现金30，早期运行另计|
|卖场×2＋团购＋遛弯×3|11|6|17|留货6、消耗货1，直接货款21；CCC路径若招聘阅读/攻坚取得A/W则净17；合计55，18货款可回收，不能都当沉没成本|
|暗图＋试点＋团购＋云端＋遛弯×3|11|6|24|WW路径得3履职转入暗图，另需B/C与工具；工资同时失去3，不是净增3现金|

商业纯留货的启动现金明显高于开发，所以它需要前期贸易产生现金，或走BCC自动补货交叉路线；这是仍须整局检验的主要速度风险。没有为强行做成相同预算给每张牌加现金补丁。

在已布好的10副业/6理智开发盘面，按现有事件配比只计查岗，单周仍过两条线的概率57.29%。创作上述四收入牌分布四工作日为47.53%。这些不是整局胜率：已有牌面刚好10时任一收入牌停就失败；多做冗余、保护、周末安全位置会改变结果。所有组合都另外核对夜晚−1、周日占满−2、支持费用和合法牌尺寸。

## 本轮具体改动

1. 两张零门槛收入牌统一3钱/副业1；不把找牌、现金循环算作副业。
2. 兴趣编程和画画调整到9；兴趣小店6＋货品1（直接买货3）启动同为9，但货可回收。便宜的持续付费生活支持仍保留。
3. 下楼遛弯为价3/+2理智/费2；城市出游为价5/+4理智/费4，限非工作。周日占满要扣2，所以出游实际净+2；不会在工作白天无压力取得+4。
4. 带薪驻留价8、理智+1、副业2；不再按纯收入终端价格附送理智。
5. 流窜艺人价5、AAA、基础副业2，两个灵感位置，每个来自不同空夜；删除附送理智。单牌满配4。原“最多取每个空夜1枚”仍可能让两张达到10；与“三四张主力收入牌”的目标冲突，所以明确收紧本牌容量，不是新增总收入上限。
6. 数据收集价4，仍保留理智6的关键增幅；创意原型改为价5/AAB/打出消耗灵感2、工具1/副业4，删去反复付灵感和额外搜索。没有新增翻倍、叠层或额外执行规则。
7. 自费出版、企业团购价2，打出货品1；直接买货时总部署5。批量低价进货能进一步省钱，成为真实的商业联动。
8. 自动补货保留满配4及货物流动，不再因为文案简化削弱；集中创作执行费改1，避免归档本身又额外送3现金。

## 完整56种卡表

单位均为资金。A创作、B开发、C商业、W职场；要求指不同名归档。✦灵感、■货品、⚙自动化、★履职。工＝仅工作白天且免查岗；闲＝仅非工作时间。钱币归档N按公共规则完成后退款；没有归档N或一次字样即重复牌。表是图标排版前的简洁语义稿。
`;
for(const [route,name]of [['A','创作'],['B','开发'],['C','商业'],['W','职场']]){
  review+=`\n### ${name}\n\n|卡牌|等级/价格/要求|标签·理智·打出|执行|持久度|\n|---|---|---|---|---|\n`;
  for(const c of cards.filter(c=>c.route===route)){
    const play=[c.tag||'',c.sanity?`理智${c.sanity>0?'+':''}${c.sanity}`:'',c.play==='—'?'':c.play].filter(Boolean).join('；')||'—';
    review+=`|${c.name}|${c.grade}/${c.price}/${c.req||'—'}|${play}|${c.text}|${c.steps?'归档'+c.steps:c.oneShot?'一次·实验':'重复'}|\n`;
  }
}
review+=`\n## 仍需实际对局验证的边界\n\n- 混合支持价9是以3周估价得到的候选值；价7/9/11宜做同种子对照，不在本稿宣称9一定最优。\n- 归档时间、实际市场等待、两次买牌/两次打牌和一次调度会限制组合启动；现金表不能代替完整行动轨迹。\n- CCC的现金启动较重，贸易能否及时补足，应与BBB、AAA的可达周数直接对照；不能只拿成型输出说一样强。\n- 自动化投入支持牌会显著降低维持费；把所有工具给收入牌并不是唯一最优路线。\n- 砸烂地球影响多人事件，需要单独的局面与人数测试。先排除于标准平衡测试，不用臆造固定金币价来假称完成。\n- 本稿保留4份固定牌数，没有为人数增减卡牌，也没有承诺每张牌应有一样的购入率。基础桥梁牌与终端具有不同购买时机。\n\n原始可复算资料：[逐牌账本](cardpool-unified-ledger-2026-11.md)、[计算结果](cardpool-unified-audit-2026-11.json)、[完整提案数据](cardpool-unified-proposal-2026-11.json)。复算命令：\`node scripts/audit-cardpool-unified-draft.mjs\`。此命令只生成设计资料，不写游戏数据、页面或规则引擎。\n`;
fs.writeFileSync('docs/cardpool-unified-review-2026-11.md',review);
console.log(JSON.stringify({cards:cards.length,changes:cards.filter(c=>c.changed).map(c=>[c.name,c.changed]),riskTable,archivePaths,boards:boards.map(({placements,...b})=>b),search:search.filter(s=>s.req==='A'),wellbeing},null,2));
