import { contextBridge, ipcRenderer } from 'electron'
import type { GamingHubApi, HardwareOverview } from '../../src/shared/electron-api'
import { exposeDeviceHubApi } from './device-hub/index.js'

const scanHardware = async (): Promise<HardwareOverview> => {
  return ipcRenderer.invoke('hardware:scan') as Promise<HardwareOverview>
}

const gamingHubApi: GamingHubApi = {
  getAppVersion: () => ipcRenderer.invoke('app:get-version') as Promise<string>,
  scanHardware,
}

contextBridge.exposeInMainWorld('gamingHub', gamingHubApi)
exposeDeviceHubApi()
