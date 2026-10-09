// Serveur de jeu : sert le client et fait tourner la simulation pour tous les joueurs.
// En développement, Vite est branché en middleware ; en production on sert dist/.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { Game, Player } from '../sim/game';
import { DT } from '../shared/stats';
import type { ClientMsg } from '../shared/protocol';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = Number(process.env.PORT ?? 8080);
const prod = process.env.NODE_ENV === 'production';

const MIME: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };

async function main() {
  let middleware: ((req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => void) | null = null;
  if (!prod) {
    const { createServer } = await import('vite');
    const vite = await createServer({ root, server: { middlewareMode: true, hmr: { port: PORT + 1 } }, appType: 'spa' });
    middleware = vite.middlewares;
  }
  const server = http.createServer((req, res) => {
    if (middleware) return middleware(req, res, () => { res.statusCode = 404; res.end(); });
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const dist = path.join(root, 'dist');
    let file = path.normalize(path.join(dist, url));
    if (!file.startsWith(dist)) { res.statusCode = 403; return res.end(); }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html');
    res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });

  const game = new Game(Date.now() & 0xffff);
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096 });
  wss.on('connection', ws => {
    let player: Player | null = null;
    let budget = 60; // messages par seconde, contre le spam
    const refill = setInterval(() => { budget = 60; }, 1000);
    const client = { send: (m: unknown) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m)); } };
    ws.on('message', raw => {
      if (--budget < 0) return;
      let msg: ClientMsg;
      try { msg = JSON.parse(String(raw)); } catch { return; }
      if (!msg || typeof msg !== 'object') return;
      if (!player) { if (msg.t === 'join') player = game.join(client, String(msg.name ?? ''), msg.race); return; }
      game.handle(player, msg);
    });
    ws.on('close', () => {
      clearInterval(refill);
      if (player) { game.leave(player); game.broadcastChat('', `${player.name} a quitté le jeu.`); }
    });
  });

  // boucle fixe à 20 ticks par seconde, avec rattrapage si le processus a pris du retard
  let last = performance.now(), acc = 0;
  setInterval(() => {
    const now = performance.now();
    acc += (now - last) / 1000; last = now;
    let n = 0;
    while (acc >= DT && n++ < 5) { game.tick(); acc -= DT; }
    if (n >= 5) acc = 0;
  }, 10);

  server.listen(PORT, () => console.log(`Terres d'Elnor sur http://localhost:${PORT} (${prod ? 'production' : 'développement'})`));
}

main();
