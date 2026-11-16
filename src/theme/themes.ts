import { THEME_KEYS, isLight, parseTheme, type Theme, type ThemeColors } from '@grail/core'
export { PRESETS, DEFAULT_THEME, isLight, parseTheme } from '@grail/core'
export type { Theme, ThemeColors } from '@grail/core'
// Applies a theme as CSS variables (RGB channel triplets, so Tailwind `/opacity`
// modifiers keep working). The themes themselves live in @grail/core.

const VAR: Record<keyof ThemeColors, string> = {
  ink: '--ink', inkSurface: '--ink-surface', inkSurface2: '--ink-surface2',
  paper: '--paper', paperDim: '--paper-dim', paperDimmer: '--paper-dimmer',
  accent: '--accent', accentLight: '--accent-light',
}

function hexToChannels(hex: string): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  for (const k of THEME_KEYS) root.style.setProperty(VAR[k], hexToChannels(theme.colors[k]))
  root.dataset.scheme = isLight(theme) ? 'light' : 'dark'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.colors.ink)
}

export function exportTheme(theme: Theme) {
  const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `grail-theme-${theme.id}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importThemeFile(): Promise<Theme | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      resolve(file ? parseTheme(await file.text()) : null)
    }
    input.click()
  })
}
