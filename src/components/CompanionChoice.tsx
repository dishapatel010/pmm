/**
 * CompanionChoice — Reusable interactive prompt component for MindPulse.
 *
 * PATTERN DOCUMENTATION
 * ─────────────────────
 * This component implements the "companion choice" interaction pattern:
 * a companion-voiced question presented as tappable chip options inline
 * within the chat thread. Once answered, it collapses to a static
 * "answered" state so chat history stays clean.
 *
 * EXTENSIBILITY
 * ─────────────
 * Future prompts can reuse this by passing different props:
 *   - Mood check-in slider: pass options for mood levels (1-5)
 *   - Exam countdown confirmation: "Is your exam still on [date]?"
 *   - Pattern tracking: "Remember this / Just today"
 *   - Micro-action invite: "Got 2 minutes?" with action options
 *   - Multi-select: set allowMultiple=true for stress patterns etc.
 *
 * USAGE EXAMPLE
 * ─────────────
 * <CompanionChoice
 *   id="pattern-followup"
 *   question="Want me to remember this as something to check in about?"
 *   options={[
 *     { label: "Remember this", value: "remember" },
 *     { label: "Just today", value: "oneoff" },
 *   ]}
 *   onAnswer={(value) => handlePatternChoice(value)}
 *   allowSkip
 * />
 */

"use client";

import * as React from "react";
import { Check, X } from "lucide-react";

export interface CompanionChoiceOption {
  label: string;
  value: string;
}

export interface CompanionChoiceProps {
  /** Unique ID for the question — used for aria-labelledby */
  id: string;
  /** The companion-voiced question text */
  question: string;
  /** Answer options rendered as chips */
  options: CompanionChoiceOption[];
  /** Allow selecting multiple values (multi-select chips) */
  allowMultiple?: boolean;
  /** Show a "skip" option at the end */
  allowSkip?: boolean;
  /** Called with the answer value(s) when the user responds */
  onAnswer: (value: string | string[]) => void;
  /** If provided, renders in "answered" collapsed state */
  answeredValue?: string | string[];
}

/**
 * CompanionChoice renders an interactive prompt as companion message bubbles.
 * Once answered, collapses to a static summary view.
 */
export function CompanionChoice({
  id,
  question,
  options,
  allowMultiple = false,
  allowSkip = false,
  onAnswer,
  answeredValue,
}: CompanionChoiceProps) {
  const [selected, setSelected] = React.useState<string[]>(() => {
    if (!answeredValue) return [];
    return Array.isArray(answeredValue) ? answeredValue : [answeredValue];
  });
  const [answered, setAnswered] = React.useState(!!answeredValue);

  const questionId = `companion-choice-q-${id}`;

  const handleChipClick = (value: string) => {
    if (answered) return;

    if (allowMultiple) {
      setSelected((prev) =>
        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
      );
    } else {
      // Single-select: immediately confirm
      setAnswered(true);
      onAnswer(value);
    }
  };

  const handleConfirmMultiple = () => {
    if (selected.length === 0) return;
    setAnswered(true);
    onAnswer(selected);
  };

  const handleSkip = () => {
    setAnswered(true);
    onAnswer([]);
  };

  // Answered / collapsed view
  if (answered) {
    const displayValues = Array.isArray(answeredValue ?? selected)
      ? (answeredValue ?? selected) as string[]
      : [(answeredValue ?? selected) as string];

    const displayLabels = displayValues
      .map((v) => options.find((o) => o.value === v)?.label ?? v)
      .filter(Boolean)
      .join(", ");

    return (
      <div className="flex flex-col gap-1">
        {/* Companion question — left-aligned */}
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-bl-xs p-4 bg-white border border-[#111827]/5 text-sm font-semibold text-[#111827] shadow-2xs">
            {question}
          </div>
        </div>
        {/* User answer — right-aligned */}
        {displayLabels && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-xs p-3 bg-[#2563EB] text-white text-sm font-semibold shadow-2xs flex items-center gap-1.5">
              <Check className="w-3 h-3 shrink-0 opacity-80" />
              {displayLabels}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active / unanswered view
  return (
    <div className="flex flex-col gap-3">
      {/* Companion question bubble */}
      <div className="flex justify-start">
        <div
          id={questionId}
          className="max-w-[85%] rounded-2xl rounded-bl-xs p-4 bg-white border border-[#111827]/5 text-sm font-semibold text-[#111827] shadow-2xs"
        >
          {question}
        </div>
      </div>

      {/* Chip options */}
      <div
        role="group"
        aria-labelledby={questionId}
        className="flex flex-wrap gap-2 pl-1"
      >
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleChipClick(option.value)}
              aria-pressed={allowMultiple ? isSelected : undefined}
              className={`
                px-4 py-2 rounded-full text-xs font-bold border transition-all duration-150
                cursor-pointer focus-visible:outline-none focus-visible:ring-2 
                focus-visible:ring-[#2563EB] focus-visible:ring-offset-2
                ${
                  isSelected
                    ? "bg-[#2563EB] text-white border-[#2563EB] shadow-sm"
                    : "bg-white text-[#111827] border-[#111827]/10 hover:bg-[#2563EB]/5 hover:border-[#2563EB]/30"
                }
              `}
            >
              {allowMultiple && isSelected && (
                <Check className="w-3 h-3 inline mr-1.5 -mt-0.5" />
              )}
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Multi-select confirm + skip */}
      {(allowMultiple || allowSkip) && (
        <div className="flex items-center gap-3 pl-1 pt-1">
          {allowMultiple && (
            <button
              type="button"
              onClick={handleConfirmMultiple}
              disabled={selected.length === 0}
              className="px-5 py-2 rounded-full text-xs font-bold bg-[#2563EB] text-white border-0 
                cursor-pointer transition-all hover:bg-blue-700 disabled:opacity-40
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
            >
              Confirm
            </button>
          )}
          {allowSkip && (
            <button
              type="button"
              onClick={handleSkip}
              className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 
                cursor-pointer transition-colors focus-visible:outline-none 
                focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 rounded"
            >
              skip for now
            </button>
          )}
        </div>
      )}
    </div>
  );
}
