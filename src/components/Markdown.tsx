import { Suspense, lazy } from 'react'
import { LinkCards } from '../linkpreview'

// react-markdown + remark-gfm are ~180KB; only loaded when markdown is actually
// rendered (Review, editor preview), keeping it out of the initial bundle.
const MarkdownRenderer = lazy(() => import('./MarkdownRenderer'))


export function Markdown({ children }: { children: string }) {
  return (
    <Suspense fallback={<p className="text-paper-dimmer text-sm">…</p>}>
      <MarkdownRenderer>{children}</MarkdownRenderer>
      <LinkCards text={children} />
    </Suspense>
  )
}
