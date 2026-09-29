import { useRef } from 'react'

interface Props {
  listening: boolean
  disabled: boolean
  status: string
  onStart: () => void
  onStop: () => void
}

const TAP_MS = 350

/** Hold to speak, release to stop. A quick tap latches listening on until Stop is pressed. */
export function SpeakButton({ listening, disabled, status, onStart, onStop }: Props) {
  const downAt = useRef(0)
  const latched = useRef(false)
  const holding = useRef(false)

  const down = () => {
    if (disabled || listening) return
    holding.current = true
    latched.current = false
    downAt.current = Date.now()
    onStart()
  }
  const up = () => {
    if (!holding.current) return
    holding.current = false
    if (Date.now() - downAt.current < TAP_MS) latched.current = true
    else onStop()
  }
  const stop = () => { latched.current = false; onStop() }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        disabled={disabled}
        onPointerDown={down}
        onPointerUp={up}
        onPointerLeave={up}
        onPointerCancel={up}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: 'none' }}
        className={`select-none rounded-full px-10 py-5 text-lg font-bold shadow-lg transition ${
          listening ? 'scale-105 bg-red-500 shadow-red-500/40' : 'bg-indigo-500 hover:bg-indigo-400'
        } disabled:cursor-not-allowed disabled:opacity-40`}
      >
        {listening ? 'Listening… release to finish' : 'HOLD TO SPEAK'}
      </button>
      {listening && (
        <button onClick={stop} className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800">
          Stop
        </button>
      )}
      <p className="min-h-5 text-sm text-slate-400" aria-live="polite">{status}</p>
    </div>
  )
}
