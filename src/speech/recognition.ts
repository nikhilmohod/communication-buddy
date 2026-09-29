import { useCallback, useEffect, useRef, useState } from 'react'

export type ListenState = 'idle' | 'listening'

export const speechRecognitionSupported = () =>
  typeof window !== 'undefined' && !!(window.SpeechRecognition ?? window.webkitSpeechRecognition)

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone permission was denied. Allow microphone access in your browser settings and try again.',
  'service-not-allowed': 'Microphone permission was denied. Allow microphone access in your browser settings and try again.',
  'audio-capture': 'No microphone was found.',
  network: 'Speech recognition needs an internet connection in this browser.',
}

/**
 * Captures a full (possibly multi-minute) transcript. Browsers end recognition after silence,
 * so it restarts until the user stops. onFinal fires once with the complete transcript.
 */
export function useSpeechRecognition(onFinal: (transcript: string) => void) {
  const [state, setState] = useState<ListenState>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const finalRef = useRef('')
  const wantRef = useRef(false)
  const onFinalRef = useRef(onFinal)
  onFinalRef.current = onFinal

  const finish = useCallback(() => {
    setState('idle')
    const text = finalRef.current.trim()
    if (text) onFinalRef.current(text)
    else setError('I did not catch anything. Check your microphone and try again.')
  }, [])

  const start = useCallback(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Ctor) {
      setError('Speech recognition is not supported in this browser. Try Chrome or Edge.')
      return
    }
    if (wantRef.current) return
    finalRef.current = ''
    setTranscript('')
    setError(null)
    wantRef.current = true
    setState('listening')

    const begin = () => {
      const rec = new Ctor()
      rec.lang = 'en-US'
      rec.continuous = true
      rec.interimResults = true
      rec.onresult = (e) => {
        let interim = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i]
          if (r.isFinal) finalRef.current += r[0].transcript + ' '
          else interim += r[0].transcript
        }
        setTranscript((finalRef.current + interim).trim())
      }
      rec.onerror = (e) => {
        if (e.error === 'no-speech' || e.error === 'aborted') return
        setError(ERRORS[e.error] ?? 'Speech recognition stopped unexpectedly. Please try again.')
        if (ERRORS[e.error]) wantRef.current = false
      }
      rec.onend = () => {
        if (wantRef.current) {
          try { begin() } catch { wantRef.current = false; finish() }
        } else finish()
      }
      recRef.current = rec
      rec.start()
    }
    try { begin() } catch {
      wantRef.current = false
      setState('idle')
      setError('Could not start the microphone. Please try again.')
    }
  }, [finish])

  const stop = useCallback(() => {
    if (!wantRef.current) return
    wantRef.current = false
    recRef.current?.stop()
  }, [])

  useEffect(() => () => {
    wantRef.current = false
    if (recRef.current) {
      recRef.current.onend = null
      recRef.current.abort()
    }
  }, [])

  return { state, transcript, error, setError, start, stop }
}
