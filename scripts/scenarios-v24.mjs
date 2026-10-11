import fs from 'node:fs';
export const {cards,rules}=JSON.parse(fs.readFileSync(new URL('../data/cardpool-v24.json',import.meta.url),'utf8'));
export const scenarios=[
 {id:'early-basic',stage:'早期',name:'两张低价小单',cards:['A-E','B-E'],archives:[],freedom:0,placements:['周一上午','周二上午'],notes:'购牌2，固定副业2；无维护。是筹资台阶，不达线。'},
 {id:'early-capital',stage:'早期',name:'小摊与生活预留',cards:['C-E','B-S'],archives:[],freedom:0,placements:['周一上午','周日上午'],notes:'购牌3、本金4、预留周费1，恰好使用起始8；收入2、理智4。'},
 {id:'mid-a',stage:'中期',name:'创作替换',cards:['A-M','A-E','B-E','A-S','B-S'],archives:['A-G1'],freedom:0,placements:['周一上午','周二上午','周三上午','周四上午','周日上午'],notes:'一技能后收入4、理智6；A-M替换两张小单，未到终局。'},
 {id:'mid-b',stage:'中期',name:'开发首次并行',cards:['B-M','A-E','B-E','B-S'],archives:['B-G1'],freedom:0,placements:['周一上午∥','周一上午∥','周二上午','周日上午'],notes:'B-M与A-E同槽；收入4，理智4，付费支持抵一部分固定压力。'},
 {id:'late-a',stage:'后期',name:'单一创作路线',cards:['A-H','A-M','A-M','A-E','B-E','A-S'],archives:['A-G1','A-G2'],freedom:0,placements:['周日全天','周一上午','周一下午','周二上午','周二下午','周三上午'],notes:'仅一张高级牌；收入10、支持3、理智6、无周费；同名中阶需要两份供给。'},
 {id:'late-b',stage:'后期',name:'单一开发路线',cards:['B-H','B-M','B-M','A-E','W-S','B-S'],archives:['B-G1','B-G2'],freedom:0,placements:['周日全天','周一上午∥','周一下午∥','周一上午∥','周二全天','周一下午∥'],notes:'收入10、压力3、支持6、理智6；两张工具分别带一张普通4h牌，各槽最多两张。'},
 {id:'late-c',stage:'后期',name:'单一商业路线',cards:['C-H','C-M','C-E','W-S'],archives:['C-G1','C-G2'],freedom:0,placements:['周日全天','周一上午','周一下午','周二全天'],notes:'收入10、压力2、支持5、理智6；锁定本金16，周费2。'},
 {id:'late-w',stage:'后期',name:'单一职场转型',cards:['W-H','W-M','W-M','A-E','B-E'],archives:['W-G1','W-G2'],freedom:2,permissions:['W-P1'],placements:['周日全天','周六上午','周六下午','周一上午','周一下午'],notes:'WW与双休完成后，收入10、支持1、自主2，理智6；双休此前两周推进且付2。'},
 {id:'late-ab',stage:'后期',name:'创作开发主轴＋职场混合',cards:['A-H','B-X','W-X','B-S','B-S'],archives:['A-G1','A-G2','B-G1','W-G1'],freedom:0,placements:['周日全天','周一上午∥','周一上午∥','周一下午','周二上午'],notes:'收入10、支持6、压力1、理智8；AB并行3+WB收入3，需四个实际归档。'},
 {id:'late-ac',stage:'后期',name:'创作商业混合',cards:['A-X','C-H','B-S'],archives:['A-G1','C-G1','C-G2'],freedom:0,placements:['周日全天','周六全天','周一上午'],notes:'收入10、支持4、理智7；3张活动但本金14，三次不同归档且两张高级牌；未双休的周六仍暴露。'},
 {id:'late-wc',stage:'后期',name:'职场商业混合',cards:['C-X','W-H','W-M','A-E'],archives:['W-G1','W-G2','C-G1'],freedom:0,placements:['周日全天','周六全天','周一上午','周一下午'],notes:'收入10、支持3、理智6；本金4，三次归档，两张高级牌。周六仍可查岗。'},
 {id:'zero-repeat',stage:'反例',name:'零技能重复小摊',cards:['C-E','C-E','C-E','C-E','A-L','W-S','W-S'],archives:[],freedom:0,placements:['周一上午','周一下午','周二上午','周二下午','周三全天','周四全天','周日全天'],notes:'四人供给允许同名小摊4张；收入10，压力5、支持8、理智6；本金16、周费4。承认它可达，比较代价而非宣称禁止零技能。'},
 {id:'night-support',stage:'边界',name:'标准支持放夜间',cards:['B-S'],archives:[],freedom:0,placements:['周一夜晚'],notes:'支持2与夜间压力2抵消，理智仍3；不是免费安全理智。'},
 {id:'night-growth',stage:'边界',name:'非职场成长放夜间',cards:['A-G1'],archives:[],freedom:0,placements:['周一夜晚'],notes:'安排时理智1，完成归档移出后恢复3；不增加技能本身的理智。'}
];
