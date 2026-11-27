import type { DeviceHubApi } from './api.js';

declare global {
  interface Window {
    /** Preload `exposeDeviceHubApi()` çağrılmadıysa tanımsızdır. */
    deviceHub?: DeviceHubApi;
  }
}

export {};
