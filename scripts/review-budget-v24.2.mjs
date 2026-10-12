// Summarise already-completed engine runs; no simulated outcomes are invented here.
import fs from 'node:fs';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
const dir=process.argv[2]||'tmp';
const json=name=>JSON.parse(fs.readFileSync(path.join(dir,name)));
const gz=name=>JSON.parse(gunzipSync(fs.readFileSync(path.join(dir,name))));
const mean=a=>a.length?a.reduce((n,x)=>n+x,0)/a.length:null;
const histogram=a=>a.reduce((h,n)=>(h[n]=(h[n]||0)+1,h),{});
const construction=rows=>({escaped:rows.length,successfulIncomeCardsRequiringTwoSkills:histogram(rows.map(p=>p.successfulGrowthIncomeCards)),threeOrFour:rows.filter(p=>[3,4].includes(p.successfulGrowthIncomeCards)).length,meanCash:mean(rows.map(p=>p.cash))});
const pairs=gz('advanced-budget-paired-details.json.gz');
const escapedPairs=pairs.flatMap(g=>g.players.filter(p=>p.escaped).map(p=>({...g.weeks.find(w=>w.week===p.escaped).players[p.id],policy:p.policy})));
const multiplayer=gz('advanced-budget-multiplayer-details.json.gz');
const escapedMulti=multiplayer.games.flatMap(g=>g.players.filter(p=>p.escaped).map(p=>({...p.final,policy:p.policy,n:g.n})));
const smoke=json('advanced-budget-smoke.json');
const report={version:'0.24.2',note:'Heuristic policies, not human balance or elapsed playtime. Growth-income count means distinct successfully executed card instances with two printed skill requirements, not a game tier. Counts do not include suspended or unplaced cards. Simultaneous escape can produce multiple winners per game. Watchdogs are test limits, not game rules.',
 paired:{...json('advanced-budget-paired.json'),construction:construction(escapedPairs),constructionByPolicy:Object.fromEntries([...new Set(escapedPairs.map(p=>p.policy))].map(r=>[r,construction(escapedPairs.filter(p=>p.policy===r))])),watchdogCases:pairs.filter(g=>!g.ended).map(g=>({seed:g.seed,policies:g.players.map(p=>p.policy),last:g.weeks.at(-1)}))},
 multiplayer:{games:multiplayer.totalGames,ended:multiplayer.ended,endedBy24:multiplayer.endedBy24,meanWeeks:mean(multiplayer.games.map(g=>g.weeks)),weeks:[Math.min(...multiplayer.games.map(g=>g.weeks)),Math.max(...multiplayer.games.map(g=>g.weeks))],construction:construction(escapedMulti),byPlayerCount:Object.fromEntries([2,3,4].map(n=>[n,construction(escapedMulti.filter(p=>p.n===n))]))},
 demoBots:{games:smoke.games.length,ended:smoke.games.filter(g=>g.ended).length,meanWeeks:mean(smoke.games.map(g=>g.weeks)),weeks:[Math.min(...smoke.games.map(g=>g.weeks)),Math.max(...smoke.games.map(g=>g.weeks))],cashAtEscape:mean(smoke.games.flatMap(g=>g.cashAtEscape).filter(v=>v!==null))}
};
fs.writeFileSync('docs/rebalance-v0.24.2.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({paired:report.paired.construction,mixed:report.paired.constructionByPolicy.mixed,multiplayer:report.multiplayer,demoBots:report.demoBots},null,2));
