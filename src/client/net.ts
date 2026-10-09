// Transport réseau : WebSocket vers le serveur, ou simulation locale (mode solo).

import type { ClientMsg, ServerMsg } from '../shared/protocol';
import { DT } from '../shared/stats';

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

/** Fait tourner le monde dans la page : jouable sans serveur, seul. */
export async function localGame(): Promise<Transport> {
  const { Game } = await import('../sim/game');
  const game = new Game((Math.random() * 1e6) | 0);
  const t: Transport = { send: () => {}, onMessage: () => {}, onClose: () => {}, online: false };
  const client = { send: (m: ServerMsg) => t.onMessage(m) };
  let player: ReturnType<typeof game.join> | null = null;
  t.send = m => {
    if (!player) { if (m.t === 'join') player = game.join(client, m.name, m.race); return; }
    game.handle(player, m);
  };
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
