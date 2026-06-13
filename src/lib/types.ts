export interface DialogueMessage {
  role: "user" | "companion";
  content: string;
  timestamp: string; // ISO String
}

export interface StudentProfile {
  examType: string; // e.g. JEE, NEET, UPSC, CAT, Boards, General, Unknown
  moodTrend: string;
  triggers: string[];
  lastTopics: string[];
}

export interface LightweightResponse {
  companionReply: string;
  suggestedMicroAction: {
    label: string;
    durationMinutes: number;
  } | null;
}

export interface SessionAnalysisResponse {
  detectedPattern: string | null;
  patternReflection: string | null;
  moodSignal: string;
  stressLevel: number;
  triggers: string[];
  lastTopics: string[];
  examType: string;
}

export interface SavedSessionAnalysis {
  detectedPattern: string | null;
  patternReflection: string | null;
  moodSignal: string;
  stressLevel: number;
  timestamp: string;
}
