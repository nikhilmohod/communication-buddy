import type { Mode } from '../types'
import type { Turn } from '../hooks/useCoach'
import { speakWord, synthesisSupported } from '../speech/synthesis'
import { isEdited } from '../utils/transcript'

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
    <h3 className="text-sm font-semibold text-indigo-300">{title}</h3>
    <div className="mt-2 space-y-2 text-sm text-slate-300">{children}</div>
  </div>
)

export function Findings({ turn, mode }: { turn: Turn; mode: Mode }) {
  const { analysis: a, fillers, words } = turn
  const coach = mode === 'coach'
  const fillerTotal = fillers.reduce((n, f) => n + f.count, 0)
  const tip = a.communicationStructure[0]?.finding || a.nextSpeakingSuggestion

  return (
    <div className="space-y-3">
      <Card title="Your Speech">
        <p className="whitespace-pre-wrap text-slate-200">{turn.transcript}</p>
        {isEdited(turn.rawTranscript, turn.transcript) && <p className="text-xs text-amber-300">Analysed from your edited transcript.</p>}
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card title="Grammar">
          {a.grammar.length === 0 ? <p>No major grammar mistakes detected.</p> : a.grammar.map((g, i) => (
            <div key={i}>
              <p><span className="text-red-300 line-through">{g.original}</span> → <span className="text-emerald-300">{g.correction}</span></p>
              <p className="text-slate-400">{g.explanation}</p>
            </div>
          ))}
        </Card>

        {(coach || a.vocabulary.length > 0) && (
          <Card title="Vocabulary">
            {a.vocabulary.length === 0 ? <p>No vocabulary changes needed.</p> : a.vocabulary.map((v, i) => (
              <div key={i}>
                <p><span className="text-red-300 line-through">{v.original}</span> → <span className="text-emerald-300">{v.better}</span></p>
                <p className="text-slate-400">{v.reason}</p>
              </div>
            ))}
          </Card>
        )}

        {a.naturalEnglish.length > 0 && (
          <Card title="Natural English">
            {a.naturalEnglish.map((n, i) => <p key={i}>{n.original} → <span className="text-emerald-300">{n.better}</span></p>)}
          </Card>
        )}

        {coach && (
          <>
            <Card title="Fluency">
              {a.fluency.length === 0 ? <p>No fluency problems noticed.</p> : a.fluency.map((f, i) => <p key={i}>{f.finding}</p>)}
            </Card>
            <Card title="Filler Words (transcript-based)">
              {fillers.length === 0 ? <p>No common filler words found.</p> : (
                <ul>
                  {fillers.map((f) => <li key={f.word}>{f.word}: {f.count}</li>)}
                  <li className="mt-1 text-slate-500">{fillerTotal} in {words} words</li>
                </ul>
              )}
              <p className="text-xs text-slate-500">Approximate: speech recognition may omit "um/uh", and "like"/"so" are not always fillers.</p>
            </Card>
            {a.pronunciation.length > 0 && (
              <Card title="Pronunciation Practice">
                <ul className="space-y-2">
                  {a.pronunciation.map((p) => (
                    <li key={p.word} className="flex items-start justify-between gap-2">
                      <div><span className="font-medium text-slate-100">{p.word}</span>{p.reason && <p className="text-slate-400">{p.reason}</p>}</div>
                      {synthesisSupported() && <button onClick={() => speakWord(p.word)} className="shrink-0 rounded-md border border-slate-600 px-3 py-1 text-xs hover:bg-slate-800">🔊 Play</button>}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-slate-500">Practice only: the browser cannot score your pronunciation.</p>
              </Card>
            )}
            {tip && <Card title="Communication Tip"><p>{tip}</p></Card>}
          </>
        )}
      </div>
    </div>
  )
}
