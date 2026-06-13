"use strict";
"use server";

import { z } from "zod";
import { 
  getLightweightReply, 
  analyzeDialogueSession 
} from "@/lib/gemini";
import { 
  DialogueMessage, 
  StudentProfile, 
  LightweightResponse, 
  SessionAnalysisResponse,
  DialogueThread
} from "@/lib/types";

// SECURITY: In-memory store for tracking IP/userId rate limits to prevent API abuse and cost spikes.
const rateLimitStore = new Map<string, number>();

/**
 * Sanitizes input text by removing HTML tags and script elements.
 * 
 * SECURITY: Prevents Cross-Site Scripting (XSS) attacks before sending to LLM.
 * 
 * @param input Raw user input string.
 * @returns Sanitized plain text string.
 */
function sanitizeInput(input: string): string {
  return input
    .replace(/<\/?[^>]+(>|$)/g, "") // Strip standard HTML tags
    .replace(/[<>]/g, ""); // Strip leftover angle brackets
}

/**
 * Validates message content criteria.
 * Enforces length boundary constraints and applies sanitization.
 */
const messageSchema = z.object({
  text: z.string()
    .min(1, { message: "No pressure to write much. Even one line is enough." })
    .max(5000, { message: "That's quite a lot of thoughts. Let's break it down into smaller steps." })
    .transform(sanitizeInput)
});

/**
 * Mock session validator.
 * 
 * SECURITY: Standard secure pattern. Assumes authentication token validates 
 * on the middleware or layout level and returns a trusted userId context.
 * 
 * @returns Verified user session context.
 */
async function getAuthSession(): Promise<{ userId: string }> {
  // Mock secure context retrieval (never read userId from client payload)
  return { userId: "session_user_98234" }; 
}

/**
 * Receives and processes a single user dialogue message.
 * Returns a conversational reply and optional micro-actions.
 * 
 * Side Effects:
 * - Makes external Gemini API network call via getLightweightReply.
 * 
 * @param text Raw dialogue text input from client.
 * @param history Recent conversation history thread.
 * @param profile Active student profile metrics.
 * @returns Lightweight response containing companionReply.
 */
export async function submitMessageAction(
  text: string,
  history: DialogueMessage[],
  profile: StudentProfile
): Promise<LightweightResponse> {
  try {
    // SECURITY: Validate user authentication session
    const session = await getAuthSession();
    if (!session.userId) {
      throw new Error("Unauthorized access attempt.");
    }

    // SECURITY: Enforce rate limits (max 1 request per 10 seconds)
    const now = Date.now();
    const lastRequest = rateLimitStore.get(session.userId) || 0;
    if (now - lastRequest < 10000) {
      return {
        companionReply: "I'm right here. Take a slow, deep breath. No need to rush our thoughts.",
        suggestedMicroAction: null
      };
    }
    rateLimitStore.set(session.userId, now);

    // Input validation & sanitization via Zod
    const validation = messageSchema.safeParse({ text });
    if (!validation.success) {
      return {
        companionReply: validation.error.issues[0]?.message || "No pressure to write much.",
        suggestedMicroAction: null
      };
    }

    const validatedText = validation.data.text;
    return await getLightweightReply(validatedText, history, profile);

  } catch (error) {
    console.error("submitMessageAction failed:", error);
    // SECURITY: Never return stack traces or database errors to client
    return {
      companionReply: "I'm right here. Want to tell me a bit more about what's going on?",
      suggestedMicroAction: null
    };
  }
}

/**
 * Compiles and analyzes the current dialogue sitting.
 * Updates target exams, triggers, and extracts pattern reflections.
 * 
 * Side Effects:
 * - Makes external Gemini API network call via analyzeDialogueSession.
 * 
 * @param history Dialogue message thread history.
 * @param profile Student profile context.
 * @returns Analytical results and updated profile context.
 */
export async function closeSessionAction(
  history: DialogueMessage[],
  profile: StudentProfile
): Promise<{ analysis: SessionAnalysisResponse; updatedProfile: StudentProfile }> {
  try {
    // SECURITY: Validate user authentication session
    const session = await getAuthSession();
    if (!session.userId) {
      throw new Error("Unauthorized access attempt.");
    }

    if (history.length === 0) {
      return {
        analysis: {
          detectedPattern: null,
          patternReflection: null,
          moodSignal: "Unknown",
          stressLevel: 5,
          triggers: profile.triggers,
          lastTopics: profile.lastTopics,
          examType: profile.examType
        },
        updatedProfile: profile
      };
    }

    // Clean historical inputs before processing
    const cleanHistory = history.map(msg => ({
      ...msg,
      content: sanitizeInput(msg.content)
    }));

    const analysis = await analyzeDialogueSession(cleanHistory, profile);

    const updatedProfile: StudentProfile = {
      examType: analysis.examType,
      moodTrend: analysis.moodSignal,
      triggers: Array.from(new Set([...profile.triggers, ...analysis.triggers])),
      lastTopics: Array.from(new Set([...profile.lastTopics, ...analysis.lastTopics]))
    };

    return {
      analysis,
      updatedProfile
    };

  } catch (error) {
    console.error("closeSessionAction failed:", error);
    // SECURITY: Catch errors gracefully and return fallback profile shapes
    return {
      analysis: {
        detectedPattern: null,
        patternReflection: null,
        moodSignal: profile.moodTrend || "Stuck",
        stressLevel: 5,
        triggers: profile.triggers,
        lastTopics: profile.lastTopics,
        examType: profile.examType
      },
      updatedProfile: profile
    };
  }
}

/**
 * Fetches the metadata list for all threads.
 * 
 * @param threads The full list of threads from client store.
 * @returns Array of thread metadata without messages.
 */
export async function getThreadListAction(
  threads: DialogueThread[]
): Promise<Omit<DialogueThread, "messages">[]> {
  return threads.map(t => ({
    id: t.id,
    createdAt: t.createdAt,
    title: t.title,
    moodSignal: t.moodSignal,
    stressLevel: t.stressLevel,
    closed: t.closed
  }));
}

/**
 * Fetches full message list for a specific thread ID.
 * 
 * @param threadId Target thread ID.
 * @param threads Full list of threads.
 * @returns Array of dialogue messages.
 */
export async function getThreadMessagesAction(
  threadId: string,
  threads: DialogueThread[]
): Promise<DialogueMessage[]> {
  const found = threads.find(t => t.id === threadId);
  return found ? found.messages : [];
}
