import * as E from '../src/engine.js';
import { getCard, STARTERS, ADVANCED } from '../src/cards.js';
import { writeFileSync } from 'node:fs';
const verbose = process.argv.includes('--verbose');
const matrix = process.argv.includes('--matrix');
const games = [];
for (const starterRecovery of matrix ? STARTERS : ['outing']) for (const playerCount of [2, 3, 4]) for (const seed of [7, 42, 20261008]) {
  const g = E.createGame({ playerCount, seed, starterRecovery }); g.players.forEach(p => p.bot = true);
  let firstCoreWeek=null, firstAdvancedWeek=null;
  while (g.phase !== 'ended' && g.week <= 40) {
    while (g.phase === 'procurement') E.botBuy(g);
    for (const p of g.players) { E.autoPlan(g, p.id); E.autoDiscard(g, p.id); E.lockPlan(g, p.id); }
    E.revealEvent(g); E.resolveAll(g);
    if(firstCoreWeek===null && g.players.some(p=>p.upgrades.length)) firstCoreWeek=g.week;
    if(firstAdvancedWeek===null && g.logs.some(l=>l.week===g.week&&l.slot&&!['warning','caught'].includes(l.tone)&&ADVANCED.some(d=>l.text.includes(`· ${d.name}`))))firstAdvancedWeek=g.week;
    for (const p of g.players) { E.botDraft(g, p.id); if (!Object.hasOwn(g.escapeDecisions, p.id)) E.chooseEscape(g, p.id, true); }
    if (verbose && playerCount === 3 && seed === 42) console.log(JSON.stringify({ week:g.week, players:g.players.map(p=>({skills:E.skillCounts(p), sanity:p.sanity, income:p.income, money:p.money, cards:p.cards.map(c=>getCard(c).name), upgrades:p.upgrades.map(c=>c.type)})) }));
    E.closeWeek(g);
    for (const p of g.players) for (const k of ['money','sanity','inspiration','achievement']) if (!Number.isFinite(p[k]) || p[k]<0) throw new Error(`Invalid ${k}`);
  }
  games.push({ starterRecovery, playerCount, seed, ended:g.phase==='ended', weeks:g.week, firstAdvancedWeek, firstCoreWeek, escapeWeeks:g.players.map(p=>p.escapedWeek), winners:g.players.filter(p=>E.won(g,p)).length, averageSteps: +(g.history.reduce((s,w)=>s+w.steps,0)/g.history.length).toFixed(1), skills:g.players.map(E.skillCounts), income:g.players.map(p=>p.income) });
}
const report={ note:'Heuristic bots test legal progress, not human playtime or route balance. Steps count active time slots across the table, not individual effects.', games };
const outputIndex=process.argv.indexOf('--output');
if(outputIndex>=0){if(!process.argv[outputIndex+1])throw new Error('--output requires a path');writeFileSync(process.argv[outputIndex+1],JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(games,null,2));
if (games.some(g=>!g.ended)) process.exitCode=1;
