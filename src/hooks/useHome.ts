import { useCallback, useEffect, useState } from 'react'
import type { Note } from '../types'
import { askToConfirm, currentFolder, saveFolder, type HomeFolder } from '../home/folder'
import { openStore } from '../home/store'
import { Home, isDeleted, isHomeFile, markDeleted } from '@grail/core'

// Opens the active home and keeps the note list in memory. `epoch` bumps when
// sync changes files underneath us, so sidecar hooks know to re-read.
export function useHome() {
  const [home, setHome] = useState<Home | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [epoch, setEpoch] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const v = new Home(await openStore(currentFolder()))
        const loaded = await v.loadNotes()
        if (cancelled) return
        setHome(v); setNotes(loaded)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const reload = useCallback(async () => {
    if (!home) return
    setNotes(await home.loadNotes())
    setEpoch((e) => e + 1)
  }, [home])

  // Sync brought files in: patch just those notes (no full reload, no flicker),
  // and let sidecar hooks re-read if a sidecar changed.
  useEffect(() => {
    if (!home) return
    return home.onRemote(async (names) => {
      const ids = names.filter((n) => n.endsWith('.md')).map((n) => n.slice(0, -3))
      if (ids.length) {
        const fresh = await Promise.all(ids.map(async (id) => [id, await home.readNote(id)] as const))
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
  }, [home])

  const saveNote = useCallback(async (note: Note) => {
    if (!home) return note
    const saved = await home.saveNote(note)
    setNotes((prev) => (prev.some((n) => n.id === saved.id)
      ? prev.map((n) => (n.id === saved.id ? saved : n))
      : [saved, ...prev]))
    return saved
  }, [home])

  const createNote = useCallback(async (type: Note['type'], body = '') => {
    if (!home) throw new Error('home not ready')
    return saveNote(home.newNote(type, body))
  }, [home, saveNote])

  /** Delete = move to #deleted: the note stays in its file, hidden until a search asks for #deleted.
   *  A note already in #deleted is deleted for good (its file and pictures go). */
  const deleteNote = useCallback(async (id: string) => {
    if (!home) return
    const note = notes.find((n) => n.id === id)
    if (note && !isDeleted(note)) { await saveNote(markDeleted(note)); return }
    if (note) await home.deleteNote(note)
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }, [home, notes, saveNote])

  // Switching homes reloads the webview so every store re-reads from the new folder. bringNotes copies
  // the current home's files across first (files the new folder already has are kept).
  const setFolder = useCallback(async (c: HomeFolder, opts: { bringNotes?: boolean; first?: boolean } = {}) => {
    if (opts.bringNotes && home) {
      const to = await openStore(c)
      const have = new Set(await to.list())
      for (const n of (await home.store.list()).filter(isHomeFile)) {
        if (!have.has(n)) await to.write(n, await home.store.read(n))
      }
    }
    saveFolder(c)
    askToConfirm(!!opts.first)
    location.reload()
  }, [home])

  return { home, notes, loading, error, epoch, reload, saveNote, createNote, deleteNote, setFolder }
}
