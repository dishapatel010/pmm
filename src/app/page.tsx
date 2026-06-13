"use client";

import * as React from "react";
import { 
  Send, 
  ArrowLeft, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  ShieldAlert, 
  X, 
  Calendar,
  Compass
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { submitMessageAction, closeSessionAction } from "./actions";
import { DialogueMessage, StudentProfile, SavedSessionAnalysis } from "@/lib/types";

const INITIAL_PROFILE: StudentProfile = {
  examType: "Unknown",
  moodTrend: "Unknown",
  triggers: [],
  lastTopics: []
};

export default function Home() {
  const [profile, setProfile] = React.useState<StudentProfile>(INITIAL_PROFILE);
  const [thread, setThread] = React.useState<DialogueMessage[]>([]);
  const [savedAnalyses, setSavedAnalyses] = React.useState<SavedSessionAnalysis[]>([]);
  
  const [inputText, setInputText] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);
  const [latestSuggestedAction, setLatestSuggestedAction] = React.useState<{ label: string, durationMinutes: number } | null>(null);
  
  // Reflection view states
  const [isLookingBackOpen, setIsLookingBackOpen] = React.useState(false);
  const [latestAnalysis, setLatestAnalysis] = React.useState<SavedSessionAnalysis | null>(null);
  const [isAnalyzingSession, setIsAnalyzingSession] = React.useState(false);
  
  // Guided Breathing Modal
  const [isBreathingOpen, setIsBreathingOpen] = React.useState(false);
  const [breathState, setBreathState] = React.useState<"idle" | "inhale" | "hold1" | "exhale" | "hold2">("idle");
  const [breathTimer, setBreathTimer] = React.useState(4);
  const breathIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Soundscape
  const [soundscape, setSoundscape] = React.useState<"none" | "beats" | "rain">("none");
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const audioNodesRef = React.useRef<any[]>([]);

  // ACCESSIBILITY: Detect user system preference for reduced motion
  const [reducedMotion, setReducedMotion] = React.useState(false);
  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus Input Refocus on replies
  const focusInput = () => {
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 50);
  };

  // Load state on mount
  React.useEffect(() => {
    const savedP = localStorage.getItem("mindpulse_profile_v3");
    const savedT = localStorage.getItem("mindpulse_thread_v3");
    const savedA = localStorage.getItem("mindpulse_analyses_v3");
    const savedLA = localStorage.getItem("mindpulse_latest_analysis_v3");

    if (savedP) setProfile(JSON.parse(savedP));
    if (savedA) setSavedAnalyses(JSON.parse(savedA));
    if (savedLA) setLatestAnalysis(JSON.parse(savedLA));

    if (savedT) {
      const parsedT: DialogueMessage[] = JSON.parse(savedT);
      if (parsedT.length > 0) {
        const lastMsgTime = new Date(parsedT[parsedT.length - 1].timestamp).toDateString();
        const todayStr = new Date().toDateString();
        
        if (lastMsgTime !== todayStr) {
          setThread([]);
          localStorage.removeItem("mindpulse_thread_v3");
        } else {
          setThread(parsedT);
        }
      }
    }
    focusInput();
  }, []);

  // Breathing Box loop
  React.useEffect(() => {
    if (breathState === "idle") {
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
      return;
    }

    breathIntervalRef.current = setInterval(() => {
      setBreathTimer((prev) => {
        if (prev <= 1) {
          setBreathState((current) => {
            switch (current) {
              case "inhale": return "hold1";
              case "hold1": return "exhale";
              case "exhale": return "hold2";
              case "hold2": return "inhale";
              default: return "idle";
            }
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
    };
  }, [breathState]);

  // Synthesize Soundscape client-side
  const startSynthesizedAudio = (type: "beats" | "rain") => {
    stopSynthesizedAudio();
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;
      const nodes: any[] = [];

      if (type === "beats") {
        const oscL = ctx.createOscillator();
        const oscR = ctx.createOscillator();
        const gainL = ctx.createGain();
        const gainR = ctx.createGain();
        const panL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        const panR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

        oscL.frequency.value = 200;
        oscR.frequency.value = 210;
        gainL.gain.value = 0.04;
        gainR.gain.value = 0.04;

        if (panL && panR) {
          panL.pan.value = -1;
          panR.pan.value = 1;
          oscL.connect(gainL).connect(panL).connect(ctx.destination);
          oscR.connect(gainR).connect(panR).connect(ctx.destination);
        } else {
          oscL.connect(gainL).connect(ctx.destination);
          oscR.connect(gainR).connect(ctx.destination);
        }
        oscL.start();
        oscR.start();
        nodes.push(oscL, oscR);
      } else if (type === "rain") {
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const source = ctx.createBufferSource();
        source.buffer = noiseBuffer;
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 420;

        const gain = ctx.createGain();
        gain.gain.value = 0.07;

        source.connect(filter).connect(gain).connect(ctx.destination);
        source.start();
        nodes.push(source);
      }

      audioNodesRef.current = nodes;
      setSoundscape(type);
      toast.success(`Playing synthesized ${type === "beats" ? "10Hz Focus Beats" : "Rain Wash"}.`);
    } catch (e) {
      toast.error("Audio Context initialization failed.");
    }
  };

  const stopSynthesizedAudio = () => {
    if (audioNodesRef.current.length > 0) {
      audioNodesRef.current.forEach(node => {
        try {
          node.stop();
          node.disconnect();
        } catch (e) {}
      });
      audioNodesRef.current = [];
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
    setSoundscape("none");
  };

  React.useEffect(() => {
    return () => stopSynthesizedAudio();
  }, []);

  const getBreathInstruction = () => {
    switch (breathState) {
      case "inhale": return "Inhale slowly...";
      case "hold1": return "Hold it...";
      case "exhale": return "Release...";
      case "hold2": return "Rest...";
      default: return "Ready";
    }
  };

  const getOpeningLine = () => {
    const hour = new Date().getHours();
    const isLate = hour >= 21 || hour < 5;
    const isMorning = hour >= 5 && hour < 11;
    const isAfternoon = hour >= 11 && hour < 17;
    const isEvening = hour >= 17 && hour < 21;

    if (profile.examType !== "Unknown" && profile.examType !== "General" && Math.random() > 0.5) {
      return `How is that ${profile.examType} prep sitting with you today?`;
    }

    if (profile.triggers.length > 0 && Math.random() > 0.6) {
      const trigger = profile.triggers[profile.triggers.length - 1];
      return `We talked about the pressure from ${trigger.toLowerCase()} recently. How are you carrying that right now?`;
    }

    if (isLate) return "It's late. Want to put today down before you sleep?";
    if (isMorning) return "Early start today. What's sitting on your mind this morning?";
    if (isAfternoon) return "Midday pause. How is the study pacing holding up?";
    if (isEvening) return "Evening check-in. Ready to unload some of the mental load?";
    
    return "No pressure to write much. Even one line is enough.";
  };

  const [openingLine, setOpeningLine] = React.useState("");

  React.useEffect(() => {
    setOpeningLine(getOpeningLine());
  }, [profile]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isTyping) return;

    const currentText = inputText;
    setInputText("");
    setIsTyping(true);

    const userMessage: DialogueMessage = {
      role: "user",
      content: currentText,
      timestamp: new Date().toISOString()
    };

    const newThread = [...thread, userMessage];
    setThread(newThread);
    localStorage.setItem("mindpulse_thread_v3", JSON.stringify(newThread));

    try {
      const reply = await submitMessageAction(currentText, thread.slice(-6), profile);

      const companionMessage: DialogueMessage = {
        role: "companion",
        content: reply.companionReply,
        timestamp: new Date().toISOString()
      };

      const updatedThread = [...newThread, companionMessage];
      setThread(updatedThread);
      setLatestSuggestedAction(reply.suggestedMicroAction);
      localStorage.setItem("mindpulse_thread_v3", JSON.stringify(updatedThread));
    } catch (err) {
      toast.error("Companion connection is slow.");
    } finally {
      setIsTyping(false);
      focusInput();
    }
  };

  const handleCloseSitting = async () => {
    if (thread.length === 0) return;

    setIsAnalyzingSession(true);
    toast.info("Reflecting on today's sitting...");

    try {
      const result = await closeSessionAction(thread, profile);

      const newAnalysis: SavedSessionAnalysis = {
        detectedPattern: result.analysis.detectedPattern,
        patternReflection: result.analysis.patternReflection,
        moodSignal: result.analysis.moodSignal,
        stressLevel: result.analysis.stressLevel,
        timestamp: new Date().toISOString()
      };

      const updatedAnalyses = [...savedAnalyses, newAnalysis];
      
      setProfile(result.updatedProfile);
      setSavedAnalyses(updatedAnalyses);
      setLatestAnalysis(newAnalysis);
      setThread([]);
      setLatestSuggestedAction(null);

      localStorage.setItem("mindpulse_profile_v3", JSON.stringify(result.updatedProfile));
      localStorage.setItem("mindpulse_analyses_v3", JSON.stringify(updatedAnalyses));
      localStorage.setItem("mindpulse_latest_analysis_v3", JSON.stringify(newAnalysis));
      localStorage.removeItem("mindpulse_thread_v3");

      setIsLookingBackOpen(true);
    } catch (e) {
      toast.error("Could not compile reflection.");
    } finally {
      setIsAnalyzingSession(false);
    }
  };

  const handleClearMemory = () => {
    localStorage.removeItem("mindpulse_profile_v3");
    localStorage.removeItem("mindpulse_thread_v3");
    localStorage.removeItem("mindpulse_analyses_v3");
    localStorage.removeItem("mindpulse_latest_analysis_v3");

    setProfile(INITIAL_PROFILE);
    setThread([]);
    setSavedAnalyses([]);
    setLatestAnalysis(null);
    setLatestSuggestedAction(null);
    setInputText("");
    stopSynthesizedAudio();
    toast.success("All memory cleared.");
  };

  const getStressColorClass = (level: number) => {
    if (level <= 3) return "bg-blue-100 text-blue-800";
    if (level <= 6) return "bg-blue-300 text-blue-900";
    return "bg-[#2563EB] text-white";
  };

  const getLatestVoiceMessage = () => {
    if (thread.length === 0) return openingLine;
    const last = thread[thread.length - 1];
    return last.role === "companion" ? last.content : "Listening...";
  };

  const animationClass = reducedMotion ? "transition-none" : `transition-all duration-[500ms] ease-[cubic-bezier(0.32,0.72,0,1)]`;

  return (
    <div className="flex-1 flex flex-col bg-[#FDFBF7] text-[#111827] font-sans selection:bg-blue-500/10 selection:text-blue-700 min-h-[100dvh] relative justify-between overflow-x-hidden">
      
      {/* Film grain noise overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 bg-[radial-gradient(rgba(0,0,0,0.012)_1px,transparent_0)] bg-[size:16px_16px] opacity-[0.3]" />

      {/* HEADER UTILITIES */}
      <header className="px-6 py-5 flex items-center justify-between z-30 max-w-2xl w-full mx-auto bg-transparent">
        <div className="flex items-center gap-2">
          {/* ACCESSIBILITY: Semantic Heading structure */}
          <h1 className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-[#111827]/60">
            <span className="w-2 h-2 rounded-full bg-[#2563EB]" aria-hidden="true" />
            MindPulse
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (soundscape === "none") startSynthesizedAudio("beats");
              else if (soundscape === "beats") startSynthesizedAudio("rain");
              else stopSynthesizedAudio();
            }}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all border border-[#111827]/10 bg-white hover:bg-slate-50 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-label="Toggle synthesized soundscapes"
          >
            {soundscape !== "none" ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <Dialog>
            <DialogTrigger render={
              <button 
                className="w-7 h-7 rounded-full border border-red-200 bg-red-50/50 hover:bg-red-50 flex items-center justify-center text-red-600 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                aria-label="Crisis Support Helplines"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
              </button>
            } />
            <DialogContent className="bg-white border-slate-200 text-[#111827] max-w-sm rounded-xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600 text-sm font-extrabold uppercase tracking-wider">
                  Crisis Helplines
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-[11px] leading-relaxed">
                  If preparation anxiety is feeling unmanageable, please talk to professionals right now.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2.5 my-1 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="font-bold">Vandrevala Foundation Support</p>
                  <p className="text-[#2563EB] font-mono font-semibold mt-0.5">9999 666 555</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {savedAnalyses.length > 0 && (
            <button 
              onClick={handleClearMemory}
              className="text-[9px] font-bold text-red-600 hover:text-red-700 bg-white hover:bg-red-50 border border-[#111827]/5 px-2.5 py-1 rounded-md transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label="Reset Dialogue Memory"
            >
              Reset
            </button>
          )}
        </div>
      </header>

      {/* CORE EXPERIENCE COLUMN */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 flex flex-col justify-center relative">
        <div className={`w-full space-y-8 py-8 ${animationClass}`}>
          
          {/* ACCESSIBILITY: aria-live region to ensure screen readers speak responses */}
          <div className="space-y-4" aria-live="polite">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827] leading-relaxed select-text font-heading whitespace-pre-line">
              {isTyping ? (
                <span className="flex items-center gap-1.5 py-2 text-slate-400" aria-label="Companion is typing">
                  <span className="w-2 h-2 bg-[#2563EB]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[#2563EB]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-[#2563EB]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              ) : (
                getLatestVoiceMessage()
              )}
            </h2>
          </div>

          {/* ACTIVE DIALOGUE MESSAGE LIST */}
          {thread.length > 1 && (
            <div className="space-y-2 pl-4 border-l border-slate-200 max-h-[140px] overflow-y-auto py-1.5 mask-linear">
              {thread.slice(0, -1).map((msg, index) => (
                <div key={index} className="text-xs">
                  <span className={`font-extrabold ${msg.role === 'user' ? 'text-slate-400' : 'text-[#2563EB]/70'}`}>
                    {msg.role === 'user' ? 'You: ' : 'Companion: '}
                  </span>
                  <span className="text-slate-500 font-medium">{msg.content}</span>
                </div>
              ))}
            </div>
          )}

          {/* SINGLE CORE INPUT FIELD */}
          <form onSubmit={handleSendMessage} className="relative">
            {/* ACCESSIBILITY: visually hidden label linked to input */}
            <label htmlFor="student-dialogue-input" className="sr-only">
              Share your thoughts, exams triggers, or backlogs with your companion
            </label>
            <div className="rounded-[2.2rem] p-1.5 bg-[#111827]/5 ring-1 ring-[#111827]/5 shadow-xs">
              <div className="rounded-[calc(2.2rem-0.375rem)] bg-white p-4.5 border border-[#111827]/5 flex gap-2 h-16 items-center">
                <input
                  id="student-dialogue-input"
                  ref={inputRef}
                  placeholder="Share a study backlog, parent pressure, or reply..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isTyping}
                  className="flex-1 border-0 bg-transparent text-[#111827] placeholder:text-slate-400 focus-visible:ring-0 focus-visible:outline-none text-sm font-semibold leading-relaxed h-full pr-2 focus:ring-0"
                  autoFocus
                />
                <button 
                  type="submit" 
                  disabled={isTyping || !inputText.trim()}
                  className="bg-[#2563EB] hover:bg-blue-700 text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  aria-label="Send message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </form>

          {/* INTERACTION TRIMMINGS */}
          <div className="flex flex-wrap items-center gap-3 pt-2 justify-between">
            <div className="flex items-center gap-2">
              {thread.length > 0 && (
                <button 
                  onClick={handleCloseSitting}
                  disabled={isAnalyzingSession}
                  className="text-[10px] font-bold text-slate-500 hover:text-[#2563EB] border border-[#111827]/5 bg-white px-4.5 py-2 rounded-full cursor-pointer hover:border-blue-100 hover:bg-blue-50/50 transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  {isAnalyzingSession ? "Reflecting..." : "Close Sitting / Compile Day"}
                </button>
              )}

              {savedAnalyses.length > 0 && (
                <button 
                  onClick={() => setIsLookingBackOpen(true)}
                  className="text-[10px] font-bold text-[#2563EB] bg-blue-50 border border-blue-100 px-4.5 py-2 rounded-full cursor-pointer hover:bg-blue-100/80 transition-all inline-flex items-center gap-1.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <Calendar className="w-3 h-3" />
                  Patterns & Reflection
                </button>
              )}
            </div>

            {/* Suggested Micro-action invitation */}
            {latestSuggestedAction && (
              <button 
                onClick={() => {
                  if (latestSuggestedAction.label.toLowerCase().includes("breathe")) {
                    setBreathState("inhale");
                    setBreathTimer(4);
                    setIsBreathingOpen(true);
                  } else {
                    startSynthesizedAudio("beats");
                  }
                }}
                className="text-[10px] font-bold text-[#2563EB] border border-blue-200 bg-blue-50 px-4.5 py-2 rounded-full cursor-pointer hover:bg-blue-100 transition-all flex items-center gap-1 shadow-2xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <Sparkles className="w-3 h-3 animate-pulse" />
                {latestSuggestedAction.label} ({latestSuggestedAction.durationMinutes}m)
              </button>
            )}
          </div>

        </div>
      </main>

      {/* GUIDED BREATHING OVERLAY */}
      {isBreathingOpen && (
        <div className="fixed inset-0 bg-[#FDFBF7] z-50 flex flex-col items-center justify-center p-6 animate-fade-in" role="dialog" aria-modal="true" aria-label="Guided box breathing exercise">
          <button 
            onClick={() => {
              setBreathState("idle");
              setIsBreathingOpen(false);
            }}
            className="absolute top-6 right-6 w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-label="Close box breathing exercise"
          >
            <X className="w-4 h-4 text-slate-700" />
          </button>

          <div className="text-center space-y-12 max-w-sm flex flex-col items-center">
            <div className="space-y-2">
              <span className="text-[10px] font-bold tracking-widest text-[#2563EB] uppercase block">Breathing Anchor</span>
              <h3 className="text-2xl font-extrabold tracking-tight">Box Breathing Reset</h3>
            </div>

            <div 
              className={`rounded-full border-4 flex flex-col items-center justify-center transition-all duration-[4000ms] ease-in-out ${
                breathState === "inhale" ? "w-48 h-48 border-[#2563EB] bg-[#2563EB]/5 scale-110 shadow-md" :
                breathState === "hold1" ? "w-48 h-48 border-amber-300 bg-amber-50/50 scale-110 shadow-xs" :
                breathState === "exhale" ? "w-36 h-36 border-[#2563EB] bg-[#2563EB]/5 scale-90" :
                breathState === "hold2" ? "w-36 h-36 border-slate-200 bg-slate-50 scale-90" :
                "w-40 h-40 border-slate-200 bg-slate-50"
              }`}
              aria-live="assertive"
            >
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                {getBreathInstruction()}
              </p>
              {breathState !== "idle" && (
                <p className="text-3xl font-extrabold text-[#111827] font-mono mt-1">
                  {breathTimer}s
                </p>
              )}
            </div>

            <Button
              onClick={() => {
                if (breathState === "idle") {
                  setBreathState("inhale");
                  setBreathTimer(4);
                } else {
                  setBreathState("idle");
                }
              }}
              className="bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs px-8 h-10 rounded-full border-0 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {breathState === "idle" ? "Begin Exercise" : "Pause"}
            </Button>
          </div>
        </div>
      )}

      {/* LOOKING BACK REFLECTION & HEATMAP */}
      {isLookingBackOpen && (
        <div className="fixed inset-0 bg-[#FDFBF7] z-50 flex flex-col items-center justify-center p-6 animate-fade-in overflow-y-auto" role="dialog" aria-modal="true" aria-label="Dialogue reflections and stress heatmap">
          <div className="max-w-md w-full bg-white border border-[#111827]/5 rounded-2xl p-6 relative shadow-xs">
            <button 
              onClick={() => setIsLookingBackOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full border border-slate-100 flex items-center justify-center hover:bg-slate-50 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label="Close reflections"
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>

            <div className="space-y-6">
              <div className="space-y-1 text-left">
                <span className="text-[10px] font-bold tracking-widest text-[#2563EB] uppercase block" id="reflections-eyebrow">Sitting Reflections</span>
                <h3 className="text-xl font-extrabold text-[#111827] tracking-tight" id="reflections-title">Looking Back</h3>
              </div>

              {latestAnalysis && (
                <div className="p-4 bg-slate-50 border border-slate-200/50 rounded-xl space-y-3.5 text-xs text-slate-700 leading-relaxed font-semibold">
                  {latestAnalysis.detectedPattern && (
                    <span className="font-extrabold text-[#2563EB] uppercase text-[9px] tracking-wider block mb-1">
                      Pattern Loop: {latestAnalysis.detectedPattern}
                    </span>
                  )}
                  <p>{latestAnalysis.patternReflection || "No distinct logical patterns detected across this sitting."}</p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Exam context fact trend: target prep milestone is {profile.examType !== "Unknown" ? profile.examType : "active"}.
                  </p>
                </div>
              )}

              {/* Stress Calendar Heatmap */}
              <div className="space-y-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Stress Heatmap (Recent Sittings)</span>
                
                <div className="flex gap-2 flex-wrap justify-start items-center p-3 border border-slate-100 rounded-lg bg-slate-50/50" role="img" aria-label="Visual calendar of recent stress logs">
                  {savedAnalyses.slice(-28).map((anal, idx) => (
                    <div 
                      key={idx}
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-mono font-bold transition-all ${
                        getStressColorClass(anal.stressLevel)
                      }`}
                      title={`Sitting of ${new Date(anal.timestamp).toLocaleDateString()}: Stress Level ${anal.stressLevel}/10`}
                    >
                      {anal.stressLevel}
                    </div>
                  ))}
                  {savedAnalyses.length === 0 && (
                    <p className="text-[11px] text-slate-400">Heatmap will populate once you close a dialogue sitting.</p>
                  )}
                </div>
                
                <div className="flex justify-between text-[9px] font-bold text-slate-400 px-1">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-100" /> Calm (1-3)</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-300" /> Focus (4-6)</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#2563EB]" /> High Stress (7+)</span>
                </div>
              </div>

              <Button 
                onClick={() => setIsLookingBackOpen(false)}
                className="w-full bg-[#111827] hover:bg-slate-800 text-white font-bold text-xs h-9.5 rounded-full cursor-pointer border-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Continue Sitting
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="px-6 py-4 flex items-center justify-center text-center text-[#111827]/40 z-20">
        <p className="text-[9px] uppercase tracking-widest font-extrabold">
          MindPulse — Distraction-free Dialogue Space
        </p>
      </footer>
    </div>
  );
}
