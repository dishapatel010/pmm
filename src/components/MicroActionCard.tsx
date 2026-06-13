/**
 * MicroActionCard — Inline guided-action timer card for MindPulse chat thread.
 *
 * WHEN TO USE
 * ───────────
 * Render when the companion's Gemini response includes a suggestedMicroAction.
 * Instead of a plain text suggestion, this card guides the user through the
 * action with a countdown + step-cycling instructions, then collects feedback.
 *
 * PRESET INSTRUCTION MAPS
 * ───────────────────────
 * The companion's LLM response only needs to return an actionType string.
 * The full instruction script is resolved here — keeps prompts lean.
 *
 * RESULT STORAGE
 * ──────────────
 * onComplete is called with feedback: 'helped' | 'not_really' | 'meh' | 'skipped'.
 * The parent (page.tsx) should store this as a WidgetMessage { role: "companion-widget",
 * widgetType: "micro-action", result: { feedback } } in the thread array.
 *
 * USAGE EXAMPLE
 * ─────────────
 * <MicroActionCard
 *   title="Box breathing"
 *   description="Let's slow things down for a moment."
 *   durationSeconds={64}
 *   actionType="box_breathing"
 *   onComplete={(fb) => appendWidgetResult("micro-action", fb)}
 * />
 */

"use client";

import * as React from "react";
import { Play, SkipForward } from "lucide-react";
import { CompanionChoice } from "@/components/CompanionChoice";

// ── Preset instruction arrays ─────────────────────────────────────────────────

const PRESET_INSTRUCTIONS: Record<
  string,
  Record<"en" | "hi" | "hinglish", { steps: string[]; stepSeconds: number }>
> = {
  box_breathing: {
    en: {
      steps: ["Breathe in...", "Hold...", "Breathe out...", "Hold..."],
      stepSeconds: 4,
    },
    hi: {
      steps: ["सांस अंदर लें...", "सांस रोकें...", "सांस बाहर छोड़ें...", "सांस रोकें..."],
      stepSeconds: 4,
    },
    hinglish: {
      steps: ["Saans andar lo...", "Hold karo...", "Saans bahar chodo...", "Hold karo..."],
      stepSeconds: 4,
    },
  },
  grounding_pause: {
    en: {
      steps: [
        "Notice 5 things you can see",
        "Notice 4 things you can touch",
        "Notice 3 things you can hear",
        "Notice 2 things you can smell",
        "Notice 1 thing you can taste",
      ],
      stepSeconds: 12,
    },
    hi: {
      steps: [
        "5 चीजें देखें जो आपके आस-पास हैं",
        "4 चीजें महसूस करें जिन्हें आप छू सकते हैं",
        "3 आवाजें सुनें जो आ रही हैं",
        "2 चीजें सूंघें जिनकी गंध आ रही है",
        "1 चीज का स्वाद महसूस करें",
      ],
      stepSeconds: 12,
    },
    hinglish: {
      steps: [
        "Apne aas-paas ki 5 cheezein dekho",
        "4 cheezon ko touch karke feel karo",
        "3 aawazein sunne ki koshish karo",
        "2 cheezon ki smell note karo",
        "1 cheez ka taste feel karo",
      ],
      stepSeconds: 12,
    },
  },
  quick_stretch: {
    en: {
      steps: [
        "Roll your shoulders back — slowly",
        "Tilt your head left, hold...",
        "Tilt your head right, hold...",
        "Neck rolls — gentle circles",
        "Shake out your hands",
      ],
      stepSeconds: 10,
    },
    hi: {
      steps: [
        "अपने कंधों को धीरे-धीरे पीछे की ओर घुमाएं",
        "सिर को बाईं ओर झुकाएं और रोकें...",
        "सिर को दाईं ओर झुकाएं और रोकें...",
        "गले को धीरे-धीरे गोल घुमाएं",
        "हाथों को थोड़ा हिलाएं और ढीला छोड़ें",
      ],
      stepSeconds: 10,
    },
    hinglish: {
      steps: [
        "Apne shoulders ko slow-slow peeche roll karo",
        "Head ko left tilt karo, hold...",
        "Head ko right tilt karo, hold...",
        "Neck rolls — slow circles ghumao",
        "Apne hands ko shake karke relax karo",
      ],
      stepSeconds: 10,
    },
  },
};

export type MicroActionFeedback = "helped" | "not_really" | "meh" | "skipped";

export interface MicroActionCardProps {
  title: string;
  description: string;
  /** Duration in seconds */
  durationSeconds: number;
  /** Preset key (maps to instruction array) OR pass custom instructions directly */
  actionType?: keyof typeof PRESET_INSTRUCTIONS;
  /** Explicit step-by-step instructions — overrides actionType preset */
  instructions?: string[];
  onComplete: (feedback: MicroActionFeedback) => void;
  /** For collapsed/history display */
  completedFeedback?: MicroActionFeedback;
  /** Respect system reduced-motion preference */
  reducedMotion?: boolean;
}

const FEEDBACK_OPTIONS_LOCALIZED = {
  en: [
    { label: "Helped 🙂", value: "helped" },
    { label: "Not really", value: "not_really" },
    { label: "Meh", value: "meh" },
  ],
  hi: [
    { label: "मदद मिली 🙂", value: "helped" },
    { label: "खास नहीं", value: "not_really" },
    { label: "ठीक-ठाक", value: "meh" },
  ],
  hinglish: [
    { label: "Help mili 🙂", value: "helped" },
    { label: "Khas nahi", value: "not_really" },
    { label: "Thik-thak", value: "meh" },
  ],
};

function detectLanguage(text: string): "en" | "hi" | "hinglish" {
  if (/[\u0900-\u097F]/.test(text)) {
    return "hi";
  }
  const hinglishKeywords = [
    "saans", "le", "lo", "lenn", "karo", "dhire", "se", "shanti", "ek", "do", "tin", "char", "paanch",
    "cheezein", "dekho", "suno", "chhuo", "feel", "peeche", "ghumao", "hath", "kandha", "tension", "kam",
    "yaar", "kuch", "baat", "batao", "chal", "chalo", "karne", "bad", "hua", "hota", "gaya"
  ];
  const words = text.toLowerCase().split(/\s+/);
  if (words.some(word => hinglishKeywords.includes(word))) {
    return "hinglish";
  }
  return "en";
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * MicroActionCard — guided timer with step instructions, circular progress,
 * and a CompanionChoice feedback prompt on completion.
 */
export function MicroActionCard({
  title,
  description,
  durationSeconds,
  actionType,
  instructions: customInstructions,
  onComplete,
  completedFeedback,
  reducedMotion = false,
}: MicroActionCardProps) {
  // Resolve instruction set
  const lang = detectLanguage(title);
  const preset = actionType ? PRESET_INSTRUCTIONS[actionType] : null;
  const resolvedPreset = preset ? preset[lang] : null;
  const instructions = customInstructions ?? resolvedPreset?.steps ?? [];
  const stepSeconds = resolvedPreset?.stepSeconds ?? (instructions.length > 0 ? Math.floor(durationSeconds / instructions.length) : durationSeconds);

  type Phase = "idle" | "active" | "feedback";
  const [phase, setPhase] = React.useState<Phase>(
    completedFeedback !== undefined ? "feedback" : "idle"
  );
  const [timeLeft, setTimeLeft] = React.useState(durationSeconds);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [announcedAt, setAnnouncedAt] = React.useState<number | null>(null);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const elapsed = durationSeconds - timeLeft;
  const pct = elapsed / durationSeconds;

  // Announce time at 10s intervals and on step change
  const [announcement, setAnnouncement] = React.useState("");

  React.useEffect(() => {
    if (phase !== "active") return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;

        // Step cycling
        if (instructions.length > 0) {
          const stepIndex = Math.min(
            Math.floor(elapsed / stepSeconds),
            instructions.length - 1
          );
          setCurrentStep(stepIndex);
        }

        // Announce every 10s and on step change
        if (next % 10 === 0 && next > 0) {
          setAnnouncement(`${next} seconds remaining`);
        }

        if (next <= 0) {
          clearInterval(intervalRef.current!);
          setAnnouncement("Exercise complete! How was that?");
          setPhase("feedback");
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase]);

  // Step index derived cleanly
  const stepIndex =
    instructions.length > 0
      ? Math.min(Math.floor(elapsed / stepSeconds), instructions.length - 1)
      : 0;

  const handleStart = () => {
    setTimeLeft(durationSeconds);
    setCurrentStep(0);
    setPhase("active");
    setAnnouncement(`Starting ${title}. ${durationSeconds} seconds.`);
  };

  const handleSkip = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    onComplete("skipped");
  };

  const handleFeedback = (value: string | string[]) => {
    const fb = (Array.isArray(value) ? value[0] : value) as MicroActionFeedback;
    onComplete(fb);
  };

  // ── Collapsed / history view ──────────────────────────────────────────────
  if (completedFeedback !== undefined) {
    const feedbackOptions = FEEDBACK_OPTIONS_LOCALIZED[lang] || FEEDBACK_OPTIONS_LOCALIZED.en;
    const feedbackLabel =
      feedbackOptions.find((o) => o.value === completedFeedback)?.label ??
      completedFeedback;
    return (
      <div className="flex flex-col gap-1">
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-bl-xs px-4 py-3 bg-white border border-[#111827]/5 text-sm font-semibold text-[#111827] shadow-2xs flex items-center gap-2">
            <span className="text-[#2563EB]">⏱</span>
            {title}
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-xs px-4 py-3 bg-[#2563EB] text-white text-sm font-bold shadow-2xs">
            {completedFeedback === "skipped" ? (lang === "hi" ? "छोड़ दिया" : lang === "hinglish" ? "Skipped" : "Skipped") : feedbackLabel}
          </div>
        </div>
      </div>
    );
  }

  // SVG circle progress params
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] w-full bg-white border border-[#111827]/5 rounded-2xl rounded-bl-xs p-5 shadow-2xs space-y-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#2563EB] mb-1">
              Micro-action · {formatTime(durationSeconds)}
            </p>
            <p className="text-sm font-extrabold text-[#111827]">{title}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">{description}</p>
          </div>

          {instructions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {instructions.map((step, i) => (
                <span
                  key={i}
                  className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full"
                >
                  {step}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2563EB] text-white text-xs font-bold cursor-pointer
                hover:bg-blue-700 transition-colors shadow-sm
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
              aria-label={`Start ${title} — ${durationSeconds} seconds`}
            >
              <Play className="w-3 h-3" />
              Start
            </button>
            <button
              onClick={handleSkip}
              className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 rounded"
              aria-label="Skip this activity"
            >
              skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Feedback phase ─────────────────────────────────────────────────────────
  if (phase === "feedback") {
    const feedbackOptions = FEEDBACK_OPTIONS_LOCALIZED[lang] || FEEDBACK_OPTIONS_LOCALIZED.en;
    return (
      <div className="flex flex-col gap-3">
        <div className="flex justify-start">
          <div className="max-w-[85%] bg-white border border-[#111827]/5 rounded-2xl rounded-bl-xs px-5 py-4 shadow-2xs">
            <p className="text-xs font-extrabold text-emerald-600 mb-1">
              {lang === "hi" ? "पूरा हुआ ✓" : lang === "hinglish" ? "Done ✓" : "Done ✓"} {title}
            </p>
            <p className="text-sm font-semibold text-[#111827]">
              {lang === "hi" ? "यह कैसा रहा?" : lang === "hinglish" ? "Kaisa laga?" : "How was that?"}
            </p>
          </div>
        </div>
        <div aria-live="polite" aria-atomic className="sr-only">
          {announcement}
        </div>
        <CompanionChoice
          id={`micro-action-feedback-${title.replace(/\s/g, "-").toLowerCase()}`}
          question=""
          options={feedbackOptions}
          onAnswer={handleFeedback}
        />
      </div>
    );
  }

  // ── Active / countdown ────────────────────────────────────────────────────
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] w-full bg-white border border-[#111827]/5 rounded-2xl rounded-bl-xs p-5 shadow-2xs space-y-4">
        {/* Circular progress + countdown */}
        <div className="flex items-center gap-5">
          <div className="relative shrink-0 w-24 h-24" role="timer" aria-label={`${timeLeft} seconds remaining`}>
            <svg viewBox="0 0 96 96" className="w-24 h-24 -rotate-90">
              {/* Track */}
              <circle
                cx="48"
                cy="48"
                r={r}
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="6"
              />
              {/* Pulsing breathing helper circle */}
              <circle
                cx="48"
                cy="48"
                r={r - 4}
                className={reducedMotion ? "" : "animate-pulse"}
                fill="#2563EB"
                fillOpacity="0.06"
                style={{ transformOrigin: "48px 48px" }}
              />
              {/* Progress arc */}
              <circle
                cx="48"
                cy="48"
                r={r}
                fill="none"
                stroke="#2563EB"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                style={
                  reducedMotion
                    ? {}
                    : { transition: "stroke-dashoffset 0.9s linear" }
                }
              />
            </svg>
            {/* Time text — centered inside SVG */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-extrabold text-[#111827] tabular-nums leading-none">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {/* Step instruction */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#2563EB] mb-1.5">
              {title}
            </p>
            {instructions.length > 0 ? (
              <p
                key={stepIndex}
                className={`text-base font-bold text-[#111827] leading-snug ${
                  reducedMotion ? "" : "animate-fade-in"
                }`}
              >
                {instructions[stepIndex]}
              </p>
            ) : (
              <p className="text-sm font-semibold text-slate-500">{description}</p>
            )}
          </div>
        </div>

        {/* Step dots if applicable */}
        {instructions.length > 1 && (
          <div className="flex gap-1.5 items-center">
            {instructions.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === stepIndex
                    ? "w-5 bg-[#2563EB]"
                    : i < stepIndex
                    ? "w-1.5 bg-[#2563EB]/30"
                    : "w-1.5 bg-slate-200"
                }`}
                aria-hidden
              />
            ))}
          </div>
        )}

        {/* Skip */}
        <div className="flex justify-end">
          <button
            onClick={handleSkip}
            className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 rounded"
            aria-label="Skip this activity"
          >
            <SkipForward className="w-3 h-3" />
            skip
          </button>
        </div>
      </div>

      {/* Aria live for time announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic>
        {announcement}
      </div>
    </div>
  );
}

export { PRESET_INSTRUCTIONS };
