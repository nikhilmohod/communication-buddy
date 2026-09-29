import { useCallback, useEffect, useRef, useState } from 'react'
import type { Analysis, ChatMessage, FillerCount, Prefs, Topic, TopicQueue, Weaknesses } from '../types'
import { analyzeSpeech } from '../ai/analysis'
import { detectWebGPU, loadEngine } from '../ai/engine'
import * as store from '../storage/storage'
import { LOCAL_TOPICS } from '../topics/localTopics'
import { completeTopic, needsRefresh, pickTopic, topUp } from '../topics/queue'
import { fetchRemoteTopics } from '../topics/remote'
import { countFillers, wordCount } from '../utils/fillers'

export type ModelStatus = 'checking' | 'unsupported' | 'idle' | 'loading' | 'ready' | 'error'

export interface Turn { transcript: string; analysis: Analysis; fillers: FillerCount[]; words: number; intro: boolean }

const GREETING =
  "Hi! I'm your English Speaking Coach. Tell me a little about yourself — who you are, where you're from, what you do and what you enjoy. Take your time; there's no rush."

const ensureCurrent = (q: TopicQueue, w: Weaknesses, p: Prefs): TopicQueue => {
  if (q.currentId && q.active.some((t) => t.id === q.currentId)) return q
  return { ...q, currentId: pickTopic(q.active, w, p.difficulty)?.id ?? null }
}

export function useCoach() {
  const [prefs, setPrefsState] = useState<Prefs>(store.loadPrefs)
  const [weak, setWeak] = useState<Weaknesses>(store.loadWeaknesses)
  const [intro, setIntro] = useState(() => !store.isIntroDone())
  const [queue, setQueueState] = useState<TopicQueue>(() =>
    ensureCurrent(topUp(store.loadQueue(), [LOCAL_TOPICS]), store.loadWeaknesses(), store.loadPrefs()))
  const [model, setModel] = useState<{ status: ModelStatus; pct: number; text: string; error?: string }>({ status: 'checking', pct: 0, text: '' })
  const [coachText, setCoachText] = useState(intro ? GREETING : '')
  const [turn, setTurn] = useState<Turn | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const history = useRef<ChatMessage[]>([])
  const queueRef = useRef(queue)
  const busy = useRef(false)

  const setQueue = useCallback((q: TopicQueue) => { queueRef.current = q; setQueueState(q); store.saveQueue(q) }, [])
  const setPrefs = useCallback((p: Prefs) => { setPrefsState(p); store.savePrefs(p) }, [])
  const topic: Topic | null = queue.active.find((t) => t.id === queue.currentId) ?? null

  // Refill from the internet (falls back to the local library) once 3 or fewer topics remain.
  const refreshTopics = useCallback(async () => {
    setRefreshing(true)
    const remote = await fetchRemoteTopics()
    setRefreshing(false)
    const q = topUp(queueRef.current, [remote, LOCAL_TOPICS])
    setQueue(ensureCurrent(q, store.loadWeaknesses(), store.loadPrefs()))
  }, [setQueue])

  useEffect(() => {
    store.saveQueue(queueRef.current)
    if (needsRefresh(queueRef.current)) void refreshTopics()
  }, [refreshTopics])

  const loadModel = useCallback(async () => {
    setModel({ status: 'loading', pct: 0, text: 'Starting…' })
    try {
      await loadEngine((pct, text) => setModel({ status: 'loading', pct, text }))
      store.setModelLoaded()
      setModel({ status: 'ready', pct: 100, text: '' })
    } catch (e) {
      console.error(e)
      setModel({ status: 'error', pct: 0, text: '', error: 'The AI model could not be loaded. Check your connection and free disk space, then retry.' })
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void detectWebGPU().then((r) => {
      if (cancelled) return
      if (!r.ok) setModel({ status: 'unsupported', pct: 0, text: '', error: r.reason })
      else if (store.wasModelLoaded()) void loadModel()
      else setModel({ status: 'idle', pct: 0, text: '' })
    })
    return () => { cancelled = true }
  }, [loadModel])

  const submitSpeech = useCallback(async (transcript: string) => {
    if (busy.current) return
    busy.current = true
    setAnalyzing(true)
    setError(null)
    try {
      const analysis = await analyzeSpeech({ transcript, topic, mode: prefs.mode, history: history.current, intro })
      const fillers = countFillers(transcript)
      const words = wordCount(transcript)
      setTurn({ transcript, analysis, fillers, words, intro })
      setCoachText(analysis.reply)
      history.current = [...history.current, { role: 'user' as const, content: transcript }, { role: 'assistant' as const, content: analysis.reply }].slice(-6)
      if (intro) {
        store.setIntroDone()
        setIntro(false)
      } else {
        const fillerTotal = fillers.reduce((a, f) => a + f.count, 0)
        const next: Weaknesses = {
          sessions: weak.sessions + 1,
          grammar: weak.grammar + (analysis.grammar.length ? 1 : 0),
          vocabulary: weak.vocabulary + (analysis.vocabulary.length ? 1 : 0),
          fluency: weak.fluency + (analysis.fluency.needsWork ? 1 : 0),
          filler: weak.filler + (words > 0 && (fillerTotal / words) * 100 >= 4 ? 1 : 0),
          structure: weak.structure + (analysis.structure && !analysis.structure.complete ? 1 : 0),
        }
        setWeak(next)
        store.saveWeaknesses(next)
      }
    } catch (e) {
      console.error(e)
      setError('Sorry, I could not analyze that. Please try speaking again.')
    } finally {
      busy.current = false
      setAnalyzing(false)
    }
  }, [topic, prefs.mode, intro, weak])

  const nextChallenge = useCallback(() => {
    const cur = queueRef.current.currentId
    let q = cur ? completeTopic(queueRef.current, cur) : queueRef.current
    if (q.active.length === 0) q = topUp(q, [LOCAL_TOPICS])
    setQueue(ensureCurrent(q, weak, prefs))
    setTurn(null)
    history.current = []
    setCoachText('')
    if (needsRefresh(q)) void refreshTopics()
  }, [setQueue, refreshTopics, weak, prefs])

  const clearData = useCallback(() => {
    store.clearLearningData()
    const w = store.defaultWeaknesses()
    setWeak(w)
    setPrefsState(store.defaultPrefs)
    const q = ensureCurrent(topUp({ active: [], currentId: null, completedIds: [], recentIds: [] }, [LOCAL_TOPICS]), w, store.defaultPrefs)
    setQueue(q)
    setIntro(true)
    setCoachText(GREETING)
    setTurn(null)
    history.current = []
    void refreshTopics()
  }, [setQueue, refreshTopics])

  return { prefs, setPrefs, intro, queue, topic, model, loadModel, coachText, turn, analyzing, error, setError, refreshing, submitSpeech, nextChallenge, clearData, weak }
}
