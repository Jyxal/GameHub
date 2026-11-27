import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { copyFileSync, mkdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { build, Arch, Platform } from 'electron-builder'

const projectDir = process.cwd()
const buildCommand = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'pnpm'
const buildArgs = process.platform === 'win32'
  ? ['/d', '/s', '/c', 'pnpm exec electron-vite build']
  : ['exec', 'electron-vite', 'build']
const buildResult = spawnSync(buildCommand, buildArgs, { cwd: projectDir, stdio: 'inherit' })

if (buildResult.error) throw buildResult.error
if (buildResult.status !== 0) process.exit(buildResult.status ?? 1)

// Keep NSIS's output path ASCII-safe; makensis can fail when the project is
// under a Windows path containing non-ASCII characters. Copy only the final
// installer back into the ignored release folder afterward.
const tempOutput = path.join(os.tmpdir(), 'gamehub-beta-' + randomUUID())
mkdirSync(tempOutput, { recursive: true })
const artifacts = await build({
  targets: Platform.WINDOWS.createTarget(['nsis'], Arch.x64),
  projectDir,
  config: { directories: { output: tempOutput } },
})
const installer = artifacts.find((artifact) => artifact.endsWith('-Setup.exe'))
if (!installer) throw new Error('Electron Builder did not produce an NSIS installer.')

const releaseDir = path.join(projectDir, 'release')
mkdirSync(releaseDir, { recursive: true })
const destination = path.join(releaseDir, path.basename(installer))
copyFileSync(installer, destination)
console.info(`Installer ready: ${destination}`)




