// Icônes peintes en SVG pour les sorts et les objets (viewBox 64x64).
const wrap = (inner: string, bg: string[]) => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs>
<radialGradient id="g${bg[0].slice(1)}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></radialGradient></defs>
<rect width="64" height="64" rx="6" fill="url(#g${bg[0].slice(1)})"/>${inner}</svg>`;
const NAT = ['#6fae4f', '#1d3a1a'], WIND = ['#7fd6e6', '#163a4a'], FIRE = ['#f2a04a', '#4a1a0e'], ARC = ['#c79a5a', '#3a2412'], BLOOD = ['#e06060', '#3a0e0e'], MANA = ['#6aa0f0', '#0e1e48'], DARK = ['#8a7ab8', '#1e1638'], STONE = ['#a59f92', '#2e2b26'], GOLD = ['#f0cd6a', '#5a3a0e'];
const arrow = (x1: number, y1: number, x2: number, y2: number, c = '#f6efd8') => {
  const a = Math.atan2(y2 - y1, x2 - x1), hx = x2 - Math.cos(a) * 9, hy = y2 - Math.sin(a) * 9, px = Math.sin(a) * 5, py = -Math.cos(a) * 5;
  return `<line x1="${x1}" y1="${y1}" x2="${hx}" y2="${hy}" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
  <polygon points="${x2},${y2} ${hx + px},${hy + py} ${hx - px},${hy - py}" fill="#e8ecf0"/>
  <path d="M${x1} ${y1} l${-Math.cos(a - 0.6) * 8} ${-Math.sin(a - 0.6) * 8} M${x1} ${y1} l${-Math.cos(a + 0.6) * 8} ${-Math.sin(a + 0.6) * 8}" stroke="#d9e8c8" stroke-width="2.4"/>`;
};
export const spellIcons: Record<string, string> = {
  tir: wrap(arrow(14, 50, 52, 12), ARC),
  percante: wrap(`<path d="M8 40 Q32 30 56 24" stroke="#d6ffb0" stroke-width="6" opacity=".35" fill="none"/>${arrow(10, 44, 56, 22)}<circle cx="44" cy="27" r="7" fill="none" stroke="#e9ffd0" stroke-width="2"/>`, NAT),
  pluie: wrap([14, 28, 42].map((x, k) => arrow(x + 6, 6 + k * 3, x, 48 + (k % 2) * 6)).join('') + `<ellipse cx="32" cy="56" rx="22" ry="4" fill="#0006"/>`, WIND),
  piege: wrap(`<path d="M10 50 Q20 30 32 44 Q44 28 54 50" stroke="#4a2a12" stroke-width="5" fill="none"/><path d="M14 44 l-4 -6 M24 36 l-2 -7 M33 42 l1 -8 M42 34 l2 -7 M50 44 l5 -5" stroke="#cfe8a0" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="20" r="6" fill="#e06a8a"/>`, NAT),
  vent: wrap(`<path d="M10 24 H40 a8 8 0 1 0 -8 -8 M10 34 H50 a7 7 0 1 1 -7 7 M10 44 H34" stroke="#f0ffff" stroke-width="4" fill="none" stroke-linecap="round"/>`, WIND),
  marque: wrap(`<circle cx="32" cy="32" r="18" fill="none" stroke="#ffd0a0" stroke-width="3"/><circle cx="32" cy="32" r="8" fill="none" stroke="#ffd0a0" stroke-width="3"/><path d="M32 6 V18 M32 46 V58 M6 32 H18 M46 32 H58" stroke="#fff2d8" stroke-width="3"/><circle cx="32" cy="32" r="3" fill="#ff5a3a"/>`, FIRE),
  potionPV: wrap(`<path d="M26 10 h12 v10 l10 14 a16 16 0 1 1 -32 0 l10 -14z" fill="#f4e8d8" opacity=".9"/><path d="M19 38 a13 13 0 0 0 26 0z" fill="#d8283a"/><rect x="25" y="6" width="14" height="6" rx="2" fill="#8a5a2a"/><circle cx="26" cy="34" r="3" fill="#fff" opacity=".7"/>`, BLOOD),
  potionMana: wrap(`<path d="M26 10 h12 v10 l10 14 a16 16 0 1 1 -32 0 l10 -14z" fill="#e8f0ff" opacity=".9"/><path d="M19 38 a13 13 0 0 0 26 0z" fill="#2a6ae8"/><rect x="25" y="6" width="14" height="6" rx="2" fill="#8a5a2a"/><circle cx="26" cy="34" r="3" fill="#fff" opacity=".7"/>`, MANA),
  lock: wrap(`<rect x="20" y="30" width="24" height="20" rx="3" fill="#6b6457"/><path d="M24 30 v-6 a8 8 0 0 1 16 0 v6" stroke="#6b6457" stroke-width="4" fill="none"/>`, ['#3a352d', '#15120e']),
};
export const itemIcons: Record<string, string> = {
  bow: wrap(`<path d="M18 8 Q50 32 18 56" stroke="#7a4a22" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M18 8 Q50 32 18 56" stroke="#c99a5a" stroke-width="1.5" fill="none"/><line x1="18" y1="8" x2="18" y2="56" stroke="#f0ead8" stroke-width="1.5"/><path d="M30 18 l4 -3 M33 46 l4 3" stroke="#d8c070" stroke-width="3"/>`, NAT),
  hood: wrap(`<path d="M12 52 Q14 14 32 10 Q50 14 52 52 Q42 40 32 40 Q22 40 12 52z" fill="#3f6b33"/><path d="M22 44 Q32 22 42 44" fill="#1a1410"/><path d="M32 10 Q44 14 48 30" stroke="#6a9a52" stroke-width="2" fill="none"/>`, NAT),
  tunic: wrap(`<path d="M18 12 L26 8 Q32 14 38 8 L46 12 L54 24 L46 28 L46 56 L18 56 L18 28 L10 24z" fill="#4f8a3c"/><rect x="18" y="36" width="28" height="5" fill="#6b4423"/><rect x="29" y="35" width="6" height="7" fill="#d9b44a"/><path d="M26 8 Q32 20 38 8" fill="#7cae55"/>`, NAT),
  legs: wrap(`<path d="M20 10 H44 L46 56 H35 L32 26 L29 56 H18z" fill="#3c4a2e"/><rect x="20" y="10" width="24" height="6" fill="#6b4423"/>`, NAT),
  boots: wrap(`<path d="M14 12 h14 v28 l12 6 v10 h-26z" fill="#5a3a22"/><path d="M34 12 h12 v30 l10 5 v9 h-22z" fill="#6b4728"/><rect x="14" y="16" width="14" height="4" fill="#3a2414"/>`, ARC),
  quiver: wrap(`<rect x="22" y="18" width="18" height="38" rx="4" fill="#7a4a24" transform="rotate(14 31 37)"/><path d="M24 18 l-4 -12 M30 17 l-1 -13 M36 18 l3 -12" stroke="#e8e0c8" stroke-width="2.5"/><path d="M18 6 l4 4 M27 3 l3 5 M38 5 l2 5" stroke="#cde8ff" stroke-width="3"/>`, WIND),
  ring: wrap(`<circle cx="32" cy="38" r="14" fill="none" stroke="#e0c060" stroke-width="6"/><path d="M24 22 L32 10 L40 22z" fill="#5ad0a0"/><path d="M28 20 L32 13 L36 20z" fill="#b0ffe0"/>`, GOLD),
  amulet: wrap(`<path d="M14 8 Q32 34 50 8" stroke="#c9a24a" stroke-width="3" fill="none"/><circle cx="32" cy="40" r="13" fill="#d9b44a"/><circle cx="32" cy="40" r="8" fill="#7a2ab8"/><circle cx="29" cy="37" r="2.5" fill="#e0c0ff"/>`, DARK),
  fang: wrap(`<path d="M22 10 Q46 14 44 30 Q40 44 30 56 Q34 40 30 30 Q26 20 22 10z" fill="#f0e8d0"/><path d="M22 10 Q30 16 32 26" stroke="#b8ac90" stroke-width="2" fill="none"/>`, STONE),
  pelt: wrap(`<path d="M12 18 Q20 8 32 12 Q44 8 52 18 Q56 30 50 40 Q54 50 44 54 Q32 50 20 54 Q10 50 14 40 Q8 30 12 18z" fill="#6f7882"/><path d="M20 22 Q32 28 44 22 M18 34 Q32 40 46 34" stroke="#9aa3ac" stroke-width="2" fill="none"/>`, STONE),
  wood: wrap(`<rect x="8" y="22" width="44" height="18" rx="9" fill="#8a5a30" transform="rotate(-20 30 31)"/><ellipse cx="50" cy="22" rx="7" ry="9" fill="#d9b07a" transform="rotate(-20 50 22)"/><ellipse cx="50" cy="22" rx="3" ry="4" fill="#a87a48" transform="rotate(-20 50 22)"/><rect x="10" y="38" width="38" height="14" rx="7" fill="#7a4c28" transform="rotate(-10 30 45)"/>`, ARC),
  copper: wrap(`<path d="M10 46 L18 24 L34 16 L52 26 L56 44 L40 54 L20 54z" fill="#77736b"/><path d="M24 30 l6 -8 l6 8 l-6 8z M38 36 l5 -6 l5 6 l-5 6z" fill="#e0874a"/><path d="M27 29 l3 -4 l3 4z" fill="#ffd0a0"/>`, STONE),
  iron: wrap(`<path d="M10 46 L18 24 L34 16 L52 26 L56 44 L40 54 L20 54z" fill="#6c6a66"/><path d="M24 30 l6 -8 l6 8 l-6 8z M38 36 l5 -6 l5 6 l-5 6z" fill="#9fc6e6"/>`, STONE),
  ingot: wrap(`<path d="M10 40 L20 26 H50 L56 40 L46 50 H16z" fill="#c87a3a"/><path d="M20 26 H50 L46 34 H24z" fill="#f0a868"/>`, FIRE),
  herb: wrap(`<path d="M32 58 V30 M32 40 Q20 34 16 22 M32 36 Q44 30 48 18" stroke="#4a8a3a" stroke-width="3" fill="none"/><circle cx="32" cy="24" r="7" fill="#9fd8ff"/><circle cx="16" cy="20" r="5" fill="#9fd8ff"/><circle cx="48" cy="16" r="5" fill="#9fd8ff"/><circle cx="32" cy="24" r="3" fill="#fff"/>`, MANA),
  crystal: wrap(`<path d="M32 6 L44 26 L36 58 L28 58 L20 26z" fill="#b48ae8"/><path d="M32 6 L36 26 L32 58 L28 26z" fill="#e0c8ff"/>`, DARK),
  bread: wrap(`<ellipse cx="32" cy="38" rx="22" ry="14" fill="#c98a42"/><path d="M18 34 l6 -6 M28 30 l6 -6 M38 32 l6 -6" stroke="#f0c888" stroke-width="3"/>`, ARC),
  scroll: wrap(`<rect x="14" y="14" width="36" height="36" fill="#f0e2c0"/><rect x="10" y="10" width="44" height="7" rx="3.5" fill="#c8a870"/><rect x="10" y="47" width="44" height="7" rx="3.5" fill="#c8a870"/><path d="M20 24 H44 M20 30 H40 M20 36 H44" stroke="#8a6a3a" stroke-width="2"/>`, GOLD),
  claw: wrap(`<path d="M14 50 Q20 20 30 10 Q28 30 22 52z M28 52 Q34 24 44 14 Q42 34 36 54z M42 54 Q46 34 54 26 Q54 42 48 56z" fill="#2e2a26"/>`, BLOOD),
};
