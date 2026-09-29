/**
 * Tolerant JSON extraction for local-model output.
 * Handles code fences, prose before/after, trailing commas, and truncated output.
 * The scanner is string-aware, so commas or brackets inside string values are never touched.
 */
export function repairJson(raw: string): string | null {
  const text = raw.replace(/```(?:json)?/gi, '')
  const start = text.indexOf('{')
  if (start < 0) return null

  const out: string[] = []
  const stack: string[] = []
  let inString = false
  let escaped = false
  let closed = false

  for (let i = start; i < text.length && !closed; i++) {
    const c = text[i]
    if (inString) {
      out.push(c)
      if (escaped) escaped = false
      else if (c === '\\') escaped = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') { inString = true; out.push(c) }
    else if (c === '{') { stack.push('}'); out.push(c) }
    else if (c === '[') { stack.push(']'); out.push(c) }
    else if (c === '}' || c === ']') {
      dropTrailingComma(out)
      out.push(c)
      stack.pop()
      if (stack.length === 0) closed = true
    } else out.push(c)
  }

  if (!closed) {
    // Truncated output: close an open string, drop a dangling comma/colon, then close containers.
    if (inString) out.push('"')
    dropTrailingComma(out)
    while (out.length && /[:\s]/.test(out[out.length - 1])) {
      if (out[out.length - 1] === ':') { out.push('null'); break }
      out.pop()
    }
    while (stack.length) out.push(stack.pop()!)
  }
  return out.join('')
}

function dropTrailingComma(out: string[]) {
  let k = out.length - 1
  while (k >= 0 && /\s/.test(out[k])) k--
  if (k >= 0 && out[k] === ',') out.splice(k, 1)
}

export function parseJsonLoose(raw: string): unknown | null {
  for (const candidate of [raw, repairJson(raw)]) {
    if (!candidate) continue
    try { return JSON.parse(candidate) } catch { /* try the repaired form next */ }
  }
  return null
}
