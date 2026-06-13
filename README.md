# MindPulse — AI Student Mental Wellness Tracker

MindPulse is a Generative AI-powered digital wellness companion designed to support competitive exam aspirants (JEE, NEET, UPSC, CAT, GATE) facing stress, burnout, and self-doubt. By analyzing open-ended journaling and sitting chat history, it identifies cognitive loops, logs stress levels, and suggests coping tools.

---

## 🏛️ Project Architecture
MindPulse is built using **Next.js 16 (App Router)** and **React 19**, styled cleanly with Tailwind CSS. It leverages the **Gemini 2.5 Flash API** to drive its conversational companion.

### Component Isolation & Core Loop
- **Conversational Core Loop:** Located in `src/app/page.tsx`. Handles prompt selections, renders message blocks, and interacts with server actions.
- **Server Actions:** Located in `src/app/actions.ts`. Enforces security, session validation, Zod validation parameters, HTML sanitization, and 10s rate limits.
- **Prompts:** Extracted as pure functions inside `src/lib/prompts.ts` to allow testing prompt composition without live API tokens.
- **Client Widgets:** Reusable elements inside `src/components/` handle Onboarding Flow, Mood Checks, Micro Action Cards, and Reframe Activity.

---

## ⚙️ How the Solution Works
1. **First-Visit Onboarding:** Collects the student's name, target exam milestone, stress symptoms, and generates a personalized dost-voiced welcome.
2. **Coping Interventions:** Live typing alerts prompt users with box-breathing templates or quick breaks based on conversational stress signals.
3. **Mascot Pet:** Interactive mascots (🐱 Cat, 🦉 Owl, 🐼 Panda) on the sidebar prompt anchor actions ("Breathe with me", "Give a treat").
4. **Reframe Activity:** Automatically detects negative thoughts and prompts users to reframe cognitive loops step-by-step.
5. **Looking Back Reflections:** Extracts stress heatmaps (1-10 levels) and CBT pattern logs on closing sittings.

---

## 🔒 Security & Safe Practice Guards
- **XSS Protections:** Sanitizes all input using regex stripping HTML markup and tags inside server functions.
- **Zod Boundaries:** Validates input lengths (1-5000 range) to block buffer overflow attempts.
- **Rate-Limiting:** Restricts message generation to 1 query per 10 seconds per authenticated session.
- **Crisis Helplines:** Integrated multilingual crisis safety flags bypass companion widgets and link directly to helpline anchors.

---

## ♿ Accessibility (WCAG AA Compliance)
- **Contrast:** High-contrast color palette with 4.5:1 text-to-background visibility ratios.
- **Keyboard Navigation:** Logical sequential tab indexing for all message buttons.
- **Reduced Motion:** Checks media selectors and disables scaling updates when `prefers-reduced-motion` is active.

---

## 🧪 Testing Validation
Includes **Vitest** test files checking Zod parsers, JSON fallbacks, and prompt configurations. 

---

## 🚀 Run Instructions
```bash
# Install dependencies
npm install

# Run tests
npm run test

# Compile production build
npm run build

# Start the dev server
npm run dev
```
