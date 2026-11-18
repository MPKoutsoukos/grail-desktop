// The desktop app's FileStores: a real folder through Tauri, or IndexedDB for
// the web build. Notes, sync and everything else sit on @grail/core's FileStore.

import { parseFrontmatter, stringifyFrontmatter, dataUrlToBytes, extForMime, writeText, type FileStore } from '@grail/core'
import type { HomeFolder } from './folder'

// --------------------------------------------------------------- IndexedDB ---

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('grail', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('files')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbStore(): FileStore {
  const db = openDb()
  const tx = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) => {
    const d = await db
    return new Promise<T>((resolve, reject) => {
      const r = fn(d.transaction('files', mode).objectStore('files'))
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(r.error)
    })
  }
  return {
    list: async () => (await tx('readonly', (s) => s.getAllKeys())).map(String),
    read: async (name) => {
      const v = await tx<Uint8Array | undefined>('readonly', (s) => s.get(name))
      if (!v) throw new Error(`not found: ${name}`)
      return v
    },
    write: async (name, data) => { await tx('readwrite', (s) => s.put(data, name)) },
    remove: async (name) => { await tx('readwrite', (s) => s.delete(name)) },
  }
}

// One-time move of the oldest web builds' localStorage notes into IndexedDB.
async function migrateLocalStorage(store: FileStore) {
  const keys = Object.keys(localStorage)
  if (!keys.some((k) => k.startsWith('grail_note_'))) return
  for (const k of keys) {
    const raw = localStorage.getItem(k)
    if (raw == null) continue
    if (k.startsWith('grail_note_')) {
      const id = k.slice('grail_note_'.length)
      const { data, body } = parseFrontmatter(raw)
      for (const field of ['drawingPath', 'mediaPath'] as const) {
        const v = data[field]
        if (typeof v === 'string' && v.startsWith('data:')) {
          const { bytes, mime } = dataUrlToBytes(v)
          const file = field === 'drawingPath' ? `${id}.png` : `${id}-media.${extForMime(mime)}`
          await store.write(file, bytes)
          data[field] = file
        }
      }
      await writeText(store, `${id}.md`, stringifyFrontmatter(data, body))
    } else if (k.startsWith('grail_scene_')) await writeText(store, `${k.slice('grail_scene_'.length)}.scene.json`, raw)
    else if (k === 'grail_review_state') await writeText(store, 'grail-review.json', raw)
    else if (k === 'grail_settings') await writeText(store, 'grail-settings.json', raw)
    else if (k === 'grail_views') await writeText(store, 'grail-views.json', raw)
    else continue
    localStorage.removeItem(k)
  }
}

// ------------------------------------------------------------------- Tauri ---

async function tauriStore(c: HomeFolder): Promise<FileStore> {
  const fs = await import('@tauri-apps/plugin-fs')
  const abs = c.kind === 'tauri' && !!c.value
  const opts = abs ? {} : { baseDir: fs.BaseDirectory.AppData }
  const dir = abs ? c.value! : 'grail-home'
  const p = (name: string) => `${dir}/${name}`
  // A new home (the default Documents/grail, or a folder typed in) may not exist yet.
  try { if (!(await fs.exists(dir, opts))) await fs.mkdir(dir, { ...opts, recursive: true }) } catch { /* exists, or the error shows on first read */ }
  // Atomic replace: a crash mid-write never leaves a half-written note.
  const replace = async (name: string, write: (tmp: string) => Promise<void>) => {
    const tmp = p(`.${name}.grail-tmp`)
    await write(tmp)
    await fs.rename(tmp, p(name), { oldPathBaseDir: opts.baseDir, newPathBaseDir: opts.baseDir })
  }
  return {
    list: async () => (await fs.readDir(dir, opts)).filter((e) => e.isFile).map((e) => e.name),
    read: (name) => fs.readFile(p(name), opts),
    write: (name, data) => replace(name, (tmp) => fs.writeFile(tmp, data, opts)),
    remove: async (name) => { try { await fs.remove(p(name), opts) } catch { /* gone */ } },
    readText: (name) => fs.readTextFile(p(name), opts),
    writeText: (name, data) => replace(name, (tmp) => fs.writeTextFile(tmp, data, opts)),
    stat: async (name) => {
      try {
        const s = await fs.stat(p(name), opts)
        return { size: s.size, mtime: s.mtime ? s.mtime.getTime() : 0 }
      } catch { return null }
    },
  }
}

export async function openStore(c: HomeFolder): Promise<FileStore> {
  if (c.kind === 'browser') {
    const s = idbStore()
    await migrateLocalStorage(s)
    return s
  }
  return tauriStore(c)
}
