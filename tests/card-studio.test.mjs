import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Readable} from 'node:stream';
import source from '../src/cardpool-data.js';
import {clone, newCard, changedEntries, validatePool, parsePool} from '../src/card-studio-model.js';
import {generateOutputs} from '../scripts/generate-v31.mjs';
import {createStudioApi} from '../scripts/card-studio-api.mjs';
import {adapt, getCard} from '../src/cards.js';
import {cardFace} from '../src/card-face.js';
import * as E from '../src/engine.js';
import {make,rig,lock} from './helpers.mjs';

test('studio preserves every source card, event and mechanic in JSON round trips',()=>{
 assert.equal(source.cards.length,55);assert.equal(source.events.length,11);
 assert.deepEqual(validatePool(source),[]);assert.deepEqual(parsePool(JSON.stringify(source)),source);
 assert.deepEqual(changedEntries(source,clone(source)),[]);
 for(const card of source.cards)assert(cardFace(adapt(card)).includes(card.name));
 const draft=clone(source);draft.cards[0].price++;draft.events[0].copies++;
 assert.deepEqual(changedEntries(source,draft).map(x=>x.group),['cards','events']);
 assert.equal(source.cards[0].price,draft.cards[0].price-1);
});
test('new cards have distinct IDs and invalid engine combinations cannot be applied',()=>{
 const pool=clone(source),a=newCard(pool.cards);pool.cards.push(a);const b=newCard(pool.cards);pool.cards.push(b);
 assert.notEqual(a.id,b.id);assert.deepEqual(validatePool(pool),[]);
 for(const patch of [{hours:2},{copies:2},{requires:'X'},{minSanity:8,maxSanity:3},{boost:true},{boost:{amount:0}},{parallel:true,hours:8},{inspirationGenerate:1},{hireFee:1,opportunity:{count:3}}]){
  const bad=clone(pool);Object.assign(bad.cards.at(-1),patch);assert(validatePool(bad).length,JSON.stringify(patch));
 }
 assert.throws(()=>parsePool('{bad'));
});
test('edited special-effect values appear in both preview and generated documentation',()=>{
 const pool=clone(source),q=pool.cards.find(c=>c.id==='A10'),m=pool.cards.find(c=>c.maturation);
 q.opportunity.count=5;m.maturation.steps=3;
 assert(cardFace(adapt(q)).includes('看 5 张'));
 const outputs=generateOutputs(pool);assert(outputs['docs/cards-v0.32.md'].includes('看5免费取1'));assert(outputs['docs/cards-v0.32.md'].includes('前3次收入'));
 const d=newCard(pool.cards);d.boost={amount:2,capitalOnly:true};assert(cardFace(adapt(d)).includes('有本金的牌收入 +2'));
});
test('edited inspiration search count is used by the actual settlement engine',()=>{
 const def=getCard('A10'),before=def.opportunity.count;
 try{
  def.opportunity.count=5;const g=make(),p=g.players[0];rig(g,p,[['A10',0]]);p.inspirationSlots=['3-2'];lock(g);E.resolveAll(g);
  assert.equal(g.opportunity.stage,'v32');E.chooseActivity(g,0,{resource:'3-2'});assert.equal(g.opportunity.count,5);E.chooseOpportunityLane(g,0,4);assert.equal(g.opportunity.options.length,5);
 }finally{def.opportunity.count=before;}
});

async function request(api,{method='GET',payload,headers={},address='127.0.0.1'}={}){
 const req=Readable.from(payload===undefined?[]:[JSON.stringify(payload)]);req.method=method;req.headers={host:'127.0.0.1:5173','content-type':'application/json',...headers};req.socket={remoteAddress:address};
 let status,body;await api(req,{writeHead(code){status=code;},end(text){body=JSON.parse(text);}});return {status,body};
}
test('local apply backs up source, updates all generated files and rejects stale writes',async()=>{
 await mkdir('tmp',{recursive:true});const root=await mkdtemp(path.resolve('tmp/ev-studio-'));
 try{
  for(const dir of ['data','src','docs'])await mkdir(path.join(root,dir));
  const original=JSON.stringify(source,null,2)+'\n';await writeFile(path.join(root,'data/cardpool-v31.json'),original);
  for(const [file,text]of Object.entries(generateOutputs(source)))await writeFile(path.join(root,file),text);
  const api=createStudioApi(root),first=await request(api);assert.equal(first.status,200);
  const pool=clone(source);pool.cards[0].price++;
  const saved=await request(api,{method:'PUT',payload:{revision:first.body.revision,pool}});assert.equal(saved.status,200,JSON.stringify(saved.body));
  assert.equal(await readFile(path.join(root,saved.body.backup),'utf8'),original);
  assert.deepEqual(JSON.parse(await readFile(path.join(root,'data/cardpool-v31.json'),'utf8')),pool);
  for(const [file,text]of Object.entries(generateOutputs(pool)))assert.equal(await readFile(path.join(root,file),'utf8'),text);
  assert.equal((await request(api,{method:'PUT',payload:{revision:first.body.revision,pool}})).status,409);
  const invalid=clone(pool);invalid.cards[0].hours=2;
  assert.equal((await request(api,{method:'PUT',payload:{revision:saved.body.revision,pool:invalid}})).status,422);
  const metadata=clone(pool);metadata.defaults.startMoney++;
  assert.equal((await request(api,{method:'PUT',payload:{revision:saved.body.revision,pool:metadata}})).status,422);
  assert.equal((await request(api,{headers:{origin:'https://untrusted.example'}})).status,403);
  assert.equal((await request(api,{headers:{host:'untrusted.example'}})).status,403);
  assert.equal((await request(api,{address:'192.168.0.4'})).status,403);
  assert.equal((await readdir(path.join(root,'data/cardpool-backups'))).length,1);
  assert.deepEqual(JSON.parse(await readFile(path.join(root,'data/cardpool-v31.json'),'utf8')),pool);
 }finally{await rm(root,{recursive:true,force:true});}
});
