/**
 * MoodCheck — Inline stress-level slider for the MindPulse companion thread.
 *
 * WHEN TO USE
 * ───────────
 * Render this in the chat thread when the companion wants a quick numeric
 * stress reading without waiting for Gemini to infer mood from text.
 * Example trigger: companion opens a session with a stress check before
 * giving advice, or at the start of a micro-action sequence.
 *
 * RESULT STORAGE
 * ──────────────
 * Call onAnswer with the confirmed value (1–10). The parent (page.tsx)
 * should store the result as a WidgetMessage { role: "companion-widget",
 * widgetType: "mood-check", result: { stressLevel } } in the thread array
 * so it's included in end-of-sitting analysis context.
 *
 * USAGE EXAMPLE
 * ─────────────
 * <MoodCheck
 *   question="Before we dive in — where's your stress sitting right now?"
 *   labels={{ min: "calm", max: "overwhelmed" }}
 *   onAnswer={(val) => appendWidgetResult("mood-check", val)}
 * />
 */

"use client";

import * as React from "react";
import { Slider } from "@/components/ui/slider";
import { Check } from "lucide-react";

export interface MoodCheckProps {
  question: string;
  min?: number;
  max?: number;
  labels?: { min: string; max: string };
  onAnswer: (value: number) => void;
  /** If provided, renders in collapsed "answered" state */
  answeredValue?: number;
}

/**
 * MoodCheck renders a companion question + shadcn Slider inline in the thread.
 * Collapses to a static summary chip once the user confirms their value.
 */
export function MoodCheck({
  question,
  min = 1,
  max = 10,
  labels = { min: "calm", max: "overwhelmed" },
  onAnswer,
  answeredValue,
}: MoodCheckProps) {
  const midpoint = Math.round((min + max) / 2);
  const [value, setValue] = React.useState(answeredValue ?? midpoint);
  const [answered, setAnswered] = React.useState(answeredValue !== undefined);

  const handleConfirm = () => {
    setAnswered(true);
    onAnswer(value);
  };

  // ── Answered / collapsed state ───────────────────────────────────────────
  if (answered) {
    const displayVal = answeredValue ?? value;
    const pct = ((displayVal - min) / (max - min)) * 100;
    // Colour shifts from calm-blue → amber → red
    const dotColor =
      pct <= 33
        ? "bg-emerald-400"
        : pct <= 66
        ? "bg-amber-400"
        : "bg-red-400";

    return (
      <div className="flex flex-col gap-1">
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-bl-xs p-4 bg-white border border-[#111827]/5 text-sm font-semibold text-[#111827] shadow-2xs">
            {question}
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-xs px-4 py-3 bg-[#2563EB] text-white text-sm font-bold shadow-2xs flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} aria-hidden />
            Stress: {displayVal}/{max}
          </div>
        </div>
      </div>
    );
  }

  // ── Active / dragging state ───────────────────────────────────────────────
  const pct = ((value - min) / (max - min)) * 100;
  const thumbColor =
    pct <= 33
      ? "text-emerald-600"
      : pct <= 66
      ? "text-amber-600"
      : "text-red-500";

  return (
    <div className="flex flex-col gap-3">
      {/* Question bubble */}
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl rounded-bl-xs p-4 bg-white border border-[#111827]/5 text-sm font-semibold text-[#111827] shadow-2xs">
          {question}
        </div>
      </div>

      {/* Slider card */}
      <div className="bg-white border border-[#111827]/5 rounded-2xl px-5 py-5 shadow-2xs space-y-4">
        {/* Live value display */}
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Stress level
          </span>
          <span
            className={`text-3xl font-extrabold tabular-nums transition-colors duration-150 flex items-center gap-1.5 ${thumbColor}`}
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="text-2xl select-none" aria-hidden="true">
              {value <= 3 ? "😌" : value <= 6 ? "😐" : value <= 8 ? "😰" : "🌋"}
            </span>
            {value}
            <span className="text-base font-semibold text-slate-300">/{max}</span>
          </span>
        </div>

        {/* Slider — 48px touch target via py padding on parent */}
        <div className="py-3">
          <Slider
            min={min}
            max={max}
            step={1}
            value={[value]}
            onValueChange={(vals) => setValue(Array.isArray(vals) ? vals[0] : vals)}
            aria-label="Stress level"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-valuetext={`${value} out of ${max} — ${value <= (max - min) / 3 + min ? labels.min : value >= max - (max - min) / 3 ? labels.max : "moderate"}`}
            className="w-full"
          />
        </div>

        {/* Min / max labels */}
        <div className="flex justify-between text-[10px] font-bold text-slate-400 -mt-2 px-0.5">
          <span>{labels.min}</span>
          <span>{labels.max}</span>
        </div>

        {/* Confirm button */}
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full py-3 rounded-full bg-[#2563EB] text-white text-xs font-bold cursor-pointer
            hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 mt-1"
          aria-label={`Set stress level to ${value} out of ${max}`}
        >
          <Check className="w-3.5 h-3.5" />
          Set — {value}/{max}
        </button>
      </div>
    </div>
  );
}
