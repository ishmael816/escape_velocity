import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {getCard} from '../src/cards.js';
export const reload = g => JSON.parse(JSON.stringify(g));
export function unchanged(g, action) {
  const before = structuredClone(g);
  assert.throws(action);
  assert.deepEqual(g, before, 'a rejected operation must change no game state');
}
// Arrange a favourable public offer by swapping real instances, never minting
// cards, money, skills or actions. Used by acquisition and market fixtures.
export function offer(g, type) {
  const lane = getCard(type).hours;
  let c = g.market[lane].find(c => c.type === type);
  if (c) return c;
  for (const pile of [g.decks[lane], g.discard[lane]]) {
    const index = pile.findIndex(c => c.type === type);
    if (index < 0) continue;
    [c] = pile.splice(index, 1);
    const displaced = g.market[lane].shift();
    if (displaced) pile.unshift(displaced);
    g.market[lane].push(c);
    return c;
  }
  assert.fail('no remaining public supply: ' + type);
}
export const supplyIds = g => [
  ...Object.values(g.market).flat(), ...Object.values(g.decks).flat(),
  ...Object.values(g.discard).flat(),
  ...g.players.flatMap(p => [...p.cards, ...p.skills, ...p.completedActivities]),
  ...(g.opportunity?.options || []),
  ...(g.opportunity?.sourceCard ? [g.opportunity.sourceCard] : [])
].map(c => c.uid).sort();
export function skipChoice(g) {
  if (g.opportunity?.stage === 'hire') E.chooseHire(g, g.opportunity.player);
  else if (g.opportunity) {
    const q = g.opportunity;
    if (q.stage === 'lane') E.chooseOpportunityLane(g, q.player,
      Object.keys(g.decks).find(k => g.decks[k].length || g.discard[k].length));
    E.chooseOpportunity(g, q.player);
  }
}
