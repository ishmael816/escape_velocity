import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';

test('UI feedback clears after a valid action, new game and timeout; failed actions retain the latest error',async()=>{
 const g=E.createGame({playerCount:2,mode:'hotseat',seed:20261009});
 g.players[0].cards.push({uid:'feedback-job',type:'W-E'});
 const storage=new Map([['escape-velocity-game-v24.2',JSON.stringify(g)]]),listeners={},classes=new Set(),timers=new Map();let timerId=0;
 const root={innerHTML:'',addEventListener:(name,fn)=>listeners[name]=fn},scroll={scrollLeft:0,scrollIntoView(){}},toast={textContent:'',classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}};
 const previous=Object.fromEntries(['document','localStorage','setTimeout','clearTimeout','FormData'].map(k=>[k,globalThis[k]]));
 globalThis.setTimeout=(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;};globalThis.clearTimeout=id=>timers.delete(id);
 globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
 globalThis.document={querySelector:s=>s==='#app'?root:s==='#toast'?toast:s==='.calendar-scroll'||s==='#shelf'||s==='.calendar-panel'?scroll:null,addEventListener(){},querySelectorAll:()=>[]};
 globalThis.FormData=class{constructor(form){return Object.entries(form.fields);}};
 const click=(action,data={})=>listeners.click({target:{closest:()=>({dataset:{action,...data}})}});
 const saved=()=>JSON.parse(storage.get('escape-velocity-game-v24.2'));
 const assertCleared=()=>{assert.equal(toast.textContent,'');assert.equal(classes.has('visible'),false);assert.equal([...timers.values()].filter(t=>t.ms===3500).length,0);};
 try{
  await import('../src/app.js');
  click('select',{uid:'feedback-job'});click('slot',{day:'6',period:'0'});
  assert.match(toast.textContent,/履职/);assert(classes.has('visible'));assert.equal(saved().actionCount,0);
  click('slot',{day:'0',period:'2'});assert(toast.textContent.length>0);assert(classes.has('visible'));assert.equal(saved().actionCount,0);
  assert.equal([...timers.values()].filter(t=>t.ms===3500).length,1);
  click('slot',{day:'0',period:'1'});assert.equal(saved().actionCount,1);assertCleared();
  // A new invalid action must show its own feedback after the old one was cleared.
  click('learn',{type:'missing-card'});assert(toast.textContent.length>0);assert(classes.has('visible'));
  listeners.submit({target:{id:'settings-form',fields:{mode:'hotseat',playerCount:'2',seed:'42'}},preventDefault(){}});
  assert.equal(saved().config.seed,42);assert.equal(saved().actionCount,0);assertCleared();
  click('learn',{type:'missing-card'});assert(toast.textContent.length>0);assert(classes.has('visible'));
  const timeout=[...timers.entries()].find(([,t])=>t.ms===3500);assert(timeout);timers.delete(timeout[0]);timeout[1].fn();assertCleared();
 }finally{for(const [key,value] of Object.entries(previous))globalThis[key]=value;}
});
