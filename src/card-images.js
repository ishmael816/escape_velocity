import definitions from './card-image-definitions.js';
// Edits in the card studio must never leave an outdated printed rule on screen.
export const cardImage=d=>definitions[d.id]===JSON.stringify(d)?`/assets/cards/${d.id}.png`:null;
