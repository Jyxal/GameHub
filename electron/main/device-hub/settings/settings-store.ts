import type { DeviceHubSettings } from '../../../../src/shared/device-hub/types.js';
import type { KeyValueStorage } from './storage.js';
import { applySettingsPatch, normalizeStoredSettings, validateSettingsPatch, type ValidationResult } from './validate.js';

const SETTINGS_KEY = 'device-hub-settings';
const KNOWN_KEY = 'device-hub-known-devices';
const MAX_KNOWN = 500;

export class SettingsStore {
  private settings: DeviceHubSettings = normalizeStoredSettings(undefined);

  constructor(private readonly storage: KeyValueStorage) {}

  async load(): Promise<DeviceHubSettings> {
    try {
      this.settings = normalizeStoredSettings(await this.storage.read(SETTINGS_KEY));
    } catch {
      this.settings = normalizeStoredSettings(undefined);
    }
    return this.get();
  }

  get(): DeviceHubSettings {
    return { ...this.settings, notifications: { ...this.settings.notifications } };
  }

  async update(input: unknown): Promise<ValidationResult<DeviceHubSettings>> {
    const patch = validateSettingsPatch(input);
    if (!patch.ok) return patch;
    const merged = applySettingsPatch(this.settings, patch.value);
    if (!merged.ok) return merged;
    await this.storage.write(SETTINGS_KEY, merged.value);
    this.settings = merged.value;
    return { ok: true, value: this.get() };
  }

  async loadKnownDevices(): Promise<Set<string>> {
    try {
      const raw = await this.storage.read(KNOWN_KEY);
      if (!Array.isArray(raw)) return new Set();
      return new Set(raw.filter((x): x is string => typeof x === 'string' && /^dev-[0-9a-f]{8}$/.test(x)).slice(-MAX_KNOWN));
    } catch {
      return new Set();
    }
  }

  async saveKnownDevices(ids: Iterable<string>): Promise<void> {
    await this.storage.write(KNOWN_KEY, [...ids].slice(-MAX_KNOWN));
  }
}
