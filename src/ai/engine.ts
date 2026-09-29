import type { MLCEngine } from '@mlc-ai/web-llm'

export const MODEL_ID = 'Phi-3-mini-4k-instruct-q4f16_1-MLC'

export type Progress = (pct: number, text: string) => void

export async function detectWebGPU(): Promise<{ ok: boolean; reason?: string }> {
  if (!navigator.gpu) {
    return { ok: false, reason: 'WebGPU is not available in this browser. Use a recent desktop Chrome or Edge (or another WebGPU-enabled browser).' }
  }
  try {
    const adapter = await navigator.gpu.requestAdapter()
    return adapter ? { ok: true } : { ok: false, reason: 'No compatible GPU was found for WebGPU.' }
  } catch {
    return { ok: false, reason: 'WebGPU could not be initialised on this device.' }
  }
}

// Single shared engine: the model is initialised (and downloaded) at most once per page load.
// Model files are cached by the browser, so later visits load from cache.
let enginePromise: Promise<MLCEngine> | null = null
let listener: Progress | null = null

export function loadEngine(onProgress: Progress): Promise<MLCEngine> {
  listener = onProgress
  if (!enginePromise) {
    enginePromise = import('@mlc-ai/web-llm')
      .then(({ CreateMLCEngine }) =>
        CreateMLCEngine(MODEL_ID, {
          initProgressCallback: (r) => listener?.(Math.round(r.progress * 100), r.text),
        }),
      )
      .catch((e) => {
        enginePromise = null // allow retry after a failure
        throw e
      })
  }
  return enginePromise
}
