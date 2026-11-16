import { useCallback, useEffect, useState } from 'react'
import type { Note } from '../types'
import { effectiveHome, saveHomeConfig, type HomeConfig } from '../vault/home'
import { openStore } from '../vault/store'
import { Vault } from '@grail/core'

// Opens the active home and keeps the note list in memory. `epoch` bumps when
// sync changes files underneath us, so sidecar hooks know to re-read.
export function useVault() {
  const [vault, setVault] = useState<Vault | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [epoch, setEpoch] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const v = new Vault(await openStore(effectiveHome()))
        const loaded = await v.loadNotes()
        if (cancelled) return
        setVault(v); setNotes(loaded)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const reload = useCallback(async () => {
    if (!vault) return
    setNotes(await vault.loadNotes())
    setEpoch((e) => e + 1)
  }, [vault])

  // Sync brought files in: patch just those notes (no full reload, no flicker),
  // and let sidecar hooks re-read if a sidecar changed.
  useEffect(() => {
    if (!vault) return
    return vault.onRemote(async (names) => {
      const ids = names.filter((n) => n.endsWith('.md')).map((n) => n.slice(0, -3))
      if (ids.length) {
        const fresh = await Promise.all(ids.map(async (id) => [id, await vault.readNote(id)] as const))
        setNotes((prev) => {
          let next = prev
          for (const [id, note] of fresh) {
            const without = next.filter((n) => n.id !== id)
            next = note ? [note, ...without] : without
          }
          return [...next].sort((a, b) => b.created - a.created)
        })
      }
      if (names.some((n) => n.endsWith('.json') && !n.endsWith('.scene.json'))) setEpoch((e) => e + 1)
    })
  }, [vault])

  const saveNote = useCallback(async (note: Note) => {
    if (!vault) return note
    const saved = await vault.saveNote(note)
    setNotes((prev) => (prev.some((n) => n.id === saved.id)
      ? prev.map((n) => (n.id === saved.id ? saved : n))
      : [saved, ...prev]))
    return saved
  }, [vault])

  const createNote = useCallback(async (type: Note['type'], body = '') => {
    if (!vault) throw new Error('vault not ready')
    return saveNote(vault.newNote(type, body))
  }, [vault, saveNote])

  const deleteNote = useCallback(async (id: string) => {
    if (!vault) return
    const note = notes.find((n) => n.id === id)
    if (note) await vault.deleteNote(note)
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }, [vault, notes])

  // Switching homes reloads the webview so every store re-reads from the new folder.
  const setHome = useCallback((c: HomeConfig) => { saveHomeConfig(c); location.reload() }, [])

  return { vault, notes, loading, error, epoch, reload, saveNote, createNote, deleteNote, setHome }
}
