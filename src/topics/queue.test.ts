import { describe, expect, it } from 'vitest'
import { LOCAL_TOPICS } from './localTopics'
import { completeTopic, emptyQueue, filterFresh, needsRefresh, pickTopic, topUp, TARGET_ACTIVE } from './queue'
import { validateTopics } from './remote'
import { defaultWeaknesses } from '../storage/storage'

describe('topic queue', () => {
  it('local library has unique ids', () => {
    expect(new Set(LOCAL_TOPICS.map((t) => t.id)).size).toBe(LOCAL_TOPICS.length)
  })

  it('tops up to the target size', () => {
    expect(topUp(emptyQueue(), [LOCAL_TOPICS]).active).toHaveLength(TARGET_ACTIVE)
  })

  it('completing removes the topic and records history without immediate repeat', () => {
    const q = topUp(emptyQueue(), [LOCAL_TOPICS])
    const id = q.active[0].id
    const done = completeTopic(q, id)
    expect(done.active.find((t) => t.id === id)).toBeUndefined()
    expect(done.completedIds).toContain(id)
    expect(topUp(done, [LOCAL_TOPICS]).active.find((t) => t.id === id)).toBeUndefined()
  })

  it('signals refresh at 3 or fewer topics', () => {
    let q = topUp(emptyQueue(), [LOCAL_TOPICS])
    while (q.active.length > 4) q = completeTopic(q, q.active[0].id)
    expect(needsRefresh(q)).toBe(false)
    q = completeTopic(q, q.active[0].id)
    expect(q.active).toHaveLength(3)
    expect(needsRefresh(q)).toBe(true)
  })

  it('filters duplicates from active, completed and recent', () => {
    const q = { ...emptyQueue(), active: [LOCAL_TOPICS[0]], completedIds: [LOCAL_TOPICS[1].id], recentIds: [LOCAL_TOPICS[2].id] }
    const ids = filterFresh(LOCAL_TOPICS.slice(0, 5), q).map((t) => t.id)
    expect(ids).toEqual([LOCAL_TOPICS[3].id, LOCAL_TOPICS[4].id])
  })

  it('never leaves zero topics when the remote fails and all local topics are used', () => {
    const q = { ...emptyQueue(), completedIds: LOCAL_TOPICS.map((t) => t.id) }
    expect(topUp(q, [[], LOCAL_TOPICS]).active.length).toBeGreaterThan(0)
  })

  it('bounds history size', () => {
    let q = topUp(emptyQueue(), [LOCAL_TOPICS])
    for (let i = 0; i < 150; i++) {
      q = completeTopic(q, q.active[0].id)
      q = topUp(q, [LOCAL_TOPICS])
    }
    expect(q.completedIds.length).toBeLessThanOrEqual(100)
    expect(q.recentIds.length).toBeLessThanOrEqual(20)
  })

  it('weights topics toward weak skills', () => {
    const grammarTopic = LOCAL_TOPICS.find((t) => t.skills.includes('tenses'))!
    const vocabTopic = LOCAL_TOPICS.find((t) => t.skills.every((s) => s === 'vocabulary'))!
    const w = { ...defaultWeaknesses(), grammar: 10, sessions: 10 }
    let g = 0
    for (let i = 0; i < 200; i++) if (pickTopic([grammarTopic, vocabTopic], w, 'any', () => i / 200)?.id === grammarTopic.id) g++
    expect(g).toBeGreaterThan(100)
  })
})

describe('remote topic validation', () => {
  it('drops malformed entries and namespaces ids', () => {
    const good = { ...LOCAL_TOPICS[0], id: 'x1' }
    const out = validateTopics([good, { id: 'bad' }, null, 'nope'])
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('r:x1')
    expect(validateTopics({})).toEqual([])
  })
})
