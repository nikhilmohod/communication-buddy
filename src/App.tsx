import { useState } from 'react'
import { Findings } from './components/Findings'
import { TranscriptEditor } from './components/TranscriptEditor'
import { useStopSpeechOnUnmount } from './speech/synthesis'
import { ModelGate } from './components/ModelGate'
import { Settings } from './components/Settings'
import { SpeakButton } from './components/SpeakButton'
import { TopicCard } from './components/TopicCard'
import { useCoach } from './hooks/useCoach'
import { speechRecognitionSupported, useSpeechRecognition } from './speech/recognition'
import { storageAvailable } from './storage/storage'

export default function App() {
  const coach = useCoach()
  const { prefs, model, turn, analyzing, intro } = coach
  const [showSettings, setShowSettings] = useState(false)
  // Recognition produces a raw transcript; the user reviews/edits it before it is analysed.
  const [draft, setDraft] = useState<{ raw: string; edited: string } | null>(null)
  const rec = useSpeechRecognition((text) => setDraft({ raw: text, edited: text }))
  useStopSpeechOnUnmount()

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

      {!ready ? (
        <ModelGate status={model.status} pct={model.pct} text={model.text} error={model.error} onLoad={coach.loadModel} />
      ) : (
        <>
          {!intro && <TopicCard topic={coach.topic} refreshing={coach.refreshing} remaining={coach.queue.active.length} />}

          {coach.coachText && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-semibold tracking-widest text-slate-500">COACH</p>
              <p className="mt-2 text-lg leading-relaxed">{coach.coachText}</p>
            </section>
          )}

          <SpeakButton
            listening={rec.state === 'listening'}
            disabled={analyzing || !speechRecognitionSupported()}
            status={status}
            onStart={() => { coach.setError(null); setDraft(null); rec.start() }}
            onStop={rec.stop}
          />

          {err && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{err}</p>}

          {rec.state === 'listening' && rec.transcript && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-semibold tracking-widest text-slate-500">LISTENING…</p>
              <p className="mt-2 whitespace-pre-wrap text-slate-200">{rec.transcript}</p>
            </section>
          )}

          {draft && rec.state !== 'listening' && !analyzing && (
            <TranscriptEditor
              raw={draft.raw}
              edited={draft.edited}
              disabled={analyzing}
              onChange={(edited) => setDraft({ ...draft, edited })}
              onClear={() => setDraft(null)}
              onAnalyze={() => { const d = draft; void coach.submitSpeech(d.edited, d.raw).then((ok) => { if (ok) setDraft(null) }) }}
            />
          )}

          {turn && !analyzing && !draft && (
            <>
              <Findings turn={turn} mode={prefs.mode} />
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
        <Settings prefs={prefs} onChange={coach.setPrefs} onClear={coach.clearData} onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}
