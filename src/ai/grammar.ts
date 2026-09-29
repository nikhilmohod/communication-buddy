import type { GrammarFix } from '../types'
import { loadEngine } from './engine'

const CHECKER = `You are a strict English grammar checker for a non-native speaker's spoken transcript.
Fix ONLY real grammar errors: verb tense, subject-verb agreement, articles (a/an/the), prepositions, plurals, word order.
Do not rephrase, do not improve style or vocabulary, do not add or remove ideas, do not add commentary.
Output ONLY the corrected text. If there are no errors, output the text exactly unchanged.`

const tokens = (t: string) => t.trim().split(/\s+/).filter(Boolean)
const key = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '')
const FILLERS = new Set(['um', 'uh', 'er', 'like', 'so', 'actually', 'basically'])
const MAX_HUNK = 8 // longer changes are rewrites, not grammar fixes
const CONTEXT = 2

export interface Hunk { original: string; correction: string }

/** Word-level diff (LCS). Returns the changed regions with a little context, ignoring case/punctuation. */
export function diffHunks(original: string, corrected: string): Hunk[] {
  const a = tokens(original)
  const b = tokens(corrected)
  const ka = a.map(key)
  const kb = b.map(key)
  const n = a.length
  const m = b.length
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = ka[i] === kb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const hunks: Hunk[] = []
  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && ka[i] === kb[j]) { i++; j++; continue }
    const si = i
    const sj = j
    while ((i < n || j < m) && !(i < n && j < m && ka[i] === kb[j])) {
      if (j >= m || (i < n && dp[i + 1][j] >= dp[i][j + 1])) i++
      else j++
    }
    const oldPart = a.slice(si, i)
    const newPart = b.slice(sj, j)
    if (Math.max(oldPart.length, newPart.length) > MAX_HUNK) continue
    if (oldPart.length > 0 && newPart.length === 0 && oldPart.every((w) => FILLERS.has(key(w)))) continue
    const pre = a.slice(Math.max(0, si - CONTEXT), si)
    const post = a.slice(i, i + CONTEXT)
    hunks.push({
      original: [...pre, ...oldPart, ...post].join(' '),
      correction: [...pre, ...newPart, ...post].join(' '),
    })
  }
  return hunks
}

async function ask(system: string, user: string, maxTokens: number): Promise<string> {
  const engine = await loadEngine(() => {})
  const res = await engine.chat.completions.create({
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    temperature: 0,
    max_tokens: maxTokens,
  })
  return (res.choices[0]?.message?.content ?? '').trim().replace(/^["“]|["”]$/g, '')
}

/** Dedicated grammar pass: correct the transcript, then diff it to find real word-level fixes. */
export async function checkGrammar(transcript: string): Promise<GrammarFix[]> {
  const words = tokens(transcript).length
  if (words < 3) return []
  const corrected = await ask(CHECKER, transcript, Math.min(900, words * 2 + 60))
  if (!corrected) return []
  const hunks = diffHunks(transcript, corrected).slice(0, 2)
  const fixes: GrammarFix[] = []
  for (const h of hunks) {
    let explanation = ''
    try {
      explanation = await ask(
        'You are an English teacher. Answer in ONE short sentence (max 20 words) naming the grammar rule. No preamble.',
        `Why is "${h.original}" corrected to "${h.correction}"?`,
        60,
      )
    } catch { /* explanation is optional */ }
    fixes.push({ ...h, explanation: explanation || 'Grammar correction.' })
  }
  return fixes
}
