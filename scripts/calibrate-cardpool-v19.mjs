import assert from 'node:assert/strict';

// Apply the approved numerical templates to the original card definitions.
export function calibratePool(candidate) {
const notes = {};
const find = id => candidate.cards.find(c => c.id === id);
function change(id, patch, why, remove = []) {
  const c = find(id);
  assert(c, id);
  for (const key of remove) delete c[key];
  Object.assign(c, patch);
  notes[id] = why;
}

// Basic growth: the permanent archive is its main reward, not a recurring income.
change('W01', {}, '保留：买 2、周末返奖金 1，净支出 1；压力和低心智换履职安全。');
change('W02', {gain:{}}, '去掉额外灵感，回到买 1 归档一个技能；不再比简单成长白送资源。');
change('W03', {}, '保留：买 3、周末返奖金 2，净支出 1；较长时段与压力 2 是兑现速度的代价。');
change('W05', {maxSanity:10}, '保留基准买 2／奖金 1／压力 1；取消入门补位的低心智门槛，给转型组合留一个履职触发器。');
change('W06', {kind:'growth'}, '奖金骰改为一次性归档。期望奖金 4/3、净支出 5/3，保留画饼体验，减少每周掷骰。');
change('W07', {cost:{},gain:{inspiration:4}}, '取消周费；灵感 4 减压力 1 的预算为 3。低心智是路线限制，不再额外加赠收益。');
change('W08', {price:4}, '奖金 3、压力 2 的预算为 4；购价由 5 降至 4。');
change('W09', {price:4}, '预算 5，三技能补偿 1，买价 4；履职收益仍不能计入逃离。');
change('W10', {price:5,stress:1}, '预算 7，四技能补偿 2，买价 5；保留低心智条件，压力由 2 减至 1。');
change('W11', {price:5,minSanity:3,maxSanity:10,cost:{}}, '取消灵感费并把低心智限制改为至少 3，允许职场技能转为可参与逃离的收入。');
change('W12', {price:5,stress:0,minSanity:3,maxSanity:10,cost:{}}, '收入 2→3，按触发上限定价；先执行履职只改变触发率，不再额外补偿购价。');

change('A01', {price:2,cost:{},gain:{inspiration:1}}, '简单归档 1 钱，加一次灵感 1 再加 1 钱；删去先扣后加的灵感记账。');
change('A02', {gain:{}}, '回到 2h／买 1／单纯归档。');
change('A03', {cost:{},gain:{inspiration:1}}, '回到 4h／买 2／归档并获得一次灵感 1。');
change('A05', {price:2}, '常驻灵感 1 的 2h 基准买价为 2。');
change('A06', {price:4}, '留白 0–4 晚得到 0–4 灵感，按上限 4 定价；不臆定平均留白数。');
change('A07', {stress:0,gain:{profit:2},effect:''}, '固定收入 2、耗灵感 1、无压力，正好对应创作模板；去掉每周收益骰。', ['dice']);
change('A08', {stress:0,cost:{inspiration:1}}, '保留买价 5；取消压力、灵感费由 2 减至 1，使预算回到 5。');
change('A09', {cost:{},support:1,upkeep:0,minSanity:0}, '保留留白条件，加入支持 1，取消灵感费；收入 2→3、预算 6→8，按上限买 7。');
change('A10', {price:8,stress:0,cost:{},support:1,upkeep:0,minSanity:0}, '收入 3→4、支持 1；四技能预算按最强状态定价 8，留白不足时不能按收入 4 估值。');
change('A11', {price:7,cost:{inspiration:1},gain:{profit:3},support:1,upkeep:0,minSanity:0}, '保留先开发后创作的灵感减免；收入 3、支持 1、耗灵感 1→0，按完全减免的上限买 7。');
change('A12', {price:6,stress:0,cost:{inspiration:1}}, '收入 3→4，灵感费降为 1、取消压力；按触发上限定价 6。');

change('B01', {cost:{}}, '买 2、返现金 1 后净支出 1，取消额外灵感费。');
change('B02', {gain:{}}, '回到 2h／买 1／单纯归档。');
change('B03', {cost:{},gain:{cash:1,inspiration:1}}, '买 3、周末返 1：净支出 2，归档＋一次灵感 1；预付与返款时点仍有区别。');
change('B05', {cost:{},gain:{inspiration:1}}, '取消现金周费，改为买 2、常驻灵感 1，与 2h 供应模板一致。');
change('B06', {cost:{}}, '取消未补偿的灵感费，回到 4h 基准。');
change('B07', {price:2}, '最多增加下一张实际收入 1，预算 2，买价 2；命中非收入活动仍会失效。');
change('B08', {cost:{}}, '取消未补偿的灵感费，回到 8h 基准。');
change('B09', {price:5,cost:{},support:1,upkeep:0,minSanity:0}, '增强实际最多 2，支持 1，共预算 6，三技能买 5；避免一个 8h 高级工具只增加 1 却卖 7。');
change('B10', {price:6,cost:{},support:1,upkeep:0,minSanity:0}, '收入 3＋支持 1，四技能预算买 6，取消灵感费。');
change('B11', {price:6,cost:{},support:1,upkeep:0,minSanity:0}, '保留留白产灵感；收入 2＋支持 1，触发时再得灵感 1，按预算上限 7 减技能 1 定价。');
change('B12', {price:5,gain:{inspiration:2}}, '取消工具自身本金，保留目标必须有本金；增强最多 2＋灵感 2，预算 6、买 5。', ['capital']);

change('C01', {}, '保留：净支出 1 的返款型成长，返款在周末，不能立即滚动购买。');
change('C02', {cost:{},gain:{}}, '回到买 1 的简单成长；不再先付现金才获得灵感。');
change('C03', {price:3,cost:{},gain:{cash:1,inspiration:1}}, '取消执行付钱又产钱；净支出 2、归档＋灵感 1，与 4h 成长模板一致。');
change('C05', {cost:{}}, '取消灵感费，回到 2h／买 2／收入 1／压力 1。');
change('C06', {stress:0,gain:{profit:2},effect:'本金在安排时锁定，撤回返还。'}, '固定收入 2、取消压力；本金 3 暂补偿 1 点预算，买价仍为 3。', ['dice']);
change('C07', {cost:{}}, '去掉每周现金费，买 3 产灵感 3，回到 4h 供应模板。');
change('C08', {price:4,stress:0}, '本金 6 暂补偿 2 点，收入 3、无压力，买价 4；启动现金仍需 10。');
change('C09', {price:5,capital:6,support:1,upkeep:0,minSanity:0}, '收入 3＋支持 1，技能 1、本金 2 的预算补偿后买 5；启动共 11。');
change('C10', {price:6,stress:0,capital:8,support:1,upkeep:0,minSanity:0}, '收入上限仍 4，增加支持 1，技能补偿 2、本金补偿封顶 2，买 6、启动共 14。');
change('C11', {price:5,cost:{},gain:{profit:2},support:2,upkeep:0,minSanity:0}, '减少收入换支持 2，取消灵感费；技能和本金补偿后买 5，提供商业与生活的混合选择。');
change('C12', {name:'分红投资组合',price:7,stress:0,capital:10,gain:{profit:4},support:1,upkeep:0,effect:''}, '移除低心智收入奖励，改为资金积累后的转型端：收入 4＋支持 1，启动共 17；不能靠两张达到收入 10。', ['conditionalBonus','condition']);

change('A13', {name:'画画与售卖习作',hours:4,price:4,gain:{profit:1},upkeep:0}, '落实混合模板：4h／买 4／收入 1＋支持 1，无执行费；2h 承载同效果会超出小牌预算。');
change('B13', {price:2,upkeep:1}, '基础生活：4h、支持 2、周费 1，预算及买价均为 2。');
change('C13', {upkeep:1}, '2h 支持 2、周费 1，预算 2，加小牌价格偏移 1，买价 3。');
change('W13', {price:2,upkeep:2}, '高品质生活：4h、支持 3、周费 2，预算及买价均为 2；用持续消费换日程效率。');

for (const route of ['W','A','B','C']) {
  const price = route === 'A' ? 7 : 6;
  change(`${route}04`, {price,cost:{}}, `保留高级牌二选一免费取得与归档，费用全部前置为 ${price}；按对应新卡池的二选一价值核算，最优省款不超过 2。`);
}
change('A14', {}, '保留：翻 3 只增加可选范围，仍原价购买至多 1 张，不能算免费取得高级牌。');
change('B14', {}, '保留：4h 换翻 3 与整理余牌，不折现成稳定收入；买牌仍需现款。');
change('C14', {price:3,cost:{}}, '把必付的执行费 1 前置到买价，保留可选重翻费 1；最多购入 1 张。');
change('W14', {}, '保留：翻 2、原价买牌，履职安全但受低心智限制；不额外加钱。');
change('P01', {}, '暂保留：买 4＋三次各付 1＝现金支出 7，另有技能、3 周推进和每周 8h 占用；双休是综合权限，不按支持 2 单项定价。');
change('P02', {price:2,cost:{},requires:'WW',effect:'完成后的下一周起，每周周初标记一个工作时段：该时段的一张 2h 或 4h 非履职活动免受查岗。掷骰前选好，本周不可移动。不保护 8h、团建或熬夜。'}, '原价含执行费共 6 且只能护 2h，收益过低；改为买 2、WW、一次完成，并允许保护一张 4h。');

return notes;
}
