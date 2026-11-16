// Review templates (Ch16): a template decides HOW the Review read renders the
// stitched continuous document — not what's in it. The four built-ins are layout
// algorithms (see ReviewView); this module just names them for the Settings
// picker. No app imports → `types` depends on it (mirrors theme/themes.ts).

export type ReviewTemplate = 'manuscript' | 'timeline' | 'codex' | 'cards'

export const REVIEW_TEMPLATES: { id: ReviewTemplate; name: string; hint: string }[] = [
  { id: 'manuscript', name: 'Manuscript', hint: 'continuous prose' },
  { id: 'timeline', name: 'Timeline', hint: 'date markers' },
  { id: 'codex', name: 'Codex', hint: 'grouped by category' },
  { id: 'cards', name: 'Cards', hint: 'boxed sections' },
]

export const DEFAULT_TEMPLATE: ReviewTemplate = 'manuscript'
