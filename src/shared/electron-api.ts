export interface GraphicsAdapterSummary {
  name: string
  vramMegabytes: number | null
}

export interface HardwareOverview {
  processorName: string
  physicalCores: number
  logicalCores: number
  memoryTotalBytes: number
  memoryUsedBytes: number
  graphicsAdapters: GraphicsAdapterSummary[]
  scannedAt: string
}

export interface GamingHubApi {
  getAppVersion(): Promise<string>
  scanHardware(): Promise<HardwareOverview>
}
