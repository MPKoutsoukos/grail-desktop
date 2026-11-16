import { createContext, useContext, useEffect, useState } from 'react'
import type { Vault } from '@grail/core'

export const VaultContext = createContext<Vault | null>(null)
export const useVaultCtx = () => useContext(VaultContext)

/** Resolve an attachment in the vault into a displayable src; refreshes when sync replaces it. */
export function useImage(name: string | undefined): string | null {
  const vault = useVaultCtx()
  // Remember which file the src belongs to, so a stale image never shows for a new name.
  const [loaded, setLoaded] = useState<{ name: string; src: string } | null>(null)
  const [bump, setBump] = useState(0)
  useEffect(() => {
    if (!vault || !name) return
    return vault.onRemote((names) => { if (names.includes(name)) setBump((b) => b + 1) })
  }, [vault, name])
  useEffect(() => {
    if (!vault || !name) return
    let cancelled = false
    vault.loadImage(name).then((src) => { if (!cancelled) setLoaded({ name, src }) }).catch(() => {})
    return () => { cancelled = true }
  }, [vault, name, bump])
  return loaded && loaded.name === name ? loaded.src : null
}
