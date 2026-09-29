# Communication Buddy — AI English Speaking Coach

A browser-based English speaking coach. You speak (30 seconds to 2 minutes), the app transcribes your **complete** answer, an AI model running **inside your browser** analyses it, and the coach replies out loud and gives you a new speaking challenge. It is not a chatbot: the loop is *speak → analyse → feedback → natural reply → speak again → new topic*.

The MVP is 100% client-side: no backend, database, accounts, API keys or paid AI services. It deploys as a static site.

## Features
- **Editable transcript**: after you speak, the recognised words appear as removable chips. Delete a wrong word, use **Edit Transcript** to fix, add or retype words, **Restore Original**, **Clear**, then **Analyze**. `rawTranscript` is never overwritten; analysis always uses `editedTranscript`.
- **Long speaking**: hold to speak (a quick tap latches listening on until you press Stop). Recognition restarts through pauses, so the full transcript is captured.
- **Analysis of the whole answer**: max 2 grammar/tense fixes (original → correction → reason), max 2 vocabulary improvements, fluency feedback, one natural-English tip, communication structure (Situation → Problem → Cause → Action → Result for work topics), and up to 3 pronunciation-practice words. Suggested mistakes must appear verbatim in your transcript, otherwise they are dropped (no invented errors).
- **Filler words**: transcript-based counts (um, uh, like, so, you know, …). Approximate: browsers often omit "um/uh", and "like"/"so" are not always fillers.
- **Pronunciation practice**: up to 3 uncommon or difficult words from your answer with a 🔊 Play button. This is practice, not pronunciation scoring: the browser only provides recognised text, so there are no pronunciation scores.
- **Text-only coach replies**: the coach's replies are shown as text. The browser's `speechSynthesis` is used only for the single-word 🔊 Play buttons in pronunciation practice.
- **Two modes**: *Conversation* (short feedback) and *Coach* (full breakdown).
- **Topic engine**: daily speaking challenge from six categories (Everyday, Workplace, Professional, Technical, Interview, Advanced), adapted to your recent weak areas.

## Architecture
```
Mic → SpeechRecognition → rawTranscript → review/edit (editedTranscript) → WebLLM (WebGPU, Phi-3-mini) → grammar pass + JSON analysis → tolerant parse + validate → UI
```
| Area | Location |
| --- | --- |
| Model loading / WebGPU detection | `src/ai/engine.ts` |
| Prompt, JSON parsing, validation | `src/ai/analysis.ts` |
| Speech input | `src/speech/recognition.ts` |
| Topic library, queue, refresh | `src/topics/` |
| LocalStorage | `src/storage/storage.ts` |
| App state | `src/hooks/useCoach.ts` |
| UI | `src/components/`, `src/App.tsx` |

**Stack:** React, Vite, TypeScript, Tailwind CSS v4, `@mlc-ai/web-llm`, Web Speech API (recognition only).

**Model:** `Phi-3-mini-4k-instruct-q4f16_1-MLC`, initialised once per page load. First use downloads roughly 2 GB, which the browser caches; later visits load from cache. It is started automatically only after a previous successful load.

## AI response and parsing
The model is asked for one JSON object: `grammar[{original,correction,explanation}]`, `vocabulary[{original,better,reason}]`, `fluency[{finding}]`, `fillers`, `naturalEnglish[{original,better}]`, `communicationStructure[{finding}]`, `pronunciation[{word,reason}]`, `overallFeedback`, `conversationReply`, `nextSpeakingSuggestion` (types in `src/types/index.ts`). Filler counts are computed locally from the transcript.

Local models often return imperfect JSON, so the client is defensive (`src/ai/json.ts`, `src/ai/analysis.ts`): strip code fences → extract the JSON object → string-aware removal of trailing commas → repair truncated output → `JSON.parse` → schema validation with safe empty defaults. If invalid, it retries **once** with a short repair instruction; if still invalid it shows a friendly fallback and keeps your transcript. Suggested mistakes must occur verbatim in your transcript, otherwise they are dropped ("No major grammar mistakes detected" is shown when nothing real is found). Grammar also gets a dedicated pass (`src/ai/grammar.ts`): the model rewrites the text with only grammar fixed and the app diffs the words. Empty transcripts never call the model, and very short ones (under 8 words) get an encouragement to speak longer.

## Topic queue and refresh
- About 10 active topics are stored in LocalStorage. Completing a topic ("Done — next challenge") removes it and records its stable ID in bounded history (100 completed, 20 recent).
- When **3 or fewer** topics remain, the app fetches `topics.json` (default: this repo's `public/topics.json` on GitHub raw; override with `VITE_TOPICS_URL` at build time), validates each entry, filters duplicates (active, completed, recent) and tops the queue back up to 10.
- If the fetch fails or returns nothing new, topics come from the built-in library (`src/topics/localTopics.ts`). If every topic has been used, the oldest completed ones are recycled, so the queue is never empty.
- Topic selection is a light weighted pick: topics whose skills match your recent weak areas (grammar, vocabulary, fluency, fillers, structure) are more likely.
- Topic JSON fields: `id, title, category, difficulty, prompt, speaking_goal, recommended_duration, skills`.

## LocalStorage
Stored under `cb.*` keys: active topic queue and history, preferences (mode, difficulty) and simple weakness counters. Transcripts are **not** stored. **Settings → Clear Learning Data** removes it all (the model cache is managed by the browser). If storage is blocked, the app still works but does not save progress.

## Browser requirements and limitations
- **WebGPU** is required for the AI model: recent desktop Chrome or Edge is recommended. Unsupported browsers see a clear message.
- **SpeechRecognition** is available in Chrome/Edge (and Safari, partly); Firefox does not support it. In Chrome it uses an online speech service, so it needs an internet connection.
- The small local model is less accurate than large cloud models; feedback is filtered but can still be imperfect.
- Microphone access requires HTTPS (or localhost).

## Development
```bash
npm install
npm run dev      # local dev server
npm test         # unit tests (topic queue, analysis validation, fillers)
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build
```

## Deployment (static)
**Vercel:** import the repo; framework preset *Vite*; build command `npm run build`; output directory `dist`.
**Cloudflare Pages:** build command `npm run build`; output directory `dist`.
No environment variables are required (optional: `VITE_TOPICS_URL`).

## Known limitations / future ideas
- Only the topic queue and counters persist; there is no session history.
- Filler detection is transcript-based; no acoustic analysis.
- No phoneme-level pronunciation scoring.
- Future: alternative/smaller models for low-end GPUs, session history, more topic packs.
