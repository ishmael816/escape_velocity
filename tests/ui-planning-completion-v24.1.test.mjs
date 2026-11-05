import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {make,rig,lock} from './helpers.mjs';
let run=0;
async function harness(g,body){
 const previous=Object.fromEntries(['document','localStorage','setTimeout','clearTimeout'].map(k=>[k,globalThis[k]]));
 const key='escape-velocity-game-v34-unified',storage=new Map([[key,JSON.stringify(g)],['escape-velocity-game-v24','old-C3-preserved']]),listeners={},timers=new Map();let id=0;
 const root={innerHTML:'',addEventListener:(n,fn)=>listeners[n]=fn},scroll={scrollLeft:0,scrollIntoView(){}},toast={textContent:'',classList:{add(){},remove(){}}};
 globalThis.setTimeout=(fn,ms)=>{timers.set(++id,{fn,ms});return id;};globalThis.clearTimeout=i=>timers.delete(i);
 globalThis.document={querySelector:s=>s==='#app'?root:s==='#toast'?toast:s==='.calendar-scroll'||s==='#shelf'||s==='.calendar-panel'?scroll:null,addEventListener(){},querySelectorAll:()=>[]};
 globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
 const click=(action,data={})=>listeners.click({target:{closest:()=>({dataset:{action,...data}})}}),saved=()=>JSON.parse(storage.get(key));
 const tick=(ms=420)=>{const entry=[...timers.entries()].find(([,t])=>t.ms===ms);assert(entry,'scheduled automatic action');timers.delete(entry[0]);entry[1].fn();};
 try{await import('../src/app.js?completion='+ ++run);await body({click,saved,tick,root,timers,storage});assert.equal(storage.get('escape-velocity-game-v24'),'old-C3-preserved');}
 finally{for(const [k,v]of Object.entries(previous))globalThis[k]=v;}
}
test('UI completion requires explicit risk confirmation, stops before dice, and leaves search to the player',async()=>{
 const g=make();rig(g,g.players[0],[['B04',6]]);g.players[1].planningDoneWeek=1;
 await harness(g,async({click,saved,tick,root,timers})=>{
  // Loaded completed players pause even when another human still has a turn.
  click('player',{id:'0'});click('finish-planning');assert(root.innerHTML.includes('确认风险'));assert.equal(saved().actionCount,0);
  click('confirm-done');assert.equal(saved().actionCount,0);for(let i=0;i<10;i++)tick();assert(saved().weekendReserve);click('reserve-skip');assert.equal(saved().phase,'resolving');assert.equal(saved().inspectionResolved,false);
  assert.equal([...timers.values()].filter(t=>t.ms===420).length,0);
  click('resolve');for(let i=0;i<30&&!saved().opportunity;i++)tick(180);assert(saved().opportunity);assert.equal(saved().opportunity.stage,'choose');assert(root.innerHTML.includes('活动选择'));
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

test('Monday row refresh UI blocks ordinary actions, changes only its row, then hands over',async()=>{
 const g=make(),before=g.market[4].filter(c=>c.marketRow===0).map(c=>c.uid),other=Object.values(g.market).flat().filter(c=>c.marketRow!==0).map(c=>c.uid);
 await harness(g,async({click,saved,root})=>{
  assert.equal((root.innerHTML.match(/class="route-market-title /g)||[]).length,4);
  assert(root.innerHTML.includes('II 级混合'));
  click('pass');assert.equal(saved().marketRefresh,null);click('pass');assert.equal(saved().marketRefresh.player,0);assert.equal(saved().actionCount,2);
  assert.equal((root.innerHTML.match(/data-action="market-row"/g)||[]).length,2);
  assert.equal((root.innerHTML.match(/data-action="market-card"/g)||[]).length,4);
  assert(!root.innerHTML.includes('data-action="learn"'));
  assert(root.innerHTML.includes('data-action="pass" disabled'));
  click('market-row',{row:'0'});const changed=saved();
  assert.equal(E.activeBuyer(changed),1);assert.equal(changed.actionCount,2);assert.equal(changed.marketRefresh.player,1);assert(E.refreshProtected(changed,0));
  const all=Object.values(changed.market).flat().map(c=>c.uid);assert(before.every(id=>!all.includes(id)));assert(other.every(id=>all.includes(id)));
  assert.equal((root.innerHTML.match(/data-action="market-row"/g)||[]).length,1);
  assert.equal(saved().marketRefresh.player,1);click('market-keep');assert.equal(saved().phase,'planning');assert.equal(saved().day,1);
 });
});
test('reload with a pending refresh restores controls for its owner only',async()=>{
 const g=make();E.pass(g,0);E.pass(g,1);
 await harness(g,async({click,saved,root,timers})=>{
  assert(root.innerHTML.includes('data-action="market-keep"'));assert.equal(timers.size,0);
  click('player',{id:'1'});assert(!root.innerHTML.includes('data-action="market-keep"'));
  click('player',{id:'0'});click('market-keep');assert.equal(E.activeBuyer(saved()),1);
 });
});

test('II refresh button replaces only the selected card and uses the single free choice',async()=>{
 const g=make(),target=E.marketCell(g,2,3).uid,others=Object.values(g.market).flat().filter(c=>c.uid!==target).map(c=>c.uid);
 await harness(g,async({click,saved,root})=>{
  click('pass');click('pass');assert(!root.innerHTML.includes('data-action="market-row" data-row="3"'));
  click('market-card',{route:'2'});const after=saved(),ids=Object.values(after.market).flat().map(c=>c.uid);
  assert(!ids.includes(target));assert(others.every(id=>ids.includes(id)));assert.equal(after.marketRefresh.player,1);assert(E.refreshProtected(after,3,2));assert.equal(after.actionCount,2);assert.equal(E.activeBuyer(after),1);
 });
});


test('one settlement run handles bot choices, can pause, and keeps the human view',async()=>{
 const g=make({mode:'bots'});rig(g,g.players[1],[['B04',0]]);lock(g);
 await harness(g,async({click,saved,tick,root,timers})=>{
  click('resolve');tick(180);click('pause-resolution');
  assert.equal([...timers.values()].filter(t=>t.ms===180).length,0);
  const cursor=saved().cursor;click('resolve');
  for(let i=0;i<40&&!saved().opportunity;i++)tick(180);
  assert(saved().opportunity);assert.equal(saved().opportunity.player,1);
  assert(root.innerHTML.includes('当前查看：你'));assert(!root.innerHTML.includes('aria-label="结算选择"'));
  click('rules');assert.equal([...timers.values()].filter(t=>t.ms===180).length,0);
  click('close');tick(180);assert.equal(saved().opportunity,null);
  for(let i=0;i<40&&saved().phase==='resolving';i++)tick(180);
  assert.equal(saved().phase,'escape');assert(saved().cursor>=cursor);
  assert(saved().uiForecast);assert(root.innerHTML.includes('结算前试算'));
 });
});

test('a human choice pauses the runner and completing it resumes settlement',async()=>{
 const g=make();rig(g,g.players[0],[['B04',0]]);lock(g);
 await harness(g,async({click,saved,tick,root,timers})=>{
  click('resolve');for(let i=0;i<40&&!saved().opportunity;i++)tick(180);
  assert(saved().opportunity);assert.equal(saved().opportunity.player,0);
  assert.equal([...timers.values()].filter(t=>t.ms===180).length,0);
  click('opp-skip');assert.equal(saved().opportunity,null);
  for(let i=0;i<40&&saved().phase==='resolving';i++)tick(180);
  assert.equal(saved().phase,'escape');assert(root.innerHTML.includes('本周统一领取'));
 });
});

test('card details expose costs before art, help starts with action guidance',async()=>{
 const g=make();await harness(g,async({click,root})=>{
  click('detail',{type:'A06'});
  assert(root.innerHTML.includes('购买费用'));assert(root.innerHTML.includes('每次执行费用'));
  assert(root.innerHTML.includes('维护费'));assert(root.innerHTML.includes('副业 +1'));
  click('close');click('rules');assert(root.innerHTML.includes('怎么赢'));assert(root.innerHTML.includes('当前能做什么'));
  assert(root.innerHTML.indexOf('help-start')<root.innerHTML.indexOf('icon-help'));
 });
});
