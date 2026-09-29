import { useCallback, useEffect, useState } from 'react'

export const synthesisSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export const RATES = [0.7, 0.8, 0.85, 0.9, 1.0]

/** Voices load asynchronously in some browsers, so listen for voiceschanged. */
export function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  useEffect(() => {
    if (!synthesisSupported()) return
    const load = () => setVoices(window.speechSynthesis.getVoices())
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
  return english.length ? english : voices
}

export function useSpeaker(voices: SpeechSynthesisVoice[], voiceURI: string | null, rate: number) {
  const [speaking, setSpeaking] = useState(false)

  const cancel = useCallback(() => {
    if (synthesisSupported()) window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  const speak = useCallback((text: string) => {
    if (!synthesisSupported() || !text.trim()) return
    window.speechSynthesis.cancel()
    const voice = voices.find((v) => v.voiceURI === voiceURI) ?? voices.find((v) => v.default) ?? voices[0]
    // Chrome may cut off long utterances, so speak sentence by sentence.
    const parts = text.match(/[^.!?]+[.!?]*/g)?.map((p) => p.trim()).filter(Boolean) ?? [text]
    parts.forEach((part, i) => {
      const u = new SpeechSynthesisUtterance(part)
      if (voice) { u.voice = voice; u.lang = voice.lang } else u.lang = 'en-US'
      u.rate = rate
      if (i === parts.length - 1) { u.onend = () => setSpeaking(false); u.onerror = () => setSpeaking(false) }
      window.speechSynthesis.speak(u)
    })
    setSpeaking(true)
  }, [voices, voiceURI, rate])

  useEffect(() => cancel, [cancel])
  return { speak, cancel, speaking }
}
