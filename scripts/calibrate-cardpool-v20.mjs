// v20: spatial inspiration, native parallel activities and variable investment.
// Apply after the historical v19 calibration so generation stays reproducible.
export function calibrateV20({cards}) {
 const patch=(id,values)=>Object.assign(cards.find(c=>c.id===id),values);
 for(const c of cards){
  const needed=c.cost.inspiration||0;
  delete c.cost.inspiration;delete c.gain.inspiration;
  if(needed)c.inspirationRequired=needed;
  for(const key of ['emptyNightInspirationCap','emptyNightThreshold','emptyNightInspiration','discountAfter'])delete c[key];
 }
 patch('A01',{gain:{cash:1}});
 patch('A03',{gain:{cash:1}});
 patch('A05',{name:'音乐时光',price:1,support:1,upkeep:1,gain:{},effect:''});
 patch('A06',{price:3,gain:{profit:2},inspirationRequired:4,effect:''});
 patch('A07',{inspirationRequired:2});patch('A08',{inspirationRequired:3});
 for(const id of ['A09','A10']){
  const c=cards.find(c=>c.id===id);c.condition='inspiration';c.inspirationBonusAt=id==='A09'?3:5;
  delete c.bonusEmptyNights;c.effect=`灵感 ≥${c.inspirationBonusAt}：收入 +1。`;
 }
 patch('A11',{inspirationRequired:2,effect:'',gain:{profit:3}});
 patch('A12',{inspirationRequired:2,effect:'本周已执行过压有钱币的牌：收入 +1。'});
 patch('B03',{price:2});patch('C03',{price:2});
 patch('B05',{name:'小工具维护',price:2,stress:1,gain:{profit:1}});
 patch('W07',{gain:{salary:2}});
 patch('C07',{price:2,gain:{},opportunity:{count:2},effect:''});
 for(const [id,h,price,income,support] of [['B09',2,5,1,0],['B10',4,7,2,1],['B11',4,6,1,1],['B12',4,6,2,0]]){
  const c=cards.find(c=>c.id===id);delete c.boost;
  patch(id,{hours:h,price,parallel:true,gain:{profit:income},support,upkeep:0,effect:''});
 }
 patch('B11',{inspirationRequired:2});
 for(const [id,ratio,price] of [['C09',4,4],['C10',3,6]]){
  patch(id,{price,capital:0,capitalRatio:ratio,gain:{},effect:''});
 }
 patch('C12',{name:'招募伙伴',hours:4,price:4,requires:'CC',capital:0,support:0,upkeep:0,gain:{},hireFee:2,effect:''});
 for(const [id,count,price] of [['W14',2,2],['A14',3,3],['B14',3,2],['C14',4,3]]){
  patch(id,{kind:'repeat',price,cost:id==='C14'?{money:1}:{},opportunity:{count},effect:''});
 }
 patch('A14',{inspirationRequired:2});
 return cards;
}
