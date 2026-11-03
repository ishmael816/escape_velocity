// Static valuation plus prepared-board checks, not simulated purchase sequences.
import fs from 'node:fs';
import pool from '../src/cardpool-data.js';
import * as E from '../src/engine.js';
import {make,add,lock} from '../tests/helpers.mjs';
const mean=a=>a.reduce((s,n)=>s+n,0)/a.length;
const cards=pool.cards.map(c=>({id:c.id,name:c.name,level:c.hours===8?'II':'I',price:c.price,
  requirement:c.requires,referenceBudget:c.price/3+c.hours/4,
  fixedIncome:c.gain.profit||0,diceIncome:c.dice?.resource==='profit'?mean(c.dice.faces):0,
  sanity:c.support-c.stress,weeklyFee:(c.cost.money||0)+c.upkeep}));
function put(g,id,day,period=0){const c=add(g,g.players[0],id);(g.players[0].schedule[`${day}-${period}`]??=[]).push(c.uid);return c;}
const g=make({startMoney:8}),p=g.players[0];
for(const [id,day,period] of [['B03',0,0],['B03',0,1],['B03',1,0],['C02',1,1],['C02',2,0],['W10',0,2],['W10',1,2],['W10',2,2],['W10',6,0]])put(g,id,day,period);
const totalPurchase=p.cards.reduce((s,c)=>s+pool.cards.find(d=>d.id===c.type).price,0);
E.syncSanity(g,p);lock(g);E.resolveAll(g);
if(g.phase!=='escape')throw Error('Prepared board did not finish');
const faces=pool.cards.find(c=>c.id==='A11').dice.faces;
const result={scope:'Static card audit; prepared, previously purchased board; no inspections, team events or purchase chronology.',
  count:cards.length,physical:pool.cards.reduce((s,c)=>s+c.copies,0),
  reference:'Historical screening only: P/3 + h/4; not a calibrated current-game balance equation.',
  zeroSkillBoard:{cards:p.cards.map(c=>c.type),totalPurchase,startingWorkingCash:8,income:p.income,sanity:p.sanity,
    endingCash:p.money,weeklyCashDelta:p.money-8,eligible:E.eligible(g,p),archives:p.skills.length},
  paintingDice:{resource:pool.cards.find(c=>c.id==='A11').dice.resource,normal:mean(faces),highSanity:mean(faces.flatMap(a=>faces.map(b=>Math.max(a,b))))},cards};
const output=process.argv[2];if(output)fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,cards:undefined},null,2));
