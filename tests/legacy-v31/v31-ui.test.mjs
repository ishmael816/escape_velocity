import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {opportunityPanel} from '../src/opportunity-ui.js';
import {make,rig,lock,add} from './helpers.mjs';

test('inspiration UI offers only empty nights and an explicit unpaid skip',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['A-I',6],['A-E',2,2]]);p.inspirationSlots=[];lock(g);E.resolveAll(g);
 const html=opportunityPanel(g);assert(html.includes('id="inspire-0"'));assert(!html.includes('value="2-2"'));assert(html.includes('放弃，不付费'));
});

test('creative search UI exposes token choice and free acquisition with skill gates',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['A-Q',0]]);p.inspirationSlots=['1-2','4-2'];lock(g);E.resolveAll(g);
 let html=opportunityPanel(g);assert(html.includes('data-key="1-2"'));assert(html.includes('data-key="4-2"'));assert(html.includes('保留灵感'));
 E.chooseActivity(g,0,'1-2');html=opportunityPanel(g);assert(html.includes('免费取得'));assert(html.includes('其余弃置'));assert(!html.includes('排回'));
 E.chooseOpportunityLane(g,0,4);html=opportunityPanel(g);assert(html.includes('取得 · 0 钱'));assert(html.includes('下周再安排'));
});

test('delivery UI offers unplaced hand cards without exposing scheduled cards as discard targets',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['A-X',0]]);const hand=add(g,p,'A-E'),placed=p.cards.find(c=>c.type==='A-X');lock(g);E.resolveAll(g);
 const html=opportunityPanel(g);assert(html.includes('data-uid="'+hand.uid+'"'));assert(!html.includes('data-uid="'+placed.uid+'"'));assert(html.includes('保留手牌'));assert(html.includes('另加收入 2'));
});
