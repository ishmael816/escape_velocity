// Income is budgeted against the 10-income / 6-sanity escape condition.
// A shared inspiration requirement earns at most a one-coin entry discount.
export function calibrateV21({cards}) {
 const patch=(id,values)=>Object.assign(cards.find(c=>c.id===id),values);
 // Ordinary starters: 2h = 2 coins / 1 income / 1 pressure;
 // 4h = 3 / 1 / 0; 8h = 5 / 2 / 1. No recurring cash cost on income.
 patch('B06',{price:3,stress:0,gain:{profit:1}});
 patch('B08',{price:5,stress:1,gain:{profit:2}});
 // Creative thresholds are shared board conditions, not per-card spending.
 patch('A06',{price:3,stress:0,gain:{},support:1,upkeep:0,inspirationRequired:4});
 patch('A07',{price:2,stress:0,gain:{profit:1},inspirationRequired:2});
 patch('A08',{price:4,stress:1,gain:{profit:2},inspirationRequired:3});
 // A first archive unlocks mixed work/life; two unlock the first major upgrade.
 patch('A13',{requires:'A',price:4});
 patch('A09',{requires:'AA',price:5});
 patch('A10',{price:7});
 patch('A11',{price:6});
 patch('A12',{price:5});
 // The cheap parallel tool is the BB bridge; powerful mixed tools still need 3.
 patch('B09',{requires:'BB',price:4,gain:{profit:2}});
 patch('B10',{price:7,gain:{profit:3}});
 patch('B11',{price:6,gain:{profit:2}});
 patch('B12',{price:6,gain:{profit:3}});
 // Fixed capital buys compactness or relief, not a better capital yield.
 patch('C06',{price:3,capital:4,stress:1,gain:{profit:2}});
 patch('C08',{price:4,capital:6,stress:0,gain:{profit:2}});
 patch('C09',{requires:'CC',price:3});
 patch('C10',{price:5});
 patch('C11',{price:4});
 // Career still earns a cash premium without meeting the escape-income goal.
 patch('W09',{requires:'WW'});
 patch('W11',{price:4,support:1,upkeep:0});
 patch('W12',{price:4,support:1,upkeep:0});
 // Fourth distinct archive includes a free advanced choice; price it with that.
 for(const r of 'WABC')patch(r+'04',{price:5});
 return cards;
}
