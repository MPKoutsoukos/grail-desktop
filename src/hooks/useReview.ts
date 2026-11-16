import { useCallback } from 'react'
import type { Note } from '../types'
import type { Vault } from '@grail/core'
import { SIDECARS } from '@grail/core'
import { useSidecar } from './useSidecar'

export interface ReviewState { order: string[]; removed: string[] }
export type ReviewMap = Record<string, ReviewState>

const EMPTY: ReviewState = { order: [], removed: [] }

// Older files stored a single {order, removed} for the global review.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untrusted JSON from disk
function normalize(parsed: any): ReviewMap {
  if (parsed && (Array.isArray(parsed.order) || Array.isArray(parsed.removed))) {
    return { '': { order: parsed.order ?? [], removed: parsed.removed ?? [] } }
  }
  return parsed && typeof parsed === 'object' ? parsed : {}
}

// The full ordered list of eligible ids: saved order first, then newcomers
// chronologically; removed ids are left out.
function orderedIds(eligible: Note[], rs: ReviewState): string[] {
  const exists = new Set(eligible.map((n) => n.id))
  const removed = new Set(rs.removed)
  const ids = [...new Set(rs.order)].filter((id) => exists.has(id) && !removed.has(id))
  const seen = new Set(ids)
  eligible
    .filter((n) => !seen.has(n.id) && !removed.has(n.id))
    .sort((a, b) => a.created - b.created)
    .forEach((n) => ids.push(n.id))
  return ids
}

// Review arrangements keyed by context: '' = the global review, a category name =
// that category's own review, each with an independent order + removed set.
export function useReview(vault: Vault | null, epoch: number) {
  const [map, set] = useSidecar<ReviewMap>(vault, SIDECARS.review, {}, epoch, normalize)

  const patch = useCallback((key: string, fn: (rs: ReviewState) => ReviewState) => {
    set((prev) => ({ ...prev, [key]: fn(prev[key] ?? EMPTY) }))
  }, [set])

  const view = useCallback((key: string, eligible: Note[]) => {
    const rs = map[key] ?? EMPTY
    const removed = new Set(rs.removed)
    const byId = new Map(eligible.map((n) => [n.id, n]))
    return {
      compiled: orderedIds(eligible, rs).map((id) => byId.get(id)!),
      removedNotes: eligible.filter((n) => removed.has(n.id)),
      removedIds: removed,
      move: (id: string, dir: -1 | 1) => patch(key, (cur) => {
        const ids = orderedIds(eligible, cur)
        const i = ids.indexOf(id)
        const j = i + dir
        if (i < 0 || j < 0 || j >= ids.length) return cur
        ;[ids[i], ids[j]] = [ids[j], ids[i]]
        return { ...cur, order: ids }
      }),
      remove: (id: string) => patch(key, (cur) => ({ ...cur, removed: [...new Set([...cur.removed, id])] })),
      restore: (id: string) => patch(key, (cur) => ({ ...cur, removed: cur.removed.filter((x) => x !== id) })),
      clearRemoved: () => patch(key, (cur) => ({ ...cur, removed: [] })),
    }
  }, [map, patch])

  return { view }
}

export type ReviewContext = ReturnType<ReturnType<typeof useReview>['view']>
