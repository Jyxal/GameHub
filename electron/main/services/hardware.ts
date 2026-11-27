import { cpus, freemem, totalmem } from 'node:os'
import * as si from 'systeminformation'
import type { GraphicsAdapterSummary, HardwareOverview } from '../../../src/shared/electron-api'

export async function scanHardware(): Promise<HardwareOverview> {
  const [cpuResult, memoryResult, graphicsResult] = await Promise.allSettled([
    si.cpu(),
    si.mem(),
    si.graphics(),
  ])

  const osCpus = cpus()
  const cpu = cpuResult.status === 'fulfilled' ? cpuResult.value : null
  const memory = memoryResult.status === 'fulfilled' ? memoryResult.value : null

  if (!cpu && osCpus.length === 0) throw new Error('İşlemci bilgisi okunamadı.')
  if (!memory && totalmem() === 0) throw new Error('RAM bilgisi okunamadı.')

  const graphicsAdapters: GraphicsAdapterSummary[] = graphicsResult.status === 'fulfilled'
    ? graphicsResult.value.controllers
        .map((controller) => ({
          name: controller.model?.trim() || controller.vendor?.trim() || 'Ekran kartı adı alınamadı',
          vramMegabytes: typeof controller.vram === 'number' && Number.isFinite(controller.vram) && controller.vram > 0
            ? Math.round(controller.vram)
            : null,
        }))
        .filter((controller) => controller.name !== 'Ekran kartı adı alınamadı')
    : []

  return {
    processorName: cpu?.brand?.trim() || cpu?.manufacturer?.trim() || osCpus[0]?.model?.trim() || 'İşlemci adı alınamadı',
    physicalCores: cpu?.physicalCores || osCpus.length,
    logicalCores: cpu?.cores || osCpus.length,
    memoryTotalBytes: memory?.total || totalmem(),
    memoryUsedBytes: memory?.used || totalmem() - freemem(),
    graphicsAdapters,
    scannedAt: new Date().toISOString(),
  }
}
