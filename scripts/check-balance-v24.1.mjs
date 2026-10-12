// Independent static design arithmetic, NOT the game engine or a match simulator.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cards,rules,scenarios} from './scenarios-v24.1.mjs';
const map=Object.fromEntries(cards.map(c=>[c.id,c]));
assert.equal(cards.length,32);assert.equal(Object.keys(map).length,32);
const counts=ids=>Object.fromEntries([... 'WABC'].map(r=>[r,new Set(ids.filter(id=>map[id].skill===r)).size]));
const qualifies=(card,skills)=>[...'WABC'].every(r=>[...card.requires].filter(x=>x===r).length<=skills[r]);
const sourceCounts=counts(cards.filter(c=>c.skill).map(c=>c.id));
for(const c of cards){assert([4,8].includes(c.hours));assert(qualifies(c,sourceCounts));assert(!c.parallel||c.hours===4);assert(c.capitalRatio===null);assert.equal(c.conditions.length,0);assert(c.minSanity===0&&c.maxSanity===10);}
function calc(cs,nights=0,freedom=0){
 const sum=k=>cs.reduce((a,c)=>a+c[k],0),support=sum('support'),stress=sum('stress')+nights*rules.nightStress;
 return {cards:cs.length,income:sum('profit'),otherCash:sum('cash'),support,printedStress:sum('stress'),nightStress:nights*rules.nightStress,rawSanity:3+freedom+support-stress,sanity:Math.max(0,Math.min(10,3+freedom+support-stress)),printedHours:sum('hours'),purchase:sum('price'),capital:sum('capital'),upkeep:sum('upkeep')};
}
const dayNo=s=>['周一','周二','周三','周四','周五','周六','周日'].findIndex(d=>s.startsWith(d));
function slots(s,c){return c.hours===8?[dayNo(s)+'-0',dayNo(s)+'-1']:[dayNo(s)+'-'+(s.includes('上午')?0:s.includes('下午')?1:2)];}
function validateSchedule(spec){
 const occupancy={};for(let i=0;i<spec.cards.length;i++){
  const c=map[spec.cards[i]],label=spec.placements[i];assert(dayNo(label)>=0);
  assert(c.hours!==8||label.includes('全天'));assert(!c.professional||(!label.includes('夜晚')&&dayNo(label)<6&&!(spec.freedom===2&&dayNo(label)===5)));
  for(const s of slots(label,c))(occupancy[s]??=[]).push(c);
 }
 for(const [s,cs]of Object.entries(occupancy)){
  assert(cs.length<=2);if(s.endsWith('2'))assert.equal(cs.length,1);
  if(cs.length===2)assert(!s.endsWith('2')&&cs.every(c=>c.hours===4)&&cs.some(c=>c.parallel));
 }
 return occupancy;
}
const reports=scenarios.map(spec=>{
 const cs=spec.cards.map(id=>map[id]),skills=counts(spec.archives),night=spec.placements.filter(s=>s.includes('夜晚')).length;
 for(const c of cs)assert(qualifies(c,skills),spec.id+': '+c.id);
 const occupancy=validateSchedule(spec),r=calc(cs,night,spec.freedom);
 const growthGross=spec.archives.reduce((s,id)=>s+map[id].price,0),growthReturn=spec.archives.reduce((s,id)=>s+map[id].cash,0);
 const permissions=(spec.permissions||[]).map(id=>map[id]);for(const c of permissions)assert(qualifies(c,skills));
 r.growthGross=growthGross;r.growthReturn=growthReturn;r.permissionBuy=permissions.reduce((s,c)=>s+c.price,0);r.permissionExecution=permissions.reduce((s,c)=>s+c.progress*c.cost,0);
 r.minimumNetAcquisition=r.purchase+growthGross-growthReturn+r.permissionBuy+r.permissionExecution;
 r.minimumCommittedAndFee=r.minimumNetAcquisition+r.capital+r.upkeep;
 r.dayHalfSlots=Object.keys(occupancy).filter(k=>!k.endsWith('2')).length;r.nightSlots=night;r.calendarHours=r.dayHalfSlots*4+night*4;
 r.qualifiesAtQuietSettlement=r.income>=10&&r.sanity>=6;
 r.requiredPlayers=Math.max(2,...Object.entries(Object.fromEntries([...new Set(spec.cards)].map(id=>[id,spec.cards.filter(x=>x===id).length]))).map(([id,n])=>map[id].advanced&&new Set(map[id].requires).size>1?Math.max(2,2*n-1):n));
 // Shared inspection dates 1..6, support and income on caught non-professional
 // cards disappear; printed schedule stress remains. No cash shortage assumed.
 const inspected=faces=>{
  const active=cs.filter((c,i)=>c.professional||!faces.includes(dayNo(spec.placements[i])+1)||dayNo(spec.placements[i])===6||spec.placements[i].includes('夜晚')||(spec.freedom===2&&dayNo(spec.placements[i])===5));
  const support=active.reduce((s,c)=>s+c.support,0),income=active.reduce((s,c)=>s+c.profit,0),sanity=3+spec.freedom+support-r.printedStress-r.nightStress;
  return income>=10&&sanity>=6;
 };
 const seq=n=>n?[1,2,3,4,5,6].flatMap(f=>seq(n-1).map(t=>[f,...t])):[[]];
 r.inspectionStaticSurvival=[1,2,3].map(n=>{const all=seq(n);return {dice:n,pass:all.filter(inspected).length,total:all.length};});
 return {...spec,...r,cardIds:spec.cards};
});
// Exhaust all useful repeat-card multiplicities at N-player supply bounds.
// Excludes pure cash jobs/search: they cannot improve the final income/sanity
// feasibility, though they can improve acquisition speed (not modeled here).
function enumerate(skills,players){
 const defs=cards.filter(c=>c.kind==='repeat'&&(c.profit||c.support)&&qualifies(c,skills));
 let examined=0,passing=0,minCards=Infinity,best=[],cheapest=null;const chosen=[];
 function visit(i){
  if(i<defs.length){const c=defs[i],cap=c.advanced&&new Set(c.requires).size>1?Math.ceil(players/2):players;for(let n=0;n<=cap;n++){visit(i+1);chosen.push(c);}chosen.splice(chosen.length-cap-1);return;}
  examined++;const r=calc(chosen);if(r.income<10)return;
  const n8=chosen.filter(c=>c.hours===8).length,n4=chosen.length-n8,parallel=chosen.filter(c=>c.parallel).length;
  if(n8>7)return;
  for(let nights=0;nights<=Math.min(7,n4);nights++){
   const parallelLeft=parallel-Math.max(0,nights-(n4-parallel));
   const pairs=Math.min(parallelLeft,Math.floor((n4-nights)/2));
   const daySlots=2*n8+n4-nights-pairs,sanity=r.rawSanity-2*nights;
   if(daySlots>14||sanity<6)continue;
   passing++;if(r.cards<minCards){minCards=r.cards;best=[];}
   const cost=r.purchase+r.capital+r.upkeep,summary={ids:chosen.map(c=>c.id),cards:r.cards,income:r.income,sanity,daySlots,nights,upkeep:r.upkeep,purchase:r.purchase,capital:r.capital,firstFeeIncluded:cost};
   if(!cheapest||cost<cheapest.firstFeeIncluded||cost===cheapest.firstFeeIncluded&&r.cards<cheapest.cards)cheapest=summary;
   if(r.cards===minCards)best.push(summary);
   break;
  }
 }
 visit(0);best.sort((a,b)=>a.firstFeeIncluded-b.firstFeeIncluded||a.upkeep-b.upkeep||a.daySlots-b.daySlots);
 return {skills,players,definitionCount:defs.length,examined,passing,minCards:Number.isFinite(minCards)?minCards:null,cheapest,lowestFundingAtMinCards:best.slice(0,3)};
}
const bounds=[2,3,4].map(n=>enumerate({W:0,A:0,B:0,C:0},n));
const firstSkill=[...'WABC'].map(r=>enumerate(Object.fromEntries([...'WABC'].map(k=>[k,k===r?1:0])),4));
const report={status:'STATIC_DESIGN_ARITHMETIC_NOT_GAME_SIMULATION',rules,sourceCounts,byHours:[4,8].map(h=>({hours:h,count:cards.filter(c=>c.hours===h).length})),advanced:cards.filter(c=>c.advanced).length,scenarios:reports,zeroSkillBounds:bounds,oneSkillBounds:firstSkill};
fs.writeFileSync(new URL('../docs/static-balance-v0.24.1.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({cards:cards.length,sourceCounts,byHours:report.byHours,scenarios:reports.map(r=>({id:r.id,income:r.income,sanity:r.sanity,cards:r.cards,dayHalfSlots:r.dayHalfSlots,nightSlots:r.nightSlots,purchase:r.purchase,capital:r.capital,upkeep:r.upkeep,minimumCommittedAndFee:r.minimumCommittedAndFee,pass:r.qualifiesAtQuietSettlement})),bounds:bounds.map(r=>({players:r.players,minCards:r.minCards,best:r.lowestFundingAtMinCards[0]})),oneSkill:firstSkill.map(r=>({skills:r.skills,minCards:r.minCards,best:r.lowestFundingAtMinCards[0]}))},null,2));
