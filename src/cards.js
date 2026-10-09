export const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
export const SIZE = { 1: '小', 2: '中', 3: '大' };
export const ROUTES = {
  A: { name: '创作', pool: '写作与创作', icon: 'pen', family: 'creative' },
  B: { name: '技术', pool: '技术与制作', icon: 'layers', family: 'technical' },
  C: { name: '经营', pool: '经营与社群', icon: 'shop', family: 'business' },
};
export const DEFAULTS = {
  "playerCount": 3,
  "mode": "bots",
  "startMoney": 16,
  "startSanity": 3,
  "startInspiration": 4,
  "maxSanity": 10,
  "salary": 10,
  "livingCost": 4,
  "restMoney": 2,
  "nightStress3": 2,
  "nightStress4": 4,
  "escapeIncome": 16,
  "seed": 20261009,
  "starterActivity": "nap"
};
// v0.9: size codes 1/2/3 represent 2/4/8 hours.
export const STARTERS = ['outing','handcraft','hike','nap'];
export const CARDS = [
  {
    "id": "weekend",
    "name": "争取双休",
    "kind": "activity",
    "size": 3,
    "category": "解锁",
    "icon": "sun",
    "price": {
      "money": 4
    },
    "cost": {
      "money": 1
    },
    "gain": {},
    "once": true,
    "minSanity": 2,
    "progressTarget": 3,
    "unlockWeekend": true,
    "rule": "每次推进须本周已完成副业；3/3 获得永久双休，工资不变"
  },
  {
    "id": "shopping",
    "name": "淘宝购物",
    "kind": "activity",
    "size": 1,
    "category": "生活",
    "icon": "phone",
    "price": {
      "money": 1
    },
    "cost": {
      "money": 2
    },
    "gain": {
      "inspiration": 3
    },
    "once": true,
    "consumable": true,
    "minSanity": 0,
    "stress": 0
  },
  {
    "id": "mall",
    "name": "逛商场",
    "kind": "activity",
    "size": 2,
    "category": "生活",
    "icon": "shop",
    "price": {
      "money": 2
    },
    "cost": {
      "money": 2
    },
    "gain": {
      "inspiration": 5
    },
    "once": true,
    "consumable": true,
    "minSanity": 0,
    "stress": 0
  },
  {
    "id": "outing",
    "name": "周日看场演出",
    "kind": "activity",
    "size": 2,
    "category": "生活",
    "icon": "frame",
    "price": {
      "money": 4
    },
    "cost": {},
    "gain": {
      "inspiration": 5
    },
    "once": true,
    "consumable": true,
    "minSanity": 0,
    "stress": 0
  },
  {
    "id": "walk",
    "name": "街角散步",
    "kind": "activity",
    "size": 1,
    "category": "生活",
    "icon": "leaf",
    "price": {
      "money": 2
    },
    "cost": {},
    "gain": {
      "inspiration": 2
    },
    "once": true,
    "consumable": true,
    "minSanity": 0,
    "stress": 0
  },
  {
    "id": "nap",
    "name": "宅家慢生活",
    "kind": "activity",
    "size": 2,
    "category": "生活",
    "icon": "coffee",
    "price": {
      "money": 3
    },
    "cost": {},
    "gain": {
      "inspiration": 4
    },
    "once": true,
    "consumable": true,
    "minSanity": 0,
    "stress": 0
  },
  {
    "id": "handcraft",
    "name": "沉浸手作",
    "kind": "activity",
    "size": 2,
    "category": "生活",
    "icon": "pen",
    "price": {
      "money": 2
    },
    "cost": {
      "money": 1
    },
    "gain": {
      "inspiration": 4
    },
    "once": true,
    "consumable": true,
    "minSanity": 0,
    "stress": 0
  },
  {
    "id": "hike",
    "name": "郊外寻趣",
    "kind": "activity",
    "size": 2,
    "category": "生活",
    "icon": "mountain",
    "price": {
      "money": 3
    },
    "cost": {
      "money": 1
    },
    "gain": {
      "inspiration": 5
    },
    "once": true,
    "consumable": true,
    "minSanity": 0,
    "stress": 0
  },
  {
    "id": "music",
    "name": "听完整张专辑",
    "kind": "activity",
    "size": 1,
    "category": "灵感",
    "icon": "headphones",
    "price": {
      "money": 3
    },
    "cost": {},
    "gain": {
      "inspiration": 1
    }
  },
  {
    "id": "reading",
    "name": "读一本闲书",
    "kind": "activity",
    "size": 2,
    "category": "灵感",
    "icon": "book",
    "price": {
      "money": 5
    },
    "cost": {
      "money": 1
    },
    "gain": {
      "inspiration": 4
    }
  },
  {
    "id": "microjob",
    "name": "零散接单",
    "kind": "activity",
    "size": 1,
    "category": "技术",
    "icon": "layers",
    "price": {
      "money": 3
    },
    "cost": {
      "inspiration": 1
    },
    "gain": {
      "money": 2
    },
    "route": "B",
    "income": true,
    "minSanity": 1,
    "stress": 1
  },
  {
    "id": "tutoring",
    "name": "周末陪练",
    "kind": "activity",
    "size": 2,
    "category": "创作",
    "icon": "pen",
    "price": {
      "money": 5
    },
    "cost": {
      "inspiration": 1
    },
    "gain": {
      "money": 4
    },
    "route": "A",
    "income": true,
    "minSanity": 1,
    "stress": 1
  },
  {
    "id": "market-service",
    "name": "市集帮工",
    "kind": "activity",
    "size": 3,
    "category": "经营",
    "icon": "shop",
    "price": {
      "money": 6
    },
    "cost": {
      "inspiration": 2
    },
    "gain": {
      "money": 7
    },
    "route": "C",
    "income": true,
    "minSanity": 1,
    "stress": 1
  },
  {
    "id": "journal",
    "name": "写下今天",
    "kind": "activity",
    "size": 1,
    "category": "创作",
    "icon": "pen",
    "price": {
      "money": 3
    },
    "cost": {},
    "gain": {
      "inspiration": 1
    },
    "route": "A",
    "skill": "A",
    "once": true,
    "minSanity": 1,
    "stress": 0
  },
  {
    "id": "sketch",
    "name": "速写练习",
    "kind": "activity",
    "size": 1,
    "category": "创作",
    "icon": "pen",
    "price": {
      "money": 3
    },
    "cost": {
      "money": 1
    },
    "gain": {
      "inspiration": 3
    },
    "route": "A",
    "skill": "A",
    "once": true,
    "minSanity": 1,
    "stress": 0
  },
  {
    "id": "story",
    "name": "短篇投稿",
    "kind": "activity",
    "size": 2,
    "category": "创作",
    "icon": "pen",
    "price": {
      "money": 4
    },
    "cost": {
      "inspiration": 1
    },
    "gain": {
      "money": 4
    },
    "route": "A",
    "skill": "A",
    "once": true,
    "minSanity": 1,
    "stress": 0
  },
  {
    "id": "photo",
    "name": "城市采风",
    "kind": "activity",
    "size": 2,
    "category": "创作",
    "icon": "pen",
    "price": {
      "money": 4
    },
    "cost": {
      "money": 1
    },
    "gain": {
      "inspiration": 4
    },
    "route": "A",
    "skill": "A",
    "once": true,
    "minSanity": 1,
    "stress": 0
  },
  {
    "id": "poetry",
    "name": "诗歌工作坊",
    "kind": "activity",
    "size": 3,
    "category": "创作",
    "icon": "pen",
    "price": {
      "money": 5
    },
    "cost": {
      "inspiration": 1
    },
    "gain": {
      "money": 6,
      "inspiration": 2
    },
    "route": "A",
    "skill": "A",
    "once": true,
    "minSanity": 1,
    "stress": 0
  },
  {
    "id": "script",
    "name": "写个小脚本",
    "kind": "activity",
    "size": 1,
    "category": "技术",
    "icon": "layers",
    "price": {
      "money": 3
    },
    "cost": {
      "inspiration": 1
    },
    "gain": {
      "money": 2
    },
    "route": "B",
    "skill": "B",
    "once": true,
    "minSanity": 1,
    "stress": 0
  },
  {
    "id": "repair",
    "name": "修好旧物",
    "kind": "activity",
    "size": 1,
    "category": "技术",
    "icon": "layers",
    "price": {
      "money": 3
    },
    "cost": {},
    "gain": {
      "inspiration": 1
    },
    "route": "B",
    "skill": "B",
    "once": true,
    "minSanity": 1,
    "stress": 0
  },
  {
    "id": "prototype",
    "name": "周末原型",
    "kind": "activity",
    "size": 2,
    "category": "技术",
    "icon": "layers",
    "price": {
      "money": 4
    },
    "cost": {
      "inspiration": 1
    },
    "gain": {
      "money": 3,
      "inspiration": 1
    },
    "route": "B",
    "skill": "B",
    "once": true,
    "minSanity": 1,
    "stress": 0
  },
  {
    "id": "open-source",
    "name": "开源贡献",
    "kind": "activity",
    "size": 2,
    "category": "技术",
    "icon": "layers",
    "price": {
      "money": 4
    },
    "cost": {},
    "gain": {
      "inspiration": 3
    },
    "route": "B",
    "skill": "B",
    "once": true,
    "minSanity": 1,
    "stress": 0
  },
  {
    "id": "hackathon",
    "name": "创客实验日",
    "kind": "activity",
    "size": 3,
    "category": "技术",
    "icon": "layers",
    "price": {
      "money": 5
    },
    "cost": {
      "inspiration": 1
    },
    "gain": {
      "money": 6,
      "inspiration": 2
    },
    "route": "B",
    "skill": "B",
    "once": true,
    "minSanity": 1,
    "stress": 0
  },
  {
    "id": "interview",
    "name": "用户访谈",
    "kind": "activity",
    "size": 1,
    "category": "经营",
    "icon": "shop",
    "price": {
      "money": 3
    },
    "cost": {},
    "gain": {
      "inspiration": 1
    },
    "route": "C",
    "skill": "C",
    "once": true,
    "minSanity": 1,
    "stress": 0
  },
  {
    "id": "resale",
    "name": "二手交易",
    "kind": "activity",
    "size": 1,
    "category": "经营",
    "icon": "shop",
    "price": {
      "money": 3
    },
    "cost": {
      "money": 1
    },
    "gain": {
      "money": 3
    },
    "route": "C",
    "skill": "C",
    "once": true,
    "minSanity": 1,
    "stress": 0
  },
  {
    "id": "salon",
    "name": "组织读书会",
    "kind": "activity",
    "size": 2,
    "category": "经营",
    "icon": "shop",
    "price": {
      "money": 4
    },
    "cost": {
      "money": 1
    },
    "gain": {
      "inspiration": 4
    },
    "route": "C",
    "skill": "C",
    "once": true,
    "minSanity": 1,
    "stress": 0
  },
  {
    "id": "trial-stall",
    "name": "试摆一次摊",
    "kind": "activity",
    "size": 2,
    "category": "经营",
    "icon": "shop",
    "price": {
      "money": 4
    },
    "cost": {
      "inspiration": 1
    },
    "gain": {
      "money": 4
    },
    "route": "C",
    "skill": "C",
    "once": true,
    "minSanity": 1,
    "stress": 0
  },
  {
    "id": "taste",
    "name": "市集调研日",
    "kind": "activity",
    "size": 3,
    "category": "经营",
    "icon": "shop",
    "price": {
      "money": 5
    },
    "cost": {
      "inspiration": 1
    },
    "gain": {
      "money": 6,
      "inspiration": 2
    },
    "route": "C",
    "skill": "C",
    "once": true,
    "minSanity": 1,
    "stress": 0
  },
  {
    "id": "seminar-A",
    "name": "写作研讨会",
    "kind": "activity",
    "size": 2,
    "category": "创作",
    "icon": "pen",
    "price": {
      "money": 6
    },
    "cost": {
      "money": 2
    },
    "gain": {},
    "route": "A",
    "skill": "A",
    "once": true,
    "minSanity": 1,
    "draft": "A",
    "rule": "周末从未亮出的创作高级牌抽二选一",
    "stress": 0
  },
  {
    "id": "seminar-B",
    "name": "技术交流会",
    "kind": "activity",
    "size": 2,
    "category": "技术",
    "icon": "layers",
    "price": {
      "money": 6
    },
    "cost": {
      "money": 2
    },
    "gain": {},
    "route": "B",
    "skill": "B",
    "once": true,
    "minSanity": 1,
    "draft": "B",
    "rule": "周末从未亮出的技术高级牌抽二选一",
    "stress": 0
  },
  {
    "id": "seminar-C",
    "name": "主理人聚会",
    "kind": "activity",
    "size": 2,
    "category": "经营",
    "icon": "shop",
    "price": {
      "money": 6
    },
    "cost": {
      "money": 2
    },
    "gain": {},
    "route": "C",
    "skill": "C",
    "once": true,
    "minSanity": 1,
    "draft": "C",
    "rule": "周末从未亮出的经营高级牌抽二选一",
    "stress": 0
  },
  {
    "id": "spa",
    "name": "温泉小憩",
    "kind": "activity",
    "size": 1,
    "category": "生活",
    "icon": "sun",
    "price": {
      "money": 4
    },
    "cost": {},
    "gain": {
      "inspiration": 3
    },
    "once": true,
    "consumable": true,
    "minSanity": 0,
    "stress": 0
  },
  {
    "id": "exhibition",
    "name": "限定展览",
    "kind": "activity",
    "size": 2,
    "category": "生活",
    "icon": "frame",
    "price": {
      "money": 5
    },
    "cost": {
      "money": 1
    },
    "gain": {
      "inspiration": 7
    },
    "once": true,
    "consumable": true,
    "minSanity": 0,
    "stress": 0
  },
  {
    "id": "festival",
    "name": "周末音乐节",
    "kind": "activity",
    "size": 3,
    "category": "生活",
    "icon": "tent",
    "price": {
      "money": 6
    },
    "cost": {
      "money": 2
    },
    "gain": {
      "inspiration": 10
    },
    "once": true,
    "consumable": true,
    "minSanity": 0,
    "stress": 0
  },
  {
    "id": "headhunter",
    "name": "寻找猎头",
    "kind": "activity",
    "size": 2,
    "category": "经营",
    "icon": "bag",
    "price": {
      "money": 4
    },
    "cost": {
      "money": 2
    },
    "gain": {},
    "once": true,
    "draft": "any",
    "minSanity": 1,
    "rule": "周末从未亮出的 8h 高级牌抽二选一"
  },
  {
    "id": "podcast",
    "name": "通勤播客",
    "kind": "activity",
    "size": 1,
    "category": "灵感",
    "icon": "headphones",
    "price": {
      "money": 4
    },
    "cost": {
      "money": 1
    },
    "gain": {
      "inspiration": 2
    }
  },
  {
    "id": "library",
    "name": "图书馆自习",
    "kind": "activity",
    "size": 2,
    "category": "灵感",
    "icon": "book",
    "price": {
      "money": 5
    },
    "cost": {},
    "gain": {
      "inspiration": 3
    }
  },
  {
    "id": "proofread",
    "name": "文字校对",
    "kind": "activity",
    "size": 1,
    "category": "创作",
    "icon": "pen",
    "price": {
      "money": 3
    },
    "cost": {
      "inspiration": 1
    },
    "gain": {
      "money": 2
    },
    "income": true,
    "route": "A",
    "minSanity": 1,
    "stress": 1
  },
  {
    "id": "errands",
    "name": "邻里代办",
    "kind": "activity",
    "size": 1,
    "category": "经营",
    "icon": "shop",
    "price": {
      "money": 3
    },
    "cost": {
      "inspiration": 1
    },
    "gain": {
      "money": 2
    },
    "income": true,
    "route": "C",
    "minSanity": 1,
    "stress": 1
  }
];
export const ADVANCED = [
  {
    "id": "newsletter",
    "name": "个人专栏",
    "kind": "activity",
    "size": 3,
    "category": "创作",
    "icon": "pen",
    "price": {
      "money": 9
    },
    "cost": {
      "inspiration": 2
    },
    "gain": {
      "money": 9
    },
    "route": "A",
    "requires": "AAA",
    "tier": "advanced",
    "income": true,
    "minSanity": 3,
    "stress": 1
  },
  {
    "id": "illustration",
    "name": "商业插画",
    "kind": "activity",
    "size": 3,
    "category": "创作",
    "icon": "pen",
    "price": {
      "money": 9
    },
    "cost": {
      "inspiration": 1
    },
    "gain": {
      "money": 8
    },
    "route": "A",
    "requires": "AAB",
    "tier": "advanced",
    "income": true,
    "minSanity": 3,
    "stress": 1
  },
  {
    "id": "retreat",
    "name": "驻地创作",
    "kind": "activity",
    "size": 3,
    "category": "创作",
    "icon": "pen",
    "price": {
      "money": 7
    },
    "cost": {
      "money": 1
    },
    "gain": {
      "inspiration": 6
    },
    "route": "A",
    "requires": "AAC",
    "tier": "advanced",
    "minSanity": 3,
    "once": false,
    "consumable": false
  },
  {
    "id": "editorial",
    "name": "策划选题",
    "kind": "activity",
    "size": 3,
    "category": "创作",
    "icon": "pen",
    "price": {
      "money": 9
    },
    "cost": {},
    "gain": {
      "inspiration": 3
    },
    "route": "A",
    "requires": "ABC",
    "tier": "advanced",
    "jobBonus": 3,
    "jobBonusUses": 1,
    "rule": "本周下一次成功副业收入 +3",
    "minSanity": 3
  },
  {
    "id": "royalty",
    "name": "出版合约",
    "kind": "activity",
    "size": 3,
    "category": "创作",
    "icon": "pen",
    "price": {
      "money": 8
    },
    "cost": {
      "money": 1,
      "inspiration": 1
    },
    "gain": {},
    "route": "A",
    "requires": "AAAA",
    "tier": "advanced",
    "once": true,
    "core": true,
    "upgrade": "royalty",
    "minSanity": 4,
    "passiveIncome": 6,
    "rule": "完成后下周起，每周版税收入 6，不占日程",
    "stress": 1,
    "progressTarget": 2
  },
  {
    "id": "muse",
    "name": "创作自由",
    "kind": "activity",
    "size": 3,
    "category": "创作",
    "icon": "pen",
    "price": {
      "money": 8
    },
    "cost": {
      "money": 2,
      "inspiration": 1
    },
    "gain": {},
    "route": "A",
    "requires": "AABC",
    "tier": "advanced",
    "once": true,
    "core": true,
    "upgrade": "muse",
    "minSanity": 4,
    "discount": 1,
    "rule": "完成后下周起，每周首次创作副业少耗 1 灵感、收入加 4",
    "stress": 1,
    "powerIncome": 4
  },
  {
    "id": "freelance",
    "name": "独立开发",
    "kind": "activity",
    "size": 3,
    "category": "技术",
    "icon": "layers",
    "price": {
      "money": 9
    },
    "cost": {
      "inspiration": 1
    },
    "gain": {
      "money": 8
    },
    "route": "B",
    "requires": "BBB",
    "tier": "advanced",
    "income": true,
    "minSanity": 3,
    "stress": 1
  },
  {
    "id": "microtool",
    "name": "小工具订阅",
    "kind": "activity",
    "size": 3,
    "category": "技术",
    "icon": "layers",
    "price": {
      "money": 9
    },
    "cost": {},
    "gain": {
      "money": 6
    },
    "route": "B",
    "requires": "ABB",
    "tier": "advanced",
    "income": true,
    "minSanity": 3,
    "stress": 1
  },
  {
    "id": "maker-break",
    "name": "木工小屋",
    "kind": "activity",
    "size": 3,
    "category": "技术",
    "icon": "layers",
    "price": {
      "money": 9
    },
    "cost": {
      "money": 1
    },
    "gain": {
      "inspiration": 5
    },
    "route": "B",
    "requires": "BBC",
    "tier": "advanced",
    "minSanity": 3
  },
  {
    "id": "pipeline",
    "name": "工具链",
    "kind": "activity",
    "size": 3,
    "category": "技术",
    "icon": "layers",
    "price": {
      "money": 9
    },
    "cost": {},
    "gain": {
      "inspiration": 4
    },
    "route": "B",
    "requires": "ABC",
    "tier": "advanced",
    "jobBonus": 2,
    "jobBonusUses": 1,
    "rule": "本周下一次成功副业收入 +2",
    "minSanity": 3
  },
  {
    "id": "automation",
    "name": "自动化工作室",
    "kind": "activity",
    "size": 3,
    "category": "技术",
    "icon": "layers",
    "price": {
      "money": 8
    },
    "cost": {
      "money": 1,
      "inspiration": 1
    },
    "gain": {},
    "route": "B",
    "requires": "BBBB",
    "tier": "advanced",
    "once": true,
    "core": true,
    "upgrade": "automation",
    "minSanity": 4,
    "discount": 2,
    "powerIncome": 4,
    "rule": "完成后下周起，每周首次技术副业少耗 2 灵感、收入加 4",
    "stress": 1,
    "progressTarget": 2
  },
  {
    "id": "remote",
    "name": "远程合作协议",
    "kind": "activity",
    "size": 3,
    "category": "技术",
    "icon": "layers",
    "price": {
      "money": 8
    },
    "cost": {
      "money": 3,
      "inspiration": 1
    },
    "gain": {},
    "route": "B",
    "requires": "ABBBC",
    "tier": "advanced",
    "once": true,
    "core": true,
    "upgrade": "remote",
    "minSanity": 4,
    "rule": "永久：下周起周三全天自由，不受查岗，工资不变",
    "stress": 1
  },
  {
    "id": "stall",
    "name": "独立小摊",
    "kind": "activity",
    "size": 3,
    "category": "经营",
    "icon": "shop",
    "price": {
      "money": 9
    },
    "cost": {
      "money": 2,
      "inspiration": 2
    },
    "gain": {
      "money": 11
    },
    "route": "C",
    "requires": "CCC",
    "tier": "advanced",
    "income": true,
    "minSanity": 3,
    "stress": 1
  },
  {
    "id": "consulting",
    "name": "品牌顾问",
    "kind": "activity",
    "size": 3,
    "category": "经营",
    "icon": "shop",
    "price": {
      "money": 9
    },
    "cost": {
      "money": 1,
      "inspiration": 1
    },
    "gain": {
      "money": 9
    },
    "route": "C",
    "requires": "ACC",
    "tier": "advanced",
    "income": true,
    "minSanity": 3,
    "stress": 1
  },
  {
    "id": "community",
    "name": "兴趣社群",
    "kind": "activity",
    "size": 3,
    "category": "经营",
    "icon": "shop",
    "price": {
      "money": 9
    },
    "cost": {
      "money": 1
    },
    "gain": {
      "inspiration": 2
    },
    "route": "C",
    "requires": "BCC",
    "tier": "advanced",
    "minSanity": 3,
    "jobBonus": 4,
    "jobBonusUses": 1,
    "rule": "本周下一次成功副业收入 +4"
  },
  {
    "id": "workshop",
    "name": "跨界工作坊",
    "kind": "activity",
    "size": 3,
    "category": "经营",
    "icon": "shop",
    "price": {
      "money": 9
    },
    "cost": {
      "inspiration": 1
    },
    "gain": {
      "money": 8
    },
    "route": "C",
    "requires": "ABC",
    "tier": "advanced",
    "income": true,
    "minSanity": 3,
    "stress": 1,
    "jobBonus": 2,
    "jobBonusUses": 1,
    "rule": "本周下一次成功副业收入 +2"
  },
  {
    "id": "chain-store",
    "name": "自己的小店",
    "kind": "activity",
    "size": 3,
    "category": "经营",
    "icon": "shop",
    "price": {
      "money": 8
    },
    "cost": {
      "money": 1,
      "inspiration": 1
    },
    "gain": {},
    "route": "C",
    "requires": "CCCC",
    "tier": "advanced",
    "once": true,
    "core": true,
    "upgrade": "chain",
    "minSanity": 4,
    "powerIncome": 6,
    "rule": "完成后下周起，每周首次经营副业收入加 6",
    "stress": 1,
    "progressTarget": 2
  },
  {
    "id": "brand",
    "name": "跨界品牌",
    "kind": "activity",
    "size": 3,
    "category": "经营",
    "icon": "shop",
    "price": {
      "money": 9
    },
    "cost": {
      "money": 2,
      "inspiration": 2
    },
    "gain": {},
    "route": "C",
    "requires": "ABCCC",
    "tier": "advanced",
    "once": true,
    "core": true,
    "upgrade": "brand",
    "minSanity": 4,
    "passiveIncome": 10,
    "rule": "完成后下周起，本周成功执行创作、技术、经营各一项，获得副业收入 10",
    "stress": 1
  }
];
export const CARD_MAP = Object.fromEntries([...CARDS,...ADVANCED].map(d=>[d.id,d]));
export const MARKET_LIMITS = {2:5,4:4,8:3};
export const marketLane = d => String({1:2,2:4,3:8}[d.size]);
export const getCard = value => CARD_MAP[typeof value==='string'?value:value?.type];
export const slotLabel = slot => `${DAYS[slot.day]}${['上午','下午','夜晚'][slot.period]}`;
export const slotKey = slot => `${slot.day}-${slot.period}`;
export const EVENTS = [
  {
    "name": "领导突然路过",
    "kind": "inspection",
    "times": [
      [
        0,
        1
      ],
      [
        2,
        0
      ],
      [
        4,
        1
      ]
    ],
    "money": 1,
    "sanity": 1,
    "text": "公开抽查周一下午、周三上午、周五下午；每涉事小时扣 1 资金、1 点当周问责压力，活动暂停。"
  },
  {
    "name": "周会点名",
    "kind": "inspection",
    "times": [
      [
        0,
        0
      ],
      [
        2,
        0
      ],
      [
        4,
        0
      ]
    ],
    "money": 1,
    "sanity": 1,
    "text": "公开抽查周一上午、周三上午、周五上午；每涉事小时扣 1 资金、1 点当周问责压力，活动暂停。"
  },
  {
    "name": "午后查岗",
    "kind": "inspection",
    "times": [
      [
        1,
        1
      ],
      [
        3,
        1
      ],
      [
        5,
        1
      ]
    ],
    "money": 1,
    "sanity": 1,
    "text": "公开抽查周二下午、周四下午、周六下午；每涉事小时扣 1 资金、1 点当周问责压力，活动暂停。"
  },
  {
    "name": "周末巡视",
    "kind": "inspection",
    "times": [
      [
        5,
        0
      ],
      [
        5,
        1
      ],
      [
        2,
        1
      ]
    ],
    "money": 1,
    "sanity": 1,
    "text": "公开抽查周六上午、周六下午、周三下午；每涉事小时扣 1 资金、1 点当周问责压力，活动暂停。"
  },
  {
    "name": "全员抽查",
    "kind": "inspection",
    "times": [
      [
        4,
        0
      ],
      [
        2,
        1
      ],
      [
        4,
        1
      ]
    ],
    "money": 1,
    "sanity": 1,
    "text": "公开抽查周五上午、周三下午、周五下午；每涉事小时扣 1 资金、1 点当周问责压力，活动暂停。"
  },
  {
    "name": "随机巡场",
    "kind": "inspection",
    "times": [
      [
        1,
        0
      ],
      [
        3,
        0
      ],
      [
        5,
        0
      ]
    ],
    "money": 1,
    "sanity": 1,
    "text": "公开抽查周二上午、周四上午、周六上午；每涉事小时扣 1 资金、1 点当周问责压力，活动暂停。"
  },
  {
    "name": "项目奖金",
    "kind": "bonus",
    "gain": {
      "money": 5
    },
    "employeesOnly": true,
    "text": "所有在职玩家周末获得 5 资金；不计副业收入。"
  },
  {
    "name": "周日晨间团建",
    "kind": "team",
    "blockedTimes": [
      [
        6,
        0
      ]
    ],
    "employeesOnly": true,
    "text": "占用本周周日上午：在职玩家该时段活动暂停，卡牌保留，不付执行消耗；不额外扣钱或理智。已逃离者不受影响。"
  },
  {
    "name": "双休通知",
    "kind": "weekend",
    "employeesOnly": true,
    "text": "本周临时双休，工资不变；已永久双休者周末获得 2 资金。"
  },
  {
    "name": "领导突击连线",
    "kind": "inspection",
    "times": [
      [
        0,
        1
      ],
      [
        3,
        0
      ],
      [
        4,
        1
      ]
    ],
    "money": 1,
    "sanity": 1,
    "text": "公开抽查周一下午、周四上午、周五下午；每涉事小时扣 1 资金、1 点当周问责压力，活动暂停。"
  },
  {
    "name": "线上考勤核对",
    "kind": "inspection",
    "text": "公开抽查周一上午、周二下午、周六上午；每涉事小时扣 1 资金、1 点当周问责压力，活动暂停。",
    "money": 1,
    "sanity": 1,
    "times": [
      [
        0,
        0
      ],
      [
        1,
        1
      ],
      [
        5,
        0
      ]
    ]
  },
  {
    "name": "周日午后团建",
    "kind": "team",
    "blockedTimes": [
      [
        6,
        1
      ]
    ],
    "employeesOnly": true,
    "text": "占用本周周日下午：在职玩家该时段活动暂停，卡牌保留，不付执行消耗；不额外扣钱或理智。已逃离者不受影响。"
  }
];
export const INSPECTIONS = EVENTS;
