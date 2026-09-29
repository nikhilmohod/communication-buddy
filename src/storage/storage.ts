import type { Prefs, TopicQueue, Weaknesses } from '../types'
import { emptyQueue } from '../topics/queue'

const KEYS = {
  prefs: 'cb.prefs',
  queue: 'cb.queue',
  weak: 'cb.weaknesses',
  intro: 'cb.introDone',
  model: 'cb.modelLoaded',
} as const

export const defaultPrefs: Prefs = { mode: 'conversation', difficulty: 'any', }
export const defaultWeaknesses = (): Weaknesses => ({ grammar: 0, vocabulary: 0, fluency: 0, filler: 0, structure: 0, sessions: 0 })

/** Set when LocalStorage throws (private mode, quota, blocked) so the UI can warn once. */
export let storageAvailable = true

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    storageAvailable = false
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    storageAvailable = false
  }
}

export const loadPrefs = () => read<Prefs>(KEYS.prefs, defaultPrefs)
export const savePrefs = (p: Prefs) => write(KEYS.prefs, p)
export const loadQueue = () => read<TopicQueue>(KEYS.queue, emptyQueue())
export const saveQueue = (q: TopicQueue) => write(KEYS.queue, q)
export const loadWeaknesses = () => read<Weaknesses>(KEYS.weak, defaultWeaknesses())
export const saveWeaknesses = (w: Weaknesses) => write(KEYS.weak, w)
export const isIntroDone = () => read<{ v: boolean }>(KEYS.intro, { v: false }).v
export const setIntroDone = () => write(KEYS.intro, { v: true })
export const wasModelLoaded = () => read<{ v: boolean }>(KEYS.model, { v: false }).v
export const setModelLoaded = () => write(KEYS.model, { v: true })

export function clearLearningData() {
  try {
    Object.values(KEYS).filter((k) => k !== KEYS.model).forEach((k) => localStorage.removeItem(k))
  } catch {
    storageAvailable = false
  }
}
