import type { ModelStatus } from '../hooks/useCoach'

interface Props { status: ModelStatus; pct: number; text: string; error?: string; onLoad: () => void }

export function ModelGate({ status, pct, text, error, onLoad }: Props) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
      <h2 className="text-xl font-semibold">Set up your private AI coach</h2>
      <p className="mt-2 text-sm text-slate-400">
        The coach runs entirely in your browser using WebGPU. Nothing you say is sent to a server.
      </p>
      {status === 'checking' && <p className="mt-6 text-slate-400">Checking your browser…</p>}
      {status === 'unsupported' && <p role="alert" className="mt-6 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-300">{error}</p>}
      {status === 'idle' && (
        <>
          <button onClick={onLoad} className="mt-6 rounded-xl bg-indigo-500 px-6 py-3 font-semibold hover:bg-indigo-400">
            Download &amp; start coach
          </button>
          <p className="mt-3 text-xs text-slate-500">One-time download of about 2 GB. It is cached by your browser afterwards.</p>
        </>
      )}
      {status === 'loading' && (
        <div className="mt-6" aria-live="polite">
          <div className="h-3 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-sm font-medium">{pct}%</p>
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{text}</p>
        </div>
      )}
      {status === 'error' && (
        <>
          <p role="alert" className="mt-6 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>
          <button onClick={onLoad} className="mt-4 rounded-xl bg-indigo-500 px-6 py-3 font-semibold hover:bg-indigo-400">Retry</button>
        </>
      )}
    </div>
  )
}
