import fs from 'node:fs';
export const {cards,rules}=JSON.parse(fs.readFileSync(new URL('../data/cardpool-v24.2.json',import.meta.url),'utf8'));
export const scenarios=[
 {"id":"early-basic","stage":"早期","name":"两张低价小单","cards":["A-E","B-E"],"archives":[],"freedom":0,"placements":["周一上午","周二上午"],"notes":"静态合法性与预算按本版牌表重新计算；不代表实际获取或随机市场胜率。"},
 {"id":"early-capital","stage":"早期","name":"小摊与生活预留","cards":["C-E","B-S"],"archives":[],"freedom":0,"placements":["周一上午","周日上午"],"notes":"静态合法性与预算按本版牌表重新计算；不代表实际获取或随机市场胜率。"},
 {"id":"mid-a","stage":"中期","name":"创作首张4h成长牌","cards":["A-M","A-E","B-E","A-S","B-S"],"archives":["A-G1","A-G2"],"freedom":0,"placements":["周一上午","周二上午","周三上午","周四上午","周日上午"],"notes":"静态合法性与预算按本版牌表重新计算；不代表实际获取或随机市场胜率。"},
 {"id":"mid-b","stage":"中期","name":"开发首张4h成长牌并行","cards":["B-M","A-E","B-E","B-S"],"archives":["B-G1","B-G2"],"freedom":0,"placements":["周一上午∥","周一上午∥","周二上午","周日上午"],"notes":"静态合法性与预算按本版牌表重新计算；不代表实际获取或随机市场胜率。"},
 {"id":"late-a","stage":"后期","name":"创作三成长牌＋起步小单","cards":["A-H","A-H","A-H","A-E"],"archives":["A-G1","A-G2"],"freedom":0,"placements":["周日全天","周六全天","周五全天","周一上午"]},
 {"id":"late-b","stage":"后期","name":"开发三成长牌＋生活支持","cards":["B-H","B-H","B-H","A-E","B-S"],"archives":["B-G1","B-G2"],"freedom":0,"placements":["周日全天","周六全天","周五全天","周一上午","周一下午"]},
 {"id":"late-c","stage":"后期","name":"商业三成长牌＋起步小单","cards":["C-H","C-H","C-H","A-E"],"archives":["C-G1","C-G2"],"freedom":0,"placements":["周日全天","周六全天","周五全天","周一上午"]},
 {"id":"late-w","stage":"后期","name":"职场转型三成长牌＋双休","cards":["W-H","W-H","W-H","A-E","B-S"],"archives":["W-G1","W-G2"],"freedom":2,"permissions":["W-P1"],"placements":["周日全天","周六全天","周五全天","周一上午","周一下午"]},
 {"id":"late-ab","stage":"后期","name":"四成长牌跨色并行","cards":["A-H","B-H","B-X","W-X","B-S"],"archives":["A-G1","A-G2","B-G1","B-G2","W-G1"],"freedom":0,"placements":["周日全天","周六全天","周一上午∥","周一上午∥","周二上午"]},
 {"id":"late-ac","stage":"后期","name":"创作商业三成长牌","cards":["A-H","A-H","A-X","A-E"],"archives":["A-G1","A-G2","C-G1"],"freedom":0,"placements":["周日全天","周六全天","周五全天","周一上午"]},
 {"id":"late-wc","stage":"后期","name":"职场商业开发四成长牌","cards":["W-H","W-H","C-X","W-X"],"archives":["W-G1","W-G2","C-G1","B-G1"],"freedom":0,"placements":["周日全天","周六全天","周五全天","周一上午"]},
 {"id":"zero-repeat","stage":"反例","name":"零技能十张牌占满白天","cards":["A-E","A-E","B-E","B-E","C-E","C-E","A-L","A-L","W-S","W-S"],"archives":[],"freedom":0,"placements":["周一上午","周一下午","周二上午","周二下午","周三上午","周三下午","周四全天","周五全天","周六全天","周日全天"]},
 {"id":"old-two-high","stage":"反例","name":"旧版两成长牌不能过线","cards":["B-H","B-H","W-S"],"archives":["B-G1","B-G2"],"freedom":0,"placements":["周日全天","周六全天","周一全天"],"qualifies":false},
 {"id":"four-high-a","stage":"后期","name":"创作四成长牌3+3+2+2","cards":["A-H","A-H","A-M","A-M"],"archives":["A-G1","A-G2"],"freedom":0,"placements":["周日全天","周六全天","周一上午","周一下午"],"qualifies":true},
 {"id":"night-support","stage":"边界","name":"标准支持放夜间","cards":["B-S"],"archives":[],"freedom":0,"placements":["周一夜晚"],"notes":"静态合法性与预算按本版牌表重新计算；不代表实际获取或随机市场胜率。"},
 {"id":"night-growth","stage":"边界","name":"非职场成长放夜间","cards":["A-G1"],"archives":[],"freedom":0,"placements":["周一夜晚"],"notes":"静态合法性与预算按本版牌表重新计算；不代表实际获取或随机市场胜率。"},
 {"id":"four-invested-w","stage":"后期","name":"W四张成长收入牌3+3+2+2","cards":["W-H","W-H","W-M","W-M","B-S"],"archives":["W-G1","W-G2"],"freedom":0,"placements":["周日全天","周六全天","周一上午","周一下午","周二上午"],"qualifies":true},
 {"id":"four-invested-b","stage":"后期","name":"B四张成长收入牌3+3+2+2","cards":["B-H","B-H","B-M","B-M","B-S"],"archives":["B-G1","B-G2"],"freedom":0,"placements":["周日全天","周六全天","周一上午","周一下午","周二上午"],"qualifies":true},
 {"id":"four-invested-c","stage":"后期","name":"C四张成长收入牌3+3+2+2","cards":["C-H","C-H","C-M","C-M","B-S"],"archives":["C-G1","C-G2"],"freedom":0,"placements":["周日全天","周六全天","周一上午","周一下午","周二上午"],"qualifies":true}
];
