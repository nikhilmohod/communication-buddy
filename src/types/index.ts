export type Difficulty = 'beginner' | 'intermediate' | 'advanced'
export type Category = 'Everyday' | 'Workplace' | 'Professional' | 'Technical' | 'Interview' | 'Advanced'
export type Skill = 'grammar' | 'tenses' | 'vocabulary' | 'fluency' | 'structure' | 'professional'
export type Mode = 'conversation' | 'coach'

export interface Topic {
  id: string
  title: string
  category: Category
  difficulty: Difficulty
  prompt: string
  speaking_goal: string
  recommended_duration: string
  skills: Skill[]
}

export interface GrammarFix { original: string; correction: string; explanation: string }
export interface VocabFix { original: string; better: string; explanation: string }

export interface Analysis {
  grammar: GrammarFix[]
  vocabulary: VocabFix[]
  fluency: { feedback: string; needsWork: boolean }
  natural: { original: string; better: string } | null
  structure: { feedback: string; complete: boolean } | null
  pronunciationWords: string[]
  reply: string
}

export interface FillerCount { word: string; count: number }

export interface Prefs {
  mode: Mode
  difficulty: Difficulty | 'any'
  voiceURI: string | null
  rate: number
}

export interface Weaknesses {
  grammar: number
  vocabulary: number
  fluency: number
  filler: number
  structure: number
  sessions: number
}

export interface TopicQueue {
  active: Topic[]
  currentId: string | null
  completedIds: string[]
  recentIds: string[]
}

export interface ChatMessage { role: 'user' | 'assistant'; content: string }
