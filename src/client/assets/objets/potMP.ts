// Potion de mana : fiole au liquide bleu.
import { BG, icon } from '../kit';
import type { ItemArt } from '../types';

export const potMP: ItemArt = {
  icon: icon(`<path d="M26 10 h12 v10 l10 14 a16 16 0 1 1 -32 0 l10 -14z" fill="#e8f0ff" opacity=".9"/><path d="M19 38 a13 13 0 0 0 26 0z" fill="#2a6ae8"/><rect x="25" y="6" width="14" height="6" rx="2" fill="#8a5a2a"/><circle cx="26" cy="34" r="3" fill="#fff" opacity=".7"/>`, BG.mana),
};
