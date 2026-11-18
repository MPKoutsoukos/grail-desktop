import { differenceInCalendarDays } from 'date-fns'
import { isDeleted, noteKind, type Note } from '@grail/core'

/** Echoes: one older fragment, resurfaced. Anniversaries (same day of the month) first, else anything over a week old; stable for the day. */
export function pickEcho(notes: Note[], salt: number): Note | null {
  const now = new Date()
  const old = notes.filter((n) => noteKind(n) === 'timeline' && !isDeleted(n) && n.body.trim() && differenceInCalendarDays(now, n.created) >= 7)
  if (!old.length) return null
  const anniversaries = old.filter((n) => new Date(n.created).getDate() === now.getDate())
  const pool = anniversaries.length ? anniversaries : old
  return pool[(Math.floor(Date.now() / 86_400_000) + salt) % pool.length]
}
