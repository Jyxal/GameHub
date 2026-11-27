// Küçük anahtar-değer depolama arayüzü. Şimdilik JSON dosyası; ileride SQLite ile değiştirilebilir.
import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface KeyValueStorage {
  read(key: string): Promise<unknown | undefined>;
  write(key: string, value: unknown): Promise<void>;
}

const KEY_RE = /^[a-z0-9-]{1,64}$/;

/** userData altında `<key>.json`; atomik yazma (geçici dosya + rename). */
export class JsonFileStorage implements KeyValueStorage {
  private readonly queues = new Map<string, Promise<void>>();

  constructor(private readonly dir: string) {}

  private fileFor(key: string): string {
    if (!KEY_RE.test(key)) throw new Error(`Geçersiz depolama anahtarı: ${key}`);
    return path.join(this.dir, `${key}.json`);
  }

  async read(key: string): Promise<unknown | undefined> {
    const file = this.fileFor(key);
    let text: string;
    try {
      text = await fs.readFile(file, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw err;
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      // Bozuk dosya: yedeklenir, varsayılanlarla devam edilir.
      await fs.rename(file, `${file}.corrupt-${Date.now()}`).catch(() => {});
      return undefined;
    }
  }

  write(key: string, value: unknown): Promise<void> {
    const file = this.fileFor(key);
    const prev = this.queues.get(key) ?? Promise.resolve();
    const next = prev
      .catch(() => {})
      .then(async () => {
        await fs.mkdir(this.dir, { recursive: true });
        const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
        try {
          await fs.writeFile(tmp, JSON.stringify(value, null, 2), { encoding: 'utf8', mode: 0o600 });
          await fs.rename(tmp, file);
        } catch (err) {
          await fs.unlink(tmp).catch(() => {});
          throw err;
        }
      });
    this.queues.set(key, next);
    return next;
  }
}

/** Testler ve depolama kullanılamadığında yedek. */
export class MemoryStorage implements KeyValueStorage {
  private readonly data = new Map<string, string>();

  async read(key: string): Promise<unknown | undefined> {
    const v = this.data.get(key);
    return v === undefined ? undefined : (JSON.parse(v) as unknown);
  }

  async write(key: string, value: unknown): Promise<void> {
    this.data.set(key, JSON.stringify(value));
  }
}
