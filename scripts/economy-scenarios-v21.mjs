// Favourable-market benchmarks, not random-market games or route win rates.
// Copies are moved from the real deck; money, seven daily actions, placement,
// archiving, upkeep and weekly payout all use the production engine.
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {getCard} from '../src/cards.js';
import {make,quiet,turn} from '../tests/helpers.mjs';

const activity=(type,day,period=0,capital)=>({type,day,period,capital});
export const scenarios=[
 {id:'basic',name:'零技能铺量',tasks:[
  activity('A08',6),activity('B06',3),activity('A07',4),
  activity('C13',1,2),activity('W13',5),activity('B08',2),
  activity('A07',4,1),activity('B06',3,1),activity('A07',0),activity('B06',0,1)]},
 {id:'creative',name:'创作逐级升级',draft:'A10',tasks:[
  activity('A07',4),activity('A02',2,2),activity('A01',5,2),activity('A09',6),
  activity('A03',3,2),activity('A04',5),activity('C13',0,2),
  activity('A10',2),activity('A13',4,1),activity('A08',3)]},
 {id:'developer',name:'开发并行',draft:'B10',tasks:[
  activity('B06',4),activity('B02',0,2),activity('B01',1,2),activity('B09',1,2),
  activity('B03',2,2),activity('B04',5),activity('C13',1,2),activity('W13',4,1),
  activity('B10',6),activity('B08',6),activity('C06',2),activity('A08',3),activity('A07',2,1)]},
 {id:'commercial',name:'商业积累本金',tasks:[
  activity('C05',4),activity('C02',1,2),activity('C01',3,2),activity('C09',6,0,8),
  activity('C13',0,2),activity('W13',5),activity('C08',3),activity('C06',4,1),
  {...activity('C09',6,0,20),adjust:true}]},
 {id:'career-commercial',name:'职场工资转投资',tasks:[
  activity('W07',4),activity('C05',3),activity('C02',1,2),activity('C01',2,2),
  activity('C09',6,0,12),activity('C13',0,2),activity('W13',5),
  {...activity('W07',4),remove:true},activity('C06',3,1),
  {...activity('C09',6,0,28),adjust:true}]},
];

function expose(g,type){
 const lane=getCard(type).hours,shown=g.market[lane].find(c=>c.type===type);
 if(shown)return shown;
 const i=g.decks[lane].findIndex(c=>c.type===type);assert(i>=0,`No remaining printed copy: ${type}`);
 const [c]=g.decks[lane].splice(i,1);g.decks[lane].unshift(g.market[lane].shift());g.market[lane].push(c);return c;
}
function favourDraft(g,type){
 // Guarantee this target is among the unseen candidates, without adding copies.
 const lane=getCard(type).hours;
 let i=g.market[lane].findIndex(c=>c.type===type);
 if(i>=0){const c=g.market[lane][i];g.market[lane][i]=g.decks[lane].pop();g.decks[lane].push(c);}
 i=g.decks[lane].findIndex(c=>c.type===type);
 if(i>=0)g.decks[lane].push(...g.decks[lane].splice(i,1));
}
export function acquireScenario(spec,{limit=18}={}){
 const g=make({playerCount:3,seed:42}),p=g.players[0],tasks=structuredClone(spec.tasks),weeks=[],actions=[];
 if(spec.draft)favourDraft(g,spec.draft);
 for(let w=1;w<=limit;w++){
  while(g.phase==='planning'){
   turn(g);if(g.phase!=='planning')break;
   let acted=false;
   for(const t of tasks){
    const d=getCard(t.type),slot={day:t.day,period:t.period};
    if(t.done&&!d.once&&!t.remove&&!E.findPlacement(p,t.uid))t.done=false;
    if(t.done)continue;
    if(t.remove){
     const c=p.cards.find(c=>c.type===t.type),at=c&&E.findPlacement(p,c.uid);
     if(!at||at.day<g.day||E.preview(g,0).income<3)continue;
     actions.push({week:g.week,day:g.day,action:'remove',type:t.type});
     E.unplace(g,0,c.uid);t.done=true;
     for(const previous of tasks)if(previous!==t&&previous.uid===c.uid)previous.retired=true;
     acted=true;break;
    }
    if(t.retired)continue;
    if(t.adjust){t.uid=p.cards.find(c=>c.type===t.type)?.uid;if(!t.uid)continue;}
    if(!t.uid){
     const free=p.cards.find(c=>c.type===t.type&&!tasks.some(x=>x.uid===c.uid));
     if(free)t.uid=free.uid;
    }
    if(t.uid){
     if(E.findPlacement(p,t.uid)&&!t.adjust){t.done=true;continue;}
     if(t.day<g.day||E.canPlace(g,p,t.uid,slot,t.capital))continue;
     // Preserve the already arranged lifestyle bill; don't place paid support
     // before there is income to sustain it or immediately spend its reserve.
     if(d.upkeep&&E.preview(g,0).income<3)continue;
     const existing=p.cards.filter(c=>E.findPlacement(p,c.uid)).reduce((n,c)=>n+(getCard(c).upkeep||0),0);
     const capital=(t.capital??d.capital??0)-(p.cards.find(c=>c.uid===t.uid)?.lockedCapital||0);
     if(p.money-capital<existing+(!E.findPlacement(p,t.uid)?d.upkeep||0:0)){
      if(capital>0)break; // Save for the planned investment before unrelated buys.
      continue;
     }
     actions.push({week:g.week,day:g.day,action:t.adjust?'invest':'place',type:t.type,capital:t.capital});
     E.place(g,0,t.uid,slot,t.capital);t.done=true;acted=true;break;
    }
    if(t.type===spec.draft)continue; // Acquired by the paid seminar, never gifted.
    if(!E.qualified(p,d))continue;
    const reserve=E.sanityState(g,p).upkeep;
    if(p.money<d.price.money+reserve)continue;
    const c=expose(g,t.type);t.uid=c.uid;
    actions.push({week:g.week,day:g.day,action:'buy',type:t.type,price:d.price.money});
    E.buy(g,0,c.uid);acted=true;break;
   }
   if(!acted)E.pass(g,0);
  }
  if(spec.draft)favourDraft(g,spec.draft);
  while(g.phase==='resolving'){
   E.resolveAll(g);if(g.opportunity)throw Error('Unexpected search in controlled route');
  }
  for(const draft of [...p.drafts]){
   const chosen=draft.options.find(c=>c.type===spec.draft)||draft.options[0];
   assert(chosen&&chosen.type===spec.draft,'Controlled seminar must expose its named target');
   E.chooseAdvanced(g,0,draft.id,chosen.uid);
  }
  weeks.push({week:g.week,income:p.income,sanity:p.sanity,cash:p.money,skills:E.skillCounts(p),
   supportFee:E.sanityState(g,p).upkeep,capital:p.cards.reduce((n,c)=>n+(c.lockedCapital||0),0),
   scheduled:p.cards.filter(c=>E.findPlacement(p,c.uid)).map(c=>c.type),
   eligible:E.eligible(g,p)});
  if(E.eligible(g,p))return {id:spec.id,name:spec.name,escapeWeek:g.week,weeks,actions};
  for(const q of g.players)if(!Object.hasOwn(g.escapeDecisions,q.id))E.chooseEscape(g,q.id,false);
  E.closeWeek(g);quiet(g);
 }
 return {id:spec.id,name:spec.name,escapeWeek:null,weeks,actions};
}
