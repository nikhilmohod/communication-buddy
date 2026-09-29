import { describe, expect, it } from 'vitest'
import { parseAnalysisResponse, runAnalysis } from './analysis'
import { repairJson } from './json'
import { countFillers } from '../utils/fillers'
import { deleteWord, isEdited, replaceWord, splitWords } from '../utils/transcript'

const transcript = 'yesterday I go to the office and we found some issue in the data'
const valid = {
  grammar: [{ original: 'I go to the office', correction: 'I went to the office', explanation: 'Past tense.' }],
  vocabulary: [{ original: 'found some issue', better: 'found an issue', reason: 'Article.' }],
  fluency: [{ finding: 'Good flow.' }], fillers: [], naturalEnglish: [{ original: 'some issue in the data', better: 'a data issue' }],
  communicationStructure: [], pronunciation: [{ word: 'architecture', reason: 'stress' }, { word: 'a', reason: '' }],
  overallFeedback: 'ok', conversationReply: 'Nice!', nextSpeakingSuggestion: 'Slow down.',
}
const json = JSON.stringify(valid)

describe('parseAnalysisResponse', () => {
  it('parses normal valid JSON and filters invalid pronunciation words', () => {
    const a = parseAnalysisResponse(json, transcript)!
    expect(a.grammar).toHaveLength(1)
    expect(a.pronunciation.map((p) => p.word)).toEqual(['architecture'])
    expect(a.conversationReply).toBe('Nice!')
  })
  it('handles ```json fences', () => {
    expect(parseAnalysisResponse('```json\n' + json + '\n```', transcript)?.conversationReply).toBe('Nice!')
  })
  it('handles text before and after', () => {
    expect(parseAnalysisResponse(`Here is the analysis:\n${json}\nHope this helps!`, transcript)?.conversationReply).toBe('Nice!')
  })
  it('handles the reported trailing-comma error', () => {
    const bad = '{"grammar": [], "vocabulary": [{"original": "some issue", "better": "an issue", "reason": "possible"}, ], "fluency": [{"finding": "ok"},], "conversationReply": "Hi",}'
    const a = parseAnalysisResponse(bad, transcript)!
    expect(a.vocabulary).toHaveLength(1)
    expect(a.fluency[0].finding).toBe('ok')
  })
  it('does not touch commas or brackets inside strings', () => {
    const t = 'a, ] b'
    expect(JSON.parse(repairJson(`{"x": "a, ] b", }`)!).x).toBe(t)
  })
  it('repairs truncated output', () => {
    const a = parseAnalysisResponse('{"grammar": [], "conversationReply": "Great job', transcript)
    expect(a?.conversationReply).toBe('Great job')
  })
  it('uses empty defaults for missing sections', () => {
    const a = parseAnalysisResponse('{"conversationReply": "Hi"}', transcript)!
    expect(a.grammar).toEqual([])
    expect(a.pronunciation).toEqual([])
  })
  it('drops invented mistakes and returns null for invalid output', () => {
    const invented = JSON.stringify({ grammar: [{ original: 'she dont like', correction: "she doesn't like", explanation: 'x' }], conversationReply: 'Hi' })
    expect(parseAnalysisResponse(invented, transcript)!.grammar).toEqual([])
    expect(parseAnalysisResponse('not json at all', transcript)).toBeNull()
    expect(parseAnalysisResponse('[1,2]', transcript)).toBeNull()
    expect(parseAnalysisResponse('{}', transcript)).toBeNull()
  })
})

describe('runAnalysis retry', () => {
  it('retries once with the repair instruction after invalid output', async () => {
    const calls: string[][] = []
    const outputs = ['garbage', json]
    const a = await runAnalysis(async (m) => { calls.push(m.map((x) => x.content)); return outputs.shift()! }, 'sys', transcript, [])
    expect(a?.conversationReply).toBe('Nice!')
    expect(calls).toHaveLength(2)
    expect(calls[1].at(-1)).toContain('ONLY the required JSON schema')
  })
  it('gives up after one retry (max 2 calls) and returns null', async () => {
    let n = 0
    expect(await runAnalysis(async () => { n++; return 'nope' }, 'sys', transcript, [])).toBeNull()
    expect(n).toBe(2)
  })
})

describe('transcript editing', () => {
  const raw = 'I worked on a data bricks pipeline'
  it('deletes, edits, adds and restores without changing raw', () => {
    const deleted = deleteWord(raw, 5)
    expect(deleted).toBe('I worked on a data pipeline')
    expect(replaceWord(raw, 5, 'Databricks')).toBe('I worked on a data Databricks pipeline')
    expect(replaceWord('I worked on a data bricks pipeline', 4, 'Databricks').split(' ')).toContain('Databricks')
    expect(splitWords(`${deleted} today`).at(-1)).toBe('today')
    expect(isEdited(raw, deleted)).toBe(true)
    expect(isEdited(raw, raw)).toBe(false)
    expect(raw).toBe('I worked on a data bricks pipeline')
  })
})

describe('countFillers', () => {
  it('counts approximate fillers', () => {
    const c = countFillers('Um so basically we, you know, like, um, did it')
    const get = (w: string) => c.find((f) => f.word === w)?.count
    expect(get('um')).toBe(2)
    expect(get('you know')).toBe(1)
    expect(get('basically')).toBe(1)
  })
})

import { diffHunks } from './grammar'

describe('diffHunks', () => {
  it('finds a tense fix with context and ignores case/punctuation-only changes', () => {
    const h = diffHunks('Yesterday I go to the office and we found some issue', 'Yesterday, I went to the office and we found some issue.')
    expect(h).toEqual([{ original: 'Yesterday I go to the', correction: 'Yesterday I went to the' }])
  })
  it('returns nothing for identical text and skips big rewrites', () => {
    expect(diffHunks('I am fine', 'i am fine.')).toEqual([])
    expect(diffHunks('a b c d e f g h i j k', 'x y z w q r s t u v k')).toEqual([])
  })
  it('finds a missing article', () => {
    expect(diffHunks('we found data issue today', 'we found a data issue today')[0].correction).toContain('a data')
  })
})
