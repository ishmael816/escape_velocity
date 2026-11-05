import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {getCard} from '../src/cards.js';

test('v23 UI: explicit protection target, growth action, old-save preservation and correct export version',async()=>{
 const g=E.createGame({playerCount:2,mode:'hotseat'}),p=g.players[0];p.protectionFrom=1;p.lastProtectedSlot='5-0';p.weekend=true;
 const c={uid:'ui-board-card',type:'A06'};p.cards.push(c);p.schedule={'2-0':[c.uid]};
 const old='{"version":22,"preserved":true}',storage=new Map([['escape-velocity-game-v22',old],['escape-velocity-game-v34-unified',JSON.stringify(g)]]),listeners={};
 const root={innerHTML:'',addEventListener:(name,fn)=>listeners[name]=fn},scroll={scrollLeft:0,scrollIntoView(){}},select={value:''},toast={textContent:'',classList:{add(){},remove(){}}};
 const previous={document:globalThis.document,localStorage:globalThis.localStorage,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,create:URL.createObjectURL,revoke:URL.revokeObjectURL};
 let exported,download;
 globalThis.setTimeout=()=>0;globalThis.clearTimeout=()=>{};
 globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
 globalThis.document={querySelector:s=>s==='#app'?root:s==='#toast'?toast:s==='#protection-slot'?select:s==='.calendar-scroll'||s==='#shelf'||s==='.calendar-panel'?scroll:null,addEventListener(){},querySelectorAll:()=>[],createElement:()=>({set download(v){download=v;},click(){}})};
 URL.createObjectURL=b=>{exported=b;return 'blob:fixture';};URL.revokeObjectURL=()=>{};
 try{
  await import('../src/app.js');
  const click=(action,data={})=>listeners.click({target:{closest:()=>({dataset:{action,...data}})}});
  assert(root.innerHTML.includes('选择时段与目标牌'));assert(root.innerHTML.includes('周三上午 · 专栏写作'));
  assert(root.innerHTML.includes('<option value="" selected disabled>')); // Previous Saturday no longer works after permanent weekend.
  click('slot',{day:'2',period:'0'});assert(root.innerHTML.includes('周三调度已有日程'));
  click('select',{uid:c.uid});assert(root.innerHTML.includes('点击绿色时段（移动免费）'));click('cancel');
  assert(!root.innerHTML.includes('value="0-0" selected'));click('protect');assert.equal(toast.textContent,'请先选择时段与目标牌。');
  select.value='2-0';click('protect');let saved=JSON.parse(storage.get('escape-velocity-game-v34-unified'));assert.equal(saved.players[0].lastProtectedSlot,'2-0');assert.equal(saved.actionCount,0);
  assert(!root.innerHTML.includes('购买成长牌'));assert(!root.innerHTML.includes('data-action="learn"'));
  const growth=Object.values(saved.market).flat().find(c=>getCard(c).skill&&!E.canBuy(saved,saved.players[0],getCard(c)));assert(growth);
  click('buy',{uid:growth.uid});saved=JSON.parse(storage.get('escape-velocity-game-v34-unified'));assert(saved.players[0].cards.some(c=>c.uid===growth.uid));assert.equal(saved.players[0].money,8-getCard(growth).price.money);assert.equal(saved.actionCount,1);
  click('export');const record=JSON.parse(await exported.text());assert.equal(record.appVersion,'0.34.0');assert.equal(record.rulesVersion,'0.34.0');assert.equal(record.game.version,32);assert(download.includes('v34'));assert.equal(storage.get('escape-velocity-game-v22'),old);
 }finally{globalThis.document=previous.document;globalThis.localStorage=previous.localStorage;globalThis.setTimeout=previous.setTimeout;globalThis.clearTimeout=previous.clearTimeout;URL.createObjectURL=previous.create;URL.revokeObjectURL=previous.revoke;}
});
