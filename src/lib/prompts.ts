import { DialogueMessage, StudentProfile } from "./types";

/**
 * Builds the lightweight chat companion prompt.
 * 
 * Clinical Guardrails:
 * - Emphasizes that the companion is NOT a clinic/diagnostic tool.
 * - Instructs the model to never use psychological jargon (e.g. Catastrophizing, All-or-nothing).
 * - Tells the model to suggest coping strategies naturally and contextually.
 * 
 * @param text The current message text from the user.
 * @param history Recent conversation context (last 5-8 messages).
 * @param profile Student profile containing exam facts and past trigger context.
 * @returns Formatted prompt string for Gemini API.
 */
export function getLightweightReplyPrompt(
  text: string,
  history: DialogueMessage[],
  profile: StudentProfile
): string {
  const historyContext = history.length > 0
    ? "Previous exchanges in this sitting:\n" + history.map(h => `${h.role === "user" ? "Student" : "Companion"}: ${h.content}`).join("\n")
    : "No previous messages in this sitting.";

  const profileContext = `Student Context:
- Target Milestone/Exam: ${profile.examType}
- Recurring Triggers: ${profile.triggers.join(", ") || "None recorded yet"}
- Recent Mood: ${profile.moodTrend}`;

  return `You are a supportive, warm AI companion for a student preparing for high-stakes exams (JEE, NEET, UPSC, CAT). 
You are holding an ongoing conversation. Reply in 1 to 2 conversational, empathetic sentences. 

${profileContext}

${historyContext}
Student: "${text}"

RULES:
- Speak directly as a caring companion. Do not use clinical, academic, or robotic diagnostic terms.
- CLINICAL GUARDRAIL: Never say "Cognitive distortion detected" or "You are experiencing catastrophizing". Name the jump or logic patterns gently, like: "You went from a low score to failing the whole year pretty fast — notice that jump?"
- Keep the tone conversational.
- If appropriate based on their stress/mood, suggest a 1-3 minute micro-action as a gentle invitation (e.g., "Want to trace your breath with me for 2 minutes?"), or keep it null if they are just replying normally. Make sure suggested micro-actions are tailored: box breathing for anxiety, short walks/water breaks for fatigue/stuck moods, or writing lists for backlogs.

Return a JSON object matching this schema exactly. Do not wrap in markdown code blocks:
{
  "companionReply": "Your warm conversational reply",
  "suggestedMicroAction": {
    "label": "Gentle invitation label",
    "durationMinutes": 2
  } or null
}`;
}

/**
 * Builds the deep session analysis prompt.
 * 
 * @param history Complete list of messages in the sitting.
 * @param profile Current state of the student profile.
 * @returns Formatted prompt string for Gemini API.
 */
export function analyzeDialogueSessionPrompt(
  history: DialogueMessage[],
  profile: StudentProfile
): string {
  const dialogueContent = history.map(h => `${h.role === "user" ? "Student" : "Companion"}: ${h.content}`).join("\n");

  return `You are a cognitive behavioral wellness analyst. Read the following dialogue transcript from a student's study sitting.
Analyze the session to extract their stress levels, dominant mood trend, triggered patterns, discussed topics, and their target exam.

Dialogue Transcript:
${dialogueContent}

Current Profile state:
${JSON.stringify(profile)}

RULES:
1. Identify if they target a specific exam (JEE, NEET, UPSC, CAT, Boards, General). If already known in profile, retain or refine it.
2. CLINICAL GUARDRAIL: Detect logical jumps or negative thought patterns (e.g. catastrophizing, parent pressure, comparisons) without labeling them clinically. Write a gentle patternReflection (1-2 sentences) about how these loop patterns impact preparation.
3. Identify moodSignal (e.g., Anxious, Fatigued, Confident, Stuck) and a stressLevel average (1-10) for this sitting.
4. Extract specific triggers and last discussed study topics.

Return a JSON object matching this schema exactly. Do not wrap in markdown:
{
  "detectedPattern": "Name of pattern/jump detected (e.g., 'Mock score catastrophizing'), or null",
  "patternReflection": "Gentle, warm explanation of the thought loop, or null",
  "moodSignal": "Single word mood tracking label",
  "stressLevel": number between 1 and 10,
  "triggers": ["list of triggers found, merged and deduplicated with current triggers"],
  "lastTopics": ["list of last 2-3 specific topics discussed"],
  "examType": "JEE, NEET, UPSC, CAT, Boards, General, or keep existing"
}`;
}
