// Right-click menus: the operating system's own context menu (Tauri), so they look and behave like every other
// menu on the computer. In the plain web build there is none, and the caller falls back to its own UI.

import { IS_TAURI } from '../home/folder'

export type MenuEntry = { label: string; action: () => void; enabled?: boolean } | 'separator'

/** Shows a native context menu at the pointer. Returns false when there's no native menu (web build). */
export async function contextMenu(entries: MenuEntry[]): Promise<boolean> {
  if (!IS_TAURI) return false
  const { Menu, MenuItem, PredefinedMenuItem } = await import('@tauri-apps/api/menu')
  const items = await Promise.all(entries.map((e) => (e === 'separator'
    ? PredefinedMenuItem.new({ item: 'Separator' })
    : MenuItem.new({ text: e.label, enabled: e.enabled ?? true, action: () => e.action() }))))
  const menu = await Menu.new({ items })
  await menu.popup()
  return true
}
