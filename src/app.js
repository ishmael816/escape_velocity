import { DAYS, SIZE, DEFAULTS, ROUTES, CARDS, ADVANCED, MARKET_LIMITS, STUDY_PRICE, STARTERS, getCard, slotKey, slotLabel } from './cards.js';
import * as engine from './engine.js';
import { FAMILIES, familyOf, hours, specialRules } from './card-visuals.js';

const STORAGE = 'escape-velocity-game-v6';
const app = document.querySelector('#app');
let game;
try { const stored = JSON.parse(localStorage.getItem(STORAGE)); if (stored?.version === 6) game = stored; } catch { /* A fresh game also works without local storage. */ }
game ||= engine.createGame();

game.config.escapeAchievement ??= DEFAULTS.escapeAchievement;
let selectedPlayer = 0, selectedCard = null, selectedSlot = null, shelf = game.phase === 'procurement' ? 'market' : 'hand';
let detailType = null;
let dialog = null, undo = [], autoplay = null, botTimer = null, lastPhase = game.phase;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const colors = ['#42786b', '#aa7650', '#7766a0', '#667f9b'];
const resourceNames = { money: '资金', sanity: '理智', inspiration: '灵感', achievement: '成就' };
const phaseNames = { procurement: '采购机会', planning: '规划日程', inspection: '每周事件', resolving: '度过一周', escape: '周末结算', ended: '终局结算' };

function icon(name, size = 20) {
  const paths = {
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    money: '<rect x="3" y="6" width="18" height="12" rx="3"/><circle cx="12" cy="12" r="3"/><path d="M6 10v4m12-4v4"/>',
    sanity: '<path d="M12 20V5c-3-5-8-1-6 3-5 1-4 7-1 8-1 4 4 6 7 4Zm0 0V5c3-5 8-1 6 3 5 1 4 7 1 8 1 4-4 6-7 4ZM6 8l3 2m9-2-3 2M5 16l4-2m10 2-4-2"/>',
    inspiration: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
    achievement: '<path d="m12 3 3 6 6 1-4.5 4.5 1 6.5-5.5-3-5.5 3 1-6.5L3 10l6-1Z"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M10 5h4m-3 14h2"/>',
    headphones: '<path d="M4 14V10a8 8 0 0 1 16 0v4"/><rect x="3" y="11" width="4" height="9" rx="2"/><rect x="17" y="11" width="4" height="9" rx="2"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    coffee: '<path d="M5 8h12v7a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8Zm12 1h2a3 3 0 0 1 0 6h-2M8 2v3m5-3v3"/>',
    moon: '<path d="M20 14a9 9 0 0 1-10-11A9 9 0 1 0 20 14Z"/><path d="m18 3 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z"/>',
    bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>',
    spark: '<path d="m12 3 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z"/><path d="m20 2 .5 2 2 .5-2 .5-.5 2-.5-2-2-.5 2-.5Z"/>',
    leaf: '<path d="M20 3c1 12-5 18-12 16-7-3-3-12 12-16Z"/><path d="M4 21 16 9"/>',
    pen: '<path d="m4 16-1 5 5-1L20 8a3 3 0 0 0-4-4L4 16Zm10-10 4 4M4 16l4 4"/>',
    bag: '<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V5a4 4 0 0 1 8 0v2M3 12h18m-11 0v3h4v-3"/>',
    book: '<path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15"/>',
    mountain: '<path d="m2 20 8-15 5 9 3-6 5 12H2Zm5-9 3 2 3-2M17 4h.01"/>',
    tent: '<path d="m12 3 10 18H2L12 3Zm0 0v18m0-9 5 9"/>',
    layers: '<path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',
    shop: '<path d="M4 10v11h16V10M2 10l3-7h14l3 7M2 10c0 4 5 4 5 0 0 4 5 4 5 0 0 4 5 4 5 0 0 4 5 4 5 0M9 21v-6h6v6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
    frame: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m5 17 5-6 4 4 3-3 4 5"/><circle cx="16" cy="8" r="1"/>',
    meeting: '<circle cx="8" cy="6" r="3"/><circle cx="17" cy="7" r="2"/><path d="M2 18v-4a6 6 0 0 1 12 0v4m1-6a5 5 0 0 1 7 4v2M2 21h20"/>',
    desk: '<path d="M2 14h20M5 14v7m14-7v7M6 3h12v8H6V3Zm6 8v3"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',
    settings: '<path d="M3 7h18M3 17h18"/><circle cx="8" cy="7" r="3" fill="currentColor"/><circle cx="16" cy="17" r="3" fill="currentColor"/>',
    exit: '<path d="M10 3H4v18h6m3-16 7 7-7 7m-5-7h12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    undo: '<path d="M3 10h10a7 7 0 0 1 0 14M3 10l5-5m-5 5 5 5" transform="translate(0 -3)"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M3 16v5h18v-5"/>',
    x: '<path d="m6 6 12 12M6 18 18 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    repeat: '<path d="M4 8h14l-3-3m3 3-3 3M20 16H6l3 3m-3-3 3-3"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
}
function tokens(values = {}, sign = '+', label = '') {
  return Object.entries(values).filter(([, n]) => n !== 0).map(([key, n]) => `<span class="effect-token ${key} ${sign === '−' ? 'expense' : ''}" title="${label}${resourceNames[key]} ${sign}${n}" aria-label="${label}${resourceNames[key]} ${sign}${n}">${icon(key, 17)}<b>${sign}${n}</b></span>`).join('');
}
function effects(def) {
  let result = tokens(def.cost, '−', '执行消耗：') + tokens(def.gain, '+', '执行收益：') + tokens(def.bonus, '+', '摸鱼成功：');
  if (def.method === 'night') result += tokens({ sanity: Math.max(1, game.config.nightSanity + (def.nightOffset || 0)) }, '−', '每周熬夜：');
  if (def.jobBonus || def.incomeBonus) result += `<span class="engine-token" title="副业收入加成">${icon('bag', 16)}${icon('arrow', 12)}${tokens({ money: def.jobBonus || def.incomeBonus })}</span>`;
  return `<div class="effect-ribbon">${def.minSanity ? `<span class="effect-token sanity requirement" title="执行所需最低理智" aria-label="执行所需理智至少${def.minSanity}">${icon('sanity', 17)}<b>≥${def.minSanity}</b></span>` : ''}${result}</div>`;
}
function cardFace(def, compact = false) {
  return `<div class="tabletop-face family-${familyOf(def)} duration-${hours(def.size)} ${compact ? 'compact-face' : ''}" style="--card-hours:${hours(def.size)}"><div class="face-heading"><span class="face-symbol">${icon(def.icon, compact ? 27 : 42)}</span><strong class="face-name">${esc(def.name)}</strong></div>${effects(def)}${def.requires ? `<div class="skill-requirements" title="所需技能，不消耗">${skillSymbols(def.requires)}</div>` : ''}${specialRules(def).length ? `<div class="special-rules">${specialRules(def).map(rule => `<span>${esc(rule)}</span>`).join('')}</div>` : ''}</div>`;
}
function skillSymbols(pattern) {
  return [...pattern].map(r => `<span class="skill-symbol family-${ROUTES[r].family}" title="${ROUTES[r].name}">${icon(ROUTES[r].icon, 13)}${r}</span>`).join('');
}
function skillZone(player) {
  const counts = engine.skillCounts(player), m = player.maintenance;
  return `<div class="maintenance-strip">本周已扣 · ${m.days} 个工作日 ${tokens({sanity:m.sanity},'−')} · 生活费 ${tokens({money:m.money},'−')}${m.shortfall ? ` · 缺款额外理智 −${m.shortfall}` : ''}<span>空白工作 / 默认休息不再逐格结算</span></div><section class="skill-tray" aria-label="技能区">${Object.entries(ROUTES).map(([r, info]) => `<details class="skill-stack family-${info.family}"><summary>${icon(info.icon,21)}<span>${r} · ${info.name}</span><b>${counts[r]}</b></summary><div>${player.skills.filter(c => getCard(c).skill === r).map(c => `<span class="skill-slip">${esc(getCard(c).name)}</span>`).join('') || '<span class="tiny">完成该类一次性活动，收入这里。</span>'}</div></details>`).join('')}<button class="atlas-link" data-action="catalogue">${icon('layers',20)}查看技能路线 ${icon('arrow',15)}</button></section>${player.upgrades.length ? `<div class="upgrades-tray">${player.upgrades.map(c => `<button class="upgrade-plaque family-${familyOf(getCard(c))}" data-action="detail" data-type="${c.type}">${icon('achievement',20)}<span><b>${esc(getCard(c).name)}</b><small>${c.activeFrom > game.week ? '下周生效' : '永久能力已生效'}</small></span></button>`).join('')}</div>` : ''}`;
}
function growthPanel() {
  const buyer = game.phase === 'procurement' ? game.players[engine.activeBuyer(game)] : null;
  const available = buyer && !buyer.bot && !game.studyOffer && engine.canPay(buyer, STUDY_PRICE);
  return `<section class="growth-panel"><div class="market-label"><span>选一个成长方向</span><small>3 资金 · 抽 2 留 1 · 占一次采购</small></div><div class="growth-decks">${Object.entries(ROUTES).map(([route,info]) => `<button class="growth-deck family-${info.family}" data-action="study" data-route="${route}" ${available && game.growthDecks[route].length ? '' : 'disabled'}><span class="deck-seal">${icon(info.icon,28)}</span><b>${route} · ${info.name}</b><small>${game.growthDecks[route].length} 张 · 背面朝上</small></button>`).join('')}</div><p class="market-footnote">候选仅在报名后翻开，另一张放回牌底。高级牌仍须通过交流活动取得。</p>${game.studyOffer && !game.players[game.studyOffer.playerId].bot ? '<button class="primary-button" data-action="study-offer">完成已报名的二选一</button>' : ''}</section>`;
}
function projectPanel(player) {
  const card = player.projects[0];
  if (!card || player.weekend || player.escaped) return '';
  const available = game.phase === 'procurement' && engine.activeBuyer(game) === player.id && !player.bot && !game.studyOffer && engine.canPay(player,getCard(card).price);
  return `<div class="personal-project"><span>${icon('sun',20)} <b>个人项目 · 争取双休</b><small>启动后成为 4h 活动；先完成副业，再支付执行费用。</small></span><button class="outline-button" data-action="buy" data-uid="${card.uid}" ${available ? '' : 'disabled'}>启动 ${priceText(getCard(card).price)}</button><button class="detail-button" data-action="detail" data-type="weekend" aria-label="双休项目详情">${icon('info',17)}</button></div>`;
}
function studyMarkup() {
  const offer = game.studyOffer;
  if (!offer) return '<p>本次选择已完成。</p>';
  const player = game.players[offer.playerId];
  return `<p class="dialog-intro">${esc(player.name)}已支付 3 资金。保留一张，另一张回牌底；不能改选路线或退回躺平。${offer.options.length === 1 ? '牌堆仅剩一张。' : ''}</p><div class="draft-options">${offer.options.map(c => { const d=getCard(c), duplicate=player.skills.some(s=>s.type===c.type); return `<article class="draft-card family-${familyOf(d)}">${cardFace(d)}${duplicate ? '<p class="tiny">已留存同名技能：仍可执行收益，完成后回成长牌底，不增加技能。</p>' : ''}<button class="primary-button" data-action="study-choose" data-uid="${c.uid}">保留「${esc(d.name)}」</button></article>`; }).join('')}</div>`;
}
function basicCatalogue() {
  const groups = [
    ['恢复与灵感', CARDS.filter(d => d.kind === 'activity' && !d.once && !d.income)],
    ['基础副业', CARDS.filter(d => d.income)],
    ['一次性补给 · 不留技能', CARDS.filter(d => d.consumable)],
    ['时间与寻访', [...CARDS.filter(d => d.kind === 'opportunity' || d.id === 'headhunter'), getCard('weekend')]],
  ];
  return `<details class="basic-catalogue"><summary>基础牌与时间机会 · 点击查看完整牌面</summary><div class="route-catalogue">${groups.map(([name, defs]) => `<section class="route-column"><h3>${name}</h3><div class="route-starters">${defs.map(d => `<button data-action="detail" data-type="${d.id}">${icon(d.icon,18)}${d.name}<span>${hours(d.size)}h${STARTERS.includes(d.id) ? ' · 可选起始' : ''}</span></button>`).join('')}</div></section>`).join('')}</div></details>`;
}
function catalogueMarkup() {
  const player = game.players[selectedPlayer];
  return `<p class="dialog-intro">规则参考册：59 种牌的内容公开，但不在桌面同时展示，也不能从本页直接选购。基础重复牌维持生活；成长活动留下技能；补给牌执行后弃置；交流活动从对应高级池抽二选一。技能永久保留、同名只计一次。</p>${basicCatalogue()}<div class="route-catalogue">${Object.entries(ROUTES).map(([route,info]) => `<section class="route-column family-${info.family}"><h3>${icon(info.icon,23)}${route} · ${info.pool}</h3><p class="tiny">${route === 'A' ? '创作积累 → 订阅、版权与灵感循环' : route === 'B' ? '技术实践 → 工具、自动化与时间自由' : '经营尝试 → 顾问、社群与品牌联动'}</p><div class="route-starters"><small>积累 ${route} 技能 · 每种活动只计一次</small>${CARDS.filter(d => d.skill === route).map(d => `<button data-action="detail" data-type="${d.id}">${d.name}<span>${hours(d.size)}h · 成长牌堆</span></button>`).join('')}</div>${ADVANCED.filter(d => d.route === route).map(d => `<button class="atlas-card ${d.core ? 'core-card' : ''}" data-action="detail" data-type="${d.id}"><div><b>${d.core ? '✦ ' : ''}${d.name}</b><span>${hours(d.size)}h · ${d.core ? '永久核心' : '每周活动'}</span></div><div class="skill-requirements">${skillSymbols(d.requires)}<small>${engine.qualified(player,d) ? '已满足' : `尚缺 ${engine.skillMissing(player,d).join('')}`}</small></div>${effects(d)}${d.rule ? `<p>${esc(d.rule)}</p>` : ''}${d.jobBonus && !d.rule ? `<p>本周后续 ${d.jobBonusUses} 次成功副业额外 +${d.jobBonus} 资金</p>` : ''}</button>`).join('')}</section>`).join('')}</div>`;
}
function detailMarkup() {
  const d = getCard(detailType), p = game.players[selectedPlayer];
  return `<div class="card-reference family-${familyOf(d)}">${cardFace(d)}<p>${hours(d.size)}h · ${d.kind === 'opportunity' ? '机会牌' : d.once ? '一次性活动' : '每周可重复活动'}${d.income ? ' · 收入计入逃离门槛' : ''}</p>${d.requires ? `<p>所需技能 ${d.requires}：${engine.qualified(p,d) ? '已满足，可以安排。' : `尚缺 ${engine.skillMissing(p,d).join('')}，可先保留，下周再规划。`}</p>` : `<p>购入费用 ${priceText(d.price)}</p>`}${d.skill ? '<p>成功执行后从日程收入技能区；同名只计一次。被取消或无法执行时保留手牌。</p>' : ''}${d.consumable ? '<p>成功执行后进入弃牌区，不留下技能。</p>' : ''}${d.core ? '<p>执行一次后收入永久能力区，不再占时间；从下一周生效。</p>' : ''}</div><button class="outline-button" data-action="catalogue">查看全部高级路线</button>`;
}
function draftMarkup() {
  return game.players.filter(p => !p.bot && p.drafts.length).map(p => `<section class="draft-section"><h3>${esc(p.name)} · 本周遇见的机会</h3>${p.drafts.map(d => `<div class="draft-offer"><p>来自「${esc(d.source)}」${d.options ? ' · 选择一张，另一张放回牌池底部' : ' · 先选择一个高级池'}</p>${d.options ? `<div class="draft-options">${d.options.map(c => { const def = getCard(c); return `<article class="draft-card family-${familyOf(def)}">${cardFace(def)}<p class="tiny">${engine.qualified(p,def) ? '技能已满足，下周可安排' : `尚缺 ${engine.skillMissing(p,def).join('')}；仍可先保留`}</p><button class="primary-button" data-action="draft-choose" data-player="${p.id}" data-draft="${d.id}" data-uid="${c.uid}">选择「${def.name}」</button></article>`; }).join('')}</div>` : `<div class="split-buttons">${Object.entries(ROUTES).map(([r,info]) => `<button class="outline-button" data-action="draft-pool" data-player="${p.id}" data-draft="${d.id}" data-pool="${r}">${icon(info.icon,18)}${info.pool}</button>`).join('')}</div>`}</div>`).join('')}</section>`).join('');
}
function visualLegend() {
  return `<div class="tabletop-legend">${Object.entries(FAMILIES).map(([key, value]) => `<span class="family-key family-${key}">${icon(value.icon, 15)}${value.name}</span>`).join('')}<span class="duration-legend">${icon('clock', 15)} 1h 小 · 2h 中 · 4h 大</span><span class="notation-legend">− 消耗 / + 收益 / ≥ 条件</span></div>`;
}

function persist() { try { localStorage.setItem(STORAGE, JSON.stringify(game)); } catch { /* Play remains possible when storage is blocked. */ } }
function toast(message) { const target = document.querySelector('#toast'); target.textContent = message; target.classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => target.classList.remove('visible'), 3400); }
function human(player) { return !player.bot; }
function editable(player) { return game.phase === 'planning' && !player.locked && human(player); }
function remember() { undo.push(structuredClone(game)); if (undo.length > 30) undo.shift(); }
function act(fn, reversible = false) {
  try {
    if (reversible) remember();
    fn();
    selectedCard = null;
    if (game.phase !== lastPhase) {
      if (game.phase === 'planning') { shelf = 'hand'; selectedPlayer = game.players.find(p => !p.bot)?.id || 0; }
      if (game.phase === 'procurement') shelf = 'market';
      if (game.phase === 'escape') dialog = 'summary';
      if (game.phase === 'ended') dialog = 'results';
      if (game.phase !== 'planning') undo = [];
      lastPhase = game.phase;
    }
    if (game.phase === 'procurement' && !game.players[engine.activeBuyer(game)]?.bot) selectedPlayer = engine.activeBuyer(game);
    persist(); render(); runBots();
  } catch (error) { if (reversible) undo.pop(); toast(error.message); }
}

function illustration() {
  return `<svg class="hero-art" viewBox="0 0 330 100" fill="none" aria-hidden="true"><path d="M6 91h307" stroke="#c7d0c8"/><path d="M16 90V55h40v35m-32-27h8m9 0h8m-25 10h8m9 0h8m-16 10v7" stroke="#bac3ba" stroke-width="1.3"/><path d="M66 90V28h42v62m-33-52h8m10 0h7m-25 10h8m10 0h7m-25 10h8m10 0h7m-25 10h8m10 0h7m-20 10h12v12" stroke="#bac3ba" stroke-width="1.3"/><rect x="150" y="18" width="61" height="72" rx="30" fill="#d9e8d6"/><path d="M171 90V40a16 16 0 0 1 32 0v50" stroke="#42786b" stroke-width="2"/><path d="M174 90h60l-31-20" fill="#e8d5a9"/><path d="m208 47 26-8m-8-4 8 4-5 7" stroke="#42786b" stroke-width="1.5"/><circle cx="269" cy="22" r="11" fill="#e7c789"/><path d="M253 89c0-19 8-33 24-43m-11 25c-3-15 3-23 14-25-1 12-7 18-14 25Zm-8 12c-13-6-17-16-12-24 11 4 16 13 12 24Z" fill="#d7e0ca" stroke="#92a684"/><path d="M295 90V77m0 0c-7-6-7-12-4-16 7 3 8 9 4 16Zm0 0c0-9 4-13 10-13 0 6-3 10-10 13Z" stroke="#92a684" fill="#d7e0ca"/><path d="m120 40 4-2m-2-5 2 5 5 2" stroke="#a9bbaa" stroke-width="1.2"/></svg>`;
}
function header() {
  const escapedCount = game.players.filter(p => p.escaped).length;
  return `<header class="topbar"><a class="brand" href="/" aria-label="逃离工位首页"><span class="brand-mark">${icon('exit', 22)}</span><span>逃离工位<small>ESCAPE VELOCITY</small></span><span class="prototype">试玩版 0.6</span></a><nav><button class="text-button" data-action="catalogue">${icon('layers', 16)} 路线图鉴</button><button class="text-button" data-action="rules">${icon('book', 16)} 玩法说明</button><button class="text-button" data-action="export">${icon('download', 16)} 导出记录</button><button class="outline-button" data-action="settings">${icon('settings', 16)} 新游戏 / 设置</button></nav></header>
  <section class="hero"><div><div class="eyebrow"><span class="live-dot"></span> 一场关于时间、热爱与自由的日程构筑</div><h1>把一周，慢慢还给自己<span>。</span></h1><p>从周日的一点空闲开始，让第二职业长出自己的飞轮。</p></div>${illustration()}<div class="week-stamp"><span>WEEK</span><strong>${String(game.week).padStart(2, '0')}</strong><small>${escapedCount} / ${game.players.length} 人已逃离</small></div></section>
  <section class="phasebar">${['procurement', 'planning', 'inspection', 'resolving', 'escape'].map((phase, index) => {
    const position = ['procurement', 'planning', 'inspection', 'resolving', 'escape', 'ended'].indexOf(game.phase);
    return `<div class="phase-step ${position === index ? 'current' : position > index ? 'complete' : ''}"><span>${position > index ? icon('check', 13) : `0${index + 1}`}</span><b>${phaseNames[phase]}</b></div>`;
  }).join('')}<div class="phase-note">${game.config.mode === 'bots' ? '单人 × 自动对手' : '同机轮流试玩'} · ${game.players.length} 人局</div></section>`;
}
function resourceBar(player) {
  return `<section class="resources">${['money', 'sanity', 'inspiration', 'achievement'].map(key => `<div class="resource ${key}"><div class="resource-icon">${icon(key, 23)}</div><div><span>${resourceNames[key]}</span><strong>${player[key]}<small>${key === 'achievement' ? '点' : ''}</small></strong></div><em>${{ money: player.escaped ? '已停止领薪' : `周薪 +${game.config.salary}`, sanity: player.sanity < 5 ? '考虑躺平或恢复活动' : '留住生活的余裕', inspiration: '给下一件有趣的事', achievement: '终局每点计 3 分' }[key]}</em></div>`).join('')}</section>`;
}
function playerTabs() {
  return `<div class="player-tabs" role="tablist" aria-label="查看玩家">${game.players.map(p => `<button role="tab" aria-selected="${p.id === selectedPlayer}" class="player-tab ${p.id === selectedPlayer ? 'active' : ''}" data-action="player" data-id="${p.id}"><span class="avatar" style="--avatar:${colors[p.id]}">${p.id === 0 && game.config.mode === 'bots' ? '你' : p.name.slice(0, 1)}</span>${esc(p.name)}<small>${p.escaped ? '已逃离' : p.locked ? '已锁定' : p.bot ? '自动' : '在职'}</small></button>`).join('')}<div class="calendar-legend"><span class="legend work"></span>工作 <span class="legend free"></span>可支配 <span class="legend night"></span>夜晚</div></div>`;
}
function calendar(player) {
  const current = game.phase === 'resolving' ? game.timeline[Math.max(0, game.cursor - 1)] : null;
  return `<section class="calendar-panel"><div class="panel-heading"><div><span class="section-kicker">YOUR WEEK, YOUR WAY</span><h2>${player.escaped ? '自由的一周' : '我的一周'} <span class="subtle">${player.weekend ? '双休已解锁' : '从周日开始'}</span></h2></div><div class="calendar-actions">${editable(player) ? `<button class="text-button compact" data-action="undo" ${undo.length ? '' : 'disabled'}>${icon('undo', 15)} 撤销</button><button class="outline-button compact" data-action="auto-plan">${icon('spark', 15)} 试试自动安排</button>` : `<span class="lock-status">${icon(player.locked ? 'lock' : 'info', 14)} ${player.locked ? '日程已锁定' : '当前可查看日程'}</span>`}</div></div>
    ${resourceBar(player)}${skillZone(player)}<div class="board-navigation"><span>周一 → 周日 · 每天上午 → 下午 → 夜晚</span><div><button class="text-button compact" data-action="board-start">周一</button><button class="outline-button compact" data-action="board-weekend">周末 ${icon('arrow', 12)}</button></div></div><div class="calendar-scroll"><div class="calendar-grid">${DAYS.map((day, i) => `<section class="day-lane ${i > 4 ? 'weekend-lane' : ''} ${!engine.workType(player, {day:i,period:0}) ? 'free-day' : ''}" aria-label="${day}日程"><div class="day-heading ${i > 4 ? 'weekend' : ''}"><b class="day-number">${i + 1}</b><div><strong>${day}</strong><span>${!engine.workType(player, {day:i,period:0}) ? '自由日' : i === 5 ? '等待解锁' : '工作日'}</span></div></div>${[0, 1, 2].map(period => slotTile(player, { day: i, period }, current)).join('')}${nightDock(player, i)}</section>`).join('')}</div></div>
    <div class="calendar-footer"><span>${selectedCard ? `${icon('info', 14)} 已选「${esc(getCard(engine.cardAt(player, selectedCard)).name)}」，点击亮起的时段放入` : editable(player) ? `${icon('info', 14)} 先选下方卡牌，再点击时段；点击时段可放空、清空或收回卡牌` : `${icon('info', 14)} 大槽位兼容所有活动 · 中槽位兼容中 / 小 · 摸鱼仅限小活动`}</span><span>${Object.keys(player.schedule).length} 项活动 · ${Object.keys(player.opportunities).length} 个机会</span></div></section>`;
}
function slotTile(player, slot, current) {
  const key = slotKey(slot), type = engine.workType(player, slot), cap = engine.capacity(player, slot);
  const card = engine.cardAt(player, player.schedule[key]), def = getCard(card), opportunity = getCard(engine.cardAt(player, player.opportunities[key]));
  const printedSize = slot.period === 2 ? 2 : opportunity ? 1 : 3;
  const inspected = game.inspection?.times.some(t => slotKey(t) === key) && type;
  const blocked = engine.eventBlocksSlot(game, player, slot);
  const allowed = selectedCard && editable(player) && !engine.canPlace(player, selectedCard, slot);
  const active = current && slotKey(current) === key;
  const base = slot.period === 2 ? 'night' : opportunity ? 'slack' : type ? 'work' : 'free';
  const isSelected = selectedSlot && slotKey(selectedSlot) === key;
  let inside;
  if (def) inside = cardFace(def, true);
  else if (slot.period === 2 && !opportunity) inside = `<div class="night-rest-content">${icon('moon', 28)}<strong>休息</strong><div class="effect-ribbon"><span class="muted-note">不结算</span></div></div>`;
  else if (slot.period === 2) inside = `<div class="night-rest-content awake">${icon('plus', 21)}<strong>熬夜空槽</strong><span>无活动效果</span></div>`;
  else if (type && !opportunity) inside = `<div class="work-content">${icon(type, 32)}<strong>${type === 'meeting' ? '开会' : '坐班'}</strong><div class="effect-ribbon"><span class="muted-note">已计入周维护</span></div></div>`;
  else inside = `<div class="free-content">${icon(player.basics[key] === 'idle' ? 'inspiration' : 'plus', 28)}<strong>${player.basics[key] === 'idle' ? '放空' : '可安排活动'}</strong><div class="effect-ribbon">${player.basics[key] === 'idle' ? tokens({inspiration:cap === 3 ? 2 : 1}) : ''}</div></div>`;
  const states = `${allowed ? 'placeable' : ''} ${isSelected ? 'selected-slot' : ''} ${active ? 'resolving-now' : ''} ${inspected ? 'inspected' : ''} ${blocked ? 'event-blocked' : ''}`;
  const label = `${slotLabel(slot)}，${hours(printedSize)}小时槽位，${blocked ? '团建占用，' : ''}${def?.name || (type && !opportunity ? type === 'meeting' ? '开会' : '坐班' : slot.period === 2 && !opportunity ? '默认休息' : '空闲')}`;
  const binding = base === 'slack' ? `<div class="slack-remainder">${icon('desk', 23)}<strong>3h 仍在工作</strong><span>领薪 · 计入工作日</span></div><div class="slack-binding">${opportunityFace(player, engine.cardAt(player, player.opportunities[key]), slot)}</div>` : '';
  return `<div class="slot-track ${base} ${slot.period === 2 ? 'night-track' : ''}" style="--slot-hours:${slot.period === 2 ? 2 : 4}"><span class="slot-caption">${icon(slot.period === 2 ? 'moon' : 'sun', 11)} ${['上午', '下午', '夜晚'][slot.period]}<b>${slot.period === 2 ? '2h' : '4h'}</b></span><div class="physical-well ${base} ${states}"><button class="slot ${base} ${slot.period === 2 ? 'night-slot' : ''}" data-hours="${hours(printedSize)}" data-action="slot" data-day="${slot.day}" data-period="${slot.period}" aria-label="${esc(label)}"><div class="slot-top"><span class="size-pill">${hours(printedSize)}h</span>${inspected ? `<span class="inspection-mark" title="本时段被抽查">${icon('eye', 13)}</span>` : ''}</div>${inside}${blocked ? `<span class="event-block-banner">${icon('lock', 14)} 团建占用 · 本周暂停</span>` : ''}</button>${binding}</div></div>`;
}
function opportunityFace(player, card, slot) {
  if (!card) return '';
  return `<div class="bound-opportunity">${cardFace(getCard(card), true)}${editable(player) ? `<button class="remove-binding" data-action="unplace" data-uid="${card.uid}" aria-label="移除${esc(getCard(card).name)}，${slotLabel(slot)}" title="收回机会牌">${icon('x', 11)}</button>` : ''}</div>`;
}
function nightDock(player, day) {
  const slot = { day, period: 2 }, card = engine.cardAt(player, player.opportunities[slotKey(slot)]);
  const chosen = selectedCard && engine.cardAt(player, selectedCard);
  const allowed = chosen && getCard(chosen).kind === 'opportunity' && editable(player) && !engine.canPlace(player, selectedCard, slot);
  return `<div class="night-binding-track"><span class="slot-caption">${icon('moon', 11)} 机会绑定</span><div class="night-binding-dock ${allowed ? 'placeable' : ''}">${card ? opportunityFace(player, card, slot) : `<button class="empty-binding" data-action="slot" data-day="${day}" data-period="2" aria-label="${DAYS[day]}熬夜机会绑定区">${icon('moon', 25)}<strong>熬夜机会</strong><span>与上方夜晚绑定</span></button>`}</div></div>`;
}
function phaseDescription() {
  const descriptions = {
    procurement: '每人两次采购，按顺序往返进行。也可躺平恢复理智。',
    planning: '机会牌先打开时间，活动牌再填入日程。成长活动留下技能，补给用后弃置。',
    inspection: '所有日程已经锁定。翻开共同事件：以抓包为主，也可能占用周日团建、发奖金或通知双休。',
    resolving: '只执行已安排的活动与机会。较早获得的资源，可以用于后面的活动。',
    escape: '工资已到账，检查本周副业收入。达标后可以逃离，也可以留下。',
    ended: '逃离者已经获胜，其余玩家按总分与理智底线检查胜利。',
  };
  return descriptions[game.phase];
}
function sidebar(player) {
  const predicted = ['procurement', 'planning', 'inspection'].includes(game.phase) ? engine.preview(game, player.id) : null;
  const income = predicted ? predicted.income : player.income;
  const progress = Math.min(100, Math.round(income / (game.config.escapeIncome + 1) * 100));
  let button = '';
  if (game.phase === 'procurement') {
    const buyer = game.players[engine.activeBuyer(game)];
    button = `<div class="turn-notice"><span class="avatar small" style="--avatar:${colors[buyer.id]}">${buyer.name[0]}</span><div><strong>${esc(buyer.name)}的采购机会</strong><small>第 ${game.purchaseIndex + 1} / ${game.purchaseOrder.length} 次选择</small></div></div>${buyer.bot ? '<button class="primary-button" disabled>自动玩家正在选择…</button>' : `<button class="primary-button" data-action="show-market">去公共市场选牌 ${icon('arrow', 17)}</button><button class="quiet-button" data-action="pass">躺平 · 理智 +${game.config.passSanity}</button>`}`;
  } else if (game.phase === 'planning') button = editable(player) ? `<button class="primary-button" data-action="lock">${icon('lock', 17)} 锁定本周日程</button><p class="tiny">未安排的手牌 ${engine.unplacedCards(player).length} / 5 张</p>` : `<button class="primary-button" disabled>${player.locked ? '等待其他玩家锁定' : '查看其他玩家的日程'}</button>`;
  else if (game.phase === 'inspection') button = `<button class="primary-button" data-action="reveal">${icon('eye', 17)} 翻开每周事件</button>`;
  else if (game.phase === 'resolving') button = `<button class="primary-button" data-action="step">${icon('arrow', 17)} ${game.cursor < game.timeline.length ? `执行${slotLabel(game.timeline[game.cursor])}` : '完成结算'}</button><div class="split-buttons"><button class="outline-button" data-action="autoplay">${autoplay ? '暂停播放' : '自动播放'}</button><button class="outline-button" data-action="resolve-all">一键结算</button></div><p class="tiny">已执行 ${game.cursor} / ${game.timeline.length} 个时段</p>`;
  else button = `<button class="primary-button" data-action="${game.phase === 'ended' ? 'results' : 'summary'}">${game.phase === 'ended' ? '查看最终结果' : '查看周末结算'} ${icon('arrow', 17)}</button>`;
  return `<aside class="sidebar"><section class="phase-card"><div class="section-kicker">THE NEXT LITTLE STEP</div><h2>${phaseNames[game.phase]}</h2><p>${phaseDescription()}</p>${button}</section>
    ${selectedSlot && editable(player) ? slotEditor(player) : ''}
    <section class="escape-card"><div class="escape-heading"><span>${icon('exit', 17)} 逃离进度</span><span>${player.escaped ? '已取得胜利' : predicted ? '本周预估' : '本周实际'}</span></div><div class="income-number">${income}<small> / &gt; ${game.config.escapeIncome}</small></div><div class="progress-track"><div style="width:${progress}%"></div></div><p>${player.escaped ? '你的时间已经属于自己。' : `当周副业收入须大于 ${game.config.escapeIncome}。工资不计入。`}</p>${predicted ? `<div class="prediction"><span>周末理智 <b class="${predicted.sanity < 4 ? 'danger-text' : ''}">${predicted.sanity}</b></span><span>周末灵感 <b>${predicted.inspiration}</b></span></div><small class="prediction-note">预估假设摸鱼成功，未计未知事件</small>${predicted.warnings.length ? `<details class="plan-warnings"><summary>${predicted.warnings.length} 项执行风险</summary>${predicted.warnings.map(w => `<p>${esc(w.text)}</p>`).join('')}</details>` : ''}` : ''}</section>
    <section class="inspection-card ${game.inspection ? 'revealed' : ''}"><div class="escape-heading"><span>${icon('eye', 17)} 本周事件</span><span>${game.inspection ? game.inspection.blockedTimes?.length ? '团建占用' : game.inspection.times.length ? `${game.inspection.times.length} 个时段` : '共同事件' : '尚未揭晓'}</span></div>${game.inspection ? `<h3>${esc(game.inspection.name)}</h3><p>${esc(game.inspection.text)}</p><div class="inspection-times">${[...game.inspection.times, ...(game.inspection.blockedTimes || [])].map(t => `<span>${slotLabel(t)}</span>`).join('')}</div>${game.inspection.times.length ? `<small>命中摸鱼：活动取消，资金 −${game.inspection.money} / 理智 −${game.inspection.sanity}；不重复扣工作理智。</small>` : ''}` : `<div class="hidden-event">${icon('eye', 26)}<p>先安排，再揭晓</p><small>12 张：7 抓包 · 2 团建 · 2 正面 · 1 平静</small></div>`}</section>
    <section class="mini-log"><div class="escape-heading"><span>最近发生</span><button class="text-button compact" data-action="show-log">全部 ${icon('arrow', 13)}</button></div>${game.logs.slice(-3).reverse().map(l => `<div class="mini-log-line"><span class="log-dot ${l.tone}"></span><p>${l.player !== null ? `<b>${esc(game.players[l.player].name)}</b> ` : ''}${esc(l.text)}</p></div>`).join('')}</section></aside>`;
}
function slotEditor(player) {
  const slot = selectedSlot, key = slotKey(slot), cap = engine.capacity(player, slot);
  const activity = engine.cardAt(player, player.schedule[key]);
  const opportunity = engine.cardAt(player, player.opportunities[key]);
  return `<section class="slot-editor"><div class="escape-heading"><strong>${slotLabel(slot)}</strong><button class="icon-button" data-action="close-slot" aria-label="关闭时段编辑">${icon('x', 15)}</button></div><p>${cap ? slot.period === 2 ? '熬夜后的中槽位，可以放入中 / 小活动。空槽没有活动效果。' : `${SIZE[cap]}槽位，可选择基础行动或放入卡牌。` : slot.period === 2 ? '夜晚默认休息。先选熬夜牌替换休息，再放活动。' : '工作占据大槽位。先选摸鱼牌，将它替换为小槽位。'}</p>${cap ? `<div class="split-buttons"><button class="outline-button" data-action="idle">放空 ${icon('inspiration',14)} +${cap === 3 ? 2 : 1}</button><button class="outline-button" data-action="clear">清空时段</button></div>` : ''}${activity ? `<button class="quiet-button" data-action="unplace" data-uid="${activity.uid}">收回「${esc(getCard(activity).name)}」</button>` : ''}${opportunity ? `<button class="quiet-button" data-action="unplace" data-uid="${opportunity.uid}">移除「${esc(getCard(opportunity).name)}」</button>` : ''}</section>`;
}
function priceText(price = {}) { return Object.entries(price).map(([key, n]) => `<span class="price ${key}">${icon(key, 13)} ${n}</span>`).join(''); }
function cardTile(card, context, player) {
  const def = getCard(card), placement = context === 'hand' ? engine.findPlacement(player, card.uid) : null;
  const active = selectedCard === card.uid;
  const buyer = game.phase === 'procurement' ? game.players[engine.activeBuyer(game)] : null;
  const affordable = buyer && engine.canPay(buyer, def.price);
  const canBuy = context !== 'hand' && buyer && !buyer.bot && affordable && !game.studyOffer;
  const select = context === 'hand' && editable(player) && engine.qualified(player, def);
  const location = placement ? { day: Number(placement.key.split('-')[0]), period: Number(placement.key.split('-')[1]) } : null;
  return `<article class="game-card family-${familyOf(def)} ${active ? 'card-selected' : ''} ${placement ? 'card-placed' : ''} ${select ? 'selectable' : ''}" style="--card-hours:${hours(def.size)}" data-hours="${hours(def.size)}" ${select ? `data-action="select-card" data-uid="${card.uid}" tabindex="0" role="button" aria-label="选择${esc(def.name)}"` : ''}><div class="card-paper"><div class="card-topline"><span class="card-category" title="${FAMILIES[familyOf(def)].name}">${icon(FAMILIES[familyOf(def)].icon, 15)}</span><span class="card-size">${hours(def.size)}h</span><span title="${def.core ? '一次建成，移入永久能力区' : def.skill ? '一次性，完成后收入技能区' : def.once ? '一次性，完成后弃置' : '每周可重复执行'}">${icon(def.once ? 'check' : 'repeat', 14)}</span></div>${cardFace(def)}</div><div class="card-bottom"><button class="detail-button" data-action="detail" data-type="${def.id}" aria-label="${esc(def.name)}详情">${icon('info',14)}</button>${context === 'hand' ? `<span class="placement-label">${placement ? `${icon('check', 12)} ${slotLabel(location)}` : !engine.qualified(player, def) ? `缺 ${engine.skillMissing(player,def).join('')}` : active ? '放入日程' : select ? '选择' : '待安排'}</span>${editable(player) ? `<button class="discard-button" data-action="discard" data-uid="${card.uid}" aria-label="弃置${esc(def.name)}" title="弃置卡牌">×</button>` : ''}` : `<span class="purchase-cost" title="购入费用"><small>购入</small>${priceText(def.price)}</span><button class="buy-button" data-action="buy" data-uid="${card.uid}" ${canBuy ? '' : 'disabled'}>${game.phase !== 'procurement' ? '待采购' : buyer?.bot ? '等待' : !affordable ? '不足' : !canBuy ? '已拥有' : '购买'}</button>`}</div></article>`;
}
function shelfPanel(player) {
  const unplaced = engine.unplacedCards(player).length;
  return `<section class="shelf-panel" id="shelf"><div class="shelf-header"><div class="shelf-tabs"><button class="${shelf === 'hand' ? 'active' : ''}" data-action="shelf" data-tab="hand">我的卡牌 <span>${player.cards.length}</span></button><button class="${shelf === 'market' ? 'active' : ''}" data-action="shelf" data-tab="market">公共市场 <span>${Object.values(game.market).flat().length}</span></button><button class="${shelf === 'log' ? 'active' : ''}" data-action="shelf" data-tab="log">本周记录</button></div><span class="shelf-hint">${shelf === 'hand' ? `未安排 ${unplaced} / 5 · ✓ 一次性 / ↻ 多次活动` : shelf === 'market' ? '1h ×4 · 2h ×3 · 4h ×2 · 买后补位 · 每周两次采购' : '可导出整局记录用于设计复盘'}</span></div>
    ${shelf === 'hand' ? `<div class="hand-hint">${selectedCard ? `已选择「${esc(getCard(engine.cardAt(player, selectedCard)).name)}」。点击它可取消选择。` : editable(player) ? '选一张机会牌打开时间，或选一张活动牌填入可支配时段。已安排的牌也能重新移动。' : '点击玩家头像，可以查看每位玩家持有的卡牌。'}</div><div class="hand-grid">${player.cards.map(c => cardTile(c, 'hand', player)).join('')}</div>` : shelf === 'market' ? `<div class="market-groups">${Object.entries(MARKET_LIMITS).map(([duration,count]) => `<section class="duration-market"><div class="market-label"><span>${icon('clock',16)} ${duration}h · ${{1:'小',2:'中',4:'大'}[duration]}时段</span><small>${count} 个展示位 · 购买后补牌</small></div><div class="market-grid duration-market-grid">${game.market[duration].map(c => cardTile(c, 'market', player)).join('') || '<p class="empty-state">该时长牌堆暂时没有可补充的牌。</p>'}</div></section>`).join('')}</div>${growthPanel()}` : logPanel()}
  </section>`;
}
function logPanel() {
  const logs = game.logs.filter(l => l.week === game.week).slice().reverse();
  return `<div class="log-panel"><div class="log-list">${logs.map(l => `<div class="log-row"><span class="log-dot ${l.tone}"></span><span class="log-player">${l.player !== null ? esc(game.players[l.player].name) : '全体'}</span><p>${esc(l.text)}</p></div>`).join('')}</div><div class="notes-panel"><h3>测试笔记</h3><p>哪里卡手？哪种组合有趣？记下来，随整局记录一起导出。</p><textarea id="notes" placeholder="例如：第三周灵感不足，熬夜接单没能执行…">${esc(game.notes || '')}</textarea><button class="outline-button" data-action="export">${icon('download', 15)} 导出整局 JSON</button></div></div>`;
}
function quickActions(player) {
  let actions = '';
  if (game.phase === 'procurement') {
    const buyer = game.players[engine.activeBuyer(game)];
    actions = buyer.bot ? `<span>${esc(buyer.name)}正在采购…</span>` : `<button class="outline-button" data-action="show-market">选择卡牌</button><button class="primary-button" data-action="pass">躺平 · 理智 +${game.config.passSanity}</button>`;
  } else if (editable(player)) actions = '<button class="outline-button" data-action="show-hand">我的卡牌</button><button class="primary-button" data-action="lock">锁定日程</button>';
  else if (game.phase === 'inspection') actions = '<button class="primary-button" data-action="reveal">翻开每周事件</button>';
  else if (game.phase === 'resolving') actions = '<button class="outline-button" data-action="step">下一项</button><button class="primary-button" data-action="resolve-all">一键结算</button>';
  else if (['escape','ended'].includes(game.phase)) actions = `<button class="primary-button" data-action="${game.phase === 'ended' ? 'results' : 'summary'}">${game.phase === 'ended' ? '查看终局' : '周末抽选与结算'}</button>`;
  return `<div class="quick-actions"><span>第 ${game.week} 周 · ${phaseNames[game.phase]}${selectedCard ? ` · 已选 ${esc(getCard(engine.cardAt(player,selectedCard)).name)}` : ''}</span><div>${actions}</div></div>`;
}
function render() {
  const player = game.players[selectedPlayer] || game.players[0];
  const boardScroll = document.querySelector('.calendar-scroll')?.scrollLeft || 0;
  app.innerHTML = `<div class="app-shell">${header()}${playerTabs()}${selectedCard ? `<div class="selection-notice" role="status">${icon(getCard(engine.cardAt(player, selectedCard)).icon, 20)}<strong>${esc(getCard(engine.cardAt(player, selectedCard)).name)}</strong><span>点击绿色边框的时段放入</span><button class="text-button compact" data-action="select-card" data-uid="${selectedCard}">取消选择 ${icon('x', 13)}</button></div>` : ''}<div class="play-layout"><div class="main-column">${calendar(player)}${projectPanel(player)}${visualLegend()}${shelfPanel(player)}</div>${sidebar(player)}</div><footer class="page-footer"><span>ESCAPE VELOCITY <span class="footer-dot">·</span> 日程构筑实验室</span><span>自动保存到本机 · 数值为测试预设 · 没有固定周数</span></footer></div>${dialog ? dialogMarkup() : ''}`;
  document.querySelector('.player-tabs').insertAdjacentHTML('afterend',quickActions(player));
  document.querySelector('.calendar-scroll').scrollLeft = boardScroll;
  if (dialog) {
    const modal = document.querySelector('.dialog-panel');
    modal?.focus({ preventScroll: true });
  }
}
function dialogMarkup() {
  let contents, title, tag;
  if (dialog === 'study') { title = '本次成长活动'; tag = 'DRAW TWO · KEEP ONE'; contents = studyMarkup(); }
  else if (dialog === 'catalogue') { title = '你的下一条路'; tag = 'PUBLIC CARD ATLAS'; contents = catalogueMarkup(); }
  else if (dialog === 'detail') { title = getCard(detailType).name; tag = 'CARD REFERENCE'; contents = detailMarkup(); }
  else if (dialog === 'rules') { title = '先拿回一点时间'; tag = 'HOW TO PLAY'; contents = rulesMarkup(); }
  else if (dialog === 'settings') { title = '开始另一种生活'; tag = 'NEW GAME'; contents = settingsMarkup(); }
  else if (dialog === 'summary') { title = `第 ${game.week} 周，过得怎么样？`; tag = 'WEEKLY REVIEW'; contents = summaryMarkup(); }
  else { title = '工位之外，生活继续'; tag = 'THE END OF THIS CHAPTER'; contents = resultsMarkup(); }
  return `<div class="dialog-backdrop" data-action="backdrop"><section class="dialog-panel ${dialog === 'settings' ? 'settings-dialog' : dialog === 'catalogue' ? 'catalogue-dialog' : ''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1"><button class="dialog-close icon-button" data-action="close-dialog" aria-label="关闭">${icon('x', 20)}</button><span class="section-kicker">${tag}</span><h2 id="dialog-title">${title}</h2>${contents}</section></div>`;
}
function rulesMarkup() {
  const entries = [
    ['只有周日属于你', '周一至周六上午开会、下午坐班。周日有两个 4h 大槽位；夜晚默认休息，不产生资源。1h 小牌、2h 中牌、4h 大牌都可放大槽，一个槽位只放一项活动。'],
    ['周维护 → 两次采购', `每周开始按工作日扣理智（每天 ${game.config.workSanity}），再扣生活费 ${game.config.livingCost}；缺款部分等额扣理智，最低为零。采购按蛇形顺序往返，每次买展示牌、报名成长、启动个人项目，或躺平获得 ${game.config.passSanity} 理智。每周轮换起始玩家。`],
    ['按时长选牌，按方向成长', '没有常驻供应。时间机会、生活与副业混合，按 1h / 2h / 4h 展示 4 / 3 / 2 张牌，买后补位；每周各移走最左一张并补牌。采购也可付 3 资金，从选定成长牌堆抽 2 留 1，未选放底；不得取消，余 1 张则拿 1 张、空堆不可报名。重复技能不叠加，重复成长完成后回牌底。双休项目每人专属，启动也占一次采购。'],
    ['先打开时间，再安排活动', `摸鱼将工作格打开为 1h 小槽位，仍算工作日、照拿工资。熬夜打开 2h 中槽，每周损耗理智，空槽也扣。机会可以自由重绑，也可手动撤下。空闲槽可主动放空：小 / 中槽 +1 灵感，大槽 +2；不安排则无效果。`],
    ['执行一次，成为你的技能', '有 ✓ 标记的活动成功后离开日程；带 A / B / C 的收入技能区。同名只计一次，技能永久保留且不消耗。↻ 活动和机会牌跨周保留。锁定时未安排手牌最多 5 张；点击 × 可弃牌。'],
    ['主动寻找高级机会', '研讨会从对应高级池抽二选一，寻找猎头任选一个池。选择统一在周末进行，获得的牌下周可用。允许提前拿尚未解锁的牌；AAA、ABB、ABC 等门槛须在安排时满足。图鉴公开所有高级牌。'],
    ['永久能力改变路线', '✦ 核心牌只建成一次，执行后移到永久区，从下周生效、不占日程。既有每周版权收入，也有技术首单加成、固定自由日和跨路线品牌联动。'],
    ['安排好，再翻共同事件', '事件共 12 张：7 张抓包（各查 1–3 个时段）、2 张团建、1 张项目奖金、1 张双休通知、1 张平静。团建占用本周周日上午或下午，在职玩家的活动与放空暂停、卡牌保留，不付执行消耗，不额外扣钱或理智；双休者仍需参加，已逃离者免疫。摸鱼被命中：活动取消、按事件处罚，不重复扣工作理智。临时双休只持续一周；「争取双休」需此前完成副业，永久移除周六工作，工资不变。'],
    ['数值版卡池', '59 种牌：6 种机会、12 种重复活动、18 种成长与交流、3 种一次性补给、猎头与双休，以及 18 种高级牌。基础成长和副业通常需理智 ≥4，高级副业需 ≥6；恢复活动无门槛。工具链与策划选题只增强本周下一次成功副业，未用加成周末失效。'],
    ['按自己的日程结算', '仅执行玩家安排的活动、机会和放空；空白工作与默认休息跳过。早获得的资源可供后续活动使用，费用不足或理智不够则跳过。副业收入加成按发生顺序生效，周末领取固定工资。'],
    ['逃离即可获胜', `当周副业收入 > ${game.config.escapeIncome} 可自愿逃离；工资、奖金和普通活动收益不计入。逃离后所有白天自由、停止领薪，往后每周 +${game.config.escapeAchievement} 成就。N−1 人逃离的当周终局，无额外一周。未逃离者总分 ≥ ${game.config.scoreTarget} 且理智 ≥ ${game.config.sanityFloor} 也获胜。总分 = ⌊资金÷2⌋ + 理智 + 成就×3。`],
  ];
  return `<p class="dialog-intro">从消耗自己的工作周，构筑一条可持续的第二职业。允许共同获胜，无援助、不限周数。</p><div class="rules-grid">${entries.map(([title,text],i) => `<article><span>0${i+1}</span><h3>${title}</h3><p>${text}</p></article>`).join('')}</div><button class="primary-button" data-action="close-dialog">开始安排我的一周</button>`;
}
function settingsMarkup() {
  const fields = [
    ['startMoney', '起始资金', 0], ['startSanity', '起始理智', 0], ['startInspiration', '起始灵感', 0],
    ['salary', '固定周薪', 0], ['workSanity', '每工作日理智损耗', 0], ['nightSanity', '普通熬夜理智损耗', 1], ['livingCost', '每周生活费', 0], ['passSanity', '每次躺平恢复理智', 0],
    ['escapeIncome', '逃离收入门槛（需大于）', 0], ['scoreTarget', '未逃离胜利总分', 1], ['sanityFloor', '积分胜利理智底线', 0],
    ['escapeAchievement', '逃离后每周获得成就', 0],
  ];
  return `<p class="dialog-intro">实体版 0.6：公共区1h ×4 · 2h ×3 · 4h ×2牌，成长按方向抽选。可选择起始恢复牌，比较不同经营方式。</p><form id="settings-form"><div class="setup-row"><label>玩家人数<select name="playerCount">${[2, 3, 4].map(n => `<option value="${n}" ${game.config.playerCount === n ? 'selected' : ''}>${n} 人</option>`).join('')}</select></label><label>游玩方式<select name="mode"><option value="bots" ${game.config.mode === 'bots' ? 'selected' : ''}>你 + 自动玩家</option><option value="hotseat" ${game.config.mode === 'hotseat' ? 'selected' : ''}>所有玩家同机操作</option></select></label></div><label class="seed-field">起始恢复方式（所有玩家相同）<select name="starterRecovery">${STARTERS.map(type => `<option value="${type}" ${game.config.starterRecovery === type ? 'selected' : ''}>${getCard(type).name} · ${{outing:'花 4 钱回 8 理智',handcraft:'花 2 灵感回 8 理智',hike:'花 4 钱得 6 理智与 1 灵感',nap:'免费回 4 理智'}[type]}</option>`).join('')}</select><small>另有零散接单。四种恢复牌均可能出现在公共展示区。</small></label><div class="settings-divider"><span>可调整的测试数值</span><button type="button" class="text-button compact" data-action="defaults">恢复预设</button></div><div class="settings-grid">${fields.map(([key, label, min]) => `<label>${label}<input name="${key}" type="number" value="${game.config[key]}" min="${min}" max="9999" step="1" required></label>`).join('')}</div><label class="seed-field">随机种子<input name="seed" type="number" value="${game.config.seed}" min="1" max="4294967295" step="1" required><small>相同种子与操作会得到相同牌序，便于重复测试。</small></label><div class="rule-footnote">开始新游戏会替换本机存档；需要复盘时，可先导出当前记录。</div><button class="primary-button" type="submit">开始新游戏 ${icon('arrow', 17)}</button></form>`;
}
function summaryMarkup() {
  const pending = game.players.filter(p => !Object.hasOwn(game.escapeDecisions, p.id));
  return `${draftMarkup()}<p class="dialog-intro">先领取本周寻访的高级牌，再决定是否逃离。高级牌下周可安排。</p><div class="review-table"><div class="review-row table-heading"><span>玩家</span><span>副业收入</span><span>理智</span><span>总分</span><span>本周选择</span></div>${game.players.map(p => `<div class="review-row"><strong><span class="avatar small" style="--avatar:${colors[p.id]}">${p.name[0]}</span>${esc(p.name)}</strong><span class="${engine.eligible(game, p) ? 'success-text' : ''}">${p.income}</span><span>${p.sanity}</span><span>${engine.score(game, p)}</span><span class="review-status">${p.escaped ? '已逃离' : !engine.eligible(game, p) ? '继续经营' : Object.hasOwn(game.escapeDecisions, p.id) ? game.escapeDecisions[p.id] ? '选择逃离' : '主动留下' : '<b>可以逃离</b>'}</span></div>`).join('')}</div>${pending.filter(p => !p.bot).map(p => `<div class="escape-choice"><div><strong>${esc(p.name)}，要告别工位吗？</strong><p>收入 ${p.income} &gt; ${game.config.escapeIncome}。逃离立即获胜，停止领薪，所有白天时间自由安排。</p></div><div class="split-buttons"><button class="primary-button" data-action="escape" data-id="${p.id}">${icon('exit', 17)} 现在逃离</button><button class="outline-button" data-action="stay" data-id="${p.id}">这周先留下</button></div></div>`).join('')}<div class="rule-footnote">本周副业收入不包含工资。工资已结算；本周完成的双休解锁将在下一周可用。</div><button class="primary-button" data-action="close-week" ${pending.length || game.players.some(p => p.drafts.length) ? 'disabled' : ''}>${game.players.filter(p => p.escaped || game.escapeDecisions[p.id]).length >= game.players.length - 1 ? '进入终局结算' : '开始下一周'} ${icon('arrow', 17)}</button>`;
}
function resultsMarkup() {
  const winners = game.players.filter(p => engine.won(game, p)).length;
  return `<p class="dialog-intro">${winners === game.players.length ? '每个人都找到了属于自己的出口。' : `${winners} 位玩家获得胜利。每一种经营，都留下了一段自己的生活。`}</p><div class="results-grid">${game.players.map(p => `<article class="result-card ${engine.won(game, p) ? 'winner' : ''}"><span class="avatar" style="--avatar:${colors[p.id]}">${p.name[0]}</span><h3>${esc(p.name)}</h3><span class="result-label">${engine.won(game, p) ? '获得胜利' : '继续寻找机会'}</span><strong class="result-score">${engine.score(game, p)}<small>分</small></strong><p>${p.escaped ? `第 ${p.escapedWeek} 周逃离，已获胜` : `总分 ${engine.score(game, p)} / ${game.config.scoreTarget}<br>理智 ${p.sanity} / ${game.config.sanityFloor}`}</p><div class="result-resources">资金 ${p.money} · 理智 ${p.sanity}<br>成就 ${p.achievement} · 灵感 ${p.inspiration}</div></article>`).join('')}</div><div class="split-buttons"><button class="outline-button" data-action="export">${icon('download', 16)} 导出这次测试</button><button class="primary-button" data-action="settings">再试一种安排 ${icon('arrow', 17)}</button></div>`;
}

function runBots() {
  clearTimeout(botTimer);
  if (dialog === 'settings') return;
  if (game.phase === 'procurement' && game.players[engine.activeBuyer(game)]?.bot) {
    botTimer = setTimeout(() => act(() => engine.botBuy(game)), 380);
  } else if (game.phase === 'planning' && game.players.some(p => p.bot && !p.locked)) {
    botTimer = setTimeout(() => act(() => {
      for (const player of game.players.filter(p => p.bot && !p.locked)) { engine.autoPlan(game, player.id); engine.autoDiscard(game, player.id); engine.lockPlan(game, player.id); }
    }), 250);
  } else if (game.phase === 'escape' && game.players.some(p => p.bot && (p.drafts.length || !Object.hasOwn(game.escapeDecisions, p.id)))) {
    botTimer = setTimeout(() => act(() => { for (const player of game.players.filter(p => p.bot)) { engine.botDraft(game, player.id); if (!Object.hasOwn(game.escapeDecisions, player.id)) engine.chooseEscape(game, player.id, true); } }), 200);
  }
}
function scrollShelf() { document.querySelector('#shelf')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function exportGame() {
  const content = { exportedAt: new Date().toISOString(), rulesVersion: '0.6', scoreFormula: 'floor(money / 2) + sanity + achievement * 3', notes: game.notes || '', game };
  const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `逃离工位-第${game.week}周-测试记录.json`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000); toast('已导出整局存档、逐步日志与测试笔记。');
}
function toggleAutoplay() {
  if (autoplay) { clearInterval(autoplay); autoplay = null; render(); return; }
  autoplay = setInterval(() => {
    if (game.phase !== 'resolving') { clearInterval(autoplay); autoplay = null; render(); return; }
    act(() => engine.step(game));
  }, 550);
  render();
}
app.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target || target.disabled) return;
  const action = target.dataset.action, player = game.players[selectedPlayer];
  if (action === 'backdrop' && event.target !== target) return;
  if (['rules', 'settings', 'results', 'summary', 'catalogue'].includes(action)) {
    if (action === 'settings') { clearTimeout(botTimer); clearInterval(autoplay); autoplay = null; }
    dialog = action; render(); return;
  }
  if (action === 'close-dialog' || action === 'backdrop') { dialog = null; render(); runBots(); return; }
  if (action === 'detail') { detailType = target.dataset.type; dialog = 'detail'; render(); return; }
  if (action === 'draft-pool') { act(() => engine.openDraft(game, Number(target.dataset.player), target.dataset.draft, target.dataset.pool)); return; }
  if (action === 'draft-choose') { act(() => engine.chooseAdvanced(game, Number(target.dataset.player), target.dataset.draft, target.dataset.uid)); return; }
  if (action === 'export') { exportGame(); return; }
  if (action === 'board-start' || action === 'board-weekend') { const board = document.querySelector('.calendar-scroll'); board.scrollTo({ left: action === 'board-start' ? 0 : board.scrollWidth, behavior: 'smooth' }); return; }
  if (action === 'player') { selectedPlayer = Number(target.dataset.id); selectedCard = null; selectedSlot = null; undo = []; render(); return; }
  if (action === 'shelf') { shelf = target.dataset.tab; render(); return; }
  if (action === 'show-market' || action === 'show-log' || action === 'show-hand') { shelf = action === 'show-market' ? 'market' : action === 'show-hand' ? 'hand' : 'log'; render(); scrollShelf(); return; }
  if (action === 'close-slot') { selectedSlot = null; render(); return; }
  if (action === 'select-card') { selectedCard = selectedCard === target.dataset.uid ? null : target.dataset.uid; render(); if (selectedCard) document.querySelector('.calendar-panel').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  if (action === 'slot') {
    const slot = { day: Number(target.dataset.day), period: Number(target.dataset.period) };
    if (selectedCard && editable(player)) { const uid = selectedCard; act(() => engine.place(game, selectedPlayer, uid, slot), true); }
    else { selectedSlot = selectedSlot && slotKey(selectedSlot) === slotKey(slot) ? null : slot; render(); if (selectedSlot && editable(player)) document.querySelector('.slot-editor')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    return;
  }
  if (action === 'study') { act(() => { engine.study(game, engine.activeBuyer(game), target.dataset.route); dialog = 'study'; }); return; }
  if (action === 'study-offer') { dialog = 'study'; render(); return; }
  if (action === 'study-choose') { act(() => { engine.chooseStudy(game, engine.activeBuyer(game), target.dataset.uid); dialog = null; }); return; }
  if (action === 'buy') { act(() => engine.buy(game, engine.activeBuyer(game), target.dataset.uid)); return; }
  if (action === 'pass') { act(() => engine.pass(game, engine.activeBuyer(game))); return; }
  if (action === 'clear' || action === 'idle') { act(() => engine.basic(game, selectedPlayer, selectedSlot, action), true); return; }
  if (action === 'unplace') { act(() => engine.unplace(game, selectedPlayer, target.dataset.uid), true); return; }
  if (action === 'discard') { act(() => engine.discardCard(game, selectedPlayer, target.dataset.uid), true); return; }
  if (action === 'auto-plan') { act(() => engine.autoPlan(game, selectedPlayer), true); toast('已试排一版，可以继续移动卡牌或撤销。'); return; }
  if (action === 'undo') { if (undo.length && editable(player)) { game = undo.pop(); selectedCard = null; selectedSlot = null; persist(); render(); runBots(); } return; }
  if (action === 'lock') {
    act(() => engine.lockPlan(game, selectedPlayer));
    if (game.players[selectedPlayer].locked) undo = [];
    if (game.phase === 'planning') { const next = game.players.find(p => !p.bot && !p.locked); if (next) { selectedPlayer = next.id; selectedSlot = null; render(); } }
    return;
  }
  if (action === 'reveal') { act(() => engine.revealInspection(game)); return; }
  if (action === 'step') { act(() => engine.step(game)); return; }
  if (action === 'autoplay') { toggleAutoplay(); return; }
  if (action === 'resolve-all') { if (autoplay) { clearInterval(autoplay); autoplay = null; } act(() => engine.resolveAll(game)); return; }
  if (action === 'escape' || action === 'stay') { act(() => engine.chooseEscape(game, Number(target.dataset.id), action === 'escape')); return; }
  if (action === 'close-week') { act(() => { engine.closeWeek(game); dialog = game.phase === 'ended' ? 'results' : null; }); return; }
  if (action === 'defaults') {
    const form = document.querySelector('#settings-form');
    for (const [key, value] of Object.entries(DEFAULTS)) if (form.elements[key]) form.elements[key].value = value;
  }
});
app.addEventListener('submit', event => {
  if (event.target.id !== 'settings-form') return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  for (const key of Object.keys(data)) if (!['mode', 'starterRecovery'].includes(key)) data[key] = Number(data[key]);
  clearTimeout(botTimer); clearInterval(autoplay); autoplay = null;
  game = engine.createGame(data); selectedPlayer = 0; selectedCard = null; selectedSlot = null; shelf = 'market'; dialog = null; undo = []; lastPhase = game.phase;
  persist(); render(); runBots(); toast('新的一周开始了。先从公共市场挑选机会。');
});
app.addEventListener('input', event => { if (event.target.id === 'notes') { game.notes = event.target.value; persist(); } });
app.addEventListener('keydown', event => { if (event.target.matches('.selectable') && ['Enter', ' '].includes(event.key)) { event.preventDefault(); event.target.click(); } });
document.addEventListener('keydown', event => { if (event.key === 'Escape') { dialog = null; selectedCard = null; selectedSlot = null; render(); runBots(); } });
render(); runBots();
