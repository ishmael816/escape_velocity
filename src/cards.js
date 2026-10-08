export const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
export const SIZE = { 1: '小', 2: '中', 3: '大' };
export const ROUTES = {
  A: { name: '创作', pool: '写作与创作', icon: 'pen', family: 'creative' },
  B: { name: '技术', pool: '技术与制作', icon: 'layers', family: 'technical' },
  C: { name: '经营', pool: '经营与社群', icon: 'shop', family: 'business' },
};
export const DEFAULTS = {
  playerCount: 3, mode: 'bots', starterRecovery: 'outing', startMoney: 22, startSanity: 24, startInspiration: 4,
  salary: 14, workSanity: 2, livingCost: 4, passSanity: 4, nightSanity: 2,
  escapeIncome: 24, scoreTarget: 85, sanityFloor: 4, escapeAchievement: 2, seed: 20261008,
};
const activity = (id, name, size, category, price, cost, gain, extra = {}) => ({
  id, name, kind: 'activity', size, category, icon: ROUTES[extra.route]?.icon || (category === '恢复' ? 'leaf' : 'book'),
  price: { money: price }, cost, gain, ...extra,
});
export const ECONOMY = { weights: { money: 1, sanity: 1, inspiration: 2 }, basic: { 1: 2, 2: 3, 3: 4 }, advanced: { 1: 4, 2: 6, 3: 8 } };
export const resourceValue = values => Object.entries(values || {}).reduce((sum, [key, n]) => sum + n * (ECONOMY.weights[key] || 0), 0);
export const activityValue = def => resourceValue(def.gain) - resourceValue(def.cost) + (def.jobBonus || 0) * (def.jobBonusUses || 0);
export const STARTERS = ['outing', 'handcraft', 'hike', 'nap'];
const growth = (id, name, route, size, cost, gain) => activity(id, name, size, ROUTES[route].name, 3, cost, gain, { route, skill: route, once: true, minSanity: 4 });
const advanced = (id, name, route, size, requires, cost, gain, extra = {}) => activity(id, name, size, ROUTES[route].name, 0, cost, gain, { route, requires, tier: 'advanced', ...extra });
export const CARDS = [
  { id: 'slack-phone', name: '手机摸鱼', kind: 'opportunity', method: 'slack', size: 1, category: '机会', icon: 'phone', price: { money: 3, sanity: 1 } },
  { id: 'slack-headphones', name: '耳机结界', kind: 'opportunity', method: 'slack', size: 1, workType: 'desk', category: '机会', icon: 'headphones', price: { money: 7, sanity: 2 }, bonus: { inspiration: 1 } },
  { id: 'slack-meeting', name: '会议隐身', kind: 'opportunity', method: 'slack', size: 1, workType: 'meeting', category: '机会', icon: 'eye', price: { money: 2, sanity: 1 } },
  { id: 'night-owl', name: '夜猫子', kind: 'opportunity', method: 'night', size: 2, category: '机会', icon: 'moon', price: { money: 2 }, nightOffset: 0 },
  { id: 'night-sprint', name: '凌晨冲刺', kind: 'opportunity', method: 'night', size: 2, category: '机会', icon: 'bolt', price: { money: 5 }, nightOffset: 1, incomeBonus: 2 },
  { id: 'night-quiet', name: '安静的夜', kind: 'opportunity', method: 'night', size: 2, category: '机会', icon: 'moon', price: { money: 5 }, nightOffset: -1 },
  // Repeated basics follow the 2 / 3 / 4 operating-value budget.
  activity('shopping', '淘宝购物', 1, '恢复', 3, { money: 3 }, { sanity: 5 }, { icon: 'phone' }),
  activity('mall', '逛商场', 2, '恢复', 3, { money: 3 }, { sanity: 6 }, { icon: 'shop' }),
  activity('outing', '周日看场演出', 3, '恢复', 3, { money: 4 }, { sanity: 8 }, { icon: 'frame' }),
  activity('walk', '街角散步', 1, '恢复', 3, {}, { sanity: 2 }, { icon: 'leaf' }),
  activity('nap', '宅家慢生活', 3, '恢复', 3, {}, { sanity: 4 }, { icon: 'coffee' }),
  activity('handcraft', '沉浸手作', 3, '恢复', 3, { inspiration: 2 }, { sanity: 8 }, { icon: 'pen' }),
  activity('hike', '郊外寻趣', 3, '恢复', 3, { money: 4 }, { sanity: 6, inspiration: 1 }, { icon: 'mountain' }),
  activity('music', '听完整张专辑', 2, '灵感', 3, {}, { sanity: 1, inspiration: 1 }, { icon: 'headphones' }),
  activity('reading', '读一本闲书', 2, '灵感', 3, { money: 1 }, { inspiration: 2 }, { icon: 'book' }),
  activity('microjob', '零散接单', 1, '技术', 3, { inspiration: 1 }, { money: 4 }, { route: 'B', income: true, minSanity: 4 }),
  activity('tutoring', '周末陪练', 2, '创作', 3, { inspiration: 2 }, { money: 7 }, { route: 'A', income: true, minSanity: 4 }),
  activity('market-service', '市集帮工', 3, '经营', 3, { inspiration: 3 }, { money: 10 }, { route: 'C', income: true, minSanity: 4 }),
  // Five market experiences + one seminar per route. No repeated-name skill farming.
  growth('journal', '写下今天', 'A', 1, { inspiration: 1 }, { sanity: 4 }),
  growth('sketch', '速写练习', 'A', 1, { inspiration: 1 }, { inspiration: 2 }),
  growth('story', '短篇投稿', 'A', 2, { inspiration: 2 }, { money: 5, sanity: 2 }),
  growth('photo', '城市采风', 'A', 2, { money: 2 }, { inspiration: 2, sanity: 1 }),
  growth('poetry', '诗歌工作坊', 'A', 3, { inspiration: 1 }, { sanity: 6 }),
  growth('script', '写个小脚本', 'B', 1, { inspiration: 1 }, { money: 2, sanity: 2 }),
  growth('repair', '修好旧物', 'B', 1, { money: 1 }, { inspiration: 1, sanity: 1 }),
  growth('prototype', '周末原型', 'B', 2, { inspiration: 2 }, { money: 1, sanity: 3, achievement: 1 }),
  growth('open-source', '开源贡献', 'B', 2, { inspiration: 1 }, { inspiration: 2, sanity: 1 }),
  growth('hackathon', '创客实验日', 'B', 3, { inspiration: 2 }, { money: 6, sanity: 2 }),
  growth('interview', '用户访谈', 'C', 1, { inspiration: 1 }, { inspiration: 2 }),
  growth('resale', '二手交易', 'C', 1, { money: 1 }, { money: 3 }),
  growth('salon', '组织读书会', 'C', 2, { money: 2 }, { inspiration: 2, sanity: 1 }),
  growth('trial-stall', '试摆一次摊', 'C', 2, { inspiration: 1 }, { money: 3, sanity: 2 }),
  growth('taste', '市集调研日', 'C', 3, { money: 2 }, { money: 4, inspiration: 1 }),
  ...Object.entries(ROUTES).map(([route, info]) => activity(`seminar-${route}`, { A: '写作研讨会', B: '技术交流会', C: '主理人聚会' }[route], 2, info.name, 3, { money: 1 }, { sanity: 1 }, { route, skill: route, once: true, minSanity: 4, draft: route, rule: `周末从${info.pool}池抽二选一` })),
  activity('spa', '温泉小憩', 1, '恢复', 3, { money: 3 }, { sanity: 10 }, { once: true, consumable: true, icon: 'sun' }),
  activity('exhibition', '限定展览', 2, '灵感', 3, { money: 2 }, { inspiration: 5 }, { once: true, consumable: true, icon: 'frame' }),
  activity('festival', '周末音乐节', 3, '恢复', 3, { money: 3 }, { sanity: 5, inspiration: 2, achievement: 1 }, { once: true, consumable: true, icon: 'tent' }),
  activity('headhunter', '寻找猎头', 1, '经营', 2, { money: 1 }, {}, { once: true, draft: 'any', minSanity: 4, icon: 'bag', rule: '周末任选一个高级池，抽二选一' }),
];
export const ADVANCED = [
  advanced('newsletter', '个人专栏', 'A', 2, 'AAA', { inspiration: 2 }, { money: 10 }, { income: true, minSanity: 6 }),
  advanced('illustration', '商业插画', 'A', 1, 'AAB', { inspiration: 1 }, { money: 6 }, { income: true, minSanity: 6 }),
  advanced('retreat', '驻地创作', 'A', 3, 'AAC', { money: 2 }, { sanity: 10 }),
  advanced('editorial', '策划选题', 'A', 2, 'ABC', {}, { inspiration: 2 }, { jobBonus: 2, jobBonusUses: 1, rule: '本周下一次成功副业收入 +2' }),
  advanced('royalty', '出版合约', 'A', 3, 'AAAA', { money: 6, inspiration: 2 }, {}, { once: true, core: true, upgrade: 'royalty', minSanity: 6, passiveIncome: 6, rule: '永久：从下周起每周版税收入 +6，不占日程' }),
  advanced('muse', '创作自由', 'A', 3, 'AABC', { money: 6, inspiration: 1 }, {}, { once: true, core: true, upgrade: 'muse', minSanity: 6, discount: 2, powerSanity: 2, rule: '永久：每周首个创作活动少消耗至多 2 灵感，并恢复 2 理智' }),
  advanced('freelance', '独立开发', 'B', 2, 'BBB', { inspiration: 2 }, { money: 10 }, { income: true, minSanity: 6 }),
  advanced('microtool', '小工具订阅', 'B', 1, 'ABB', { inspiration: 1 }, { money: 6 }, { income: true, minSanity: 6 }),
  advanced('maker-break', '木工小屋', 'B', 2, 'BBC', { money: 2 }, { sanity: 8 }),
  advanced('pipeline', '工具链', 'B', 1, 'ABC', {}, { inspiration: 1 }, { jobBonus: 2, jobBonusUses: 1, rule: '本周下一次成功副业收入 +2' }),
  advanced('automation', '自动化工作室', 'B', 3, 'BBBB', { money: 6, inspiration: 2 }, {}, { once: true, core: true, upgrade: 'automation', minSanity: 6, discount: 2, powerIncome: 2, rule: '永久：每周首个技术副业少消耗至多 2 灵感，收入 +2' }),
  advanced('remote', '远程合作协议', 'B', 3, 'ABBBC', { money: 8, inspiration: 2 }, {}, { once: true, core: true, upgrade: 'remote', minSanity: 6, rule: '永久：下周起周三全天自由，工资不变，少一个工作日' }),
  advanced('stall', '独立小摊', 'C', 3, 'CCC', { inspiration: 3 }, { money: 14 }, { income: true, minSanity: 6 }),
  advanced('consulting', '品牌顾问', 'C', 2, 'ACC', { inspiration: 2 }, { money: 10 }, { income: true, minSanity: 6 }),
  advanced('community', '兴趣社群', 'C', 2, 'BCC', { money: 2 }, { sanity: 6, inspiration: 1 }),
  advanced('workshop', '跨界工作坊', 'C', 3, 'ABC', { inspiration: 2 }, { money: 10, sanity: 2 }, { income: true, minSanity: 6 }),
  advanced('chain-store', '自己的小店', 'C', 3, 'CCCC', { money: 6, inspiration: 2 }, {}, { once: true, core: true, upgrade: 'chain', minSanity: 6, powerIncome: 4, powerSanity: 2, rule: '永久：每周首个经营副业收入 +4，并恢复 2 理智' }),
  advanced('brand', '跨界品牌', 'C', 3, 'ABCCC', { money: 6, inspiration: 2 }, {}, { once: true, core: true, upgrade: 'brand', minSanity: 6, passiveIncome: 10, rule: '永久：一周成功执行创作、技术、经营各一次，周末收入 +10' }),
];
export const WEEKEND_CARD = activity('weekend', '争取双休', 3, '解锁', 5, { money: 6 }, {}, { once: true, minSanity: 4, icon: 'sun', unlockWeekend: true, rule: '本周先完成副业；成功后下周永久双休，工资不变' });
export const CARD_MAP = Object.fromEntries([...CARDS, ...ADVANCED, WEEKEND_CARD].map(card => [card.id, card]));
export const MARKET_LIMITS = { 1: 4, 2: 3, 4: 2 };
export const marketLane = def => def.size === 3 ? '4' : String(def.size);
export const STUDY_PRICE = { money: 3 };
export const getCard = value => CARD_MAP[typeof value === 'string' ? value : value?.type];
export const slotLabel = slot => `${DAYS[slot.day]}${['上午', '下午', '夜晚'][slot.period]}`;
export const slotKey = slot => `${slot.day}-${slot.period}`;
export const EVENTS = [
  { name: '领导突然路过', kind: 'inspection', times: [[0, 1]], money: 2, sanity: 2, text: '抽查周一下午；只处罚该时段摸鱼。' },
  { name: '周会点名', kind: 'inspection', times: [[0, 0], [2, 0]], money: 2, sanity: 2, text: '抽查周一、周三上午。' },
  { name: '午后查岗', kind: 'inspection', times: [[1, 1], [3, 1]], money: 3, sanity: 1, text: '抽查周二、周四下午。' },
  { name: '周末巡视', kind: 'inspection', times: [[5, 0], [5, 1]], money: 2, sanity: 2, text: '抽查周六两个工作时段；已双休者不受影响。' },
  { name: '全员抽查', kind: 'inspection', times: [[4, 0], [2, 1], [4, 1]], money: 2, sanity: 2, text: '抽查周五上午、周三下午、周五下午。' },
  { name: '随机巡场', kind: 'inspection', times: [[1, 0], [3, 0], [5, 0]], money: 3, sanity: 1, text: '抽查周二、周四、周六上午。' },
  { name: '项目奖金', kind: 'bonus', gain: { money: 5 }, employeesOnly: true, text: '所有在职玩家立即获得 5 资金；不计副业收入。' },
  { name: '周日晨间团建', kind: 'team', blockedTimes: [[6, 0]], employeesOnly: true, text: '占用本周周日上午：在职玩家该时段活动与放空暂停，卡牌保留，不付执行消耗；不额外扣钱或理智。已逃离者不受影响。' },
  { name: '双休通知', kind: 'weekend', employeesOnly: true, text: '下周临时双休一周，工资不变；已永久双休者获得 3 理智。' },
  { name: '领导突击连线', kind: 'inspection', times: [[0, 1], [3, 0], [4, 1]], money: 2, sanity: 2, text: '抽查周一下午、周四上午、周五下午。' },
  { name: '普通的一周', kind: 'quiet', text: '没有额外效果，按你的安排度过这一周。' },
  { name: '周日午后团建', kind: 'team', blockedTimes: [[6, 1]], employeesOnly: true, text: '占用本周周日下午：在职玩家该时段活动与放空暂停，卡牌保留，不付执行消耗；不额外扣钱或理智。已逃离者不受影响。' },
];
export const INSPECTIONS = EVENTS;
