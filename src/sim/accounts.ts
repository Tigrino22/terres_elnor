// Comptes joueurs : inscription, connexion, un personnage par compte.
// Le stockage et le hachage sont fournis par l'environnement : fichier JSON + scrypt
// côté serveur, localStorage + PBKDF2 dans le navigateur en mode solo.

import type { AuthMsg, Race, SaveData } from '../shared/protocol';

export interface Account {
  account: string;
  salt: string;
  hash: string;
  name: string;
  race: Race;
  created: number;
  save: SaveData | null;
}

export interface AccountStore {
  get(account: string): Account | undefined;
  nameTaken(name: string): boolean;
  put(acc: Account): void;
}

export interface Hasher {
  salt(): string;
  hash(password: string, salt: string): Promise<string>;
}

export type AuthResult = { ok: true; acc: Account; created: boolean } | { ok: false; error: string };

export const accountKey = (s: unknown) => String(s ?? '').trim().toLowerCase();
export const cleanName = (s: unknown) => String(s ?? '').replace(/[^\p{L}\p{N} '-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);

/** Comparaison en temps constant, pour ne rien laisser deviner du hachage. */
function same(a: string, b: string) {
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}

export async function authenticate(store: AccountStore, hasher: Hasher, msg: AuthMsg): Promise<AuthResult> {
  const key = accountKey(msg.account);
  const password = String(msg.password ?? '');
  if (!/^[a-z0-9_.-]{3,20}$/.test(key)) return { ok: false, error: 'Identifiant : 3 à 20 caractères, lettres, chiffres, point, tiret ou souligné.' };
  if (password.length < 6 || password.length > 72) return { ok: false, error: 'Mot de passe : 6 caractères au minimum.' };

  if (msg.mode === 'login') {
    const acc = store.get(key);
    // on hache même si le compte n'existe pas, pour ne pas révéler les identifiants existants
    const hash = await hasher.hash(password, acc?.salt ?? 'absent');
    if (!acc || !same(hash, acc.hash)) return { ok: false, error: 'Identifiant ou mot de passe incorrect.' };
    return { ok: true, acc, created: false };
  }

  const name = cleanName(msg.name);
  if (name.length < 2) return { ok: false, error: 'Le nom du personnage doit faire au moins 2 lettres.' };
  if (store.get(key)) return { ok: false, error: 'Cet identifiant est déjà pris.' };
  if (store.nameTaken(name)) return { ok: false, error: `Le nom « ${name} » est déjà porté par un autre personnage.` };
  const salt = hasher.salt();
  const hash = await hasher.hash(password, salt);
  // deux inscriptions simultanées : la seconde arrive après le hachage
  if (store.get(key) || store.nameTaken(name)) return { ok: false, error: 'Cet identifiant ou ce nom vient d’être pris.' };
  const acc: Account = { account: key, salt, hash, name, race: msg.race === 'humain' ? 'humain' : 'elfe', created: Date.now(), save: null };
  store.put(acc);
  return { ok: true, acc, created: true };
}

/** Stockage en mémoire, sérialisable en JSON ; base des deux stockages réels. */
export class MemoryStore implements AccountStore {
  protected accounts = new Map<string, Account>();
  protected names = new Set<string>();
  constructor(list: Account[] = []) { for (const a of list) this.index(a); }
  private index(a: Account) { this.accounts.set(a.account, a); this.names.add(a.name.toLowerCase()); }
  get(account: string) { return this.accounts.get(accountKey(account)); }
  nameTaken(name: string) { return this.names.has(name.toLowerCase()); }
  put(acc: Account) { this.index(acc); this.changed(); }
  list() { return [...this.accounts.values()]; }
  protected changed() {}
}
