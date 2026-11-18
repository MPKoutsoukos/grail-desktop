import { useCallback } from 'react'
import type { Settings } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import type { Home } from '@grail/core'
import { SIDECARS } from '@grail/core'
import { useSidecar } from './useSidecar'

const normalize = (input: unknown): Settings => {
  const raw = (input ?? {}) as Partial<Settings>
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    cover: { ...DEFAULT_SETTINGS.cover, ...raw.cover },
  }
}

export function useSettings(home: Home | null, epoch: number) {
  const [settings, set, ready] = useSidecar<Settings>(home, SIDECARS.settings, DEFAULT_SETTINGS, epoch, normalize)
  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    set((prev) => ({ ...prev, [key]: value }))
  }, [set])
  return { settings, ready, update }
}
