import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {make,rig} from './helpers.mjs';
let run=0;
async function harness(g,body){
 const previous=Object.fromEntries(['document','localStorage','setTimeout','clearTimeout'].map(k=>[k,globalThis[k]]));
 const key='escape-velocity-game-v24.2-engines',storage=new Map([[key,JSON.stringify(g)],['escape-velocity-game-v24','old-C3-preserved']]),listeners={},timers=new Map();let id=0;
 const root={innerHTML:'',addEventListener:(n,fn)=>listeners[n]=fn},scroll={scrollLeft:0,scrollIntoView(){}},toast={textContent:'',classList:{add(){},remove(){}}};
 globalThis.setTimeout=(fn,ms)=>{timers.set(++id,{fn,ms});return id;};globalThis.clearTimeout=i=>timers.delete(i);
 globalThis.document={querySelector:s=>s==='#app'?root:s==='#toast'?toast:s==='.calendar-scroll'||s==='#shelf'||s==='.calendar-panel'?scroll:null,addEventListener(){},querySelectorAll:()=>[]};
 globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
 const click=(action,data={})=>listeners.click({target:{closest:()=>({dataset:{action,...data}})}}),saved=()=>JSON.parse(storage.get(key));
 const tick=()=>{const entry=[...timers.entries()].find(([,t])=>t.ms===420);assert(entry,'scheduled automatic action');timers.delete(entry[0]);entry[1].fn();};
 try{await import('../src/app.js?completion='+ ++run);await body({click,saved,tick,root,timers,storage});assert.equal(storage.get('escape-velocity-game-v24'),'old-C3-preserved');}
 finally{for(const [k,v]of Object.entries(previous))globalThis[k]=v;}
}
test('UI completion requires explicit risk confirmation, stops before dice, and leaves search to the player',async()=>{
 const g=make();rig(g,g.players[0],[['S-Q',6]]);g.players[1].planningDoneWeek=1;
 await harness(g,async({click,saved,tick,root,timers})=>{
  // Loaded completed players pause even when another human still has a turn.
  click('player',{id:'0'});click('finish-planning');assert(root.innerHTML.includes('确认风险'));assert.equal(saved().actionCount,0);
  click('confirm-done');assert.equal(saved().actionCount,0);tick();tick();assert.equal(saved().phase,'resolving');assert.equal(saved().inspectionResolved,false);
  assert.equal([...timers.values()].filter(t=>t.ms===420).length,0);
  click('resolve');assert(saved().opportunity);assert.equal(saved().opportunity.stage,'lane');assert(root.innerHTML.includes('寻找机会'));
  assert.equal([...timers.values()].filter(t=>t.ms===420).length,0);
 });
});
test('UI reload pauses before bot actions; resume and cancel do not buy or erase prior consent',async()=>{
 const g=make({mode:'bots'});g.players[0].planningDoneWeek=1;g.turn=1;
 await harness(g,async({click,saved,root,timers})=>{
  assert(root.innerHTML.includes('继续自动跳过'));assert.equal(timers.size,0);assert.equal(saved().actionCount,0);
  click('resume-auto');assert.equal([...timers.values()].filter(t=>t.ms===420).length,1);assert.equal(saved().actionCount,0);
  click('cancel-done');assert.equal(saved().players[0].planningDoneWeek,undefined);assert.equal(saved().actionCount,0);
  assert.equal(saved().players[0].cards.length,0);
 });
});
test('opening help interrupts pending automatic passes until the dialog is closed',async()=>{
 const g=make();await harness(g,async({click,saved,tick,timers})=>{
  click('finish-planning');click('confirm-done');assert.equal([...timers.values()].filter(t=>t.ms===420).length,1);
  click('rules');assert.equal([...timers.values()].filter(t=>t.ms===420).length,0);assert.equal(saved().actionCount,0);
  click('close');tick();assert.equal(saved().actionCount,1);assert.equal(E.activeBuyer(saved()),1);
  assert.equal([...timers.values()].filter(t=>t.ms===420).length,0);
 });
});
