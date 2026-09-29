import type { Mode } from '../types'
import type { Turn } from '../hooks/useCoach'

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
    <h3 className="text-sm font-semibold text-indigo-300">{title}</h3>
    <div className="mt-2 space-y-2 text-sm text-slate-300">{children}</div>
  </div>
)

interface Props { turn: Turn; mode: Mode; onPlayWord: (w: string) => void; canSpeak: boolean }

export function Findings({ turn, mode, onPlayWord, canSpeak }: Props) {
  const { analysis: a, fillers, words } = turn
  const coach = mode === 'coach'
  const fillerTotal = fillers.reduce((n, f) => n + f.count, 0)

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card title="Grammar">
        {a.grammar.length === 0 ? <p>No major correction needed.</p> : a.grammar.map((g, i) => (
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
              <p>{v.original} → <span className="text-emerald-300">{v.better}</span></p>
              <p className="text-slate-400">{v.explanation}</p>
            </div>
          ))}
        </Card>
      )}

      {a.natural && (
        <Card title="Natural English">
          <p>{a.natural.original} → <span className="text-emerald-300">{a.natural.better}</span></p>
        </Card>
      )}

      {coach && (
        <>
          <Card title="Fluency"><p>{a.fluency.feedback}</p></Card>
          <Card title="Filler words (from transcript)">
            {fillers.length === 0 ? <p>No common filler words found.</p> : (
              <p>{fillers.map((f) => `${f.word} ×${f.count}`).join(', ')} <span className="text-slate-500">({fillerTotal} in {words} words)</span></p>
            )}
            <p className="text-xs text-slate-500">Approximate: speech recognition may omit "um/uh", and words like "like" or "so" are not always fillers.</p>
          </Card>
          {a.structure && (
            <Card title="Communication structure">
              <p>{a.structure.complete ? 'Well structured. ' : ''}{a.structure.feedback}</p>
            </Card>
          )}
          {a.pronunciationWords.length > 0 && (
            <Card title="Pronunciation practice">
              <ul className="space-y-1">
                {a.pronunciationWords.map((w) => (
                  <li key={w} className="flex items-center justify-between">
                    <span>{w}</span>
                    <button disabled={!canSpeak} onClick={() => onPlayWord(w)} className="rounded-md border border-slate-600 px-3 py-1 text-xs hover:bg-slate-800 disabled:opacity-40">Play</button>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-500">Listen and repeat. This is practice, not pronunciation scoring.</p>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
