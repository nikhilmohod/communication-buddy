import type { Category, Difficulty, Skill, Topic } from '../types'

const CATEGORIES: Category[] = ['Everyday', 'Workplace', 'Professional', 'Technical', 'Interview', 'Advanced']
const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced']
const SKILLS: Skill[] = ['grammar', 'tenses', 'vocabulary', 'fluency', 'structure', 'professional']

// Static JSON hosted in this repository. Override with VITE_TOPICS_URL at build time.
export const TOPICS_URL: string =
  import.meta.env.VITE_TOPICS_URL ??
  'https://raw.githubusercontent.com/nikhilmohod/communication-buddy/main/public/topics.json'

const str = (v: unknown) => typeof v === 'string' && v.trim().length > 0

/** Keeps only well-formed topics; ignores anything else in the remote file. */
export function validateTopics(data: unknown): Topic[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((t): Topic[] => {
    if (!t || typeof t !== 'object') return []
    const o = t as Record<string, unknown>
    if (!str(o.id) || !str(o.title) || !str(o.prompt) || !str(o.speaking_goal) || !str(o.recommended_duration)) return []
    if (!CATEGORIES.includes(o.category as Category) || !DIFFICULTIES.includes(o.difficulty as Difficulty)) return []
    const skills = Array.isArray(o.skills) ? (o.skills.filter((s) => SKILLS.includes(s as Skill)) as Skill[]) : []
    return [{
      id: `r:${o.id}`,
      title: o.title as string,
      category: o.category as Category,
      difficulty: o.difficulty as Difficulty,
      prompt: o.prompt as string,
      speaking_goal: o.speaking_goal as string,
      recommended_duration: o.recommended_duration as string,
      skills,
    }]
  })
}

/** Returns [] on any failure so callers fall back to the local library. */
export async function fetchRemoteTopics(url = TOPICS_URL, timeoutMs = 6000): Promise<Topic[]> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-cache' })
    if (!res.ok) return []
    return validateTopics(await res.json())
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}
