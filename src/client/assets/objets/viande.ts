// Viande de sanglier : pièce rouge avec son os.
import { BG, icon } from '../kit';
import type { ItemArt } from '../types';

export const viande: ItemArt = {
  icon: icon(`<path d="M14 40 Q10 22 26 16 Q42 12 46 28 Q48 40 34 46 Q22 50 14 40z" fill="#b8423a"/><path d="M20 36 Q18 26 28 22 Q38 20 40 30" stroke="#e88a7a" stroke-width="3" fill="none"/><rect x="40" y="38" width="16" height="6" rx="3" fill="#f0e6cc" transform="rotate(35 48 41)"/><circle cx="54" cy="50" r="4" fill="#f0e6cc"/><circle cx="57" cy="46" r="3.5" fill="#f0e6cc"/>`, BG.sang),
};
