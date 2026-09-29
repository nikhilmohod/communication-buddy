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
export interface VocabFix { original: string; better: string; reason: string }
export interface Finding { finding: string }
export interface NaturalFix { original: string; better: string }
export interface PronunciationWord { word: string; reason: string }

/** Strict analysis schema. Every section may be empty; the UI works with any subset. */
export interface Analysis {
  grammar: GrammarFix[]
  vocabulary: VocabFix[]
  fluency: Finding[]
  naturalEnglish: NaturalFix[]
  communicationStructure: Finding[]
  pronunciation: PronunciationWord[]
  overallFeedback: string
  conversationReply: string
  nextSpeakingSuggestion: string
}

export interface FillerCount { word: string; count: number }

export interface Prefs {
  mode: Mode
  difficulty: Difficulty | 'any'
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
