import type { Analysis, ChatMessage, Mode, Topic } from '../types'
import { loadEngine } from './engine'
import { checkGrammar } from './grammar'
import { parseJsonLoose } from './json'

const SYSTEM = `You are a warm, encouraging English speaking coach for a non-native speaker.
You receive a transcript from speech recognition. Analyse the WHOLE transcript.
Return ONLY one JSON object with exactly these keys. No markdown, no code fences, no text outside the JSON, no trailing commas:
{
 "grammar": [{"original": "", "correction": "", "explanation": ""}],
 "vocabulary": [{"original": "", "better": "", "reason": ""}],
 "fluency": [{"finding": ""}],
 "fillers": [],
 "naturalEnglish": [{"original": "", "better": ""}],
 "communicationStructure": [{"finding": ""}],
 "pronunciation": [{"word": "", "reason": ""}],
 "overallFeedback": "",
 "conversationReply": "",
 "nextSpeakingSuggestion": ""
}
Rules:
- Use empty arrays when there is nothing useful to say. NEVER invent mistakes. If grammar is fine, "grammar" is [].
- "original" must be copied exactly from the transcript. Max 2 grammar items, max 3 vocabulary items.
- Vocabulary: only real mistakes or unnatural word choices (e.g. "discussed about" -> "discussed"; "got some problem" -> "had a problem"). Do not replace simple correct words.
- "fluency": only real problems with flow, repetition, sentence length or clarity. "naturalEnglish": at most one useful alternative.
- "communicationStructure": only if the answer is long (about 40+ words); say what is missing (for work topics: situation, problem, cause, action, result).
- "pronunciation": up to 3 uncommon or technically complex words from the transcript that learners often mispronounce.
- "conversationReply": 2-4 friendly sentences reacting to the CONTENT of what was said, not just a new question.
- "nextSpeakingSuggestion": one short practical speaking tip.`

const REPAIR = 'Return the analysis again using ONLY the required JSON schema. No markdown, no explanation, no code fences, no trailing commas.'

type Obj = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const list = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter((o): o is Obj => !!o && typeof o === 'object') : [])
const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim()
/** True if the snippet really occurs in the transcript (guards against invented mistakes). */
const inTranscript = (snippet: string, transcript: string) => !!norm(snippet) && norm(transcript).includes(norm(snippet))

export const emptyAnalysis = (): Analysis => ({
  grammar: [], vocabulary: [], fluency: [], naturalEnglish: [], communicationStructure: [], pronunciation: [],
  overallFeedback: '', conversationReply: '', nextSpeakingSuggestion: '',
})

/** Parses and validates model output. Returns null if it is unusable. Missing sections become empty. */
export function parseAnalysisResponse(raw: string, transcript: string): Analysis | null {
  const d = parseJsonLoose(raw)
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null
  const o = d as Obj

  const a = emptyAnalysis()
  a.grammar = list(o.grammar)
    .map((g) => ({ original: str(g.original), correction: str(g.correction), explanation: str(g.explanation) }))
    .filter((g) => g.original && g.correction && norm(g.original) !== norm(g.correction) && inTranscript(g.original, transcript))
    .slice(0, 2)
  a.vocabulary = list(o.vocabulary)
    .map((v) => ({ original: str(v.original), better: str(v.better), reason: str(v.reason) || str(v.explanation) }))
    .filter((v) => v.original && v.better && norm(v.original) !== norm(v.better) && inTranscript(v.original, transcript))
    .slice(0, 3)
  a.fluency = list(o.fluency).map((f) => ({ finding: str(f.finding) })).filter((f) => f.finding).slice(0, 3)
  a.naturalEnglish = list(o.naturalEnglish)
    .map((n) => ({ original: str(n.original), better: str(n.better) }))
    .filter((n) => n.original && n.better && inTranscript(n.original, transcript))
    .slice(0, 1)
  a.communicationStructure = list(o.communicationStructure).map((f) => ({ finding: str(f.finding) })).filter((f) => f.finding).slice(0, 2)
  const seen = new Set<string>()
  a.pronunciation = list(o.pronunciation)
    .map((p) => ({ word: str(p.word), reason: str(p.reason) }))
    .filter((p) => /^[A-Za-z][A-Za-z'-]{3,}$/.test(p.word) && !seen.has(p.word.toLowerCase()) && !!seen.add(p.word.toLowerCase()))
    .slice(0, 3)
  a.overallFeedback = str(o.overallFeedback)
  a.conversationReply = str(o.conversationReply)
  a.nextSpeakingSuggestion = str(o.nextSpeakingSuggestion)

  // A response with no usable content at all is treated as invalid so the caller can retry.
  const hasContent = a.conversationReply || a.overallFeedback || a.grammar.length || a.vocabulary.length || a.fluency.length || a.pronunciation.length
  return hasContent ? a : null
}

export type Generate = (messages: { role: 'system' | 'user' | 'assistant'; content: string }[]) => Promise<string>

/** Parse → (one compact retry) → null. History is not resent on the retry to save tokens. */
export async function runAnalysis(generate: Generate, system: string, transcript: string, history: ChatMessage[]): Promise<Analysis | null> {
  const user = { role: 'user' as const, content: `Transcript:\n"""${transcript}"""` }
  const first = await generate([{ role: 'system', content: system }, ...history.slice(-4), user])
  const parsed = parseAnalysisResponse(first, transcript)
  if (parsed) return parsed
  console.error('Unusable model output (retrying once):', first)
  const second = await generate([{ role: 'system', content: system }, user, { role: 'user', content: REPAIR }])
  const retried = parseAnalysisResponse(second, transcript)
  if (!retried) console.error('Unusable model output after retry:', second)
  return retried
}

export interface AnalyzeInput {
  transcript: string
  topic: Topic | null
  mode: Mode
  history: ChatMessage[]
  intro: boolean
}

/** Runs the full analysis. Never throws for bad model output: falls back to grammar-only feedback. */
export async function analyzeSpeech(input: AnalyzeInput): Promise<Analysis> {
  const engine = await loadEngine(() => {})
  const context = input.intro
    ? "Context: this is the speaker's self-introduction. Respond warmly to what they shared, then say you will give them a speaking challenge."
    : `Context: speaking challenge "${input.topic?.title}". Prompt given: ${input.topic?.prompt}`
  const detail = input.mode === 'coach' ? 'Give thorough feedback.' : 'Keep feedback brief; focus on the most important point.'
  const generate: Generate = async (messages) => {
    const res = await engine.chat.completions.create({ messages, temperature: 0.3, max_tokens: 900 })
    return res.choices[0]?.message?.content ?? ''
  }

  // Dedicated grammar pass: more reliable on a small model than asking for it in the big prompt.
  const grammarFixes = await checkGrammar(input.transcript).catch((e) => { console.error('Grammar pass failed', e); return null })
  const analysis = await runAnalysis(generate, `${SYSTEM}\n${context}\n${detail}`, input.transcript, input.history)

  const result = analysis ?? {
    ...emptyAnalysis(),
    conversationReply: "Thanks for sharing that. I couldn't produce the full feedback this time, but here is what I found. Keep going — tell me a little more.",
  }
  if (grammarFixes) result.grammar = grammarFixes
  return result
}
