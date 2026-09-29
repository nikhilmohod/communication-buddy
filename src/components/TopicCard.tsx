import type { Topic } from '../types'

const TIPS: Record<string, string> = {
  grammar: 'Slow down slightly and finish each sentence before starting the next.',
  tenses: 'Decide first: is this story in the past or present? Keep the tense consistent.',
  vocabulary: 'Use concrete, simple words. Clear beats fancy.',
  fluency: 'It is fine to pause. Take a breath instead of saying "um".',
  structure: 'Give a beginning, a middle and an end. Signpost with "first", "then", "as a result".',
  professional: 'Lead with the key point, then give the details.',
}

export function TopicCard({ topic, refreshing, remaining }: { topic: Topic | null; refreshing: boolean; remaining: number }) {
  if (!topic) return <div className="rounded-2xl bg-slate-900 p-6 text-slate-400">Loading your next challenge…</div>
  return (
    <section className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-slate-900 p-5 sm:p-6">
      <p className="text-xs font-semibold tracking-widest text-indigo-300">TODAY'S SPEAKING CHALLENGE</p>
      <h2 className="mt-2 text-xl font-semibold sm:text-2xl">{topic.title}</h2>
      <p className="mt-2 text-slate-300">{topic.prompt}</p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div><dt className="text-slate-500">Goal</dt><dd>{topic.speaking_goal}</dd></div>
        <div><dt className="text-slate-500">Suggested duration</dt><dd>{topic.recommended_duration}</dd></div>
        <div><dt className="text-slate-500">Tip</dt><dd>{TIPS[topic.skills[0]] ?? TIPS.fluency}</dd></div>
      </dl>
      <p className="mt-4 text-xs text-slate-500">
        {topic.category} · {topic.difficulty} · {remaining} topics in queue{refreshing ? ' · fetching new topics…' : ''}
      </p>
    </section>
  )
}
