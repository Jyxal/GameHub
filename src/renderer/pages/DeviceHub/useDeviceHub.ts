import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  DeviceHubNotification,
  DeviceHubSettings,
  DeviceHubSettingsPatch,
  DeviceHubSnapshot,
} from '../../../shared/device-hub/types';

export interface UseDeviceHubResult {
  snapshot: DeviceHubSnapshot | null;
  settings: DeviceHubSettings | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  notifications: DeviceHubNotification[];
  available: boolean;
  refresh: () => Promise<void>;
  updateSettings: (patch: DeviceHubSettingsPatch) => Promise<string | null>;
  dismissNotification: (timestamp: number) => void;
}

const MAX_TOASTS = 4;

function errMsg(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err);
  // Electron "Error invoking remote method '...': Error: <mesaj>" önekini temizle
  return m.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}

export function useDeviceHub(): UseDeviceHubResult {
  const api = typeof window !== 'undefined' ? window.deviceHub : undefined;
  const [snapshot, setSnapshot] = useState<DeviceHubSnapshot | null>(null);
  const [settings, setSettings] = useState<DeviceHubSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(api ? null : 'Device Hub API bulunamadı: preload köprüsü yüklenmemiş.');
  const [notifications, setNotifications] = useState<DeviceHubNotification[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!api) {
      setLoading(false);
      return;
    }
    const offDevices = api.onDevicesChanged((s) => mounted.current && setSnapshot(s));
    const offNotif = api.onNotification((n) => {
      if (!mounted.current) return;
      setNotifications((prev) => [n, ...prev].slice(0, MAX_TOASTS));
    });
    Promise.all([api.getDevices(), api.getSummary(), api.getSettings()])
      .then(([devices, summary, s]) => {
        if (!mounted.current) return;
        setSnapshot((prev) => prev ?? { devices, summary });
        setSettings(s);
      })
      .catch((e) => mounted.current && setError(errMsg(e)))
      .finally(() => mounted.current && setLoading(false));
    return () => {
      mounted.current = false;
      offDevices();
      offNotif();
    };
  }, [api]);

  const refresh = useCallback(async () => {
    if (!api) return;
    setRefreshing(true);
    try {
      const s = await api.refresh();
      if (mounted.current) {
        setSnapshot(s);
        setError(null);
      }
    } catch (e) {
      if (mounted.current) setError(errMsg(e));
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, [api]);

  const updateSettings = useCallback(
    async (patch: DeviceHubSettingsPatch): Promise<string | null> => {
      if (!api) return 'Device Hub API bulunamadı.';
      try {
        const s = await api.updateSettings(patch);
        if (mounted.current) setSettings(s);
        return null;
      } catch (e) {
        return errMsg(e);
      }
    },
    [api],
  );

  const dismissNotification = useCallback((timestamp: number) => {
    setNotifications((prev) => prev.filter((n) => n.timestamp !== timestamp));
  }, []);

  return { snapshot, settings, loading, refreshing, error, notifications, available: !!api, refresh, updateSettings, dismissNotification };
}
