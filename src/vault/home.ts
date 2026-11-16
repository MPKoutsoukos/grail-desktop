// Where the desktop app keeps the vault. The choice lives in localStorage,
// outside the vault, since it's what says where the vault is.

export type HomeKind =
  | 'tauri'         // a folder you picked (value = absolute path)
  | 'tauri-default' // the app data folder
  | 'browser'       // the web build: IndexedDB

export interface HomeConfig {
  kind: HomeKind
  value?: string
}

const w = (typeof window === 'undefined' ? {} : window) as { __TAURI_INTERNALS__?: unknown }
export const IS_TAURI = !!w.__TAURI_INTERNALS__

const LS_HOME = 'grail_home'

export function loadHomeConfig(): HomeConfig | null {
  try {
    const raw = localStorage.getItem(LS_HOME)
    if (!raw) return null
    const c = JSON.parse(raw) as { kind: string; value?: string }
    if (c.kind === 'tauri' || c.kind === 'tauri-default') return c as HomeConfig
    return { kind: 'browser' }
  } catch {
    return null
  }
}

export function saveHomeConfig(c: HomeConfig) {
  try { localStorage.setItem(LS_HOME, JSON.stringify(c)) } catch { /* private mode */ }
}

/** Desktop asks where to keep the vault on first run; the web build just uses IndexedDB. */
export const homeNeeded = () => IS_TAURI && !loadHomeConfig()

export function effectiveHome(): HomeConfig {
  return loadHomeConfig() ?? { kind: IS_TAURI ? 'tauri-default' : 'browser' }
}

/** A stable key for per-vault device state (sync account, queue). */
export const homeKey = (c: HomeConfig) => `${c.kind}:${c.value ?? ''}`

export function homeLabel(c: HomeConfig): string {
  switch (c.kind) {
    case 'tauri': return c.value ?? 'custom folder'
    case 'tauri-default': return 'App data folder'
    case 'browser': return 'This browser'
  }
}
