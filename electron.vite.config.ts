import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'

// Electron inherits this flag from its parent process. In run-as-Node mode,
// Electron's `app` API is unavailable and the main process crashes on startup.
delete process.env.ELECTRON_RUN_AS_NODE
delete process.env.ELECTRON_OVERRIDE_DIST_PATH

export default defineConfig({
  main: {
    build: {
      lib: { entry: 'electron/main/index.ts' },
    },
  },
  preload: {
    build: {
      lib: { entry: 'electron/preload/index.ts', formats: ['cjs'] },
    },
  },
  renderer: {
    // Packaged Electron loads this page over file://, so asset URLs must be relative.
    base: './',
    plugins: [react({})],
  },
})
