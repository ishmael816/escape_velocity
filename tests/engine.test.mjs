import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import { EVENTS, CARDS, ADVANCED, CARD_MAP, STARTERS, ECONOMY, activityValue, MARKET_LIMITS, marketLane, getCard } from '../src/cards.js';

const game = options => E.createGame({ playerCount:3, mode:'hotseat', ...options });
function planning(g) { while(g.phase==='procurement') E.pass(g,E.activeBuyer(g)); return g; }
function card(g,p,type) { const c={uid:`c${++g.uid}`,type}; p.cards.push(c); return c; }
function skills(g,p,pattern) { for(const r of pattern) { const d=CARDS.find(d=>d.skill===r&&!p.skills.some(c=>c.type===d.id)); p.skills.push({uid:`c${++g.uid}`,type:d.id}); } }
function finish(g,event='普通的一周') { for(const p of g.players) if(!p.locked) E.lockPlan(g,p.id); g.inspectionDeck=[EVENTS.findIndex(e=>e.name===event)]; E.revealEvent(g); E.resolveAll(g); }
function next(g) { for(const p of g.players) { E.botDraft(g,p.id); if(!Object.hasOwn(g.escapeDecisions,p.id)) E.chooseEscape(g,p.id,false); } E.closeWeek(g); }
const sunAM={day:6,period:0},sunPM={day:6,period:1},monPM={day:0,period:1},monNight={day:0,period:2};

test('week maintenance is per working day; empty work and rest do not resolve',()=>{
 const g=game(),p=g.players[0]; assert.equal(E.workingDays(p),6); assert.equal(p.sanity,12); assert.equal(p.money,18);
 assert.equal(E.capacity(p,sunAM),3); assert.equal(E.capacity(p,monNight),0);
 planning(g);const sanity=p.sanity;finish(g); assert.equal(g.timeline.length,0);assert.equal(p.sanity,sanity);assert.equal(p.money,32);assert.equal(p.income,0);
 next(g);assert.equal(p.sanity,sanity-12);assert.equal(p.money,28);assert.deepEqual(g.purchaseOrder,[1,2,0,0,2,1]);
});
test('shortfall and maintenance never create negative resources; lying flat remains available',()=>{
 const g=game({startMoney:1,startSanity:2}); assert.equal(g.players[0].money,0);assert.equal(g.players[0].sanity,0);assert.equal(g.players[0].maintenance.shortfall,3);
 E.pass(g,0);assert.equal(g.players[0].sanity,4);assert.throws(()=>E.pass(g,0));
});
test('snake purchases refill immediately by duration; invalid purchases spend no turn',()=>{
 const g=game(),p=g.players[0]; assert.deepEqual(g.purchaseOrder,[0,1,2,2,1,0]);const c=g.market[1][0];E.buy(g,0,c.uid);assert.equal(g.market[1].length,4);assert.ok(p.cards.includes(c));
 while(E.activeBuyer(g)!==0)E.pass(g,E.activeBuyer(g));const before=JSON.stringify(g);assert.throws(()=>E.buy(g,0,'supply:outing'));assert.equal(JSON.stringify(g),before);E.pass(g,0);assert.equal(g.phase,'planning');
});
test('opportunities retain work-day maintenance and rebinding returns nested activity to hand',()=>{
 const g=planning(game()),p=g.players[0],slack=card(g,p,'slack-phone'),night=card(g,p,'night-owl'),mall=card(g,p,'mall');
 E.place(g,0,slack.uid,monPM);assert.equal(E.capacity(p,monPM),1);assert.equal(E.workingDays(p),6);assert.throws(()=>E.place(g,0,mall.uid,monPM));
 E.place(g,0,card(g,p,'shopping').uid,monPM);E.place(g,0,slack.uid,{day:1,period:1});assert.equal(p.schedule['0-1'],undefined);assert.ok(p.cards[0]);
 E.place(g,0,night.uid,monNight);E.place(g,0,mall.uid,monNight);E.unplace(g,0,night.uid);assert.equal(E.capacity(p,monNight),0);assert.equal(p.schedule['0-2'],undefined);
});
test('night slots cost sanity every week, including an empty opened slot; withdrawing stops cost',()=>{
 const g=planning(game()),p=g.players[0],n=card(g,p,'night-owl');E.place(g,0,n.uid,monNight);const s=p.sanity;finish(g);assert.equal(p.sanity,s-2);assert.equal(g.timeline.length,1);
 next(g);planning(g);const s2=p.sanity;finish(g);assert.equal(p.sanity,s2-2);next(g);planning(g);E.unplace(g,0,n.uid);const s3=p.sanity;finish(g);assert.equal(p.sanity,s3);
});
test('only explicit idle actions generate inspiration; clear removes them',()=>{
 const g=planning(game()),p=g.players[0];E.basic(g,0,sunAM,'idle');const i=p.inspiration;finish(g);assert.equal(p.inspiration,i+2);
 next(g);planning(g);E.basic(g,0,sunAM,'clear');const j=p.inspiration;finish(g);assert.equal(p.inspiration,j);
});
test('successful one-shot becomes a permanent distinct skill; repeated names do not grow skill count',()=>{
 const g=planning(game()),p=g.players[0],a=card(g,p,'journal');E.place(g,0,a.uid,sunAM);finish(g);assert.ok(!p.cards.includes(a));assert.equal(p.schedule['6-0'],undefined);assert.equal(E.skillCounts(p).A,1);
 next(g);planning(g);const b=card(g,p,'journal');E.place(g,0,b.uid,sunAM);finish(g);assert.equal(E.skillCounts(p).A,1);assert.ok(g.growthDecks.A.includes(b));
});
test('inspection cancels the activity without consuming it or double-charging work',()=>{
 const g=planning(game()),p=g.players[0],a=card(g,p,'journal'),o=card(g,p,'slack-phone');E.place(g,0,o.uid,monPM);E.place(g,0,a.uid,monPM);const s=p.sanity,m=p.money,i=p.inspiration;finish(g,'领导突然路过');
 assert.equal(p.sanity,s-2);assert.equal(p.money,m-2+g.config.salary);assert.equal(p.inspiration,i);assert.equal(E.skillCounts(p).A,0);assert.ok(p.cards.includes(a));assert.equal(p.caught,1);
});
test('insufficient resources keep a one-shot available; skill gates require the full mixed pattern',()=>{
 const g=planning(game()),p=g.players[0],a=card(g,p,'journal'),advanced=card(g,p,'microtool');p.inspiration=0;E.place(g,0,a.uid,sunAM);assert.throws(()=>E.place(g,0,advanced.uid,sunPM));finish(g);assert.ok(p.cards.includes(a));
 skills(g,p,'ABB');assert.equal(E.qualified(p,getCard(advanced)),true);assert.equal(E.qualified(p,getCard('freelance')),false);assert.deepEqual(E.skillMissing(p,getCard('freelance')),['B']);
});
test('seminar performs an actual draw, blocks close until choice, permits holding unqualified cards',()=>{
 const g=planning(game()),p=g.players[0],a=card(g,p,'seminar-A');E.place(g,0,a.uid,sunAM);finish(g);assert.equal(p.drafts.length,1);const d=p.drafts[0];assert.equal(d.options.length,2);assert.notEqual(d.options[0].type,d.options[1].type);assert.equal(E.skillCounts(p).A,1);
 assert.throws(()=>E.closeWeek(g));assert.throws(()=>E.openDraft(g,0,d.id,'B'));const chosen=d.options[0],other=d.options[1];E.chooseAdvanced(g,0,d.id,chosen.uid);assert.ok(p.cards.includes(chosen));assert.equal(g.advancedDecks.A[0].uid,other.uid);assert.equal(E.qualified(p,getCard(chosen)),false);next(g);planning(g);assert.throws(()=>E.place(g,0,chosen.uid,sunAM));
});
test('headhunter chooses exactly one pool, cannot reroll; a depleted eligible pool compensates',()=>{
 const g=planning(game()),p=g.players[0],a=card(g,p,'headhunter');E.place(g,0,a.uid,sunAM);finish(g);const d=p.drafts[0];assert.equal(d.options,null);E.openDraft(g,0,d.id,'B');assert.ok(d.options.every(c=>getCard(c).route==='B'));assert.throws(()=>E.openDraft(g,0,d.id,'C'));
 E.chooseAdvanced(g,0,d.id,d.options[0].uid);g.advancedDecks.C=[];p.drafts.push({id:'empty',pool:'C',options:null});const s=p.sanity;E.openDraft(g,0,'empty','C');assert.equal(p.sanity,s+g.config.passSanity);assert.equal(p.drafts.length,0);
});
test('draw excludes owned and built names, even when multiple physical copies exist',()=>{
 const g=game(),p=g.players[0];g.phase='escape';card(g,p,'newsletter');p.upgrades.push({type:'royalty',uid:'built',activeFrom:1});p.drafts.push({id:'draw',pool:'A',options:null});
 E.openDraft(g,0,'draw','A');assert.equal(p.drafts[0].options.length,2);assert.ok(p.drafts[0].options.every(c=>!['newsletter','royalty'].includes(c.type)));
});
test('employee bonus is shared and never counts as side income',()=>{
 const g=planning(game()),p=g.players[0],q=g.players[1];q.escaped=true;const m=p.money,n=q.money;finish(g,'项目奖金');assert.equal(p.money,m+5+g.config.salary);assert.equal(q.money,n);assert.equal(p.income,0);
});

test('event deck is majority inspections with two half-day Sunday disruptions',()=>{
 assert.equal(EVENTS.length,12);
 assert.equal(EVENTS.filter(e=>e.kind==='inspection').length,7);
 assert.equal(EVENTS.filter(e=>e.kind==='team').length,2);
 assert.equal(EVENTS.filter(e=>e.kind==='bonus'||e.kind==='weekend').length,2);
 assert.equal(EVENTS.filter(e=>e.kind==='quiet').length,1);
 assert.deepEqual(EVENTS.filter(e=>e.kind==='team').map(e=>e.blockedTimes),[[[6,0]],[[6,1]]]);
});

test('Sunday team event preserves a one-shot and its costs while the other half-day runs',()=>{
 const g=planning(game()),p=g.players[0],a=card(g,p,'seminar-A');
 E.place(g,0,a.uid,sunAM);E.place(g,0,p.cards.find(c=>c.type==='microjob').uid,sunPM);
 const before={money:p.money,sanity:p.sanity,inspiration:p.inspiration};
 finish(g,'周日晨间团建');
 assert.ok(p.cards.includes(a));assert.equal(p.schedule['6-0'],a.uid);assert.equal(p.skills.length,0);assert.equal(p.drafts.length,0);
 assert.equal(p.money,before.money+4+g.config.salary);assert.equal(p.sanity,before.sanity);assert.equal(p.inspiration,before.inspiration-1);assert.equal(p.income,4);assert.equal(p.caught,0);
 next(g);planning(g);finish(g);assert.equal(p.skills.some(c=>c.uid===a.uid),true);assert.equal(p.drafts.length,1);
});

test('team event pauses idle and permanent-weekend employees but exempts escaped players',()=>{
 const g=planning(game());g.players[1].weekend=true;g.players[2].escaped=true;
 for(const p of g.players) E.basic(g,p.id,sunPM,'idle');
 const before=g.players.map(p=>p.inspiration);finish(g,'周日午后团建');
 assert.deepEqual(g.players.map((p,i)=>p.inspiration-before[i]),[0,0,2]);
 assert.deepEqual(g.players.map(p=>p.caught),[0,0,0]);
});

test('team event survives save/restore without adding empty-slot resolution work',()=>{
 const empty=planning(game());finish(empty,'周日晨间团建');assert.equal(empty.timeline.length,0);
 const g=planning(game()),p=g.players[0];E.place(g,0,p.cards.find(c=>c.type==='outing').uid,sunAM);
 for(const p of g.players)E.lockPlan(g,p.id);
 g.inspectionDeck=[EVENTS.findIndex(e=>e.name==='周日晨间团建')];E.revealEvent(g);
 const restored=JSON.parse(JSON.stringify(g));E.resolveAll(g);E.resolveAll(restored);assert.deepEqual(restored,g);
 assert.ok(g.logs.some(l=>l.text.includes('被公司团建占用')));
});
test('temporary weekend starts next week, reduces maintenance once, expires and returns cards safely',()=>{
 const g=planning(game()),p=g.players[0];finish(g,'双休通知');assert.equal(E.capacity(p,{day:5,period:0}),0);next(g);assert.equal(p.maintenance.days,5);assert.equal(E.capacity(p,{day:5,period:0}),3);
 planning(g);const a=card(g,p,'mall');E.place(g,0,a.uid,{day:5,period:0});finish(g);next(g);assert.equal(p.maintenance.days,6);assert.equal(p.schedule['5-0'],undefined);assert.ok(p.cards.includes(a));
});
test('permanent weekend requires an earlier job, applies next week with unchanged salary',()=>{
 const g=planning(game()),p=g.players[0],w=card(g,p,'weekend');E.place(g,0,p.cards.find(c=>c.type==='microjob').uid,sunAM);E.place(g,0,w.uid,sunPM);finish(g);assert.equal(p.weekend,true);next(g);assert.equal(p.maintenance.days,5);assert.equal(g.config.salary,14);
});
test('core power activates following week and leaves the calendar',()=>{
 const g=planning(game()),p=g.players[0];skills(g,p,'AAAA');const c=card(g,p,'royalty');E.place(g,0,c.uid,sunAM);finish(g);assert.equal(p.income,0);assert.equal(p.upgrades.length,1);assert.equal(p.schedule['6-0'],undefined);
 next(g);planning(g);finish(g);assert.equal(p.income,6);
});
test('automation waives only the first technical income inspiration and adds income only once',()=>{
 const g=planning(game()),p=g.players[0];skills(g,p,'BBB');p.upgrades=[{type:'automation',uid:'core',activeFrom:1}];p.inspiration=1;
 const a=card(g,p,'freelance');E.place(g,0,a.uid,sunAM);E.place(g,0,p.cards.find(c=>c.type==='microjob').uid,sunPM);finish(g);assert.equal(p.income,10+2+4);assert.equal(p.inspiration,0);
});
test('remote agreement and multi-route brand change scheduling and reward successful route combinations',()=>{
 const g=planning(game()),p=g.players[0];p.upgrades=[{type:'remote',uid:'remote',activeFrom:2},{type:'brand',uid:'brand',activeFrom:2}];finish(g);next(g);assert.equal(p.maintenance.days,5);assert.equal(E.capacity(p,{day:2,period:0}),3);
 planning(g);for(const [type,slot] of [['journal',{day:2,period:0}],['repair',sunAM],['resale',sunPM]])E.place(g,0,card(g,p,type).uid,slot);finish(g);assert.equal(p.income,10);assert.equal(p.achievement,0);
});
test('preview is pure and matches a quiet week including resource ordering and income bonuses',()=>{
 const g=planning(game()),p=g.players[0];skills(g,p,'ABC');E.place(g,0,card(g,p,'editorial').uid,sunAM);E.place(g,0,p.cards.find(c=>c.type==='microjob').uid,sunPM);
 const before=JSON.stringify(g),pred=E.preview(g,0);assert.equal(JSON.stringify(g),before);finish(g);for(const key of ['money','sanity','inspiration','income','achievement'])assert.equal(p[key],pred[key]);assert.equal(p.income,6);
});
test('N minus one triggers current-week ending after all choices; strict income gate and shared wins',()=>{
 const g=planning(game());finish(g);g.players[0].income=24;assert.equal(E.eligible(g,g.players[0]),false);g.players[0].income=25;g.players[1].income=26;delete g.escapeDecisions[0];delete g.escapeDecisions[1];E.chooseEscape(g,0,true);assert.throws(()=>E.closeWeek(g));E.chooseEscape(g,1,true);E.closeWeek(g);assert.equal(g.phase,'ended');assert.equal(g.week,1);assert.ok(E.won(g,g.players[0]));assert.ok(E.won(g,g.players[1]));
});
test('pending advanced choices survive JSON save/restore with identical results',()=>{
 const g=planning(game()),p=g.players[0];E.place(g,0,card(g,p,'seminar-A').uid,sunAM);finish(g);const restored=JSON.parse(JSON.stringify(g));
 for(const state of [g,restored]){const d=state.players[0].drafts[0];E.chooseAdvanced(state,0,d.id,d.options[0].uid);next(state);}assert.deepEqual(restored,g);
});
test('all three routes have six distinct advanced cards and reachable permanent cores',()=>{
 assert.equal(new Set([...CARDS,...ADVANCED].map(c=>c.id)).size,CARDS.length+ADVANCED.length);
 for(const r of ['A','B','C']){assert.equal(ADVANCED.filter(c=>c.route===r).length,6);assert.equal(ADVANCED.filter(c=>c.route===r&&c.core).length,2);}
 for(const d of ADVANCED) for(const r of ['A','B','C'])assert.ok([...d.requires].filter(x=>x===r).length<=CARDS.filter(c=>c.skill===r).length);
});

test('catalogue follows operating budgets with explicit achievement and search tradeoffs',()=>{
 assert.equal(Object.keys(CARD_MAP).length,59);
 for(const d of CARDS.filter(d=>d.kind==='activity'&&!d.draft)){
  // Achievement is deliberately separated from the operating-resource estimate.
  const budget=activityValue(d)+(d.gain.achievement||0)*3;
  assert.equal(budget,ECONOMY.basic[d.size]+(d.consumable?5:0),d.id);
 }
 for(const d of ADVANCED.filter(d=>!d.core))assert.equal(activityValue(d),ECONOMY.advanced[d.size],d.id);
 for(const r of ['A','B','C'])assert.equal(CARDS.filter(d=>d.skill===r).length,6);
});

test('all starting recovery choices are selectable and unknown choices fall back safely',()=>{
 for(const type of STARTERS){const g=game({starterRecovery:type});assert.ok(g.players.every(p=>p.cards[0].type===type));}
 assert.equal(game({starterRecovery:'missing'}).players[0].cards[0].type,'outing');
});

test('one-shot supplies are discarded after success and grant no skill',()=>{
 const g=planning(game()),p=g.players[0],c=card(g,p,'spa'),s=p.sanity;
 E.place(g,0,c.uid,sunAM);finish(g);assert.equal(p.sanity,s+10);assert.ok(g.discard[1].includes(c));assert.equal(p.skills.length,0);assert.ok(!p.cards.includes(c));
});

test('combo rewards only the next successful job; failure preserves the bonus and week end clears it',()=>{
 const g=planning(game()),p=g.players[0];p.weekend=true;skills(g,p,'ABC');p.inspiration=0;
 E.place(g,0,card(g,p,'pipeline').uid,{day:5,period:0});
 E.place(g,0,card(g,p,'tutoring').uid,{day:5,period:1}); // Needs 2 inspiration; fails after pipeline gives 1.
 E.place(g,0,p.cards.find(c=>c.type==='microjob').uid,sunAM);
 E.place(g,0,card(g,p,'microjob').uid,sunPM); // No inspiration left: no second bonus or income.
 finish(g);assert.equal(p.income,6);assert.equal(p.jobBonuses.length,0);assert.equal(p.jobsDone,1);
 next(g);planning(g);E.unplace(g,0,p.schedule['6-0']);E.unplace(g,0,p.schedule['6-1']);E.unplace(g,0,p.schedule['5-1']);
 finish(g);assert.equal(p.jobBonuses.length,1);next(g);assert.equal(p.jobBonuses.length,0);
});

test('recovery can revive a zero-sanity player before a later job without forced rest',()=>{
 const g=planning(game()),p=g.players[0];p.sanity=0;
 E.place(g,0,p.cards.find(c=>c.type==='microjob').uid,sunAM);E.place(g,0,p.cards[0].uid,sunPM);finish(g);
 assert.equal(p.income,0);assert.equal(p.sanity,8);
 next(g);planning(g);p.sanity=0;E.place(g,0,p.cards[0].uid,sunAM);E.place(g,0,p.cards.find(c=>c.type==='microjob').uid,sunPM);finish(g);
 assert.equal(p.income,4);assert.equal(p.sanity,8);
});

test('default recovery plus one pass sustains three weeks with a growth purchase each week',()=>{
 const g=game(),p=g.players[0];
 for(const route of ['A','B','C']){
  let purchased=false;
  while(g.phase==='procurement'){const id=E.activeBuyer(g);if(id===0&&!purchased){const deck=g.growthDecks[route],i=deck.findIndex(c=>c.type===`seminar-${route}`);deck.push(...deck.splice(i,1));E.study(g,0,route);E.chooseStudy(g,0,g.studyOffer.options.find(c=>c.type===`seminar-${route}`).uid);purchased=true;}else E.pass(g,id);}
  E.place(g,0,p.cards.find(c=>c.type==='outing').uid,sunAM);E.place(g,0,p.cards.find(c=>c.type===`seminar-${route}`).uid,sunPM);finish(g);
  assert.ok(p.sanity>=24);assert.ok(p.money>=18);assert.equal(p.drafts.length,1);next(g);
 }
 assert.deepEqual(E.skillCounts(p),{A:1,B:1,C:1});assert.ok(p.sanity>=12);
});

test('every working time can be inspected; no permanently safe slack slot',()=>{
 const times=new Set(EVENTS.flatMap(e=>(e.times||[]).map(([d,p])=>`${d}-${p}`)));
 for(let day=0;day<6;day++)for(let period=0;period<2;period++)assert.ok(times.has(`${day}-${period}`));
});

for(const playerCount of [2,3,4]) for(const seed of [7,42,20261008]) test(`${playerCount} players, seed ${seed}: full legal game completes`,()=>{
 const g=game({playerCount,seed});g.players.forEach(p=>p.bot=true);
 while(g.phase!=='ended'&&g.week<=40){while(g.phase==='procurement')E.botBuy(g);for(const p of g.players){E.autoPlan(g,p.id);E.autoDiscard(g,p.id);E.lockPlan(g,p.id);}E.revealEvent(g);E.resolveAll(g);for(const p of g.players){E.botDraft(g,p.id);if(!Object.hasOwn(g.escapeDecisions,p.id))E.chooseEscape(g,p.id,true);}E.closeWeek(g);
 for(const p of g.players)for(const k of ['money','sanity','inspiration','achievement'])assert.ok(Number.isFinite(p[k])&&p[k]>=0);
 }assert.equal(g.phase,'ended');assert.ok(g.players.filter(p=>p.escaped).length>=playerCount-1);
});


test('shared market has 4/3/2 duration spaces and mixes opportunity with activity',()=>{
 const g=game();
 for(const [lane,count] of Object.entries(MARKET_LIMITS)){
  assert.equal(g.market[lane].length,count);
  const all=[...g.market[lane],...g.decks[lane]];
  assert.ok(all.every(c=>marketLane(getCard(c))===lane&&!getCard(c).skill));
  if(lane!=='4')assert.deepEqual(new Set(all.map(c=>getCard(c).kind)),new Set(['activity','opportunity']));
 }
 const snapshot=structuredClone(g.market), chosen=g.market[2][1];E.buy(g,0,chosen.uid);
 assert.equal(g.market[2].length,3);assert.ok(!g.market[2].includes(chosen));assert.deepEqual(g.market[1],snapshot[1]);assert.deepEqual(g.market[4],snapshot[4]);
});

test('duration pile exhaustion reshuffles only its own discard and may leave empty spaces',()=>{
 const g=game();g.decks[1]=[];g.discard[1]=[{uid:'recycled',type:'shopping'}];
 E.buy(g,0,g.market[1][0].uid);assert.equal(g.market[1].length,4);assert.ok(g.market[1].some(c=>c.uid==='recycled'));assert.equal(g.discard[1].length,0);
 E.buy(g,1,g.market[1][0].uid);assert.equal(g.market[1].length,3);
});

test('study commits one purchase, cannot reroll or pass, and resumes identically from JSON',()=>{
 const g=game(),p=g.players[0],money=p.money,deck=[...g.growthDecks.A];
 E.study(g,0,'A');assert.equal(p.money,money-3);assert.equal(g.purchaseIndex,0);assert.deepEqual(g.studyOffer.options,deck.slice(-2).reverse());
 const before=JSON.stringify(g);for(const fn of [()=>E.pass(g,0),()=>E.study(g,0,'B'),()=>E.buy(g,0,g.market[1][0].uid),()=>E.chooseStudy(g,1,g.studyOffer.options[0].uid),()=>E.chooseStudy(g,0,'fake')]){assert.throws(fn);assert.equal(JSON.stringify(g),before);}
 const saved=JSON.parse(before),pick=g.studyOffer.options[0],other=g.studyOffer.options[1];
 for(const state of [g,saved])E.chooseStudy(state,0,pick.uid);
 assert.deepEqual(g,saved);assert.ok(p.cards.includes(pick));assert.equal(g.growthDecks.A[0].uid,other.uid);assert.equal(g.purchaseIndex,1);assert.equal(g.studyOffer,null);
});

test('growth draw handles one card, empty pile and unaffordable registration without free reveals',()=>{
 const g=game();g.growthDecks.A=g.growthDecks.A.slice(0,1);E.study(g,0,'A');assert.equal(g.studyOffer.options.length,1);E.chooseStudy(g,0,g.studyOffer.options[0].uid);
 const before=JSON.stringify(g);assert.throws(()=>E.study(g,1,'A'));assert.equal(JSON.stringify(g),before);
 g.players[1].money=2;const poor=JSON.stringify(g);assert.throws(()=>E.study(g,1,'B'));assert.equal(JSON.stringify(g),poor);
});

test('weekend project is personal, has a finite card and returns to its owner when discarded',()=>{
 const g=game(),p=g.players[0],project=p.projects[0];assert.throws(()=>E.buy(g,0,g.players[1].projects[0].uid));
 E.buy(g,0,project.uid);assert.equal(p.projects.length,0);assert.ok(p.cards.includes(project));planning(g);E.discardCard(g,0,project.uid);assert.equal(p.projects[0],project);assert.ok(!p.cards.includes(project));
});

function allPhysicalCards(g){return [...Object.values(g.decks).flat(),...Object.values(g.discard).flat(),...Object.values(g.market).flat(),...Object.values(g.growthDecks).flat(),...Object.values(g.advancedDecks).flat(),...(g.studyOffer?.options||[]),...g.players.flatMap(p=>[...p.cards,...p.skills,...p.upgrades,...p.projects,...p.completedProjects,...p.drafts.flatMap(d=>d.options||[])])];}
test('a complete game conserves physical cards across drafts, skills, projects and discards',()=>{
 const g=game({playerCount:3,seed:42});g.players.forEach(p=>p.bot=true);
 const original=allPhysicalCards(g).map(c=>c.uid).sort();assert.equal(original.length,61*3);
 const check=()=>assert.deepEqual(allPhysicalCards(g).map(c=>c.uid).sort(),original);
 while(g.phase!=='ended'&&g.week<=40){while(g.phase==='procurement'){E.botBuy(g);check();}for(const p of g.players){E.autoPlan(g,p.id);E.autoDiscard(g,p.id);E.lockPlan(g,p.id);}E.revealEvent(g);E.resolveAll(g);check();for(const p of g.players){E.botDraft(g,p.id);if(!Object.hasOwn(g.escapeDecisions,p.id))E.chooseEscape(g,p.id,true);}E.closeWeek(g);check();}
 assert.equal(g.phase,'ended');
});
