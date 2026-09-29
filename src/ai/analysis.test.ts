import { describe, expect, it } from 'vitest'
import { parseAnalysis } from './analysis'
import { countFillers } from '../utils/fillers'

const transcript = 'yesterday I go to the office and we found some issue in the data'

describe('parseAnalysis', () => {
  it('keeps real mistakes and drops invented ones', () => {
    const raw = JSON.stringify({
      grammar: [
        { original: 'I go to the office', correction: 'I went to the office', explanation: 'Past tense.' },
        { original: 'she dont like', correction: "she doesn't like", explanation: 'Invented.' },
      ],
      vocabulary: [], fluency: { feedback: 'ok', needsWork: false },
      natural: { original: 'some issue in the data', better: 'a data issue' },
      structure: null, pronunciationWords: ['office', 'architecture', 'a'], reply: 'Nice!',
    })
    const a = parseAnalysis(`text ${raw} text`, transcript)
    expect(a.grammar).toHaveLength(1)
    expect(a.natural?.better).toBe('a data issue')
    expect(a.pronunciationWords).toEqual(['office', 'architecture'])
  })

  it('caps grammar items at 2 and rejects output without reply or JSON', () => {
    const many = Array.from({ length: 4 }, () => ({ original: 'we found', correction: 'we had found', explanation: 'x' }))
    expect(parseAnalysis(JSON.stringify({ grammar: many, reply: 'hi' }), transcript).grammar).toHaveLength(2)
    expect(() => parseAnalysis('nothing', transcript)).toThrow()
    expect(() => parseAnalysis('{"grammar":[]}', transcript)).toThrow()
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
