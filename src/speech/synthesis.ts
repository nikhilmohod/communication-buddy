import { useEffect } from 'react'

export const synthesisSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

/** Plays a single word for pronunciation practice using the browser's built-in voice. */
export function speakWord(word: string) {
  if (!synthesisSupported()) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(word)
  u.lang = 'en-US'
  u.rate = 0.85
  window.speechSynthesis.speak(u)
}

export function useStopSpeechOnUnmount() {
  useEffect(() => () => { if (synthesisSupported()) window.speechSynthesis.cancel() }, [])
}
