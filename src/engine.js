import { CARDS, ADVANCED, MARKET_LIMITS, marketLane, STUDY_PRICE, DEFAULTS, EVENTS, ROUTES, STARTERS, getCard, slotKey, slotLabel } from './cards.js';

export function rng(game) {
  let x = game.random >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  game.random = x >>> 0;
  return game.random / 4294967296;
}
function shuffle(game, values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(rng(game) * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
function instance(game, type) { return { uid: `c${++game.uid}`, type }; }
export function log(game, player, text, tone = 'normal', slot = null) {
  game.logs.push({ week: game.week, player: player?.id ?? null, text, tone, slot: slot ? slotKey(slot) : null });
}
const slots = () => Array.from({ length: 7 }, (_, day) => [0, 1, 2].map(period => ({ day, period }))).flat();
export const activeBuyer = game => game.purchaseOrder[game.purchaseIndex];
export const canPay = (player, cost = {}) => Object.entries(cost).every(([key, n]) => player[key] >= n);
function pay(player, amounts = {}) { for (const [key, n] of Object.entries(amounts)) player[key] -= n; }
function gain(player, amounts = {}) { for (const [key, n] of Object.entries(amounts)) player[key] += n; }
function purchaseOrder(game) { const order = game.players.map((_, i) => (game.first + i) % game.players.length); return [...order, ...order.slice().reverse()]; }
export const cardAt = (player, uid) => player.cards.find(c => c.uid === uid);
export function skillCounts(player) {
  const result = { A: 0, B: 0, C: 0 };
  for (const type of new Set(player.skills.map(c => c.type))) result[getCard(type).skill]++;
  return result;
}
export function skillMissing(player, def) {
  const counts = skillCounts(player), missing = [];
  for (const route of def.requires || '') { if (counts[route] > 0) counts[route]--; else missing.push(route); }
  return missing;
}
export const qualified = (player, def) => !skillMissing(player, def).length;
function upgradeDef(game, player, name) { const card = player.upgrades.find(c => getCard(c).upgrade === name && c.activeFrom <= game.week); return card && getCard(card); }
function hasUpgrade(game, player, name) { return !!upgradeDef(game, player, name); }
export function workType(player, slot) {
  if (slot.period === 2 || slot.day === 6 || player.escaped || player.freeDays.includes(slot.day) || (slot.day === 5 && (player.weekend || player.tempWeekend))) return null;
  return slot.period === 0 ? 'meeting' : 'desk';
}
export const workingDays = player => Array.from({ length: 7 }, (_, day) => day).filter(day => workType(player, { day, period: 0 }) || workType(player, { day, period: 1 })).length;
export function capacity(player, slot) {
  if (slot.period === 2) return player.opportunities[slotKey(slot)] ? 2 : 0;
  return !workType(player, slot) ? 3 : player.opportunities[slotKey(slot)] ? 1 : 0;
}
export function createGame(options = {}) {
  const config = { ...DEFAULTS, ...options };
  for (const [key, fallback] of Object.entries(DEFAULTS)) if (typeof fallback === 'number') config[key] = Number.isFinite(Number(config[key])) ? Math.max(0, Math.floor(Number(config[key]))) : fallback;
  config.playerCount = Math.max(2, Math.min(4, config.playerCount));
  config.mode = config.mode === 'hotseat' ? 'hotseat' : 'bots';
  config.starterRecovery = STARTERS.includes(config.starterRecovery) ? config.starterRecovery : DEFAULTS.starterRecovery;
  const game = {
    version: 6, config, week: 1, phase: 'procurement', random: config.seed || 1, uid: 0,
    first: 0, purchaseIndex: 0, purchaseOrder: [], players: [],
    decks: { 1: [], 2: [], 4: [] }, discard: { 1: [], 2: [], 4: [] },
    market: { 1: [], 2: [], 4: [] }, advancedDecks: { A: [], B: [], C: [] },
    growthDecks: { A: [], B: [], C: [] }, studyOffer: null,
    inspectionDeck: [], inspectionDiscard: [], inspection: null, timeline: [], cursor: 0,
    logs: [], history: [], escapeDecisions: {},
  };
  const names = ['你', '林小满', '陈不卷', '周自在'];
  for (let id = 0; id < config.playerCount; id++) game.players.push({
    id, name: config.mode === 'hotseat' ? `玩家 ${id + 1}` : names[id], bot: config.mode === 'bots' && id > 0,
    money: config.startMoney, sanity: config.startSanity, inspiration: config.startInspiration, achievement: 0,
    escaped: false, escapedWeek: null, weekend: false, pendingWeekend: false, tempWeekend: false, holidayWeek: 0, freeDays: [], locked: false,
    cards: [instance(game, config.starterRecovery), instance(game, 'microjob')], projects: [instance(game, 'weekend')], completedProjects: [], skills: [], upgrades: [], drafts: [],
    schedule: {}, opportunities: {}, basics: {}, income: 0, jobBonuses: [], jobsDone: 0, caught: 0, usedPowers: [], activeRoutes: [],
  });
  for (const lane of Object.keys(MARKET_LIMITS)) game.decks[lane] = shuffle(game, CARDS.filter(c => marketLane(c) === lane && !c.skill).flatMap(c => Array.from({ length: config.playerCount }, () => instance(game, c.id))));
  for (const route of Object.keys(ROUTES)) game.growthDecks[route] = shuffle(game, CARDS.filter(c => c.skill === route).flatMap(c => Array.from({ length: config.playerCount }, () => instance(game, c.id))));
  for (const route of Object.keys(ROUTES)) game.advancedDecks[route] = shuffle(game, ADVANCED.filter(c => c.route === route).flatMap(c => Array.from({ length: config.playerCount }, () => instance(game, c.id))));
  game.inspectionDeck = shuffle(game, EVENTS.map((_, i) => i));
  fillMarket(game);
  game.purchaseOrder = purchaseOrder(game);
  startMaintenance(game);
  return game;
}
function draw(game, kind) {
  if (!game.decks[kind].length && game.discard[kind].length) { game.decks[kind] = shuffle(game, game.discard[kind]); game.discard[kind] = []; }
  return game.decks[kind].pop() || null;
}
function fillMarket(game) {
  for (const [kind, count] of Object.entries(MARKET_LIMITS)) while (game.market[kind].length < count) {
    const card = draw(game, kind); if (!card) break; game.market[kind].push(card);
  }
}
function startMaintenance(game) {
  for (const p of game.players) {
    p.tempWeekend = p.holidayWeek === game.week;
    p.freeDays = hasUpgrade(game, p, 'remote') ? [2] : [];
    // Temporary holidays may expire. Return cards that no longer fit, retaining the player's cards.
    for (const key of Object.keys(p.opportunities)) {
      const [day, period] = key.split('-').map(Number);
      if (period !== 2 && !workType(p, { day, period })) delete p.opportunities[key];
    }
    for (const key of Object.keys(p.schedule)) {
      const [day, period] = key.split('-').map(Number), def = getCard(cardAt(p, p.schedule[key]));
      if (!def || def.size > capacity(p, { day, period })) delete p.schedule[key];
    }
    for (const key of Object.keys(p.basics)) { const [day, period] = key.split('-').map(Number); if (!capacity(p, { day, period })) delete p.basics[key]; }
    p.income = 0; p.jobBonuses = []; p.jobsDone = 0; p.caught = 0; p.usedPowers = []; p.activeRoutes = []; p.locked = false;
    const days = workingDays(p), sanity = days * game.config.workSanity;
    const shortfall = Math.max(0, game.config.livingCost - p.money);
    p.money = Math.max(0, p.money - game.config.livingCost);
    p.sanity = Math.max(0, p.sanity - sanity - shortfall);
    p.maintenance = { days, sanity, money: game.config.livingCost, shortfall };
    log(game, p, `周维护：${days} 个工作日，理智 −${sanity}；生活费 −${game.config.livingCost}${shortfall ? `，不足 ${shortfall}，额外理智 −${shortfall}` : ''}。`, 'maintenance');
  }
}
export function buy(game, playerId, uid) {
  assertPurchase(game, playerId);
  const p = game.players[playerId];
  const kind = Object.keys(MARKET_LIMITS).find(k => game.market[k].some(c => c.uid === uid));
  const card = kind ? game.market[kind].find(c => c.uid === uid) : p.projects.find(c => c.uid === uid);
  if (!card) throw new Error('只能购买展示区的牌，或启动自己的双休项目。');
  if (!kind && (p.weekend || p.escaped)) throw new Error('已无需争取双休。');
  const def = getCard(card);
  if (!canPay(p, def.price)) throw new Error('购买所需资源不足，可以选择躺平恢复。');
  pay(p, def.price); p.cards.push(card);
  if (kind) game.market[kind] = game.market[kind].filter(c => c.uid !== uid);
  else p.projects = p.projects.filter(c => c.uid !== uid);
  fillMarket(game); log(game, p, `购入「${def.name}」。`, 'purchase'); advancePurchase(game);
}
function assertPurchase(game, playerId) {
  if (game.phase !== 'procurement' || activeBuyer(game) !== playerId) throw new Error('现在不是你的采购顺序。');
  if (game.studyOffer) throw new Error('请先完成已付费的成长二选一。');
}
export function study(game, playerId, route) {
  assertPurchase(game, playerId);
  const p = game.players[playerId], deck = game.growthDecks[route];
  if (!ROUTES[route] || !deck?.length) throw new Error('该成长牌堆已空，请选择其他行动。');
  if (!canPay(p, STUDY_PRICE)) throw new Error('报名需要 3 资金。');
  pay(p, STUDY_PRICE);
  // Draw only the top two physical cards; never scan hidden order for preferred names.
  const options = deck.splice(Math.max(0, deck.length - 2)).reverse();
  game.studyOffer = { playerId, route, options };
  log(game, p, `报名${ROUTES[route].name}：支付 3 资金，抽选成长活动。`, 'purchase');
}
export function chooseStudy(game, playerId, uid) {
  const offer = game.studyOffer;
  if (game.phase !== 'procurement' || activeBuyer(game) !== playerId || offer?.playerId !== playerId) throw new Error('当前没有你的成长候选。');
  const card = offer.options.find(c => c.uid === uid);
  if (!card) throw new Error('只能保留本次抽到的活动。');
  game.players[playerId].cards.push(card);
  game.growthDecks[offer.route].unshift(...offer.options.filter(c => c.uid !== uid));
  game.studyOffer = null;
  log(game, game.players[playerId], `保留「${getCard(card).name}」，其他候选放回牌底。`, 'purchase');
  advancePurchase(game);
}
export function pass(game, playerId) {
  assertPurchase(game, playerId);
  game.players[playerId].sanity += game.config.passSanity;
  log(game, game.players[playerId], `躺平一次：理智 +${game.config.passSanity}。`, 'recovery'); advancePurchase(game);
}
function advancePurchase(game) { if (++game.purchaseIndex >= game.purchaseOrder.length) game.phase = 'planning'; }
export function findPlacement(player, uid) {
  for (const field of ['schedule', 'opportunities']) { const key = Object.keys(player[field]).find(k => player[field][k] === uid); if (key) return { field, key }; }
  return null;
}
export const unplacedCards = player => player.cards.filter(c => !findPlacement(player, c.uid));
function assertPlanning(game, p) { if (game.phase !== 'planning' || p.locked) throw new Error('只有未锁定日程时才能修改。'); }
export function canPlace(p, uid, slot) {
  if (!Number.isInteger(slot.day) || !Number.isInteger(slot.period) || slot.day < 0 || slot.day > 6 || slot.period < 0 || slot.period > 2) return '无效的时段。';
  const def = getCard(cardAt(p, uid));
  if (!def) return '你没有这张牌。';
  if (def.kind === 'activity') {
    if (!qualified(p, def)) return `尚缺技能：${skillMissing(p, def).map(r => ROUTES[r].name).join('、')}。`;
    if (def.size > capacity(p, slot)) return capacity(p, slot) ? '槽位装不下这项活动。' : '先用机会牌打开这个时段。';
  } else if (def.method === 'night') { if (slot.period !== 2) return '熬夜牌只能绑定夜晚。'; }
  else {
    if (!workType(p, slot)) return '摸鱼牌只能绑定工作时段。';
    if (def.workType && workType(p, slot) !== def.workType) return def.workType === 'desk' ? '只能绑定坐班。' : '只能绑定开会。';
  }
  return null;
}
function removePlacement(p, field, key) { delete p[field][key]; if (field === 'opportunities') { delete p.schedule[key]; delete p.basics[key]; } }
export function place(game, playerId, uid, slot) {
  const p = game.players[playerId]; assertPlanning(game, p);
  const error = canPlace(p, uid, slot); if (error) throw new Error(error);
  const def = getCard(cardAt(p, uid)), old = findPlacement(p, uid), key = slotKey(slot);
  if (old?.key === key) return;
  if (old) removePlacement(p, old.field, old.key);
  if (def.kind === 'opportunity') p.opportunities[key] = uid;
  else { p.schedule[key] = uid; delete p.basics[key]; }
}
export function unplace(game, playerId, uid) { const p = game.players[playerId]; assertPlanning(game, p); const old = findPlacement(p, uid); if (old) removePlacement(p, old.field, old.key); }
export function basic(game, playerId, slot, action) {
  const p = game.players[playerId]; assertPlanning(game, p);
  if (!capacity(p, slot) || !['idle', 'clear'].includes(action)) throw new Error('只可在空闲时段安排放空或清空。');
  delete p.schedule[slotKey(slot)]; delete p.basics[slotKey(slot)];
  if (action === 'idle') p.basics[slotKey(slot)] = action;
}
function recycle(game, card, owner) {
  const def = getCard(card);
  if (def.tier === 'advanced') game.advancedDecks[def.route].unshift(card);
  else if (def.skill) game.growthDecks[def.skill].unshift(card);
  else if (def.unlockWeekend) {
    (owner.pendingWeekend ? owner.completedProjects : owner.projects).push(card);
  } else game.discard[marketLane(def)].push(card);
}
export function discardCard(game, playerId, uid) {
  const p = game.players[playerId]; assertPlanning(game, p); const card = cardAt(p, uid);
  if (!card) throw new Error('找不到这张牌。');
  unplace(game, playerId, uid); recycle(game, card, p); p.cards = p.cards.filter(c => c.uid !== uid);
  log(game, p, `弃置「${getCard(card).name}」。`);
}
export function lockPlan(game, playerId) {
  const p = game.players[playerId]; assertPlanning(game, p);
  if (unplacedCards(p).length > 5) throw new Error('未安排的手牌最多保留 5 张，请先安排或弃牌。');
  p.locked = true; log(game, p, '锁定本周日程。');
  if (game.players.every(player => player.locked)) game.phase = 'inspection';
}
function customTimeline(players) { return slots().filter(s => players.some(p => p.schedule[slotKey(s)] || p.opportunities[slotKey(s)] || p.basics[slotKey(s)])); }
export function eventBlocksSlot(game, player, slot) {
  return !player.escaped && !!game.inspection?.blockedTimes?.some(t => slotKey(t) === slotKey(slot));
}
export function revealInspection(game) {
  if (game.phase !== 'inspection') throw new Error('需要所有人先锁定日程。');
  if (!game.inspectionDeck.length) { game.inspectionDeck = shuffle(game, game.inspectionDiscard); game.inspectionDiscard = []; }
  const index = game.inspectionDeck.pop(); game.inspectionDiscard.push(index);
  const event = EVENTS[index];
  game.inspection = { ...event, times: (event.times || []).map(([day, period]) => ({ day, period })), blockedTimes: (event.blockedTimes || []).map(([day, period]) => ({ day, period })) };
  log(game, null, `每周事件「${event.name}」：${event.text}`, 'inspection');
  for (const p of game.players) {
    if (event.employeesOnly && p.escaped) continue;
    gain(p, event.gain);
    if (event.kind === 'weekend') { if (p.weekend) p.sanity += 3; else p.holidayWeek = game.week + 1; }
  }
  game.timeline = customTimeline(game.players); game.cursor = 0; game.phase = 'resolving';
  if (!game.timeline.length) finishWeek(game);
}
export const revealEvent = revealInspection;
function activityCost(game, p, def) {
  const cost = { ...def.cost };
  if (hasUpgrade(game, p, 'muse') && def.route === 'A' && !p.usedPowers.includes('muse')) cost.inspiration = Math.max(0, (cost.inspiration || 0) - upgradeDef(game, p, 'muse').discount);
  if (hasUpgrade(game, p, 'automation') && def.route === 'B' && def.income && !p.usedPowers.includes('automation')) cost.inspiration = Math.max(0, (cost.inspiration || 0) - upgradeDef(game, p, 'automation').discount);
  return cost;
}
function resolveActivity(game, p, slot, opportunity) {
  const key = slotKey(slot), card = cardAt(p, p.schedule[key]);
  if (!card) {
    if (p.basics[key] === 'idle') { const n = capacity(p, slot) === 3 ? 2 : 1; p.inspiration += n; log(game, p, `${slotLabel(slot)} · 放空，灵感 +${n}。`, 'inspiration', slot); }
    return;
  }
  const def = getCard(card), cost = activityCost(game, p, def);
  const fail = def.size > capacity(p, slot) ? '槽位不足' : !qualified(p, def) ? '技能不足' : p.sanity < (def.minSanity || 0) ? '理智不足' : def.unlockWeekend && (!p.jobsDone || p.weekend) ? '需要此前完成副业且尚未永久双休' : !canPay(p, cost) ? '资源不足' : null;
  if (fail) { log(game, p, `${slotLabel(slot)} · ${fail}，「${def.name}」保留，未执行。`, 'warning', slot); return; }
  pay(p, cost); gain(p, def.gain);
  let extra = 0;
  if (def.income) {
    extra = p.jobBonuses.reduce((sum, bonus) => sum + bonus.amount, 0) + (opportunity?.incomeBonus || 0);
    p.jobBonuses = p.jobBonuses.map(b => ({ ...b, remaining: b.remaining - 1 })).filter(b => b.remaining > 0);
    for (const [power, route] of [['automation', 'B'], ['chain', 'C']]) if (def.route === route && hasUpgrade(game, p, power) && !p.usedPowers.includes(power)) {
      const core = upgradeDef(game, p, power);
      extra += core.powerIncome; p.sanity += core.powerSanity || 0; p.usedPowers.push(power);
    }
    p.money += extra; p.income += (def.gain.money || 0) + extra; p.jobsDone++;
  }
  if (def.route === 'A' && hasUpgrade(game, p, 'muse') && !p.usedPowers.includes('muse')) { p.sanity += upgradeDef(game, p, 'muse').powerSanity; p.usedPowers.push('muse'); }
  if (def.jobBonus) p.jobBonuses.push({ amount: def.jobBonus, remaining: def.jobBonusUses });
  if (def.route && !p.activeRoutes.includes(def.route)) p.activeRoutes.push(def.route);
  if (def.unlockWeekend) p.pendingWeekend = true;
  if (def.draft) p.drafts.push({ id: `d${++game.uid}`, pool: def.draft, source: def.name, options: null });
  if (def.once) {
    delete p.schedule[key]; p.cards = p.cards.filter(c => c.uid !== card.uid);
    if (def.upgrade) p.upgrades.push({ ...card, activeFrom: game.week + 1 });
    else if (def.skill && !p.skills.some(c => c.type === card.type)) p.skills.push(card);
    else recycle(game, card, p);
  }
  const resourceNames = { money: '资金', sanity: '理智', inspiration: '灵感', achievement: '成就' };
  const result = Object.entries(def.gain || {}).map(([k, v]) => `${resourceNames[k]} +${v}`).join('，');
  log(game, p, `${slotLabel(slot)} · ${def.name}${result ? `：${result}` : ''}${extra ? `；收入加成 +${extra}` : ''}${def.skill ? `；留下${ROUTES[def.skill].name}经历（同名只计一次）` : ''}${def.draft ? '；周末抽选高级牌' : ''}${def.upgrade ? '；永久能力下周生效' : ''}${def.unlockWeekend ? '；下周永久双休' : ''}。`, def.income ? 'income' : def.skill ? 'unlock' : def.gain.sanity ? 'recovery' : 'normal', slot);
}
function resolveSlot(game, p, slot) {
  const key = slotKey(slot), opportunity = getCard(cardAt(p, p.opportunities[key]));
  if (!p.schedule[key] && !p.basics[key] && !opportunity) return;
  if (eventBlocksSlot(game, p, slot)) {
    log(game, p, `${slotLabel(slot)} · 被公司团建占用，本时段活动与放空暂停，卡牌保留，不付执行消耗。`, 'warning', slot); return;
  }
  if (slot.period === 2) {
    if (!opportunity) return;
    const n = Math.max(1, game.config.nightSanity + (opportunity.nightOffset || 0));
    if (p.sanity < n) { log(game, p, `${slotLabel(slot)} · 无法支付 ${n} 熬夜理智，跳过。`, 'warning', slot); return; }
    p.sanity -= n; log(game, p, `${slotLabel(slot)} · 熬夜理智 −${n}。`, 'normal', slot);
  } else if (workType(p, slot)) {
    if (!opportunity) return;
    if (game.inspection?.times.some(t => slotKey(t) === key)) {
      p.money = Math.max(0, p.money - game.inspection.money); p.sanity = Math.max(0, p.sanity - game.inspection.sanity); p.caught++;
      log(game, p, `${slotLabel(slot)} · 摸鱼被抓包，活动保留但取消；资金 −${game.inspection.money}、理智 −${game.inspection.sanity}。`, 'caught', slot); return;
    }
    gain(p, opportunity.bonus);
  }
  resolveActivity(game, p, slot, opportunity);
}
export function step(game) {
  if (game.phase !== 'resolving') throw new Error('当前不在结算阶段。');
  const slot = game.timeline[game.cursor];
  if (slot) for (let i = 0; i < game.players.length; i++) resolveSlot(game, game.players[(game.first + i) % game.players.length], slot);
  game.cursor++;
  if (game.cursor >= game.timeline.length) finishWeek(game);
  return slot;
}
export function resolveAll(game) { while (game.phase === 'resolving') step(game); }
function weeklyIncome(game, p) {
  for (const power of ['royalty', 'brand']) {
    const def = upgradeDef(game, p, power);
    if (!def || power === 'brand' && !['A', 'B', 'C'].every(r => p.activeRoutes.includes(r))) continue;
    p.money += def.passiveIncome; p.income += def.passiveIncome;
    log(game, p, `${def.name}：副业收入 +${def.passiveIncome}。`, 'income');
  }
}
function finishWeek(game) {
  for (const p of game.players) {
    weeklyIncome(game, p);
    if (!p.escaped) { p.money += game.config.salary; log(game, p, `周薪到账：资金 +${game.config.salary}。`, 'income'); }
    else { p.achievement += game.config.escapeAchievement; log(game, p, `自由生活：成就 +${game.config.escapeAchievement}。`, 'income'); }
    if (p.pendingWeekend) { p.weekend = true; p.pendingWeekend = false; log(game, p, '永久双休已达成，下周生效。', 'unlock'); }
  }
  game.phase = 'escape'; game.escapeDecisions = {};
  for (const p of game.players) {
    if (p.escaped || !eligible(game, p)) game.escapeDecisions[p.id] = false;
    for (const draft of [...p.drafts]) if (draft.pool !== 'any') openDraft(game, p.id, draft.id, draft.pool);
  }
  game.history.push({ week: game.week, steps: game.timeline.length, event: game.inspection?.name, players: game.players.map(p => ({ id: p.id, money: p.money, sanity: p.sanity, inspiration: p.inspiration, achievement: p.achievement, income: p.income, caught: p.caught, escaped: p.escaped, skills: skillCounts(p), upgrades: p.upgrades.length })) });
}
export function openDraft(game, playerId, draftId, route) {
  if (game.phase !== 'escape') throw new Error('高级牌在周末抽选。');
  const p = game.players[playerId], draft = p.drafts.find(d => d.id === draftId);
  if (!draft || draft.options || !ROUTES[route] || (draft.pool !== 'any' && draft.pool !== route)) throw new Error('不能更换已经揭晓的候选或牌池。');
  draft.pool = route; draft.options = [];
  const deck = game.advancedDecks[route], seen = new Set([...p.cards, ...p.upgrades].map(c => c.type));
  for (const d of p.drafts) for (const c of d.options || []) seen.add(c.type);
  const skipped = [], count = deck.length;
  for (let i = 0; i < count && draft.options.length < 2; i++) {
    const card = deck.pop();
    if (seen.has(card.type)) skipped.push(card);
    else { seen.add(card.type); draft.options.push(card); }
  }
  deck.unshift(...skipped);
  if (!draft.options.length) { p.drafts = p.drafts.filter(d => d.id !== draftId); p.sanity += game.config.passSanity; log(game, p, '该高级池没有未持有的候选，改为恢复躺平补偿。', 'recovery'); }
}
export function chooseAdvanced(game, playerId, draftId, uid) {
  if (game.phase !== 'escape') throw new Error('高级牌在周末抽选。');
  const p = game.players[playerId], draft = p.drafts.find(d => d.id === draftId), card = draft?.options?.find(c => c.uid === uid);
  if (!card) throw new Error('请选择本次候选中的高级牌。');
  if ([...p.cards, ...p.upgrades].some(c => c.type === card.type)) throw new Error('同名高级牌每人限一张。');
  p.cards.push(card);
  game.advancedDecks[draft.pool].unshift(...draft.options.filter(c => c.uid !== uid));
  p.drafts = p.drafts.filter(d => d.id !== draftId);
  log(game, p, `取得「${getCard(card).name}」，下周起满足技能后可安排。`, 'unlock');
}
export const eligible = (game, p) => !p.escaped && p.income > game.config.escapeIncome;
export function chooseEscape(game, playerId, choice) {
  if (game.phase !== 'escape') throw new Error('请在周末决定是否逃离。');
  const p = game.players[playerId];
  if (!eligible(game, p) || Object.hasOwn(game.escapeDecisions, playerId)) throw new Error('尚未达到收入门槛，或本周已作决定。');
  game.escapeDecisions[playerId] = Boolean(choice);
}
export function closeWeek(game) {
  if (game.phase !== 'escape') throw new Error('当前尚未完成一周。');
  if (game.players.some(p => p.drafts.length)) throw new Error('请先完成高级牌抽选。');
  if (game.players.some(p => !Object.hasOwn(game.escapeDecisions, p.id))) throw new Error('还有玩家尚未决定是否逃离。');
  for (const p of game.players) if (game.escapeDecisions[p.id] && !p.escaped) {
    p.escaped = true; p.escapedWeek = game.week;
    for (const [key, uid] of Object.entries(p.opportunities)) if (getCard(cardAt(p, uid))?.method === 'slack') delete p.opportunities[key];
    log(game, p, '正式逃离工位，获得永久胜利！', 'unlock');
  }
  if (game.players.filter(p => p.escaped).length >= game.players.length - 1) { game.phase = 'ended'; log(game, null, '已逃离人数达到 N−1，游戏结束。', 'unlock'); return; }
  game.week++; game.first = (game.first + 1) % game.players.length;
  game.purchaseIndex = 0; game.purchaseOrder = purchaseOrder(game); game.inspection = null; game.timeline = []; game.cursor = 0;
  for (const kind of Object.keys(MARKET_LIMITS)) if (game.market[kind].length) game.discard[kind].push(game.market[kind].shift());
  fillMarket(game); game.phase = 'procurement'; startMaintenance(game);
}
export const score = (game, p) => Math.floor(p.money / 2) + p.sanity + p.achievement * 3;
export const won = (game, p) => p.escaped || (score(game, p) >= game.config.scoreTarget && p.sanity >= game.config.sanityFloor);
export function preview(game, playerId) {
  const clone = structuredClone(game), p = clone.players[playerId];
  clone.inspection = null; clone.logs = [];
  p.income = 0; p.jobBonuses = []; p.jobsDone = 0; p.usedPowers = []; p.activeRoutes = [];
  for (const slot of customTimeline([p])) resolveSlot(clone, p, slot);
  weeklyIncome(clone, p);
  if (!p.escaped) p.money += clone.config.salary; else p.achievement += clone.config.escapeAchievement;
  return { money: p.money, sanity: p.sanity, inspiration: p.inspiration, achievement: p.achievement, income: p.income, skills: skillCounts(p), warnings: clone.logs.filter(l => l.tone === 'warning'), logs: clone.logs };
}

// Automatic opponents use the same purchase, slot, skill and resource rules as human players.
function preferredRoute(p) {
  const counts = skillCounts(p), bias = ['A', 'B', 'C'][p.id % 3];
  return Object.keys(ROUTES).sort((a, b) => (counts[b] + (b === bias ? .2 : 0)) - (counts[a] + (a === bias ? .2 : 0)))[0];
}
function botValue(p, card, game, retaining = false) {
  const d = getCard(card), owned = p.cards.filter(c => c.type === d.id).length;
  if (owned && !retaining) return -20;
  if (d.kind === 'opportunity') {
    if (p.escaped) return -20;
    const count = p.cards.filter(c => getCard(c).kind === 'opportunity').length;
    return count < 2 ? 18 - count * 3 : count < 4 ? 7 : -10;
  }
  const counts = skillCounts(p), route = preferredRoute(p);
  if (d.skill && !p.skills.some(c => c.type === d.id)) {
    let n = d.skill === route ? (counts[d.skill] < 3 ? 17 : 8) : counts[d.skill] === 0 ? 11 : 6;
    const targets = p.cards.filter(c => getCard(c).requires);
    if (targets.some(c => skillMissing(p, getCard(c)).includes(d.skill))) n += 10;
    if (d.draft && Object.values(counts).reduce((a, b) => a + b, 0) >= 2) n += 5;
    return n;
  }
  if (d.draft) return !p.escaped && preview(game, p.id).income <= game.config.escapeIncome ? 16 : 4;
  if (d.tier === 'advanced') {
    const hasRecovery = p.cards.some(c => getCard(c).tier === 'advanced' && getCard(c).gain.sanity >= 6);
    return (d.income ? 24 : d.core ? 23 : d.gain.sanity >= 6 ? (hasRecovery ? 17 : 27) : 19) - skillMissing(p, d).length * 6;
  }
  if (d.unlockWeekend) return !p.weekend && Object.values(counts).reduce((a, b) => a + b, 0) >= 3 ? 22 : -10;
  if (d.gain.sanity) return p.sanity < 14 ? 13 : 3;
  if (d.gain.inspiration) return p.inspiration < 4 ? 14 : 3;
  return d.income ? 4 : 0;
}
export function botBuy(game) {
  const p = game.players[activeBuyer(game)];
  if (!p?.bot || game.phase !== 'procurement') return;
  if (game.studyOffer) {
    const options = [...game.studyOffer.options].sort((a,b) => botValue(p,b,game)-botValue(p,a,game));
    chooseStudy(game,p.id,options[0].uid); return;
  }
  const projection = preview(game, p.id);
  if ((p.sanity < 2 && projection.sanity < 6) || (projection.sanity < 10 && game.purchaseIndex >= game.players.length)) { pass(game, p.id); return; }
  const candidates = [...Object.values(game.market).flat(), ...(!p.weekend && !p.escaped ? p.projects : [])]
    .filter(c => canPay(p, getCard(c).price) && p.money - (getCard(c).price.money || 0) >= 3);
  candidates.sort((a, b) => botValue(p, b, game) - botValue(p, a, game));
  // Route choice uses public definitions and personal needs, never hidden deck order.
  const routes = Object.keys(ROUTES).filter(r => game.growthDecks[r].length).map(route => {
    const defs = CARDS.filter(d => d.skill === route);
    const value = Math.max(...defs.map(d => botValue(p,{type:d.id},game))) - 2;
    return { route, value };
  }).sort((a,b) => b.value-a.value);
  if (unplacedCards(p).length < 6 && p.money >= 6 && routes[0]?.value > Math.max(5, candidates[0] ? botValue(p,candidates[0],game) : 0)) {
    study(game,p.id,routes[0].route); return;
  }
  if (unplacedCards(p).length < 6 && candidates.length && botValue(p, candidates[0], game) > 5) buy(game, p.id, candidates[0].uid);
  else pass(game, p.id);
}
export function autoPlan(game, playerId) {
  const p = game.players[playerId]; assertPlanning(game, p);
  p.schedule = {}; p.opportunities = {}; p.basics = {};
  const opportunities = p.cards.filter(c => getCard(c).kind === 'opportunity');
  const activities = p.cards.filter(c => getCard(c).kind === 'activity' && qualified(p, getCard(c)));
  for (const c of opportunities.filter(c => getCard(c).method === 'slack')) {
    const target = slots().find(s => s.period !== 2 && !p.opportunities[slotKey(s)] && !canPlace(p, c.uid, s));
    if (target) place(game, playerId, c.uid, target);
  }
  let nights = 0;
  const needNights = Math.min(3, Math.max(0, activities.length - (p.weekend ? 4 : 2)));
  for (const c of opportunities.filter(c => getCard(c).method === 'night')) {
    if (nights >= needNights) break;
    const target = [0, 2, 4, 6, 1, 3, 5].map(day => ({ day, period: 2 })).find(s => !p.opportunities[slotKey(s)] && !canPlace(p, c.uid, s));
    if (target) { place(game, playerId, c.uid, target); nights++; }
  }
  // Simulate a private copy chronologically so recovery and inspiration precede expensive activities.
  const sim = structuredClone(game), sp = sim.players[playerId]; sim.inspection = null; sim.logs = [];
  const used = new Set();
  for (const slot of slots().filter(s => capacity(p, s))) {
    const key = slotKey(slot), cap = capacity(p, slot), opp = getCard(cardAt(sp, sp.opportunities[key]));
    const nightCost = slot.period === 2 ? Math.max(1, game.config.nightSanity + (opp?.nightOffset || 0)) : 0;
    const choices = activities.filter(c => !used.has(c.uid) && getCard(c).size <= cap && canPay(sp, activityCost(sim, sp, getCard(c))) && sp.sanity - nightCost >= (getCard(c).minSanity || 0) && !(getCard(c).unlockWeekend && (!sp.jobsDone || sp.weekend)));
    const value = c => {
      const d = getCard(c);
      if (d.gain.sanity && sp.sanity < 10) return 35 + Math.min(d.gain.sanity, 12 - sp.sanity);
      if (d.gain.inspiration && sp.inspiration < 3) return 32 + d.gain.inspiration;
      if (d.unlockWeekend) return 29;
      if (d.core) return 28;
      if (d.skill && !sp.skills.some(s => s.type === d.id)) {
        const needed = activities.length < 3 || skillCounts(sp)[d.skill] < 3 || p.cards.some(c => skillMissing(sp, getCard(c)).includes(d.skill));
        return (needed ? 25 : 11) + (d.draft ? 2 : 0);
      }
      if (d.draft) return 20;
      if (d.jobBonus && activities.some(c => getCard(c).income && !used.has(c.uid) && getCard(c).size <= 3)) return 24;
      if (d.income) return 15 + d.gain.money / 3;
      return d.gain.sanity ? 8 : d.gain.inspiration ? 9 : 2;
    };
    choices.sort((a, b) => value(b) - value(a));
    const choice = choices[0];
    if (choice) { place(game, playerId, choice.uid, slot); sp.schedule[key] = choice.uid; used.add(choice.uid); }
    else if (slot.period !== 2) { basic(game, playerId, slot, 'idle'); sp.basics[key] = 'idle'; }
    else { delete p.opportunities[key]; delete sp.opportunities[key]; continue; }
    resolveSlot(sim, sp, slot);
  }
}
export function autoDiscard(game, playerId) {
  const p = game.players[playerId];
  while (unplacedCards(p).length > 5) {
    const candidates = unplacedCards(p).sort((a, b) => botValue(p, a, game, true) - botValue(p, b, game, true));
    discardCard(game, playerId, candidates[0].uid);
  }
}
export function botDraft(game, playerId) {
  const p = game.players[playerId];
  for (const draft of [...p.drafts]) {
    if (!draft.options) openDraft(game, playerId, draft.id, preferredRoute(p));
    if (!draft.options.length) continue;
    const options = [...draft.options].sort((a, b) => botValue(p, b, game) - botValue(p, a, game));
    chooseAdvanced(game, playerId, draft.id, options[0].uid);
  }
}
