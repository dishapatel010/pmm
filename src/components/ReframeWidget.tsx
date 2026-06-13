"use client";

import * as React from "react";
import { CompanionChoice } from "./CompanionChoice";
import { Sparkles } from "lucide-react";

interface ReframeWidgetProps {
  originalThought: string;
  onDone: (original: string, reframed: string, feedback: "yeah_kind_of" | "not_really" | "still_struggling" | "no_thanks") => void;
  reframeAction: (thought: string) => Promise<string>;
}

export function ReframeWidget({ originalThought, onDone, reframeAction }: ReframeWidgetProps) {
  const [step, setStep] = React.useState<"invite" | "reframing" | "result" | "done">("invite");
  const [reframedThought, setReframedThought] = React.useState("");
  const [feedback, setFeedback] = React.useState<"yeah_kind_of" | "not_really" | "still_struggling" | "no_thanks" | null>(null);

  const startReframe = async () => {
    setStep("reframing");
    try {
      const reframed = await reframeAction(originalThought);
      setReframedThought(reframed);
      setStep("result");
    } catch (e) {
      setReframedThought("Let's take a slow breath first. We don't have to carry this all at once.");
      setStep("result");
    }
  };

  const handleInviteAnswer = (value: string | string[]) => {
    if (value === "yes") {
      startReframe();
    } else {
      setFeedback("no_thanks");
      setStep("done");
      onDone(originalThought, "", "no_thanks");
    }
  };

  const handleFeedbackAnswer = (value: string | string[]) => {
    const val = value as "yeah_kind_of" | "not_really" | "still_struggling";
    setFeedback(val);
    setStep("done");
    onDone(originalThought, reframedThought, val);
  };

  return (
    <div className="space-y-4 my-4 p-4 border border-[#2563EB]/10 bg-blue-50/20 rounded-2xl shadow-xs">
      <div className="flex items-center gap-2 text-[#2563EB]">
        <Sparkles className="w-4 h-4 shrink-0" />
        <span className="text-[10px] font-extrabold uppercase tracking-widest">Reframe Activity</span>
      </div>

      {/* 1. Original Thought Quote */}
      <div className="pl-3 border-l-2 border-slate-300 text-xs italic text-slate-500 my-2">
        &ldquo;{originalThought}&rdquo;
      </div>

      {step === "invite" && (
        <CompanionChoice
          id="reframe-invite"
          question="Want to try rewriting that thought together?"
          options={[
            { label: "Yes", value: "yes" },
            { label: "No thanks", value: "no" }
          ]}
          onAnswer={handleInviteAnswer}
        />
      )}

      {step === "reframing" && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium py-2 animate-pulse">
          <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          <span>MindPulse is reframing...</span>
        </div>
      )}

      {step === "result" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-xs p-4 bg-white border border-[#111827]/5 text-sm font-semibold text-[#111827] shadow-2xs leading-relaxed select-text">
              {reframedThought}
            </div>
          </div>

          <CompanionChoice
            id="reframe-feedback"
            question="Does that feel more true?"
            options={[
              { label: "Yeah, kind of", value: "yeah_kind_of" },
              { label: "Not really", value: "not_really" },
              { label: "Still struggling", value: "still_struggling" }
            ]}
            onAnswer={handleFeedbackAnswer}
          />
        </div>
      )}

      {step === "done" && (
        <div className="space-y-3">
          {reframedThought && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-xs p-4 bg-white border border-[#111827]/5 text-sm font-semibold text-[#111827] shadow-2xs leading-relaxed select-text opacity-75">
                {reframedThought}
              </div>
            </div>
          )}
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">
            {feedback === "no_thanks" && "Activity declined"}
            {feedback === "yeah_kind_of" && "Reframed successfully"}
            {feedback === "not_really" && "Completed reframe check"}
            {feedback === "still_struggling" && "Completed reframe check (Still struggling)"}
          </div>
        </div>
      )}
    </div>
  );
}
