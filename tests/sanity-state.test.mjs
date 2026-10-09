import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {CARDS,ADVANCED} from '../src/cards.js';
const make=()=>E.createGame({playerCount:2,mode:'hotseat'});
const calm=g=>{g.inspection={name:'平静',kind:'quiet',times:[],blockedTimes:[]};return g;};
const turn=g=>{while(g.phase==='planning'&&E.activeBuyer(g)!==0)E.pass(g,E.activeBuyer(g));};
const finish=g=>{while(g.phase==='planning')E.pass(g,E.activeBuyer(g));E.resolveAll(g);};
const next=g=>{for(const p of g.players){E.botDraft(g,p.id);if(!Object.hasOwn(g.escapeDecisions,p.id))E.chooseEscape(g,p.id,false);}E.closeWeek(g);};
function grant(p,n){p.skills=CARDS.filter(d=>d.skill).slice(0,n).map((d,i)=>({uid:'skill'+i,type:d.id}));}

test('completed skills never improve sanity, regardless of count, route or duplicates',()=>{const g=make(),p=g.players[0];for(const n of [1,3,9,18]){grant(p,n);assert.equal(E.syncSanity(g,p),3);}p.skills.push({...p.skills[0]});assert.equal(E.syncSanity(g,p),3);p.sanity=6;assert.equal(E.syncSanity(g,p),3);p.skills=[];assert.equal(E.syncSanity(g,p),3);});
test('permanent weekend and escape are mutually exclusive circumstance levels',()=>{const g=make(),p=g.players[0];p.tempWeekend=true;assert.equal(E.syncSanity(g,p),3);p.weekend=true;assert.equal(E.syncSanity(g,p),5);p.escaped=true;assert.equal(E.syncSanity(g,p),7);grant(p,3);assert.equal(E.syncSanity(g,p),7);});
test('sanity cap cannot hide pressure or store an overflow refund',()=>{const g=calm(make()),p=g.players[0];g.config.startSanity=10;grant(p,3);p.weekend=true;E.syncSanity(g,p);E.place(g,0,p.cards[1].uid,{day:6,period:0});assert.equal(p.sanity,9);turn(g);E.unplace(g,0,p.cards[1].uid);assert.equal(p.sanity,10);});
test('clamp at zero does not erase accountability or allow withdrawal farming',()=>{const g=calm(make()),p=g.players[0],c=p.cards[1];E.place(g,0,c.uid,{day:6,period:0});p.accountability=5;E.syncSanity(g,p);assert.equal(p.sanity,0);turn(g);E.unplace(g,0,c.uid);assert.equal(p.sanity,0);assert.equal(p.accountability,5);turn(g);assert.match(E.canPlace(g,p,c.uid,{day:6,period:0}),/低于 0/);});
test('actual inspection can hit zero, resets next week, never refunds its fine',()=>{const g=calm(make()),p=g.players[0],c=p.cards[2];g.inspection={name:'查岗',kind:'inspection',times:[{day:0,period:0}],blockedTimes:[],money:1,sanity:2};E.place(g,0,c.uid,{day:0,period:0});const before=p.money;finish(g);assert.equal(p.sanity,0);assert.equal(p.accountability,4);assert.equal(p.money,before+12+6-2);const money=p.money;next(g);assert.equal(p.accountability,0);assert.equal(p.sanity,3);assert.equal(p.money,money);});
test('stable schedule does not drift over five weeks without purchases',()=>{const g=calm(make()),p=g.players[0];E.place(g,0,p.cards[1].uid,{day:6,period:1});turn(g);E.place(g,0,p.cards[2].uid,{day:6,period:0});for(let i=0;i<5;i++){finish(g);assert.equal(p.sanity,2);assert.equal(p.income,2);if(i<4){next(g);calm(g);assert.equal(p.sanity,2);}}});
test('preview derives state without mutating accountability, skills or actual bar',()=>{const g=calm(make()),p=g.players[0],d=CARDS.find(d=>d.skill),c={uid:'test-growth',type:d.id};p.cards.push(c);E.place(g,0,c.uid,{day:6,period:0});const before=JSON.stringify(g),preview=E.preview(g,0);assert.equal(preview.sanity,3);assert.equal(JSON.stringify(g),before);finish(g);assert.equal(p.sanity,preview.sanity);});
test('life and growth cash are not escape income, all sanity resource fields prohibited',()=>{for(const d of [...CARDS,...ADVANCED]){for(const v of [d.price,d.cost,d.gain])assert.equal(Object.hasOwn(v,'sanity'),false,d.id);assert.equal(d.powerSanity,undefined);}assert.ok(CARDS.filter(d=>d.category==='生活').every(d=>!d.income&&!d.gain.sanity));assert.ok(CARDS.filter(d=>d.skill).every(d=>!d.income));});
test('bot can release night pressure and replace low income instead of endlessly refreshing',()=>{const g=calm(make()),p=g.players[0];p.bot=true;g.config.startSanity=6;grant(p,3);p.weekend=true;const extra={uid:'extra',type:'podcast'},advance={uid:'advanced',type:'illustration'};p.cards.push(extra,advance);p.schedule={'6-2':[p.cards[2].uid,extra.uid],'6-0':[p.cards[1].uid]};E.syncSanity(g,p);assert.equal(p.sanity,3);const before=g.actionCount;E.botAct(g);assert.equal(g.actionCount,before+1);assert.ok(p.sanity>3);});

test('bot spends separate actions withdrawing a basic job and installing its qualified upgrade',()=>{
 const g=calm(make()),p=g.players[0];p.bot=true;g.config.startSanity=6;
 p.skills=['journal','sketch','repair'].map((type,i)=>({uid:'skill-'+i,type}));
 p.cards=['microjob','proofread','errands','illustration'].map((type,i)=>({uid:'job-'+i,type}));
 p.schedule={'4-0':['job-0'],'5-0':['job-1'],'6-0':['job-2']};E.syncSanity(g,p);
 assert.equal(p.sanity,3);E.botAct(g);assert.equal(g.actionCount,1);
 assert.equal(Object.values(p.schedule).flat().length,2);assert.equal(p.sanity,4);
 turn(g);E.botAct(g);assert.equal(g.actionCount,3);
 assert.ok(E.findPlacement(p,'job-3'));assert.equal(p.sanity,3);
});
