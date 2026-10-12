import fs from 'node:fs';
export const {cards,rules}=JSON.parse(fs.readFileSync(new URL('../data/cardpool-v24.1.json',import.meta.url),'utf8'));
export const scenarios=[
 {id:'early-basic',stage:'早期',name:'两张低价小单',cards:['A-E','B-E'],archives:[],freedom:0,placements:['周一上午','周二上午'],notes:'静态合法性与预算按本版牌表重新计算；不代表实际获取或随机市场胜率。'},
 {id:'early-capital',stage:'早期',name:'小摊与生活预留',cards:['C-E','B-S'],archives:[],freedom:0,placements:['周一上午','周日上午'],notes:'静态合法性与预算按本版牌表重新计算；不代表实际获取或随机市场胜率。'},
 {id:'mid-a',stage:'中期',name:'创作替换',cards:['A-M','A-E','B-E','A-S','B-S'],archives:['A-G1'],freedom:0,placements:['周一上午','周二上午','周三上午','周四上午','周日上午'],notes:'静态合法性与预算按本版牌表重新计算；不代表实际获取或随机市场胜率。'},
 {id:'mid-b',stage:'中期',name:'开发首次并行',cards:['B-M','A-E','B-E','B-S'],archives:['B-G1'],freedom:0,placements:['周一上午∥','周一上午∥','周二上午','周日上午'],notes:'静态合法性与预算按本版牌表重新计算；不代表实际获取或随机市场胜率。'},
 {id:'late-a',stage:'后期',name:'单一创作路线',cards:['A-H','A-M','A-M','A-E','B-E','A-S'],archives:['A-G1','A-G2'],freedom:0,placements:['周日全天','周一上午','周一下午','周二上午','周二下午','周三上午'],notes:'静态合法性与预算按本版牌表重新计算；不代表实际获取或随机市场胜率。'},
 {id:'late-b',stage:'后期',name:'单一开发路线',cards:['B-H','B-M','B-M','A-E','W-S','B-S'],archives:['B-G1','B-G2'],freedom:0,placements:['周日全天','周一上午∥','周一下午∥','周一上午∥','周二全天','周一下午∥'],notes:'静态合法性与预算按本版牌表重新计算；不代表实际获取或随机市场胜率。'},
 {id:'late-c',stage:'后期',name:'单一商业路线',cards:['C-H','C-M','C-E','W-S'],archives:['C-G1','C-G2'],freedom:0,placements:['周日全天','周一上午','周一下午','周二全天'],notes:'静态合法性与预算按本版牌表重新计算；不代表实际获取或随机市场胜率。'},
 {id:'late-w',stage:'后期',name:'单一职场转型',cards:['W-H','W-M','W-M','A-E','B-E'],archives:['W-G1','W-G2'],freedom:2,permissions:['W-P1'],placements:['周日全天','周六上午','周六下午','周一上午','周一下午'],notes:'静态合法性与预算按本版牌表重新计算；不代表实际获取或随机市场胜率。'},
 {id:'late-ab',stage:'后期',name:'创作开发主轴＋职场混合',cards:['A-H','B-X','W-X','B-S','B-S'],archives:['A-G1','A-G2','B-G1','W-G1'],freedom:0,placements:['周日全天','周一上午∥','周一上午∥','周一下午','周二上午'],notes:'静态合法性与预算按本版牌表重新计算；不代表实际获取或随机市场胜率。'},
 {id:'late-ac',stage:'后期',name:'创作商业混合',cards:['A-X','C-H','B-S'],archives:['A-G1','C-G1','C-G2'],freedom:0,placements:['周日全天','周六全天','周一上午'],notes:'静态合法性与预算按本版牌表重新计算；不代表实际获取或随机市场胜率。'},
 {id:'late-wc',stage:'后期',name:'职场商业混合',cards:['C-X','W-H','W-M','A-E'],archives:['W-G1','W-G2','C-G1'],freedom:0,placements:['周日全天','周六全天','周一上午','周一下午'],notes:'静态合法性与预算按本版牌表重新计算；不代表实际获取或随机市场胜率。'},
 {id:'zero-repeat',stage:'反例',name:'零技能重复小摊',cards:['C-E','C-E','C-E','C-E','A-L','W-S','W-S'],archives:[],freedom:0,placements:['周一上午','周一下午','周二上午','周二下午','周三全天','周四全天','周日全天'],notes:'静态合法性与预算按本版牌表重新计算；不代表实际获取或随机市场胜率。'},
 {id:'night-support',stage:'边界',name:'标准支持放夜间',cards:['B-S'],archives:[],freedom:0,placements:['周一夜晚'],notes:'静态合法性与预算按本版牌表重新计算；不代表实际获取或随机市场胜率。'},
 {id:'night-growth',stage:'边界',name:'非职场成长放夜间',cards:['A-G1'],archives:[],freedom:0,placements:['周一夜晚'],notes:'静态合法性与预算按本版牌表重新计算；不代表实际获取或随机市场胜率。'}
];
