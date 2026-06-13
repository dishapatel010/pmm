# MindPulse — Architecture & Problem Statement Alignment

This document outlines the architecture, data flow, and problem alignment for the MindPulse AI Companion.

## 🏛️ Architecture

MindPulse uses a mobile-first, distraction-free conversational design built on Next.js 16 (App Router) with Base UI components. It avoids dense SaaS dashboard grids in favor of an intimate, typography-led companion dialogue.

```
+----------------+      Message / Sitting Close      +----------------------+
|   page.tsx     | --------------------------------> |      actions.ts      |
|  (Client UI)   | <-------------------------------- |  (Server Actions)    |
+----------------+       Lightweight / Analysis      +----------------------+
                                                                |
                                                     Authenticate & Validate
                                                                |
                                                                v
+----------------+       Shaped structured JSON      +----------------------+
|  types.ts /    | <-------------------------------- |      gemini.ts       |
|  prompts.ts    |                                   |  (GenAI SDK Handler) |
+----------------+                                   +----------------------+
```

### Data Flow Sequence:
1. **Entry**: Student writes dialogue response inside [page.tsx](file:///home/ubuntu/pmwell/src/app/page.tsx).
2. **Server Action**: [actions.ts](file:///home/ubuntu/pmwell/src/app/actions.ts) executes `submitMessageAction` (or `closeSessionAction` on close), validating authentication session facts, checking in-memory 10-second rate limits, and sanitizing raw text against HTML/XSS.
3. **Gemini SDK**: Prompts are dynamically compiled as pure functions in [prompts.ts](file:///home/ubuntu/pmwell/src/lib/prompts.ts). The server-side Gemini service in [gemini.ts](file:///home/ubuntu/pmwell/src/lib/gemini.ts) triggers the `@google/genai` model.
4. **Response**: Pure transformation methods shape the responses safely, returning conversational replies instantly and deep CBT reflections / updated profiles on session close.

---

## 🎯 Problem Statement Alignment

| Requirement | Implementation File / Symbol | Description |
| :--- | :--- | :--- |
| **Open-ended journaling** | [page.tsx](file:///home/ubuntu/pmwell/src/app/page.tsx) | Integrated into the main interactive dialogue workspace. |
| **Mood logs analyzed** | [gemini.ts:SessionAnalysisResponse](file:///home/ubuntu/pmwell/src/lib/types.ts) | `moodSignal` and `stressLevel` averages are extracted during session closure. |
| **Hidden stress triggers** | [gemini.ts:analyzeDialogueSession](file:///home/ubuntu/pmwell/src/lib/gemini.ts) | Analyzes full transcripts to pinpoint triggers and study topics. |
| **Hyper-personalized** | [prompts.ts:getLightweightReplyPrompt](file:///home/ubuntu/pmwell/src/lib/prompts.ts) | Interpolates target exams, past topics, and triggers into prompt instructions. |
| **Tailored coping / adaptive mindfulness** | [prompts.ts:getLightweightReplyPrompt](file:///home/ubuntu/pmwell/src/lib/prompts.ts) | Dynamically tailors `suggestedMicroAction` based on current mood signals. |
| **Always-available companion** | [gemini.ts:getLightweightReply](file:///home/ubuntu/pmwell/src/lib/gemini.ts) | Integrates 8.5s request timeouts and fallback strings. |
