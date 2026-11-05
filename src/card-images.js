import definitions from './card-image-definitions.js';
// Edits in the card studio must never leave an outdated printed rule on screen.
export const cardImage=d=>definitions[d.id]===JSON.stringify(d)?`/assets/cards/${d.id}.png`:null;

// Reuse the illustration even when the printed rules have changed. Clip strictly
// above the old title/rules; all text beside it comes from the live definition.
export function cardIllustration(d) {
 const source=definitions[d.id];if(!source)return '';
 const original=JSON.parse(source),tall=original.hours===8;
 return `<svg class="card-illustration" viewBox="0 0 756 ${tall?1348:400}" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice"><image href="/assets/cards/${d.id}.png" width="756" height="${tall?2112:1056}"/></svg>`;
}
