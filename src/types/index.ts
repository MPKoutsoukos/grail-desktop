import { DEFAULT_THEME, type Theme } from '../theme/themes'
import { DEFAULT_TEMPLATE, type ReviewTemplate } from '../review/templates'
export type { Theme } from '../theme/themes'
export type { ReviewTemplate } from '../review/templates'

// The note model is shared with the mobile app and the sync server.
export type { Note, NoteType } from '@grail/core'

// A named, persisted query (see notes/filter.ts for the grammar).
export interface SavedView {
  id: string
  name: string
  query: string
  created: number
}

export interface Cover {
  enabled: boolean
  title: string
  subtitle: string
  image?: string
}

// Off unless you turn it on (Settings): a page to click through before your notes isn't how desktop apps start.
export const DEFAULT_COVER: Cover = { enabled: false, title: 'grail', subtitle: '' }

export type ReadingFont = 'serif' | 'sans' | 'mono'

export interface Settings {
  haptics: boolean
  autoImportScreenshots: boolean
  lastScreenshotImport: number
  theme: Theme
  cover: Cover
  reviewTemplate: ReviewTemplate
  readingFont: ReadingFont
  /** Resurface an older fragment at the top of Browse. */
  echoes: boolean
  /** true: fetch link previews by themselves; false: ask each time (the same setting as the Android app's). */
  linkPreviews: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  haptics: true,
  autoImportScreenshots: false,
  lastScreenshotImport: 0,
  theme: DEFAULT_THEME,
  cover: DEFAULT_COVER,
  reviewTemplate: DEFAULT_TEMPLATE,
  readingFont: 'serif',
  echoes: true,
  linkPreviews: false,
}
