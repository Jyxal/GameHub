// PowerShell yardımcı sürecinin yaşam döngüsü (Node API'leri; Electron bağımlılığı yok).
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { EventEmitter } from 'node:events';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DEVICE_HUB_PS_SCRIPT } from './powershell-script.js';

export type HostCommand = 'scan' | 'battery' | 'ping';

interface Pending {
  resolve: (data: unknown) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

export interface PowerShellHostEvents {
  change: [kind: 'arrival' | 'removal' | 'other'];
  ready: [watcher: boolean];
  unavailable: [reason: string];
}

const MAX_LINE = 8 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30_000;
const RESTART_DELAYS_MS = [2_000, 5_000, 15_000, 60_000, 120_000];

function powershellPath(): string {
  const root = process.env.SystemRoot || process.env.windir;
  return root ? path.join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe') : 'powershell.exe';
}

export function encodePowerShellCommand(script: string): string {
  return Buffer.from(script, 'utf16le').toString('base64');
}

export class PowerShellHost extends EventEmitter<PowerShellHostEvents> {
  private child: ChildProcessWithoutNullStreams | null = null;
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;
  private failures = 0;
  private restartTimer: NodeJS.Timeout | null = null;
  private stableTimer: NodeJS.Timeout | null = null;
  private disposed = false;
  private isReady = false;
  private watcher = false;
  private readyWaiters: Array<() => void> = [];

  constructor(private readonly log: (msg: string) => void = () => {}) {
    super();
  }

  get watcherActive(): boolean {
    return this.isReady && this.watcher;
  }

  get running(): boolean {
    return this.child !== null;
  }

  start(): void {
    if (this.disposed || this.child) return;
    const args = ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encodePowerShellCommand(DEVICE_HUB_PS_SCRIPT)];
    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawn(powershellPath(), args, { shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) {
      this.handleExit(null, `başlatılamadı: ${(err as Error).message}`);
      return;
    }
    this.child = child;
    this.isReady = false;
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', () => {
      /* stderr boşaltılır (tampon dolmasın); PowerShell uyarıları yok sayılır */
    });
    child.stdin.on('error', () => {});
    const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
    rl.on('line', (line) => this.onLine(line));
    child.on('error', (err) => this.handleExit(child, `süreç hatası: ${err.message}`));
    child.on('exit', (code) => this.handleExit(child, `süreç sonlandı (kod ${code ?? 'yok'})`));
  }

  private onLine(line: string): void {
    if (line.length === 0 || line.length > MAX_LINE) return;
    let msg: unknown;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    if (typeof msg !== 'object' || msg === null) return;
    const m = msg as { type?: unknown; id?: unknown; ok?: unknown; data?: unknown; error?: unknown; watcher?: unknown };
    if (m.type === 'ready') {
      this.isReady = true;
      this.watcher = m.watcher === true;
      this.readyWaiters.splice(0).forEach((w) => w());
      this.stableTimer = setTimeout(() => (this.failures = 0), 60_000);
      this.emit('ready', this.watcher);
      return;
    }
    if (m.type === 'change') {
      const kind = (m as { kind?: unknown }).kind;
      this.emit('change', kind === 'arrival' || kind === 'removal' ? kind : 'other');
      return;
    }
    if (typeof m.id !== 'number') return;
    const p = this.pending.get(m.id);
    if (!p) return;
    this.pending.delete(m.id);
    clearTimeout(p.timer);
    if (m.ok === true) p.resolve(m.data ?? null);
    else p.reject(new Error(typeof m.error === 'string' ? m.error : 'PowerShell komutu başarısız'));
  }

  private handleExit(child: ChildProcessWithoutNullStreams | null, reason: string): void {
    // 'error' ve 'exit' aynı süreç için iki kez gelebilir; eski süreçlerin olayları yok sayılır.
    if (child !== this.child) return;
    this.child = null;
    this.isReady = false;
    if (this.stableTimer) clearTimeout(this.stableTimer);
    if (child && child.exitCode === null) {
      try {
        child.kill();
      } catch {
        /* yok say */
      }
    }
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error(`PowerShell yardımcı süreci: ${reason}`));
    }
    this.pending.clear();
    if (this.disposed) return;
    this.log(`PowerShell yardımcı süreci durdu: ${reason}`);
    if (this.failures >= RESTART_DELAYS_MS.length) {
      this.emit('unavailable', reason);
      return;
    }
    const delay = RESTART_DELAYS_MS[this.failures++];
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      this.start();
    }, delay);
  }

  private waitReady(timeoutMs: number): Promise<void> {
    if (this.isReady) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('PowerShell yardımcı süreci hazır değil')), timeoutMs);
      this.readyWaiters.push(() => {
        clearTimeout(t);
        resolve();
      });
    });
  }

  async request(cmd: HostCommand): Promise<unknown> {
    if (this.disposed) throw new Error('Device Hub kapatıldı');
    if (!this.child) this.start();
    await this.waitReady(20_000);
    const child = this.child;
    if (!child) throw new Error('PowerShell yardımcı süreci çalışmıyor');
    const id = this.nextId++;
    if (this.nextId > 999_999_999) this.nextId = 1;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`PowerShell komutu zaman aşımına uğradı (${cmd})`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
      child.stdin.write(`${cmd} ${id}\n`);
    });
  }

  dispose(): void {
    this.disposed = true;
    if (this.restartTimer) clearTimeout(this.restartTimer);
    if (this.stableTimer) clearTimeout(this.stableTimer);
    const child = this.child;
    this.child = null;
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error('Device Hub kapatıldı'));
    }
    this.pending.clear();
    if (child) {
      try {
        child.stdin.end();
      } catch {
        /* yok say */
      }
      const killTimer = setTimeout(() => {
        if (child.exitCode === null) child.kill();
      }, 2_000);
      killTimer.unref();
    }
    this.removeAllListeners();
  }
}
