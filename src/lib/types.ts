/** A standard text message from user or companion */
export interface DialogueMessage {
  role: "user" | "companion";
  content: string;
  timestamp: string; // ISO String
  safetyFlag?: boolean;
}

/**
 * A companion-rendered widget result stored inline in the thread.
 * Included in end-of-sitting analysis context as a structured signal.
 */
export interface WidgetMessage {
  role: "companion-widget";
  widgetType: "mood-check" | "micro-action" | "reframe";
  /** Human-readable summary for collapsed / history view */
  summary: string;
  /** Structured result payload */
  result:
    | { type: "mood-check"; stressLevel: number }
    | { type: "micro-action"; feedback: "helped" | "not_really" | "meh" | "skipped" }
    | { type: "reframe"; originalThought: string; reframedThought: string; feedback: "yeah_kind_of" | "not_really" | "still_struggling" | "no_thanks" };
  timestamp: string;
}

/** Any message that can appear in a thread */
export type AnyMessage = DialogueMessage | WidgetMessage;

export interface StudentProfile {
  name: string; // User's first name — collected during onboarding
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
  /**
   * SAFETY GUARDRAIL — not a clinical/diagnostic feature.
   * Set to true when the student's message contains language suggesting
   * hopelessness, worthlessness, self-harm ideation, or crisis.
   * MindPulse is NOT a substitute for professional mental health support.
   * When true, safetyResponse replaces companionReply in the UI and all
   * widgets (micro-actions, mood sliders) are suppressed for that turn.
   */
  safetyFlag?: boolean;
  safetyResponse?: string | null;
  suggestedMoodCheck?: {
    question: string;
    minLabel?: string;
    maxLabel?: string;
  } | null;
  suggestedChoice?: {
    id: string;
    question: string;
    options: { label: string; value: string }[];
    allowMultiple?: boolean;
    allowSkip?: boolean;
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

export interface DialogueThread {
  id: string;
  createdAt: string; // ISO String
  title: string;
  messages: AnyMessage[];
  moodSignal?: string;
  stressLevel?: number;
  closed: boolean;
}
