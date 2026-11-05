import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {make,add,lock} from './helpers.mjs';

test('human event choice works after reload, advances seats, saves, and preserves the previous rules save',async()=>{
 const g=make({startSanity:2});
 for(const p of g.players)add(g,p,'A06');
 g.inspection.wellbeing={max:2,effect:'hand'};lock(g);E.rollInspections(g);
 const key='escape-velocity-game-v34-unified',oldKey='escape-velocity-game-v34-unified-markers';
 const storage=new Map([[key,JSON.stringify(g)],[oldKey,'previous save untouched']]),listeners={};
 const root={innerHTML:'',addEventListener:(name,fn)=>listeners[name]=fn};
 const toast={textContent:'',classList:{add(){},remove(){}}};
 const previous=Object.fromEntries(['document','localStorage','setTimeout','clearTimeout'].map(k=>[k,globalThis[k]]));
 const timers=new Map();let timerId=0;globalThis.setTimeout=(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;};globalThis.clearTimeout=id=>timers.delete(id);
 globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
 globalThis.document={querySelector:s=>s==='#app'?root:s==='#toast'?toast:null,querySelectorAll:()=>[],addEventListener(){}};
 const click=(action,uid)=>listeners.click({target:{closest:()=>({dataset:{action,uid}})}});
 const saved=()=>JSON.parse(storage.get(key));
 try{
  await import('../src/app.js');
  assert(root.innerHTML.includes('事件处理'));
  assert(root.innerHTML.includes('data-action="opp-discard"'));
  click('opp-discard',g.players[0].cards[0].uid);
  assert.equal(saved().opportunity.player,1);
  assert.equal(saved().players[0].cards.length,0);
  click('opp-discard',g.players[1].cards[0].uid);
  assert.equal(saved().opportunity,null);
  assert.equal(saved().players[1].cards.length,0);
  click('resolve');for(let i=0;i<40&&saved().phase==='resolving';i++){const entry=[...timers].find(([,t])=>t.ms===180);assert(entry);timers.delete(entry[0]);entry[1].fn();}assert.equal(saved().phase,'escape');
  assert.equal(storage.get(oldKey),'previous save untouched');
  assert.equal(toast.textContent,'');
 }finally{for(const [k,v]of Object.entries(previous))globalThis[k]=v;}
});
