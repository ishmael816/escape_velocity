// Candidate design arithmetic only. Does not import or change the playable engine.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const source=JSON.parse(readFileSync('docs/cardpool-v0.10.json','utf8'));
const changes=[
 {id:'W05',set:{maxSanity:10}},
 {id:'W06',set:{price:2,kind:'growth',effect:'一次性归档 W；奖金骰 0/0/0/2/2/4，当场领取，不计副业。'}},
 {id:'W11',set:{minSanity:3,maxSanity:10}},
 {id:'W12',set:{stress:0,minSanity:3,maxSanity:10}},
 {id:'A07',set:{gain:{profit:2},effect:''},remove:['dice']},
 {id:'A11',set:{name:'个人互动作品',price:9,minSanity:0,cost:{},support:2,upkeep:0,effect:''},remove:['discountAfter']},
 {id:'A13',set:{name:'画画与售卖习作',hours:4,price:4,gain:{profit:1},upkeep:0}},
 {id:'B05',set:{name:'开源兴趣项目',price:4,requires:'B',cost:{},gain:{inspiration:1},support:1,upkeep:0}},
 {id:'B09',set:{price:8,minSanity:0,cost:{},support:1,upkeep:0}},
 {id:'B11',set:{name:'数字手作工坊',price:9,minSanity:0,cost:{},gain:{profit:2,inspiration:1},support:1,upkeep:0,effect:''},remove:['emptyNightThreshold','emptyNightInspiration']},
 {id:'C06',set:{gain:{profit:2},effect:''},remove:['dice']},
 {id:'C07',set:{name:'收藏品交流',price:4,requires:'C',capital:4,cost:{},gain:{profit:2},support:1,upkeep:0}},
 {id:'C12',set:{name:'分红投资组合',capital:10,stress:0,minSanity:3,effect:''},remove:['condition','conditionalBonus']},
];
const cards=source.cards.map(c=>{
 const edit=changes.find(x=>x.id===c.id),out={...c,...edit?.set};
 for(const key of edit?.remove||[])delete out[key];
 return out;
});
const projects=source.projects.map(c=>c.id==='P02'?{...c,price:3,requires:'WW',cost:{money:1},effect:'下一周起，每周周初标记一个工作白天槽；其中一张 2h 或 4h 非履职活动免查岗。本周不可移动标记，不保护 8h、团建或熬夜。'}:c);
const data={status:'design-only-not-implemented',version:'0.18-candidate-2',baseline:{startingHand:0,money:8,sanity:3,inspiration:4,salary:3,escapeIncomeAtLeast:10,escapeSanityAtLeast:6,perActivityIncomeMax:4},market:source.market,changes,cards,projects};
writeFileSync('docs/cardpool-life-v0.18.json',JSON.stringify(data,null,2)+'\n');
const byId=new Map(cards.map(c=>[c.id,c]));
const at=(id,day,slot='am')=>({id,day,slot});
const scenarios=[
 {name:'画画起步：生活与少量收入',skills:'',expectedIncome:1,expectedSanity:4,plan:[at('A13',7)]},
 {name:'权限转型中途：履职与开发并行',skills:'WWB',protection:at('B06',2),expectedIncome:3,expectedSanity:3,plan:[at('W05',1),at('A13',1,'pm'),at('B06',2),at('B05',2,'night')]},
 {name:'红绿混合：无双休，生活与收入合一',skills:'AAABB',expectedIncome:10,expectedSanity:6,plan:[at('A06',1),at('A13',7,'pm'),at('A11',2),at('B11',3),at('A09',4),at('A07',7)]},
 {name:'开发为主：增强配合集中支持',skills:'BBBB',expectedIncome:10,expectedSanity:7,plan:[at('B13',1),at('W13',1,'pm'),at('B09',2),at('B06',3),at('B10',4),at('A06',5),at('B08',7)]},
 {name:'职场转商业：存量本金支撑副业',skills:'CCW',expectedIncome:10,expectedSanity:7,plan:[at('C12',2),at('C08',4),at('B13',5),at('C07',6),at('C06',7),at('W13',7,'pm')]},
];
const counts=s=>[...s].reduce((o,k)=>(o[k]=(o[k]||0)+1,o),{});
function audit(s){
 const used=new Set(),copies={},owned=counts(s.skills),nights=new Set();
 const plan=s.plan.map(p=>({...p,c:byId.get(p.id)}));
 for(const p of plan){
  assert(p.c);assert(p.day>=1&&p.day<=7);assert(['am','pm','night'].includes(p.slot));
  assert.equal(p.c.kind,'repeat');assert(!p.c.dice);
  for(const [r,n]of Object.entries(counts(p.c.requires)))assert((owned[r]||0)>=n,`${s.name}: ${p.id} skill`);
  copies[p.id]=(copies[p.id]||0)+1;assert(copies[p.id]<=(p.c.advanced?1:2));
  if(p.slot==='night'){assert.equal(p.c.hours,2);nights.add(p.day);}
  if(p.c.professional)assert(p.day<=6&&p.slot!=='night');
  const slots=p.c.hours===8?['am','pm']:[p.slot];
  if(p.c.hours===8)assert.equal(p.slot,'am');
  for(const slot of slots){const key=`${p.day}-${slot}`;assert(!used.has(key));used.add(key);}
 }
 const sum=f=>plan.reduce((n,p)=>n+f(p.c),0),support=sum(c=>c.support||0),pressure=sum(c=>c.stress),sanity=Math.min(10,3+support-pressure),upkeep=sum(c=>c.upkeep||0);
 assert(sanity>=0);for(const p of plan)assert(sanity>=p.c.minSanity&&sanity<=p.c.maxSanity,`${s.name}: ${p.id} sanity`);
 const order=p=>p.day*3+(p.c.hours===8||p.slot==='pm'?1:p.slot==='night'?2:0);
 plan.sort((a,b)=>order(a)-order(b));
 let inspiration=0,minimum=0,pending=null,professional=false,income=0,salaryBonus=0,executionMoney=0;
 const lines=[];
 for(const {c}of plan){
  inspiration-=c.cost.inspiration||0;minimum=Math.min(minimum,inspiration);executionMoney+=c.cost.money||0;
  inspiration+=c.gain.inspiration||0;if(c.emptyNightInspirationCap)inspiration+=Math.min(7-nights.size,c.emptyNightInspirationCap);
  let profit=c.gain.profit||0;
  if(c.condition==='emptyNights'&&7-nights.size>=c.bonusEmptyNights)profit+=c.conditionalBonus;
  if(c.condition==='professional'&&professional)profit+=c.conditionalBonus;
  if(profit&&pending&&(!pending.capitalOnly||c.capital))profit+=pending.type==='double'?Math.min(c.gain.profit,pending.amount):pending.amount;
  profit=Math.min(4,profit);income+=profit;salaryBonus+=c.gain.salary||0;
  pending=c.boost||null;professional||=!!c.professional;lines.push({id:c.id,profit});
 }
 assert(inspiration>=0,`${s.name}: ongoing inspiration deficit`);assert.equal(income,s.expectedIncome);assert.equal(sanity,s.expectedSanity);
 if(s.protection){const p=plan.find(p=>p.id===s.protection.id&&p.day===s.protection.day);assert(p&&p.c.hours<=4&&!p.c.professional&&p.slot!=='night');}
 return {name:s.name,skills:s.skills,weekend:false,plan:s.plan,sideIncome:income,sanity,support,pressure,upkeep,executionMoney,weeklyCashNet:3+salaryBonus+income-upkeep-executionMoney,inspirationNet:inspiration,minimumStartingInspiration:-minimum,purchasePrice:sum(c=>c.price),lockedCapital:sum(c=>c.capital||0),operatingReserve:upkeep+executionMoney,installedCards:plan.length,hours:sum(c=>c.hours),qualifiesToEscape:income>=10&&sanity>=6,lines,protection:s.protection||null};
}
assert.equal(cards.length,56);assert.equal(cards.filter(c=>c.support).length,9);
assert.deepEqual([2,4,8].map(h=>cards.filter(c=>c.hours===h).length),[16,20,20]);
for(const id of ['A13','B05','C07','A11','B11','B09']){
 const c=byId.get(id);assert.equal(c.upkeep,0);assert.equal(c.cost.money||0,0);
}
assert.equal(cards.filter(c=>c.dice).length,1);assert.equal(cards.find(c=>c.dice).kind,'growth');
const report={note:'Static candidate arithmetic with selected cards already owned, all fees funded, no inspections or team events, no weekend bonus, no night overtime. Not engine execution, acquisition simulation, win rate or balance validation. Purchase costs exclude archived growth, projects, previous purchases and the path to acquire this position.',scenarios:scenarios.map(audit),copiesOfA13:{copies:4,sideIncome:4,support:4,upkeep:0,weeklyCashNet:7,hours:16,purchasePrice:16,qualifiesToEscape:false}};
writeFileSync('docs/life-combos-v0.18.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({marketTypes:cards.length,supportTypes:9,changes:changes.length,scenarios:report.scenarios.map(({name,sideIncome,sanity,weeklyCashNet,purchasePrice,lockedCapital})=>({name,sideIncome,sanity,weeklyCashNet,purchasePrice,lockedCapital}))},null,2));
