import { GoogleGenAI } from "@google/genai";
import { DialogueMessage, StudentProfile, LightweightResponse, SessionAnalysisResponse } from "./types";
import { getLightweightReplyPrompt, analyzeDialogueSessionPrompt } from "./prompts";

// SECURITY: Gemini API key is loaded strictly on the server-side via process.env.
// This file is executed solely on the server context to prevent API key exposure to the client.
const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

/**
 * Executes a network call to the Gemini 2.5 Flash model.
 * 
 * Side Effects:
 * - Makes an external HTTP network request to Google GenAI API.
 * 
 * @param prompt The constructed prompt string.
 * @param temperature Float controlling variance in reply generation.
 * @returns Raw text response from the API.
 */
export async function callGemini(
  prompt: string,
  temperature: number = 0.7
): Promise<string> {
  const geminiCall = ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: temperature,
    },
  });

  // 8.5 seconds absolute timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error("Timeout")), 8500)
  );

  const response = await Promise.race([geminiCall, timeoutPromise]) as any;
  return response.text || "";
}

/**
 * Shapes the raw JSON string from Gemini into a validated LightweightResponse.
 * This is a pure function, making it easily unit testable without network requests.
 * 
 * @param rawResult Raw JSON string response from Gemini.
 * @returns Structured and parsed LightweightResponse.
 */
export function buildCompanionResponse(
  rawResult: string
): LightweightResponse {
  try {
    const parsed = JSON.parse(rawResult);
    return {
      companionReply: parsed.companionReply || "I'm here for you.",
      suggestedMicroAction: parsed.suggestedMicroAction || null
    };
  } catch (error) {
    console.error("Failed to parse companion response JSON:", error);
    return {
      companionReply: "I hear you. Take a slow breath. Let's tackle things one step at a time.",
      suggestedMicroAction: null
    };
  }
}

/**
 * Shapes the raw JSON string from Gemini into a validated SessionAnalysisResponse.
 * This is a pure function, making it easily unit testable without network requests.
 * 
 * @param rawResult Raw JSON string response from Gemini.
 * @param currentProfile The user profile context to merge fallbacks.
 * @returns Structured and parsed SessionAnalysisResponse.
 */
export function buildSessionAnalysisResponse(
  rawResult: string,
  currentProfile: StudentProfile
): SessionAnalysisResponse {
  try {
    const parsed = JSON.parse(rawResult);
    return {
      detectedPattern: parsed.detectedPattern || null,
      patternReflection: parsed.patternReflection || null,
      moodSignal: parsed.moodSignal || "Stuck",
      stressLevel: typeof parsed.stressLevel === "number" ? parsed.stressLevel : 5,
      triggers: Array.isArray(parsed.triggers) ? parsed.triggers : currentProfile.triggers,
      lastTopics: Array.isArray(parsed.lastTopics) ? parsed.lastTopics : currentProfile.lastTopics,
      examType: parsed.examType || currentProfile.examType
    };
  } catch (error) {
    console.error("Failed to parse session analysis JSON:", error);
    return {
      detectedPattern: null,
      patternReflection: null,
      moodSignal: currentProfile.moodTrend || "Unknown",
      stressLevel: 5,
      triggers: currentProfile.triggers,
      lastTopics: currentProfile.lastTopics,
      examType: currentProfile.examType
    };
  }
}

/**
 * Handles the lightweight dialogue submission exchange.
 * 
 * Side Effects:
 * - Initiates external Gemini API network call via callGemini.
 * 
 * @param text The new user message content.
 * @param history The conversation thread history.
 * @param profile The current student profile.
 * @returns Lightweight response containing the reply and potential action.
 */
export async function getLightweightReply(
  text: string,
  history: DialogueMessage[],
  profile: StudentProfile
): Promise<LightweightResponse> {
  const prompt = getLightweightReplyPrompt(text, history, profile);
  try {
    const rawResult = await callGemini(prompt, 0.7);
    return buildCompanionResponse(rawResult);
  } catch (error: any) {
    console.error("getLightweightReply failed:", error);
    if (error.message === "Timeout") {
      return {
        companionReply: "I'm taking a bit longer than usual to think, but I'm still right here. Hang on, or let's just take a quiet breath together.",
        suggestedMicroAction: {
          label: "Quiet breathing for 1 minute",
          durationMinutes: 1
        }
      };
    }
    return {
      companionReply: "I'm right here. Take a slow breath. Want to tell me a bit more about what's going on?",
      suggestedMicroAction: null
    };
  }
}

/**
 * Handles the full dialogue session analysis.
 * 
 * Side Effects:
 * - Initiates external Gemini API network call via callGemini.
 * 
 * @param history The session dialogue messages.
 * @param profile The current student profile.
 * @returns Structured session analysis data.
 */
export async function analyzeDialogueSession(
  history: DialogueMessage[],
  profile: StudentProfile
): Promise<SessionAnalysisResponse> {
  const prompt = analyzeDialogueSessionPrompt(history, profile);
  try {
    const rawResult = await callGemini(prompt, 0.2);
    return buildSessionAnalysisResponse(rawResult, profile);
  } catch (error) {
    console.error("analyzeDialogueSession failed:", error);
    return {
      detectedPattern: null,
      patternReflection: null,
      moodSignal: "Stuck",
      stressLevel: 5,
      triggers: profile.triggers,
      lastTopics: profile.lastTopics,
      examType: profile.examType
    };
  }
}
