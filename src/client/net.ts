// Transport réseau : WebSocket vers le serveur, ou simulation locale (mode solo).

import type { ClientMsg, ServerMsg } from '../shared/protocol';
import { DT } from '../shared/stats';
import { Account, Hasher, MemoryStore, authenticate } from '../sim/accounts';

export interface Transport {
  send(m: ClientMsg): void;
  onMessage: (m: ServerMsg) => void;
  onClose: (reason: string) => void;
  online: boolean;
}

export function wsUrl() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/ws`;
}

export function connectWs(url = wsUrl(), timeout = 2500): Promise<Transport> {
  return new Promise((resolve, reject) => {
    let ws: WebSocket;
    try { ws = new WebSocket(url); } catch (e) { reject(e); return; }
    const timer = setTimeout(() => { ws.close(); reject(new Error('délai dépassé')); }, timeout);
    const t: Transport = { send: m => ws.readyState === 1 && ws.send(JSON.stringify(m)), onMessage: () => {}, onClose: () => {}, online: true };
    ws.onopen = () => { clearTimeout(timer); resolve(t); };
    ws.onerror = () => { clearTimeout(timer); reject(new Error('connexion impossible')); };
    ws.onmessage = ev => {
      let m: ServerMsg;
      try { m = JSON.parse(ev.data); } catch { return; }
      t.onMessage(m);
    };
    ws.onclose = () => t.onClose('Connexion au serveur perdue.');
  });
}

const STORE_KEY = 'elnor.comptes';

/** Comptes du mode solo, gardés dans le navigateur. */
class LocalStore extends MemoryStore {
  constructor() {
    let list: Account[] = [];
    try { list = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}').accounts ?? []; } catch { /* stockage indisponible */ }
    super(list);
  }
  protected changed() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, accounts: this.list() })); } catch { /* navigation privée */ }
  }
}

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const pbkdf2Hasher: Hasher = {
  salt: () => hex(crypto.getRandomValues(new Uint8Array(16)).buffer),
  async hash(password, salt) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 100_000, hash: 'SHA-256' }, key, 256));
  },
};

/** Fait tourner le monde dans la page : jouable sans serveur, seul, avec sauvegarde locale. */
export async function localGame(): Promise<Transport> {
  const { Game } = await import('../sim/game');
  const game = new Game((Math.random() * 1e6) | 0);
  const store = new LocalStore();
  const t: Transport = { send: () => {}, onMessage: () => {}, onClose: () => {}, online: false };
  const client = { send: (m: ServerMsg) => t.onMessage(m) };
  let player: ReturnType<typeof game.join> | null = null;
  let busy = false;
  t.send = async m => {
    if (player) { game.handle(player, m); return; }
    if (m.t !== 'auth' || busy) return;
    busy = true;
    const r = await authenticate(store, pbkdf2Hasher, m).catch(() => ({ ok: false as const, error: 'Le navigateur refuse le chiffrement du mot de passe.' }));
    busy = false;
    if (!r.ok) { client.send({ t: 'auth', ok: false, error: r.error }); return; }
    const acc = r.acc;
    client.send({ t: 'auth', ok: true });
    player = game.join(client, acc.name, acc.race, acc.save, save => { acc.save = save; store.put(acc); });
  };
  // fermer l'onglet sauvegarde aussi
  addEventListener('pagehide', () => game.saveAll());
  let last = performance.now(), acc = 0;
  setInterval(() => {
    const now = performance.now();
    acc += (now - last) / 1000; last = now;
    let n = 0;
    while (acc >= DT && n++ < 5) { game.tick(); acc -= DT; }
    if (n >= 5) acc = 0;
  }, 16);
  return t;
}
