/// <reference types="vite/client" />

import type { GamingHubApi } from '../../shared/electron-api'

declare global {
  interface Window {
    gamingHub: GamingHubApi
  }
}

export {}
