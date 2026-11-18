import { useCallback, useEffect, useRef, useState } from 'react'
import type { Home } from '@grail/core'
import { useLatest } from './useLatest'

// A JSON file in the home, as React state. It re-reads when the home or the
// sync epoch changes, and writes only on real user changes — never echoing a
// load back to disk, which would wake sync for nothing.
export function useSidecar<T>(
  home: Home | null,
  name: string,
  fallback: T,
  epoch: number,
  normalize: (raw: unknown) => T = (x) => x as T,
) {
  const [value, setValue] = useState<T>(fallback)
  const [ready, setReady] = useState(false)
  const dirty = useRef(false)
  const norm = useLatest(normalize)
  const fb = useLatest(fallback)

  useEffect(() => {
    if (!home) return
    let cancelled = false
    home.readJson(name, fb.current).then((raw) => {
      if (cancelled) return
      setValue(norm.current(raw))
      setReady(true)
    })
    return () => { cancelled = true }
  }, [home, name, epoch, norm, fb])

  useEffect(() => {
    if (!home || !dirty.current) return
    dirty.current = false
    home.writeJson(name, value)
  }, [home, name, value])

  const update = useCallback((fn: (prev: T) => T) => {
    dirty.current = true
    setValue(fn)
  }, [])

  return [value, update, ready] as const
}
