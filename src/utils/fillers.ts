import type { FillerCount } from '../types'

// Transcript-based detection only: browsers often drop "um"/"uh" from recognition output,
// and words like "like" or "so" are not always fillers. Counts are approximate.
const FILLERS = ['um', 'uh', 'you know', 'i mean', 'kind of', 'sort of', 'basically', 'actually', 'like', 'so']

export function countFillers(text: string): FillerCount[] {
  const t = ` ${text.toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ')} `
  return FILLERS.map((word) => ({ word, count: t.split(` ${word} `).length - 1 }))
    .filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count)
}

export const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0)
