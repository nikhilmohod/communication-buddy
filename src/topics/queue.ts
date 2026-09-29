import type { Difficulty, Skill, Topic, TopicQueue, Weaknesses } from '../types'
import { LOCAL_TOPICS } from './localTopics'

export const TARGET_ACTIVE = 10
export const REFRESH_AT = 3
const MAX_COMPLETED = 100
const MAX_RECENT = 20

export const emptyQueue = (): TopicQueue => ({ active: [], currentId: null, completedIds: [], recentIds: [] })

const bound = (ids: string[], max: number) => ids.slice(-max)

/** Topics that may be added: not active, completed or recently used. */
export function filterFresh(candidates: Topic[], q: TopicQueue): Topic[] {
  const blocked = new Set([...q.active.map((t) => t.id), ...q.completedIds, ...q.recentIds])
  const seen = new Set<string>()
  return candidates.filter((t) => {
    if (blocked.has(t.id) || seen.has(t.id)) return false
    seen.add(t.id)
    return true
  })
}

/** Add topics up to TARGET_ACTIVE. If nothing fresh exists, recycle the oldest completed local topics. */
export function topUp(q: TopicQueue, sources: Topic[][]): TopicQueue {
  let active = [...q.active]
  let completedIds = q.completedIds
  const add = (pool: Topic[]) => {
    for (const t of filterFresh(pool, { ...q, active, completedIds })) {
      if (active.length >= TARGET_ACTIVE) break
      active.push(t)
    }
  }
  for (const s of sources) add(s)
  if (active.length === 0) {
    // Everything has been used: allow completed topics again so the user never has zero topics.
    completedIds = []
    add(LOCAL_TOPICS)
  }
  return { ...q, active, completedIds }
}

export const needsRefresh = (q: TopicQueue) => q.active.length <= REFRESH_AT

const SKILL_TO_WEAKNESS: Record<Skill, (keyof Omit<Weaknesses, 'sessions'>)[]> = {
  grammar: ['grammar'],
  tenses: ['grammar'],
  vocabulary: ['vocabulary'],
  fluency: ['fluency'],
  structure: ['structure', 'filler'],
  professional: ['structure'],
}

/** Weight = 1 + weakness rate of the topic's skills; soft preference for chosen difficulty. */
export function topicWeight(t: Topic, w: Weaknesses, difficulty: Difficulty | 'any'): number {
  const sessions = Math.max(w.sessions, 1)
  let weight = 1
  for (const skill of t.skills) {
    for (const key of SKILL_TO_WEAKNESS[skill]) weight += (w[key] as number) / sessions
  }
  if (difficulty !== 'any' && t.difficulty !== difficulty) weight *= 0.3
  return weight
}

export function pickTopic(active: Topic[], w: Weaknesses, difficulty: Difficulty | 'any', rand = Math.random): Topic | null {
  if (active.length === 0) return null
  const weights = active.map((t) => topicWeight(t, w, difficulty))
  let r = rand() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < active.length; i++) {
    r -= weights[i]
    if (r <= 0) return active[i]
  }
  return active[active.length - 1]
}

/** Remove the finished topic from the active list and record it in bounded history. */
export function completeTopic(q: TopicQueue, id: string): TopicQueue {
  return {
    active: q.active.filter((t) => t.id !== id),
    currentId: null,
    completedIds: bound([...q.completedIds.filter((x) => x !== id), id], MAX_COMPLETED),
    recentIds: bound([...q.recentIds.filter((x) => x !== id), id], MAX_RECENT),
  }
}
