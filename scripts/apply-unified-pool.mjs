// Apply the reviewed 56-card proposal. Does not modify gameplay defaults/events.
import fs from 'node:fs';
const file='data/cardpool-v31.json',pool=JSON.parse(fs.readFileSync(file));
const draft=JSON.parse(fs.readFileSync('docs/cardpool-unified-proposal-2026-11.json'));
const mechanics={
 A01:{generate:1},A02:{wholeNight:2},A03:{generate:2},A04:{generate:1},A05:{discardHand:3},A06:{},A07:{},A08:{},
 A09:{artist:2,distinctNights:true},A10:{spend:'inspiration',focus:{min:6,look:3}},A11:{inspirationDice:4},A12:{},A13:{},A14:{playSpend:'principal'},A15:{spend:'auto'},
 B01:{},B02:{},B03:{},B04:{focus:{min:6,look:4}},B05:{rightAuto:true,replay:true},B06:{belowBonus:1,focus:{min:6,belowBonus:2}},B07:{leftAuto:true},B08:{},B09:{autoProfit:2},B10:{agent:2},B11:{spend:'auto'},B12:{},B13:{playSpend:'auto'},B14:{playResources:{inspiration:2,auto:1}},
 C01:{},C02:{trade:{mode:'buy',limit:1,price:2}},C03:{trade:{mode:'either',limit:2,price:3}},C04:{capital:2,goodsIncome:false,trade:{mode:'sell',limit:1,price:4,own:true,fullPrice:5}},C05:{},C06:{capital:3},C07:{hire:true},C08:{trade:{mode:'buy',limit:3,price:5,bundle:true}},C09:{trade:{mode:'sell',limit:2,price:4}},C10:{capital:1},C11:{spend:'inspiration',goods:1},C12:{capital:2,autoProfit:1,autoRequiresFull:true,autoRestock:true},C13:{playSpend:'principal'},
 W01:{},W02:{},W03:{},W04:{completion:{cash:2,duty:1}},W05:{duty:1},W06:{},W09:{completion:{weekend:true}},W10:{},W11:{spend:'inspiration',completion:{duty:1}},W12:{playFee:3,completion:{cash:5,duty:1}},W13:{spend:'auto',duty:1},W14:{salaryDice:true},W15:{eventSplit:true},W16:{salaryTransfer:3},
};
const searches={A07:{count:2,route:'A'},A10:{count:2,free:true},B04:{count:2,route:'B'},B07:{count:3},C05:{count:2,route:'C'},W06:{count:2}};
const cash={W01:1,W02:3,W03:5,W06:2,W11:2,W13:2,A15:5,B11:5};
// The proposal ledger stores configured totals for these cards. Only the printed
// base belongs in gain; attached markers are read once at the weekly settlement.
const baseIncome={A09:2,B09:1,B10:2,C04:0,C06:1,C10:0,C12:1,W16:0};
pool.cards=draft.cards.map(d=>({
 id:d.id,name:d.name,route:d.route,hours:d.grade==='II'?8:4,price:d.price,requires:d.req,kind:d.steps?'growth':d.id==='W15'?'once':'repeat',copies:4,
 stress:Math.max(0,-d.sanity),support:Math.max(0,d.sanity),upkeep:['A12','W10'].includes(d.id)?d.fee:0,capital:0,
 minSanity:d.id==='W04'?2:0,maxSanity:d.id==='W15'?1:10,
 professional:['W04','W05','W06','W09','W11','W12','W13','W14','B12'].includes(d.id),offHours:['W01','W02','W03','W10','W16','A12'].includes(d.id),parallel:false,advanced:d.grade==='II',
 cost:d.fee&&!['A12','W10','C02','C08'].includes(d.id)?{money:d.fee}:{},gain:{...((baseIncome[d.id]??d.income)?{profit:baseIncome[d.id]??d.income}:{}),...(cash[d.id]?{cash:cash[d.id]}:{})},
 ...(d.steps?{progress:d.steps}:{}),...(searches[d.id]?{opportunity:{...searches[d.id],lane:4}}:{}),...(d.id==='C07'?{hireFee:1}:{}),mechanic:mechanics[d.id],
}));
pool.version='0.34.0';pool.rules.revision='unified-2026-11';
fs.writeFileSync(file,JSON.stringify(pool,null,2)+'\n');
