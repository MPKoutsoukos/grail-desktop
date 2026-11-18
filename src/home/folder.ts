// Where the desktop app keeps the home: the folder its notes live in. The choice lives in
// localStorage, outside the home, since it's what says where the home is.

export type FolderKind =
  | 'tauri'         // a folder on this computer (value = absolute path): the default Documents/grail, or one you picked
  | 'tauri-default' // the app data folder (what grail used before there was a default in Documents)
  | 'browser'       // the web build: IndexedDB

export interface HomeFolder {
  kind: FolderKind
  value?: string
}

const w = (typeof window === 'undefined' ? {} : window) as { __TAURI_INTERNALS__?: unknown }
export const IS_TAURI = !!w.__TAURI_INTERNALS__

const LS_HOME = 'grail_home'
const LS_CONFIRM = 'grail_folder_confirm'

export function loadFolder(): HomeFolder | null {
  try {
    const raw = localStorage.getItem(LS_HOME)
    if (!raw) return null
    const c = JSON.parse(raw) as { kind: string; value?: string }
    if (c.kind === 'tauri' || c.kind === 'tauri-default') return c as HomeFolder
    return { kind: 'browser' }
  } catch {
    return null
  }
}

export function saveFolder(c: HomeFolder) {
  try { localStorage.setItem(LS_HOME, JSON.stringify(c)) } catch { /* private mode */ }
}

/** Desktop asks where to keep the home on first run; the web build just uses IndexedDB. */
export const folderNeeded = () => IS_TAURI && !loadFolder()

export function currentFolder(): HomeFolder {
  return loadFolder() ?? { kind: IS_TAURI ? 'tauri-default' : 'browser' }
}

/** A stable key for per-home device state. */
export const folderKey = (c: HomeFolder) => `${c.kind}:${c.value ?? ''}`

/** The default home for a new install: a "grail" folder in Documents, easy to find and back up. */
export async function defaultFolder(): Promise<HomeFolder> {
  const { documentDir, join } = await import('@tauri-apps/api/path')
  return { kind: 'tauri', value: await join(await documentDir(), 'grail') }
}

/** The folder's full path on this computer, to show the person where their notes are. */
export async function folderPath(c: HomeFolder): Promise<string> {
  switch (c.kind) {
    case 'tauri': return c.value ?? ''
    case 'tauri-default': {
      const { appDataDir, join } = await import('@tauri-apps/api/path')
      return join(await appDataDir(), 'grail-home')
    }
    case 'browser': return 'This browser'
  }
}

export function folderLabel(c: HomeFolder): string {
  switch (c.kind) {
    case 'tauri': return c.value ?? 'custom folder'
    case 'tauri-default': return 'App data folder'
    case 'browser': return 'This browser'
  }
}

/** After a folder is chosen the window reloads; this flag shows "Your notes are here" once it has. */
export function askToConfirm(first: boolean) {
  try { localStorage.setItem(LS_CONFIRM, first ? 'first' : 'change') } catch { /* private mode */ }
}
export function pendingConfirm(): 'first' | 'change' | null {
  try { const v = localStorage.getItem(LS_CONFIRM); return v === 'first' || v === 'change' ? v : null } catch { return null }
}
export function clearConfirm() {
  try { localStorage.removeItem(LS_CONFIRM) } catch { /* private mode */ }
}
