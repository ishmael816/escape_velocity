import fs from 'node:fs';
// Archived v0.6 printer; v0.7 requires a new player board and help sheet.
const { CARDS, ADVANCED, WEEKEND_CARD, EVENTS, DEFAULTS } = JSON.parse(fs.readFileSync(new URL('./fixtures/print-cards-v0.6.json', import.meta.url), 'utf8'));
import { familyOf, FAMILIES } from '../src/card-visuals.js';

const common = CARDS.filter(c => !c.skill).map((c, i) => ({ ...c, code: `M${String(i + 1).padStart(2, '0')}`, deck: '公共' }));
const growth = CARDS.filter(c => c.skill).map(c => ({ ...c, code: `G${c.route}${String(CARDS.filter(d => d.skill === c.route).findIndex(d => d.id === c.id) + 1).padStart(2, '0')}`, deck: '成长' }));
const advanced = ADVANCED.map(c => ({ ...c, code: `H${c.route}${String(ADVANCED.filter(d => d.route === c.route).findIndex(d => d.id === c.id) + 1).padStart(2, '0')}`, deck: '高级' }));
const project = { ...WEEKEND_CARD, code: 'P01', deck: '项目' };
const cards = [...common, ...growth, ...advanced, project].map(c => ({ ...c, printColor: FAMILIES[familyOf(c)].color }));
const starters = ['outing', 'microjob'].map(id => ({ ...cards.find(c => c.id === id), starter: true }));
fs.mkdirSync('tmp/pdfs', { recursive: true });
fs.writeFileSync('tmp/pdfs/print-data.json', JSON.stringify({ version: '0.6', defaults: DEFAULTS, cards, starters, events: EVENTS }, null, 2));
console.log(JSON.stringify({ unique: cards.length, cardSet: cards.length + starters.length, byHours: [1, 2, 3].map(size => [...cards, ...starters].filter(c => c.size === size).length), tickets: growth.length + advanced.length, events: EVENTS.length }));
