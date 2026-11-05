import test from 'node:test';
import assert from 'node:assert/strict';
import {make,rig,add} from './helpers.mjs';
import {getCard} from '../src/cards.js';
import {placementRelation,resourceAdvice,captureForecast,nextResolutionAction} from '../src/interaction-feedback.js';

test('placement previews resolve actual neighboring cards without mutating the schedule',()=>{
 const g=make(),p=g.players[0];rig(g,p,[['A06',3,1],['B07',1,0]]);
 const pipeline=add(g,p,'B05'),data=add(g,p,'B06'),before=JSON.stringify(p);
 assert.deepEqual(placementRelation(p,pipeline.uid,{day:2,period:1}).targets,[p.cards[0].uid]);
 assert.deepEqual(placementRelation(p,data.uid,{day:3,period:0}).targets,[p.cards[0].uid]);
 assert.match(placementRelation(p,pipeline.uid,{day:6,period:0}).text,/暂时无法触发/);
 assert.equal(JSON.stringify(p),before);
});

test('resource warnings and forecasts do not mutate gameplay or advance RNG',()=>{
 const g=make(),p=g.players[0],before=JSON.stringify(g);
 assert.match(resourceAdvice(g,p,getCard('A10')).join('；'),/执行需要.*当前没有/);
 assert.equal(JSON.stringify(g),before);
 captureForecast(g);const forecast=g.uiForecast;delete g.uiForecast;
 assert.equal(JSON.stringify(g),before);assert.equal(forecast.players.length,2);
 assert.equal(nextResolutionAction({...g,phase:'resolving'},false),null);
 assert.equal(nextResolutionAction({...g,phase:'resolving'},true,true),null);
 assert.equal(nextResolutionAction({...g,phase:'resolving'},true),'step');
});
