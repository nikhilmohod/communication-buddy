import type { Prefs } from '../types'

interface Props {
  prefs: Prefs
  onChange: (p: Prefs) => void
  onClear: () => void
  onClose: () => void
}

const field = 'mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm'

export function Settings({ prefs, onChange, onClear, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-10 flex justify-end bg-black/60" onClick={onClose}>
      <aside className="h-full w-full max-w-sm space-y-4 overflow-y-auto bg-slate-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close settings">✕</button>
        </div>
        <label className="block text-sm">Difficulty
          <select className={field} value={prefs.difficulty} onChange={(e) => onChange({ ...prefs, difficulty: e.target.value as Prefs['difficulty'] })}>
            <option value="any">Any</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <button
          onClick={() => { if (confirm('Clear all saved topics, progress and preferences on this device?')) onClear() }}
          className="w-full rounded-lg border border-red-500/50 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
        >
          Clear Learning Data
        </button>
        <p className="text-xs text-slate-500">Everything is stored only in this browser. The downloaded AI model stays cached.</p>
      </aside>
    </div>
  )
}
