import { useState } from 'react'
import { deleteWord, isEdited, splitWords } from '../utils/transcript'

interface Props {
  raw: string
  edited: string
  onChange: (text: string) => void
  onAnalyze: () => void
  onClear: () => void
  disabled: boolean
}

const btn = 'rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-800 disabled:opacity-40'

/** Review step: fix speech-recognition mistakes (delete/edit/add words) before analysis. */
export function TranscriptEditor({ raw, edited, onChange, onAnalyze, onClear, disabled }: Props) {
  const [editing, setEditing] = useState(false)
  const words = splitWords(edited)
  const changed = isEdited(raw, edited)

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-widest text-slate-500">CHECK YOUR TRANSCRIPT</p>
        {changed && <span className="text-xs text-amber-300">edited</span>}
      </div>
      <p className="mt-1 text-xs text-slate-500">Speech recognition can mishear words. Remove or fix them before analysis.</p>

      {editing ? (
        <textarea
          value={edited}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          aria-label="Edit transcript"
          className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-slate-100"
        />
      ) : (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Transcript words">
          {words.map((w, i) => (
            <li key={`${i}-${w}`} className="flex items-center gap-1 rounded-full bg-slate-800 py-1 pl-3 pr-1 text-sm">
              {w}
              <button onClick={() => onChange(deleteWord(edited, i))} aria-label={`Delete word ${w}`} className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-red-500/30 hover:text-white">✕</button>
            </li>
          ))}
        </ul>
      )}

      {changed && (
        <details className="mt-3 text-sm text-slate-400">
          <summary className="cursor-pointer">Original recognition</summary>
          <p className="mt-1">{raw}</p>
        </details>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => setEditing(!editing)} className={btn}>{editing ? 'Done editing' : 'Edit Transcript'}</button>
        <button onClick={() => onChange(raw)} disabled={!changed} className={btn}>Restore Original</button>
        <button onClick={onClear} className={btn}>Clear</button>
        <button onClick={onAnalyze} disabled={disabled || words.length === 0} className="ml-auto rounded-lg bg-emerald-500 px-5 py-1.5 text-sm font-semibold hover:bg-emerald-400 disabled:opacity-40">Analyze</button>
      </div>
    </section>
  )
}
