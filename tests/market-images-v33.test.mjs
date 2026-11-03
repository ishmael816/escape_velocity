import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CARDS,ADVANCED} from '../src/cards.js';
import {cardImage} from '../src/card-images.js';
import * as E from '../src/engine.js';
import {routeMarket} from '../src/minimal-ui.js';
test('all current cards use matching local physical faces; edited rules fall back to live rendering',()=>{
 for(const d of [...CARDS,...ADVANCED]){
  const url=cardImage(d);assert(url,d.id);const png=fs.readFileSync('.'+url);
  assert.equal(png.readUInt32BE(16),756);assert.equal(png.readUInt32BE(20),d.hours===8?2112:1056);
  assert.equal(cardImage({...d,name:d.name+'改'}),null);
 }
});
test('first purchase marks only the replacement as new and renders twelve offers',()=>{
 const g=E.createGame({mode:'hotseat',startMoney:100}),p=g.players[0];
 assert(!routeMarket(g,p,true,null).includes('class="new-offer"'));
 const c=g.market[4].find(c=>!E.canBuy(g,p,CARDS.find(d=>d.id===c.type)));E.buy(g,0,c.uid);
 const html=routeMarket(g,g.players[1],true,null);
 assert.equal((html.match(/class="new-offer"/g)||[]).length,1);
 assert.equal((html.match(/class="card-image-button"/g)||[]).length,12);
 assert(!html.includes('data-row="2"'));
});
