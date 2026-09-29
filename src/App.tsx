import { useEffect, useState } from 'react'
import { Findings } from './components/Findings'
import { ModelGate } from './components/ModelGate'
import { Settings } from './components/Settings'
import { SpeakButton } from './components/SpeakButton'
import { TopicCard } from './components/TopicCard'
import { useCoach } from './hooks/useCoach'
import { speechRecognitionSupported, useSpeechRecognition } from './speech/recognition'
import { synthesisSupported, useSpeaker, useVoices } from './speech/synthesis'
import { storageAvailable } from './storage/storage'

export default function App() {
  const coach = useCoach()
  const { prefs, model, turn, analyzing, intro } = coach
  const [showSettings, setShowSettings] = useState(false)
  const voices = useVoices()
  const { speak, cancel, speaking } = useSpeaker(voices, prefs.voiceURI, prefs.rate)
  const rec = useSpeechRecognition(async (text) => {
    await coach.submitSpeech(text)
  })

  // Speak each new coach reply automatically; Replay is always available.
  useEffect(() => {
    if (turn) speak(turn.analysis.reply)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn])

  const ready = model.status === 'ready'
  const err = coach.error ?? rec.error
  const status = rec.state === 'listening' ? 'Listening…' : analyzing ? 'Analyzing your response…' : ''

  return (
    <div className="mx-auto min-h-screen max-w-4xl space-y-5 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Communication Buddy</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-700 text-sm" role="group" aria-label="Mode">
            {(['conversation', 'coach'] as const).map((m) => (
              <button key={m} onClick={() => coach.setPrefs({ ...prefs, mode: m })}
                className={`px-3 py-1.5 capitalize first:rounded-l-lg last:rounded-r-lg ${prefs.mode === m ? 'bg-indigo-500' : 'hover:bg-slate-800'}`}>{m}</button>
            ))}
          </div>
          <button onClick={() => setShowSettings(true)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800">Settings</button>
        </div>
      </header>

      {!storageAvailable && <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-300">Browser storage is unavailable, so progress will not be saved.</p>}
      {!speechRecognitionSupported() && <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-300">Speech recognition is not supported in this browser. Please use Chrome or Edge.</p>}
      {!synthesisSupported() && <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-300">Text-to-speech is not available, so you will only see the coach's replies as text.</p>}

      {!ready ? (
        <ModelGate status={model.status} pct={model.pct} text={model.text} error={model.error} onLoad={coach.loadModel} />
      ) : (
        <>
          {!intro && <TopicCard topic={coach.topic} refreshing={coach.refreshing} remaining={coach.queue.active.length} />}

          {coach.coachText && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-semibold tracking-widest text-slate-500">COACH</p>
              <p className="mt-2 text-lg leading-relaxed">{coach.coachText}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => speak(coach.coachText)} disabled={!synthesisSupported()} className="rounded-md border border-slate-600 px-3 py-1 text-sm hover:bg-slate-800 disabled:opacity-40">▶ Replay</button>
                {speaking && <button onClick={cancel} className="rounded-md border border-slate-600 px-3 py-1 text-sm hover:bg-slate-800">Stop voice</button>}
              </div>
            </section>
          )}

          <SpeakButton
            listening={rec.state === 'listening'}
            disabled={analyzing || !speechRecognitionSupported()}
            status={status}
            onStart={() => { cancel(); coach.setError(null); rec.start() }}
            onStop={rec.stop}
          />

          {err && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{err}</p>}

          {(rec.transcript || turn) && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-semibold tracking-widest text-slate-500">YOUR TRANSCRIPT</p>
              <p className="mt-2 whitespace-pre-wrap text-slate-200">{rec.state === 'listening' || !turn ? rec.transcript : turn.transcript}</p>
            </section>
          )}

          {turn && !analyzing && (
            <>
              <Findings turn={turn} mode={prefs.mode} canSpeak={synthesisSupported()} onPlayWord={speak} />
              <div className="flex justify-center">
                {turn.intro ? null : (
                  <button onClick={coach.nextChallenge} className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold hover:bg-emerald-400">
                    Done — next challenge
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}

      {showSettings && (
        <Settings prefs={prefs} voices={voices} onChange={coach.setPrefs} onClear={coach.clearData} onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}
