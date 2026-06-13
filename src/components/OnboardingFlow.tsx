"use client";

import * as React from "react";
import { Check, ChevronRight } from "lucide-react";
import { CompanionChoice } from "@/components/CompanionChoice";

// ─── Onboarding Questions ────────────────────────────────────────────────────

const EXAM_OPTIONS = [
  { label: "JEE", value: "JEE" },
  { label: "NEET", value: "NEET" },
  { label: "UPSC", value: "UPSC" },
  { label: "CAT", value: "CAT" },
  { label: "GATE", value: "GATE" },
  { label: "CUET", value: "CUET" },
  { label: "Other", value: "Other" },
];

const TIMELINE_OPTIONS = [
  { label: "Less than a month", value: "< 1 month" },
  { label: "1–3 months", value: "1-3 months" },
  { label: "3–6 months", value: "3-6 months" },
  { label: "6+ months", value: "6+ months" },
  { label: "Not sure yet", value: "unsure" },
];

const STRESS_OPTIONS = [
  { label: "Racing thoughts", value: "racing-thoughts" },
  { label: "Can't sleep", value: "cant-sleep" },
  { label: "Avoiding studying", value: "avoiding-studying" },
  { label: "Comparing myself to others", value: "comparing" },
  { label: "Physical (headache/tension)", value: "physical" },
  { label: "Something else", value: "something-else" },
];

const CHECKIN_OPTIONS = [
  { label: "Brief and to-the-point", value: "brief" },
  { label: "Warm and conversational", value: "warm" },
  { label: "Mostly quiet — I'll come to you", value: "quiet" },
];

// ─── Onboarding Answers State ─────────────────────────────────────────────────

export interface OnboardingAnswers {
  name: string;
  targetExam: string;
  examTimeline: string;
  stressPatterns: string[];
  checkInPreference: string;
  initialContext: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface OnboardingFlowProps {
  onComplete: (answers: OnboardingAnswers) => void;
  onSkip: () => void;
}

// ─── Personalized Opening Line Generator ─────────────────────────────────────

function buildOpeningLine(answers: OnboardingAnswers): string {
  const firstName = answers.name ? `, ${answers.name.split(" ")[0]}` : "";
  const exam = answers.targetExam && answers.targetExam !== "Other" ? answers.targetExam : "your exam";
  const timeline = answers.examTimeline && answers.examTimeline !== "unsure"
    ? `about ${answers.examTimeline} out`
    : "whenever it comes";

  const stressLabels = answers.stressPatterns
    .map((v) => STRESS_OPTIONS.find((o) => o.value === v)?.label ?? v)
    .slice(0, 2)
    .join(" and ");
  const stressPart = stressLabels
    ? `, and stress shows up as ${stressLabels.toLowerCase()} for you`
    : "";

  const tonePart =
    answers.checkInPreference === "brief"
      ? "I'll keep things brief and focused."
      : answers.checkInPreference === "quiet"
      ? "I'll stay quiet until you come to me — I'm always here when you need it."
      : "I'll keep things warm rather than brisk.";

  const contextPart = answers.initialContext
    ? ` You mentioned "${answers.initialContext.trim()}" — we can start there whenever you're ready.`
    : " Whenever you're ready, I'm here.";

  return `Got it${firstName} — ${exam} prep, ${timeline}${stressPart}. ${tonePart}${contextPart}`;
}

// ─── Onboarding Component ─────────────────────────────────────────────────────

/**
 * OnboardingFlow — Conversational first-visit setup for MindPulse.
 *
 * Renders 4-5 questions one at a time in the companion chat style using
 * CompanionChoice chips. Zero Gemini calls — purely client-side.
 * After completion, calls onComplete with structured answers for profile init.
 */
export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<OnboardingAnswers>({
    name: "",
    targetExam: "",
    examTimeline: "",
    stressPatterns: [],
    checkInPreference: "warm",
    initialContext: "",
  });
  const [otherExamText, setOtherExamText] = React.useState("");
  const [freeText, setFreeText] = React.useState("");
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const otherInputRef = React.useRef<HTMLInputElement>(null);

  // Focus name input on mount
  React.useEffect(() => {
    setTimeout(() => nameInputRef.current?.focus(), 80);
  }, []);

  // Focus "other" input when it appears
  React.useEffect(() => {
    if (answers.targetExam === "Other" && step === 1) {
      setTimeout(() => otherInputRef.current?.focus(), 50);
    }
  }, [answers.targetExam, step]);

  const handleNameConfirm = () => {
    const val = answers.name.trim();
    if (!val) return;
    setStep(1);
  };

  const handleExamAnswer = (value: string | string[]) => {
    const exam = Array.isArray(value) ? value[0] : value;
    if (exam === "Other") {
      setAnswers((a) => ({ ...a, targetExam: "Other" }));
      return; // Wait for text input
    }
    setAnswers((a) => ({ ...a, targetExam: exam }));
    setStep(2);
  };

  const handleOtherExamConfirm = () => {
    const val = otherExamText.trim() || "Other";
    setAnswers((a) => ({ ...a, targetExam: val }));
    setStep(2);
  };

  const handleTimelineAnswer = (value: string | string[]) => {
    const timeline = Array.isArray(value) ? value[0] : value;
    setAnswers((a) => ({ ...a, examTimeline: timeline }));
    setStep(3);
  };

  const handleStressAnswer = (value: string | string[]) => {
    const patterns = Array.isArray(value) ? value : [value];
    setAnswers((a) => ({ ...a, stressPatterns: patterns }));
    setStep(4);
  };

  const handleCheckInAnswer = (value: string | string[]) => {
    const pref = Array.isArray(value) ? value[0] : value;
    setAnswers((a) => ({ ...a, checkInPreference: pref }));
    setStep(5);
  };

  const handleFinalSubmit = () => {
    const finalAnswers: OnboardingAnswers = {
      ...answers,
      initialContext: freeText.trim(),
    };
    onComplete(finalAnswers);
  };

  const handleFinalSkip = () => {
    const finalAnswers: OnboardingAnswers = {
      ...answers,
      initialContext: "",
    };
    onComplete(finalAnswers);
  };

  return (
    <div className="flex flex-col gap-4 py-2 w-full animate-fade-in">
      <div className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-[#111827]/5 rounded-xl p-3 leading-relaxed">
        ℹ️ Language preference is auto-detected. You can chat or journal in Hindi, Hinglish (Hindi in Roman script), English, or regional languages. The companion will automatically adapt to your script and register.
      </div>
      {/* Step 0: Name */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-bl-xs p-4 bg-white border border-[#111827]/5 text-sm font-semibold text-[#111827] shadow-2xs">
            First — what should I call you?
          </div>
        </div>
        {step === 0 ? (
          <div className="flex justify-end">
            <div className="flex gap-2 max-w-[85%] w-full">
              <input
                ref={nameInputRef}
                value={answers.name}
                onChange={(e) => setAnswers((a) => ({ ...a, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleNameConfirm()}
                placeholder="Your first name..."
                maxLength={40}
                className="flex-1 text-sm font-semibold bg-white border border-[#111827]/10 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 placeholder:text-slate-400"
              />
              <button
                onClick={handleNameConfirm}
                disabled={!answers.name.trim()}
                className="px-4 py-2 rounded-full bg-[#2563EB] text-white text-xs font-bold cursor-pointer hover:bg-blue-700 transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
              >
                Hi ✓
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-xs px-4 py-3 bg-[#2563EB] text-white text-sm font-bold shadow-2xs">
              {answers.name}
            </div>
          </div>
        )}
      </div>

      {/* Step 1: Which exam */}
      {step >= 1 && (
        <CompanionChoice
          id="exam"
          question="What are you preparing for?"
          options={EXAM_OPTIONS}
          onAnswer={handleExamAnswer}
          answeredValue={step > 1 ? (answers.targetExam || undefined) : undefined}
        />
      )}

      {/* "Other" exam free text — shown while on step 1 with Other selected */}
      {step === 1 && answers.targetExam === "Other" && (
        <div className="flex justify-end">
          <div className="flex gap-2 max-w-[85%] w-full">
            <input
              ref={otherInputRef}
              value={otherExamText}
              onChange={(e) => setOtherExamText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleOtherExamConfirm()}
              placeholder="Which exam? (e.g. State CET, GMAT...)"
              className="flex-1 text-sm font-semibold bg-white border border-[#111827]/10 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 placeholder:text-slate-400"
            />
            <button
              onClick={handleOtherExamConfirm}
              className="px-4 py-2 rounded-full bg-[#2563EB] text-white text-xs font-bold cursor-pointer hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Timeline */}
      {step >= 2 && (
        <CompanionChoice
          id="timeline"
          question="Roughly how far out is it?"
          options={TIMELINE_OPTIONS}
          onAnswer={handleTimelineAnswer}
          answeredValue={step > 2 ? (answers.examTimeline || undefined) : undefined}
        />
      )}

      {/* Step 3: Stress patterns — multi-select */}
      {step >= 3 && (
        <CompanionChoice
          id="stress"
          question="When stress hits, what does it usually feel like for you?"
          options={STRESS_OPTIONS}
          allowMultiple
          allowSkip
          onAnswer={handleStressAnswer}
          answeredValue={step > 3 ? (answers.stressPatterns.length > 0 ? answers.stressPatterns : undefined) : undefined}
        />
      )}

      {/* Step 4: Check-in tone preference */}
      {step >= 4 && (
        <CompanionChoice
          id="checkin"
          question="How would you like check-ins to feel?"
          options={CHECKIN_OPTIONS}
          onAnswer={handleCheckInAnswer}
          answeredValue={step > 4 ? (answers.checkInPreference || undefined) : undefined}
        />
      )}

      {/* Step 5: Free text + finish */}
      {step >= 5 && (
        <div className="flex flex-col gap-3">
          {/* Companion question bubble */}
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-xs p-4 bg-white border border-[#111827]/5 text-sm font-semibold text-[#111827] shadow-2xs">
              One thing that&apos;s been on your mind lately? (totally optional)
            </div>
          </div>

          {/* Free text input + submit */}
          <div className="flex flex-col gap-2">
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Could be anything — a topic, a feeling, a deadline..."
              rows={2}
              className="w-full text-sm font-semibold bg-white border border-[#111827]/10 rounded-2xl px-4 py-3 
                focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 
                placeholder:text-slate-400 resize-none"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleFinalSubmit}
                className="flex-1 py-3 rounded-full bg-[#2563EB] text-white text-sm font-bold cursor-pointer 
                  hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
              >
                Let&apos;s begin
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleFinalSkip}
                className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 
                  cursor-pointer transition-colors shrink-0
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 
                  focus-visible:ring-offset-2 rounded"
              >
                skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { buildOpeningLine };
