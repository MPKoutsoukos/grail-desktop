import { createContext, useContext, useEffect, useState } from 'react'
import type { Home } from '@grail/core'

export const HomeContext = createContext<Home | null>(null)
export const useHomeCtx = () => useContext(HomeContext)

/** Resolve an attachment in the home into a displayable src; refreshes when sync replaces it. */
export function useImage(name: string | undefined): string | null {
  const home = useHomeCtx()
  // Remember which file the src belongs to, so a stale image never shows for a new name.
  const [loaded, setLoaded] = useState<{ name: string; src: string } | null>(null)
  const [bump, setBump] = useState(0)
  useEffect(() => {
    if (!home || !name) return
    return home.onRemote((names) => { if (names.includes(name)) setBump((b) => b + 1) })
  }, [home, name])
  useEffect(() => {
    if (!home || !name) return
    let cancelled = false
    home.loadImage(name).then((src) => { if (!cancelled) setLoaded({ name, src }) }).catch(() => {})
    return () => { cancelled = true }
  }, [home, name, bump])
  return loaded && loaded.name === name ? loaded.src : null
}
