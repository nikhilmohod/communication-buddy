import type { Analysis, ChatMessage, Mode, Topic } from '../types'
import { loadEngine } from './engine'

const SYSTEM = `You are a warm, encouraging English speaking coach for a non-native speaker.
You receive a speech transcript produced by speech recognition (no punctuation or capitals may be reliable).
Analyse the WHOLE transcript and reply with ONLY a JSON object with these keys:
{
 "grammar": [ {"original": "exact words from transcript", "correction": "...", "explanation": "one short sentence"} ],
 "vocabulary": [ {"original": "exact words from transcript", "better": "...", "explanation": "one short sentence"} ],
 "fluency": {"feedback": "1-2 practical sentences about flow, repetition, sentence length, transitions, clarity", "needsWork": true|false},
 "natural": {"original": "exact words from transcript", "better": "more natural phrasing"} or null,
 "structure": {"feedback": "1-2 sentences", "complete": true|false} or null,
 "pronunciationWords": ["up to 3 words the speaker used or should use that are hard to pronounce"],
 "reply": "your natural spoken reply"
}
Rules:
- Never invent mistakes. If grammar is fine, use an empty "grammar" array. Max 2 grammar/tense items, max 2 vocabulary items.
- "original" fields must be copied exactly from the transcript.
- Prefer natural, simple vocabulary; never replace simple correct English with fancy words.
- Only give "natural" if there is one clearly useful improvement; otherwise null.
- For answers over about 40 words, judge structure (for work topics: situation, problem, cause, action, result) and say what is missing. Otherwise structure is null.
- "reply" responds to the CONTENT of what the speaker said like a friendly person would (2-4 sentences), then invites them to continue or gives a small follow-up. Do not just ask a new question.`

const asArray = <T>(v: unknown, map: (o: Record<string, unknown>) => T | null): T[] =>
  (Array.isArray(v) ? v : []).flatMap((o) => {
    if (!o || typeof o !== 'object') return []
    const r = map(o as Record<string, unknown>)
    return r ? [r] : []
  })
const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** True if `snippet` really occurs in the transcript (guards against invented mistakes). */
const inTranscript = (snippet: string, transcript: string) => {
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim()
  const n = norm(snippet)
  return n.length > 0 && norm(transcript).includes(n)
}

export function parseAnalysis(raw: string, transcript: string): Analysis {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('No JSON in model output')
  const d = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>

  const grammar = asArray(d.grammar, (o) => {
    const g = { original: s(o.original), correction: s(o.correction), explanation: s(o.explanation) }
    return g.original && g.correction && g.original.toLowerCase() !== g.correction.toLowerCase() && inTranscript(g.original, transcript) ? g : null
  }).slice(0, 2)
  const vocabulary = asArray(d.vocabulary, (o) => {
    const v = { original: s(o.original), better: s(o.better), explanation: s(o.explanation) }
    return v.original && v.better && inTranscript(v.original, transcript) ? v : null
  }).slice(0, 2)

  const f = (d.fluency ?? {}) as Record<string, unknown>
  const n = d.natural as Record<string, unknown> | null
  const natural = n && s(n.original) && s(n.better) && inTranscript(s(n.original), transcript)
    ? { original: s(n.original), better: s(n.better) }
    : null
  const st = d.structure as Record<string, unknown> | null
  const structure = st && s(st.feedback) ? { feedback: s(st.feedback), complete: st.complete === true } : null
  const words = (Array.isArray(d.pronunciationWords) ? d.pronunciationWords : [])
    .map(s).filter((w) => /^[A-Za-z][A-Za-z'-]{3,}$/.test(w))
  const reply = s(d.reply)
  if (!reply) throw new Error('Empty reply')

  return {
    grammar,
    vocabulary,
    fluency: { feedback: s(f.feedback) || 'Your speech was easy to follow.', needsWork: f.needsWork === true },
    natural,
    structure,
    pronunciationWords: [...new Set(words)].slice(0, 3),
    reply,
  }
}

export interface AnalyzeInput {
  transcript: string
  topic: Topic | null
  mode: Mode
  history: ChatMessage[]
  intro: boolean
}

export async function analyzeSpeech(input: AnalyzeInput): Promise<Analysis> {
  const engine = await loadEngine(() => {})
  const context = input.intro
    ? 'Context: this is the speaker\'s self-introduction. Respond warmly to what they shared, then say you will give them a speaking challenge.'
    : `Context: speaking challenge "${input.topic?.title}". Prompt given: ${input.topic?.prompt}`
  const detail = input.mode === 'coach' ? 'Give thorough feedback.' : 'Keep feedback brief; focus on the most important point.'
  const messages = [
    { role: 'system' as const, content: `${SYSTEM}\n${context}\n${detail}` },
    ...input.history.slice(-4),
    { role: 'user' as const, content: `Transcript:\n"""${input.transcript}"""` },
  ]
  const res = await engine.chat.completions.create({
    messages,
    temperature: 0.3,
    max_tokens: 700,
    response_format: { type: 'json_object' },
  })
  return parseAnalysis(res.choices[0]?.message?.content ?? '', input.transcript)
}
