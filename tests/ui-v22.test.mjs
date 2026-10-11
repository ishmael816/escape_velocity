import test from 'node:test';
import assert from 'node:assert/strict';
// DOM contract smoke test, not a real browser/visual test.
test('fresh v22 UI renders, preserves v21 save, and shows the rebuilt catalogue and rules',async()=>{
 const oldSave='{"version":21,"cards":["old-card"]}',storage=new Map([['escape-velocity-game-v21',oldSave]]),listeners={};
 const root={innerHTML:'',addEventListener:(name,fn)=>listeners[name]=fn},scroll={scrollLeft:0,scrollIntoView(){}};
 globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
 globalThis.document={querySelector:s=>s==='#app'?root:s==='.calendar-scroll'||s==='#shelf'||s==='.calendar-panel'?scroll:null,addEventListener(){},querySelectorAll:()=>[]};
 await import('../src/app.js');
 assert(root.innerHTML.includes('v0.22'));assert(!root.innerHTML.includes('版图灵感'));assert(!root.innerHTML.includes('undefined'));
 const click=action=>listeners.click({target:{closest:()=>({dataset:{action}})}});
 click('catalogue');assert(root.innerHTML.includes('寻找机会'));assert(root.innerHTML.includes('自有品牌'));assert(root.innerHTML.includes('W-G1'));assert(!root.innerHTML.replace(/<[^>]*>/g,'').includes('2h'));
 click('rules');assert(root.innerHTML.includes('32种全新卡牌'));assert(root.innerHTML.includes('两个不同名成长来源'));assert(root.innerHTML.includes('夜间照常生效'));
 click('settings');assert(root.innerHTML.includes('value="2"'));assert(root.innerHTML.includes('旧v0.21存档保留'));assert.equal(storage.get('escape-velocity-game-v21'),oldSave);
 delete globalThis.document;delete globalThis.localStorage;
});
