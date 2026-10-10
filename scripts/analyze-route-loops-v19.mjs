// Prepared-board experiments, not opening simulations or route win rates.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {CARDS,getCard} from '../src/cards.js';
import {make,add,lock,next,seedFor} from '../tests/helpers.mjs';

const specs=[
 {id:'creative',name:'创作：留白与长篇',skills:'AAAA',plan:[['A09',1],['A10',3],['A08',6],['A05',0,2],['C13',2,2]]},
 {id:'developer',name:'开发：两组增强',skills:'BBBB',plan:[['B09',0],['B06',1,0],['B07',1,1],['B10',2],['A13',6,0],['C05',4,2],['C13',5,2]]},
 {id:'commerce',name:'商业：本金经营',skills:'CCCC',plan:[['C10',1],['C09',3],['C08',6],['C13',0,2]]},
 {id:'career_commerce',name:'职场转商业：分红与经营',skills:'CCW',plan:[['C12',0],['C06',1,0],['A13',1,1],['C08',6],['C13',4,2]]},
 {id:'creative_developer',name:'创作×开发：素材与叙事',skills:'AABB',plan:[['B11',0],['A13',1,0],['B07',1,1],['A11',2],['A08',6]]},
 {id:'developer_commerce',name:'开发×商业：自动化代购',skills:'BCCC',plan:[['B12',0],['C06',1,0],['A07',1,1],['A13',2,0],['C09',6],['C13',4,2]]},
];
function archiveTypes(pattern){return [...new Set(pattern)].flatMap(r=>CARDS.filter(d=>d.skill===r).sort((a,b)=>a.price.money-b.price.money||a.id.localeCompare(b.id)).slice(0,[...pattern].filter(x=>x===r).length).map(d=>d.id));}
function prepare(spec){
 const g=make({startMoney:100}),p=g.players[0];
 p.skills=archiveTypes(spec.skills).map(type=>({uid:`archive-${type}`,type}));
 // Support first makes intermediate placements legal; reset the turn only for
 // board assembly. This is deliberately not a legal acquisition transcript.
 for(const [type,day,period=0] of [...spec.plan].sort((a,b)=>(getCard(b[0]).support||0)-(getCard(a[0]).support||0))){
  const c=add(g,p,type);g.day=0;g.turn=0;g.phase='planning';g.actionCount=0;g.dayPasses=0;
  assert.equal(E.canPlace(g,p,c.uid,{day,period}),null,`${spec.id}: ${type}`);
  E.place(g,p.id,c.uid,{day,period});
 }
 p.money=12;g.day=0;g.turn=0;g.actionCount=0;g.dayPasses=0;g.phase='planning';E.syncSanity(g,p);
 return g;
}
const facesFor=n=>n===0?[[]]:facesFor(n-1).flatMap(a=>Array.from({length:6},(_,i)=>[...a,i+1]));
const sequences=[0,1,2,3].map(n=>facesFor(n).map(faces=>({faces,seed:faces.length?seedFor(faces):1})));
function run(spec,{count=0,seed=1,blocked=null}={}){
 const g=prepare(spec),p=g.players[0];g.inspection.inspectionCount=count;g.diceRandom=seed;
 if(blocked!==null)g.inspection.blockedTimes=[{day:6,period:blocked}];
 lock(g);E.resolveAll(g);assert.equal(g.phase,'escape');
 return {income:p.income,sanity:p.sanity,eligible:E.eligible(g,p),cashDelta:p.money-12,inspirationDelta:p.inspiration-4,caught:p.caught};
}
const report=specs.map(spec=>{
 const archive=archiveTypes(spec.skills),defs=spec.plan.map(([id])=>getCard(id));
 const g=prepare(spec),p=g.players[0],continuity=[];
 for(let week=0;week<3;week++){
  const inspiration=p.inspiration;lock(g);E.resolveAll(g);
  continuity.push({income:p.income,sanity:p.sanity,inspirationDelta:p.inspiration-inspiration,scheduled:Object.values(p.schedule).flat().length});
  assert.equal(E.eligible(g,p),true,`${spec.id} calm week ${week+1}`);
  if(week<2)next(g);
 }
 return {...spec,archive,boardPrice:defs.reduce((n,d)=>n+d.price.money,0),archivePrice:archive.reduce((n,id)=>n+getCard(id).price.money,0),capital:defs.reduce((n,d)=>n+(d.capital||0),0),hours:defs.reduce((n,d)=>n+d.hours,0),daySlots:spec.plan.reduce((n,[id,,period=0])=>n+(period===2?0:getCard(id).hours===8?2:1),0),minimumPurchasePlaceActions:2*(defs.length+archive.length),upkeep:defs.reduce((n,d)=>n+(d.upkeep||0),0),calm:run(spec),continuity,
  inspections:sequences.map((seq,count)=>{const outcomes=seq.map(x=>run(spec,{count,seed:x.seed}));return {count,sequences:outcomes.length,escapeFraction:outcomes.filter(x=>x.eligible).length/outcomes.length,averageIncome:outcomes.reduce((n,x)=>n+x.income,0)/outcomes.length};}),
  sundayTeam:[0,1].map(blocked=>({period:blocked,...run(spec,{blocked})})),
 };
});
const openingSpecs=[
 {id:'creative',cards:['A05','A07','A02'],slots:[[1,2],[6,0],[5,2]]},
 {id:'developer',cards:['B06','B02','B13'],slots:[[6,0],[3,2],[6,1]]},
 {id:'commerce',cards:['C06','C02'],slots:[[6,0],[3,2]]},
 {id:'career',cards:['W05','W02','W01'],slots:[[1,0],[3,0],[5,0]]},
];
const openings=openingSpecs.map(spec=>{
 const g=make(),p=g.players[0];
 // A controlled starting market: all named cards are visible, no free cards.
 for(const type of spec.cards){
  const lane=getCard(type).hours;if(g.market[lane].some(c=>c.type===type))continue;
  const i=g.decks[lane].findIndex(c=>c.type===type);assert.ok(i>=0);
  const [c]=g.decks[lane].splice(i,1),j=g.market[lane].findIndex(x=>!spec.cards.includes(x.type));assert.ok(j>=0);
  const [old]=g.market[lane].splice(j,1,c);g.decks[lane].unshift(old);
 }
 const cashAfterAction=[];
 for(let i=0;i<spec.cards.length;i++){
  const type=spec.cards[i],c=g.market[getCard(type).hours].find(x=>x.type===type);assert.ok(c);
  E.buy(g,0,c.uid);cashAfterAction.push(p.money);E.pass(g,1);
  const [day,period]=spec.slots[i];E.place(g,0,c.uid,{day,period});cashAfterAction.push(p.money);E.pass(g,1);
 }
 lock(g);E.resolveAll(g);assert.equal(g.phase,'escape');
 return {...spec,actions:2*spec.cards.length,cashAfterAction,money:p.money,capital:p.cards.reduce((n,c)=>n+(c.lockedCapital||0),0),sanity:p.sanity,income:p.income,skills:E.skillCounts(p),inspiration:p.inspiration,upkeep:(p.supports||[]).filter(x=>x.active).reduce((n,x)=>n+x.fee,0)};
});
const result={note:'Prepared legal boards with required archived skills, no permanent weekend or protection, 12 liquid cash after capital is locked. No card acquisition probability, building time, live opponents or adaptive event response simulated. All currently implemented caps remain. Inspection probabilities are exact conditional one-week results for these fixed schedules, not route win rates. Openings use controlled visible offers, ordinary purchases and alternating legal actions from the real empty-hand starting resources, in a quiet week.',openings,boards:report};
fs.writeFileSync('docs/route-loops-v0.19.json',JSON.stringify(result,null,2)+'\n');
console.table(report.map(r=>({route:r.id,price:r.boardPrice,skills:r.archivePrice,capital:r.capital,hours:r.hours,income:r.calm.income,sanity:r.calm.sanity,inspiration:r.calm.inspirationDelta,fee:r.upkeep,oneDie:r.inspections[1].escapeFraction,twoDice:r.inspections[2].escapeFraction,threeDice:r.inspections[3].escapeFraction})));
