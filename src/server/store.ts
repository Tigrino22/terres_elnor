// Comptes et sauvegardes du serveur : un fichier JSON écrit de façon atomique,
// mots de passe hachés avec scrypt. Suffisant pour la V1 ; PostgreSQL prendra le relais.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Account, Hasher, MemoryStore } from '../sim/accounts';

export class JsonFileStore extends MemoryStore {
  private timer: NodeJS.Timeout | null = null;

  private constructor(private file: string, list: Account[]) { super(list); }

  static open(file: string) {
    let list: Account[] = [];
    if (fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      list = Array.isArray(raw?.accounts) ? raw.accounts : [];
    } else fs.mkdirSync(path.dirname(file), { recursive: true });
    return new JsonFileStore(file, list);
  }

  /** Les écritures sont regroupées : au plus une par seconde. */
  protected changed() {
    if (!this.timer) this.timer = setTimeout(() => this.flush(), 1000);
  }

  flush() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({ v: 1, accounts: this.list() }));
    fs.renameSync(tmp, this.file);
  }
}

export const scryptHasher: Hasher = {
  salt: () => crypto.randomBytes(16).toString('hex'),
  hash: (password, salt) => new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, 32, (err, key) => err ? reject(err) : resolve(key.toString('hex')))),
};
