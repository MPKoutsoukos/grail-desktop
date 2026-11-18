import { useCallback } from 'react'
import type { SavedView } from '../types'
import type { Home } from '@grail/core'
import { SIDECARS } from '@grail/core'
import { useSidecar } from './useSidecar'

const normalize = (raw: unknown): SavedView[] => (Array.isArray(raw) ? raw : [])

// Named saved queries, kept in grail-views.json alongside the notes.
export function useViews(home: Home | null, epoch: number) {
  const [views, set] = useSidecar<SavedView[]>(home, SIDECARS.views, [], epoch, normalize)

  const addView = useCallback((name: string, query: string) => {
    const view: SavedView = { id: String(Date.now()), name: name.trim() || 'Untitled view', query, created: Date.now() }
    set((prev) => [...prev, view])
  }, [set])

  const removeView = useCallback((id: string) => set((prev) => prev.filter((v) => v.id !== id)), [set])

  return { views, addView, removeView }
}
