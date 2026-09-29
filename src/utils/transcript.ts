/** Pure helpers for the transcript editor. rawTranscript is never modified; only the edited copy changes. */
export const splitWords = (text: string) => text.trim().split(/\s+/).filter(Boolean)
export const deleteWord = (text: string, index: number) => splitWords(text).filter((_, i) => i !== index).join(' ')
export const replaceWord = (text: string, index: number, word: string) =>
  splitWords(text).flatMap((w, i) => (i === index ? splitWords(word) : [w])).join(' ')
export const isEdited = (raw: string, edited: string) => splitWords(raw).join(' ') !== splitWords(edited).join(' ')
