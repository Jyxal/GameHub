import { app, BrowserWindow, ipcMain, session, type IpcMainInvokeEvent } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerDeviceHub, type DeviceHubHandle } from './device-hub/index.js'
import { scanHardware } from './services/hardware'

const devServerUrl = process.env.ELECTRON_RENDERER_URL
const rendererFile = join(__dirname, '../renderer/index.html')
let deviceHubHandle: DeviceHubHandle | null = null

function isTrustedRendererUrl(candidate: string): boolean {
  if (devServerUrl) {
    try {
      return new URL(candidate).origin === new URL(devServerUrl).origin
    } catch {
      return false
    }
  }

  return candidate === pathToFileURL(rendererFile).href
}

function assertTrustedSender(event: IpcMainInvokeEvent): void {
  const senderUrl = event.senderFrame?.url
  if (!senderUrl || !isTrustedRendererUrl(senderUrl)) {
    throw new Error('Blocked IPC request from an untrusted renderer.')
  }
}

function createMainWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#090e14',
    show: false,
    title: 'Gaming Environment Platform',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  })

  // Boş koyu pencereyi göstermeyip renderer hazır olduğunda pencereyi aç.
  mainWindow.once('ready-to-show', () => mainWindow.show())

  deviceHubHandle = registerDeviceHub(mainWindow)

  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl)
  } else {
    void mainWindow.loadFile(rendererFile)
  }
}

app.whenReady().then(() => {
  app.on('before-quit', () => deviceHubHandle?.dispose())

  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false)
  })

  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }))
    contents.on('will-navigate', (event, navigationUrl) => {
      if (!isTrustedRendererUrl(navigationUrl)) event.preventDefault()
    })
  })

  ipcMain.handle('app:get-version', (event) => {
    assertTrustedSender(event)
    return app.getVersion()
  })

  ipcMain.handle('hardware:scan', (event) => {
    assertTrustedSender(event)
    return scanHardware()
  })

  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
