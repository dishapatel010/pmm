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
  Compass,
  Menu,
  Plus,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { submitMessageAction, closeSessionAction, getThreadListAction, getThreadMessagesAction, reframeNegativeThoughtAction } from "./actions";
import { DialogueMessage, StudentProfile, SavedSessionAnalysis, DialogueThread, WidgetMessage, AnyMessage } from "@/lib/types";
import { OnboardingFlow, buildOpeningLine, type OnboardingAnswers } from "@/components/OnboardingFlow";
import { MicroActionCard, type MicroActionFeedback } from "@/components/MicroActionCard";
import { MoodCheck } from "@/components/MoodCheck";
import { CompanionChoice } from "@/components/CompanionChoice";
import { ReframeWidget } from "@/components/ReframeWidget";

const INITIAL_PROFILE: StudentProfile = {
  name: "",
  examType: "Unknown",
  moodTrend: "Unknown",
  triggers: [],
  lastTopics: []
};

export default function Home() {
  const [profile, setProfile] = React.useState<StudentProfile>(INITIAL_PROFILE);
  const [thread, setThread] = React.useState<AnyMessage[]>([]);
  const [widgetMessages, setWidgetMessages] = React.useState<WidgetMessage[]>([]);
  const [savedAnalyses, setSavedAnalyses] = React.useState<SavedSessionAnalysis[]>([]);
  
  // Threads History States
  const [threads, setThreads] = React.useState<DialogueThread[]>([]);
  const [activeThreadId, setActiveThreadId] = React.useState<string>("");
  const [threadListMetadata, setThreadListMetadata] = React.useState<Omit<DialogueThread, "messages">[]>([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState<boolean>(false);
  // Onboarding: true when this is a brand-new user with no stored data
  const [isOnboarding, setIsOnboarding] = React.useState<boolean>(false);

  const [inputText, setInputText] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);
  const [latestSuggestedAction, setLatestSuggestedAction] = React.useState<{ label: string, durationMinutes: number } | null>(null);
  const [latestSuggestedMoodCheck, setLatestSuggestedMoodCheck] = React.useState<{ question: string, minLabel?: string, maxLabel?: string } | null>(null);
  const [latestSuggestedChoice, setLatestSuggestedChoice] = React.useState<{ id: string, question: string, options: { label: string, value: string }[], allowMultiple?: boolean, allowSkip?: boolean } | null>(null);
  
  // Mascot Wellness Pet States
  const [petMascot, setPetMascot] = React.useState<"cat" | "owl" | "panda">("cat");
  const [petStatus, setPetStatus] = React.useState<string>("Purr... ready to breathe when you are!");
  const [isPetMenuOpen, setIsPetMenuOpen] = React.useState<boolean>(false);
  const [activeReframeOriginalThought, setActiveReframeOriginalThought] = React.useState<string | null>(null);
  
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

  // Load state on mount with legacy migration layer
  React.useEffect(() => {
    // Check if new keys exist
    const savedP = localStorage.getItem("mindpulse_profile_v3");
    const savedT = localStorage.getItem("mindpulse_thread_v3");
    const savedA = localStorage.getItem("mindpulse_analyses_v3");
    const savedLA = localStorage.getItem("mindpulse_latest_analysis_v3");

    // Read legacy keys
    const legacyProfile = localStorage.getItem("mindpulse_profile");
    const legacyResponse = localStorage.getItem("mindpulse_latest_response");
    const legacyAnalysis = localStorage.getItem("mindpulse_latest_analysis");

    let migratedProfile: StudentProfile | null = savedP ? JSON.parse(savedP) : null;
    let migratedThread: DialogueMessage[] | null = savedT ? JSON.parse(savedT) : null;
    let migratedAnalyses: SavedSessionAnalysis[] | null = savedA ? JSON.parse(savedA) : null;
    let migratedLA: SavedSessionAnalysis | null = savedLA ? JSON.parse(savedLA) : null;

    // Migrate Profile
    if (!savedP && legacyProfile) {
      try {
        const parsedLegacyP = JSON.parse(legacyProfile);
        migratedProfile = {
          name: parsedLegacyP.name || "",
          examType: parsedLegacyP.examType || "Unknown",
          moodTrend: parsedLegacyP.moodTrend || parsedLegacyP.mood || "Unknown",
          triggers: parsedLegacyP.triggers || [],
          lastTopics: parsedLegacyP.lastTopics || []
        };
        localStorage.setItem("mindpulse_profile_v3", JSON.stringify(migratedProfile));
      } catch (e) {
        console.error("Failed to migrate legacy profile", e);
      }
    }

    if (migratedProfile) {
      setProfile(migratedProfile);
    }

    // Migrate Analyses
    if (!savedA && legacyAnalysis) {
      try {
        const parsedLegacyA = JSON.parse(legacyAnalysis);
        const singleAnalysis: SavedSessionAnalysis = {
          detectedPattern: parsedLegacyA.detectedPattern || null,
          patternReflection: parsedLegacyA.patternReflection || null,
          moodSignal: parsedLegacyA.moodSignal || "Unknown",
          stressLevel: typeof parsedLegacyA.stressLevel === "number" ? parsedLegacyA.stressLevel : 5,
          timestamp: parsedLegacyA.timestamp || new Date().toISOString()
        };
        migratedAnalyses = [singleAnalysis];
        migratedLA = singleAnalysis;
        localStorage.setItem("mindpulse_analyses_v3", JSON.stringify(migratedAnalyses));
        localStorage.setItem("mindpulse_latest_analysis_v3", JSON.stringify(migratedLA));
      } catch (e) {
        console.error("Failed to migrate legacy analysis", e);
      }
    }

    if (migratedAnalyses) {
      setSavedAnalyses(migratedAnalyses);
    }
    if (migratedLA) {
      setLatestAnalysis(migratedLA);
    }

    // Migrate Thread/Response
    if (!savedT && legacyResponse) {
      try {
        let content = legacyResponse;
        try {
          const parsed = JSON.parse(legacyResponse);
          if (typeof parsed === "string") {
            content = parsed;
          } else if (Array.isArray(parsed)) {
            migratedThread = parsed.map((m: any) => ({
              role: m.role || "companion",
              content: m.content || "",
              timestamp: m.timestamp || new Date().toISOString()
            }));
          } else if (parsed && parsed.companionReply) {
            content = parsed.companionReply;
          }
        } catch {
          // Plain text
        }

        if (!migratedThread && content) {
          migratedThread = [
            {
              role: "companion",
              content: content,
              timestamp: new Date().toISOString()
            }
          ];
        }

        if (migratedThread) {
          localStorage.setItem("mindpulse_thread_v3", JSON.stringify(migratedThread));
        }
      } catch (e) {
        console.error("Failed to migrate legacy response/thread", e);
      }
    }

    // Load and initialize threads list
    const savedThreads = localStorage.getItem("mindpulse_threads_list_v3");
    let loadedThreads: DialogueThread[] = [];
    if (savedThreads) {
      try {
        loadedThreads = JSON.parse(savedThreads);
      } catch (e) {
        console.error("Failed to parse saved threads list", e);
      }
    }

    // ── First-visit detection ──────────────────────────────────────────────
    // Show onboarding if: no v3 profile saved AND no threads list saved.
    // Legacy migration already ran above — if a migrated profile was found,
    // migratedProfile will be non-null and we skip onboarding.
    const isFirstVisit = !savedP && !legacyProfile && !savedThreads;
    if (isFirstVisit) {
      setIsOnboarding(true);
      return; // Skip all thread init — onboarding will create the first thread
    }

    // Wrap current open thread if none exists in list
    if (loadedThreads.length === 0) {
      const activeMsgs = (migratedThread && migratedThread.length > 0) ? migratedThread : [];
      const firstMsgText = activeMsgs.find(m => m.role === "user")?.content || "Current Sitting";
      const words = firstMsgText.trim().split(/\s+/);
      const title = words.slice(0, 7).join(" ") + (words.length > 7 ? "..." : "");
      
      const defaultThread: DialogueThread = {
        id: "thread_" + Date.now(),
        createdAt: new Date().toISOString(),
        title: title,
        messages: activeMsgs,
        closed: false
      };
      loadedThreads = [defaultThread];
      localStorage.setItem("mindpulse_threads_list_v3", JSON.stringify(loadedThreads));
    }

    setThreads(loadedThreads);

    // Call server action to load metadata of threads
    const fetchMetadata = async (allThreads: DialogueThread[]) => {
      try {
        const list = await getThreadListAction(allThreads);
        setThreadListMetadata(list);
      } catch (e) {
        console.error("Failed to fetch thread list metadata", e);
      }
    };
    fetchMetadata(loadedThreads);

    // Determine active thread
    const active = loadedThreads.find(t => !t.closed) || loadedThreads[0];
    if (active) {
      setActiveThreadId(active.id);
      // Fetch full messages from server action
      const loadMessages = async () => {
        try {
          const msgs = await getThreadMessagesAction(active.id, loadedThreads);
          setThread(msgs);
        } catch (e) {
          console.error("Failed to load thread messages", e);
        }
      };
      loadMessages();
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

  /**
   * appendWidgetResult — stores a widget interaction result as a WidgetMessage
   * in the thread so it's available for end-of-sitting analysis.
   */
  const appendWidgetResult = (
    widgetType: WidgetMessage["widgetType"],
    result: WidgetMessage["result"],
    summary: string
  ) => {
    const msg: WidgetMessage = {
      role: "companion-widget",
      widgetType,
      summary,
      result,
      timestamp: new Date().toISOString(),
    };
    const newThread = [...thread, msg];
    setThread(newThread);
    localStorage.setItem("mindpulse_thread_v3", JSON.stringify(newThread));

    const updatedThreads = threads.map((t) =>
      t.id === activeThreadId ? { ...t, messages: newThread as DialogueMessage[] } : t
    );
    setThreads(updatedThreads);
    localStorage.setItem("mindpulse_threads_list_v3", JSON.stringify(updatedThreads));
  };

  const handleMicroActionComplete = (feedback: MicroActionFeedback) => {
    if (!latestSuggestedAction) return;
    setLatestSuggestedAction(null);
    appendWidgetResult(
      "micro-action",
      { type: "micro-action", feedback },
      `${latestSuggestedAction.label} — ${feedback === "helped" ? "Helped 🙂" : feedback === "not_really" ? "Not really" : feedback === "meh" ? "Meh" : "Skipped"}`
    );
  };

  const handleMoodCheckAnswer = (value: number) => {
    if (!latestSuggestedMoodCheck) return;
    setLatestSuggestedMoodCheck(null);
    appendWidgetResult(
      "mood-check",
      { type: "mood-check", stressLevel: value },
      `Stress level check: ${value}/10`
    );
  };

  const handleChoiceAnswer = (value: string | string[]) => {
    if (!latestSuggestedChoice) return;
    const choice = latestSuggestedChoice;
    setLatestSuggestedChoice(null);
    const displayValues = Array.isArray(value) ? value : [value];
    const displayLabels = displayValues
      .map((v) => choice.options.find((o) => o.value === v)?.label ?? v)
      .filter(Boolean)
      .join(", ");

    appendWidgetResult(
      "micro-action",
      { type: "micro-action", feedback: "helped" },
      `${choice.question} — Answered: ${displayLabels}`
    );
  };

  const handleReframeDone = (
    original: string,
    reframed: string,
    feedbackVal: "yeah_kind_of" | "not_really" | "still_struggling" | "no_thanks"
  ) => {
    setActiveReframeOriginalThought(null);
    
    // Add widget result message
    const widgetMsg: WidgetMessage = {
      role: "companion-widget",
      widgetType: "reframe",
      summary: `Reframe Activity: ${feedbackVal === "no_thanks" ? "Declined" : "Completed"}`,
      result: {
        type: "reframe",
        originalThought: original,
        reframedThought: reframed,
        feedback: feedbackVal
      },
      timestamp: new Date().toISOString()
    };

    // If yes and reframed, add reframed thought as companion reply and feedback as user reply
    let newMsgs: AnyMessage[] = [...thread, widgetMsg];
    if (feedbackVal !== "no_thanks" && reframed) {
      const companionMsg: DialogueMessage = {
        role: "companion",
        content: reframed,
        timestamp: new Date().toISOString()
      };
      
      const userFeedbackLabel =
        feedbackVal === "yeah_kind_of" ? "Yeah, kind of" :
        feedbackVal === "not_really" ? "Not really" :
        "Still struggling";

      const userMsg: DialogueMessage = {
        role: "user",
        content: userFeedbackLabel,
        timestamp: new Date().toISOString()
      };
      newMsgs = [...newMsgs, companionMsg, userMsg];

      // If Not really or Still struggling, companion responds warmly without pushing further
      if (feedbackVal === "not_really" || feedbackVal === "still_struggling") {
        const warmFallbackMsg: DialogueMessage = {
          role: "companion",
          content: "That is completely fine. We don't have to get it perfect today. Just take it one step at a time.",
          timestamp: new Date().toISOString()
        };
        newMsgs = [...newMsgs, warmFallbackMsg];
      }
    } else if (feedbackVal === "no_thanks") {
      // User chose No thanks
      const warmFallbackMsg: DialogueMessage = {
        role: "companion",
        content: "No pressure at all dost. We'll take things at your pace.",
        timestamp: new Date().toISOString()
      };
      newMsgs = [...newMsgs, warmFallbackMsg];
    }

    setThread(newMsgs);
    localStorage.setItem("mindpulse_thread_v3", JSON.stringify(newMsgs));

    const updatedThreads = threads.map((t) =>
      t.id === activeThreadId ? { ...t, messages: newMsgs as DialogueMessage[] } : t
    );
    setThreads(updatedThreads);
    localStorage.setItem("mindpulse_threads_list_v3", JSON.stringify(updatedThreads));
  };


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

    // Reset active suggestions
    setLatestSuggestedAction(null);
    setLatestSuggestedMoodCheck(null);
    setLatestSuggestedChoice(null);

    const currentText = inputText;
    setInputText("");
    setIsTyping(true);

    const userMessage: DialogueMessage = {
      role: "user",
      content: currentText,
      timestamp: new Date().toISOString()
    };

    const newThreadMessages = [...thread, userMessage];
    setThread(newThreadMessages);
    localStorage.setItem("mindpulse_thread_v3", JSON.stringify(newThreadMessages));

    // Update threads collection
    const updatedThreads = threads.map(t => {
      if (t.id === activeThreadId) {
        let title = t.title;
        // Generate title if it's the first message or a placeholder
        if (t.messages.length === 0 || t.title === "Current Sitting" || t.title === "New Conversation") {
          const words = currentText.trim().split(/\s+/);
          title = words.slice(0, 7).join(" ") + (words.length > 7 ? "..." : "");
        }
        return {
          ...t,
          title,
          messages: newThreadMessages
        };
      }
      return t;
    });
    setThreads(updatedThreads);
    localStorage.setItem("mindpulse_threads_list_v3", JSON.stringify(updatedThreads));
    
    try {
      const list = await getThreadListAction(updatedThreads);
      setThreadListMetadata(list);
    } catch (e) {}

    try {
      const reply = await submitMessageAction(currentText, thread.slice(-6), profile);

      const companionMessage: DialogueMessage = {
        role: "companion",
        content: reply.safetyFlag ? (reply.safetyResponse || reply.companionReply) : reply.companionReply,
        timestamp: new Date().toISOString(),
        safetyFlag: reply.safetyFlag
      };

      const finalThreadMessages = [...newThreadMessages, companionMessage];
      setThread(finalThreadMessages);
      setLatestSuggestedAction(reply.safetyFlag ? null : reply.suggestedMicroAction);
      setLatestSuggestedMoodCheck(reply.safetyFlag ? null : (reply.suggestedMoodCheck ?? null));
      if (!reply.safetyFlag && reply.suggestedChoice?.id === "reframe-trigger") {
        setActiveReframeOriginalThought(currentText);
        setLatestSuggestedChoice(null); // Clear suggestedChoice, we will render ReframeWidget instead
      } else {
        setLatestSuggestedChoice(reply.safetyFlag ? null : (reply.suggestedChoice ?? null));
      }
      localStorage.setItem("mindpulse_thread_v3", JSON.stringify(finalThreadMessages));

      const finalThreads = updatedThreads.map(t => {
        if (t.id === activeThreadId) {
          return {
            ...t,
            messages: finalThreadMessages
          };
        }
        return t;
      });
      setThreads(finalThreads);
      localStorage.setItem("mindpulse_threads_list_v3", JSON.stringify(finalThreads));
      
      try {
        const list = await getThreadListAction(finalThreads);
        setThreadListMetadata(list);
      } catch (e) {}
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
      setLatestSuggestedMoodCheck(null);
      setLatestSuggestedChoice(null);

      // Close thread and store analysis results in it
      const finalThreads = threads.map(t => {
        if (t.id === activeThreadId) {
          return {
            ...t,
            moodSignal: result.analysis.moodSignal,
            stressLevel: result.analysis.stressLevel,
            closed: true
          };
        }
        return t;
      });

      setThreads(finalThreads);
      localStorage.setItem("mindpulse_profile_v3", JSON.stringify(result.updatedProfile));
      localStorage.setItem("mindpulse_analyses_v3", JSON.stringify(updatedAnalyses));
      localStorage.setItem("mindpulse_latest_analysis_v3", JSON.stringify(newAnalysis));
      localStorage.setItem("mindpulse_threads_list_v3", JSON.stringify(finalThreads));
      localStorage.removeItem("mindpulse_thread_v3");

      try {
        const list = await getThreadListAction(finalThreads);
        setThreadListMetadata(list);
      } catch (e) {}

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
    localStorage.removeItem("mindpulse_threads_list_v3");

    // Also remove legacy keys
    localStorage.removeItem("mindpulse_profile");
    localStorage.removeItem("mindpulse_latest_response");
    localStorage.removeItem("mindpulse_latest_analysis");

    setProfile(INITIAL_PROFILE);
    setThread([]);
    setThreads([]);
    setThreadListMetadata([]);
    setSavedAnalyses([]);
    setLatestAnalysis(null);
    setLatestSuggestedAction(null);
    setInputText("");
    stopSynthesizedAudio();
    toast.success("All memory cleared.");
  };

  /**
   * handleOnboardingComplete — called when the user finishes the onboarding flow.
   * Creates the StudentProfile, writes it to localStorage, creates the first
   * thread with a personalized welcome companion message, and exits onboarding.
   */
  const handleOnboardingComplete = async (onboardingAnswers: OnboardingAnswers) => {
    // Build profile from answers
    const newProfile: StudentProfile = {
      name: onboardingAnswers.name,
      examType: onboardingAnswers.targetExam || "Unknown",
      moodTrend: "Unknown",
      triggers: onboardingAnswers.stressPatterns,
      lastTopics: [],
    };

    // Personalized companion opening line
    const welcomeText = buildOpeningLine(onboardingAnswers);

    const welcomeMessage: DialogueMessage = {
      role: "companion",
      content: welcomeText,
      timestamp: new Date().toISOString(),
    };

    // Create first thread
    const firstThreadId = "thread_" + Date.now();
    const firstThread: DialogueThread = {
      id: firstThreadId,
      createdAt: new Date().toISOString(),
      title: "First Sitting",
      messages: [welcomeMessage],
      closed: false,
    };

    const allThreads = [firstThread];

    // Persist
    localStorage.setItem("mindpulse_profile_v3", JSON.stringify(newProfile));
    localStorage.setItem("mindpulse_threads_list_v3", JSON.stringify(allThreads));
    localStorage.setItem("mindpulse_thread_v3", JSON.stringify([welcomeMessage]));

    // Update state
    setProfile(newProfile);
    setThreads(allThreads);
    setActiveThreadId(firstThreadId);
    setThread([welcomeMessage]);
    setIsOnboarding(false);

    // Fetch metadata
    try {
      const list = await getThreadListAction(allThreads);
      setThreadListMetadata(list);
    } catch (e) {}

    setTimeout(() => focusInput(), 100);
  };

  const handleOnboardingSkip = () => {
    // Create a minimal default profile and empty first thread
    const defaultProfile: StudentProfile = { ...INITIAL_PROFILE };
    const firstThreadId = "thread_" + Date.now();
    const firstThread: DialogueThread = {
      id: firstThreadId,
      createdAt: new Date().toISOString(),
      title: "First Sitting",
      messages: [],
      closed: false,
    };
    localStorage.setItem("mindpulse_profile_v3", JSON.stringify(defaultProfile));
    localStorage.setItem("mindpulse_threads_list_v3", JSON.stringify([firstThread]));
    setProfile(defaultProfile);
    setThreads([firstThread]);
    setActiveThreadId(firstThreadId);
    setThread([]);
    setIsOnboarding(false);
    setTimeout(() => focusInput(), 100);
  };

  const handleStartNewConversation = async () => {
    const newId = "thread_" + Date.now();
    const newThread: DialogueThread = {
      id: newId,
      createdAt: new Date().toISOString(),
      title: "New Conversation",
      messages: [],
      closed: false
    };

    const updatedThreads = [newThread, ...threads];
    setThreads(updatedThreads);
    setActiveThreadId(newId);
    setThread([]);
    setLatestSuggestedAction(null);
    setLatestSuggestedMoodCheck(null);
    setLatestSuggestedChoice(null);
    localStorage.setItem("mindpulse_threads_list_v3", JSON.stringify(updatedThreads));

    try {
      const list = await getThreadListAction(updatedThreads);
      setThreadListMetadata(list);
    } catch (e) {}
    setIsMobileSidebarOpen(false);
    focusInput();
  };

  const handleSelectThread = async (id: string) => {
    setActiveThreadId(id);
    try {
      const msgs = await getThreadMessagesAction(id, threads);
      setThread(msgs);
    } catch (e) {
      console.error(e);
    }
    setIsMobileSidebarOpen(false);
  };

  const getRelativeDateLabel = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const today = new Date();
      const diffTime = Math.abs(today.setHours(0,0,0,0) - date.setHours(0,0,0,0));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      return `${diffDays} days ago`;
    } catch (e) {
      return "Unknown";
    }
  };

  const getMoodDotColor = (mood?: string) => {
    if (!mood || mood === "Unknown") return "bg-slate-300";
    const m = mood.toLowerCase();
    if (m.includes("anxious") || m.includes("stress") || m.includes("panick") || m.includes("overwhelm")) return "bg-red-400";
    if (m.includes("hope") || m.includes("determined") || m.includes("confid")) return "bg-emerald-400";
    if (m.includes("fatig") || m.includes("tir") || m.includes("stuck")) return "bg-amber-400";
    return "bg-[#2563EB]";
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

  const activeThread = threads.find(t => t.id === activeThreadId);
  const isClosed = activeThread ? activeThread.closed : false;
  const animationClass = reducedMotion ? "transition-none" : `transition-all duration-[500ms] ease-[cubic-bezier(0.32,0.72,0,1)]`;

  return (
    <div className="flex-1 flex bg-[#FDFBF7] text-[#111827] font-sans selection:bg-blue-500/10 selection:text-blue-700 min-h-[100dvh] relative overflow-hidden">
      
      {/* Film grain noise overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 bg-[radial-gradient(rgba(0,0,0,0.012)_1px,transparent_0)] bg-[size:16px_16px] opacity-[0.3]" />

      {/* DESKTOP SIDEBAR / MOBILE COLLAPSIBLE PANEL */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 w-[260px] bg-[#F7F4EF] border-r border-[#111827]/5 flex flex-col justify-between transition-transform duration-300 md:relative md:translate-x-0 ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        aria-label="Conversation history"
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Sidebar Header */}
          <div className="p-4 flex items-center justify-between border-b border-[#111827]/5 shrink-0">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#111827]/60">Sittings</span>
            <button
              onClick={handleStartNewConversation}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2563EB] hover:text-blue-700 bg-white border border-[#111827]/5 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label="Start fresh new conversation"
            >
              <Plus className="w-3 h-3" />
              New Sitting
            </button>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {threadListMetadata.map((t) => {
              const isActive = t.id === activeThreadId;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectThread(t.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-all duration-150 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                    isActive 
                      ? "bg-[#2563EB]/5 text-[#2563EB] font-bold" 
                      : "hover:bg-[#111827]/5 text-slate-700 font-semibold"
                  }`}
                >
                  <div className="flex flex-col min-w-0 flex-1 pr-2">
                    <span className="text-xs truncate block">{t.title || "Untitled Conversation"}</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">{getRelativeDateLabel(t.createdAt)}</span>
                  </div>
                  {t.moodSignal && (
                    <span 
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${getMoodDotColor(t.moodSignal)}`} 
                      title={`Mood Signal: ${t.moodSignal}`} 
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
            {threadListMetadata.length === 0 && (
              <p className="text-[10px] text-slate-400 p-4 text-center">No past sittings yet.</p>
            )}
          </div>
        </div>

        {/* Mascot Wellness Pet Widget */}
        <div className="p-3 mx-2 my-1 border border-[#111827]/5 bg-white/70 rounded-xl space-y-2 text-center shadow-2xs">
          <div className="flex items-center gap-2.5 justify-start text-left">
            <span className="text-3xl animate-bounce select-none duration-1000 origin-bottom" style={{ animationDuration: "2s" }} role="img" aria-label="Mascot Pet">
              {petMascot === "cat" ? "🐱" : petMascot === "owl" ? "🦉" : "🐼"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-extrabold text-[#2563EB] uppercase tracking-wider">
                {petMascot === "cat" ? "Calm Cat" : petMascot === "owl" ? "Focus Owl" : "Pacing Panda"}
              </p>
              <p className="text-[10px] font-bold text-slate-500 leading-snug truncate">
                {petStatus}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setIsPetMenuOpen(!isPetMenuOpen)}
              className="w-full text-[9px] font-extrabold uppercase tracking-wider py-1 border border-[#111827]/5 bg-white rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Interact
            </button>
            
            {isPetMenuOpen && (
              <div className="pt-1.5 border-t border-[#111827]/5 space-y-1.5 flex flex-col items-stretch text-left">
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400 block mb-0.5">Pet Actions</span>
                <button
                  onClick={() => {
                    setIsBreathingOpen(true);
                    setBreathState("inhale");
                    setPetStatus(petMascot === "cat" ? "Breathe in... Breathe out..." : petMascot === "owl" ? "Calming down..." : "Taking a break...");
                    setIsPetMenuOpen(false);
                  }}
                  className="text-[9px] font-bold text-left px-2 py-1 hover:bg-[#2563EB]/5 rounded text-slate-700 cursor-pointer"
                >
                  🧘 Breathe with me
                </button>
                <button
                  onClick={() => {
                    setPetStatus(
                      petMascot === "cat" ? "Purr! Nyam nyam... happy cat! ❤️" :
                      petMascot === "owl" ? "Hoot! Delicious treat! Ready to study! ❤️" :
                      "Nom nom... panda is full and happy! ❤️"
                    );
                    toast.success("Mascot treat delivered! ❤️");
                    setIsPetMenuOpen(false);
                  }}
                  className="text-[9px] font-bold text-left px-2 py-1 hover:bg-[#2563EB]/5 rounded text-slate-700 cursor-pointer"
                >
                  🍪 Give a treat
                </button>
                
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400 block mb-0.5 mt-1">Change Mascot</span>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => {
                      setPetMascot("cat");
                      setPetStatus("Purr... ready to breathe when you are!");
                      setIsPetMenuOpen(false);
                    }}
                    className={`text-[9px] font-bold py-1 border rounded cursor-pointer text-center ${petMascot === "cat" ? "border-[#2563EB] bg-blue-50/50 text-[#2563EB]" : "border-[#111827]/5 bg-white"}`}
                  >
                    🐱 Cat
                  </button>
                  <button
                    onClick={() => {
                      setPetMascot("owl");
                      setPetStatus("Whoot! Focused on your prep!");
                      setIsPetMenuOpen(false);
                    }}
                    className={`text-[9px] font-bold py-1 border rounded cursor-pointer text-center ${petMascot === "owl" ? "border-[#2563EB] bg-blue-50/50 text-[#2563EB]" : "border-[#111827]/5 bg-white"}`}
                  >
                    🦉 Owl
                  </button>
                  <button
                    onClick={() => {
                      setPetMascot("panda");
                      setPetStatus("Yawn... Don't forget to stretch!");
                      setIsPetMenuOpen(false);
                    }}
                    className={`text-[9px] font-bold py-1 border rounded cursor-pointer text-center ${petMascot === "panda" ? "border-[#2563EB] bg-blue-50/50 text-[#2563EB]" : "border-[#111827]/5 bg-white"}`}
                  >
                    🐼 Panda
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#111827]/5 text-center shrink-0">
          <p className="text-[8px] uppercase tracking-widest font-extrabold text-slate-400">
            MindPulse Core
          </p>
        </div>
      </aside>

      {/* MOBILE BACKDROP */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/10 z-30 md:hidden"
          aria-hidden="true"
        />
      )}

      {/* CHAT/CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-h-[100dvh] justify-between relative min-w-0">
        
        {/* HEADER */}
        <header className="px-6 py-5 flex items-center justify-between z-20 w-full bg-transparent border-b border-[#111827]/5 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="md:hidden w-7 h-7 rounded-full border border-[#111827]/10 bg-white hover:bg-slate-50 flex items-center justify-center cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label={isMobileSidebarOpen ? "Close conversation history" : "Show conversation history"}
            >
              <Menu className="w-3.5 h-3.5 text-slate-700" />
            </button>

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

        {/* CHAT AREA */}
        <main className="flex-1 w-full max-w-2xl mx-auto px-6 flex flex-col justify-between py-6 min-h-0 relative">
          
          {/* Scrollable messages thread */}
          <div 
            className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 scrollbar-thin scroll-smooth"
            aria-live="polite"
          >
            {/* ── ONBOARDING GATE ────────────────────────────────────────── */}
            {isOnboarding ? (
              <div className="space-y-4 py-4">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827] leading-relaxed select-text font-heading">
                  Hey — I&apos;m your MindPulse companion. Let me get to know you a little.
                </h2>
                <p className="text-sm font-semibold text-slate-500">
                  Quick setup — takes under 30 seconds.
                </p>
                <OnboardingFlow
                  onComplete={handleOnboardingComplete}
                  onSkip={handleOnboardingSkip}
                />
              </div>
            ) : (
              <>
              {/* If thread is empty, render the opening line as a companion chat bubble */}
              {thread.length === 0 && (
                <div className="flex w-full justify-start py-2">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-xs p-4 bg-white border border-[#111827]/5 text-sm font-semibold text-[#111827] shadow-2xs">
                    <p className="whitespace-pre-wrap select-text">{openingLine}</p>
                  </div>
                </div>
              )}

             {/* Message History list */}
            {thread.map((msg, index) => {
              if (msg.role === "companion-widget") {
                // Collapsed widget summary in thread history
                return (
                  <div key={index} className="flex justify-center">
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full">
                      {msg.summary}
                    </span>
                  </div>
                );
              }
              const isUser = msg.role === "user";
              const isSafety = !isUser && msg.safetyFlag;
              return (
                <div 
                  key={index}
                  className={`flex w-full ${isUser ? "justify-end" : "justify-start"} ${isSafety ? "my-6" : ""}`}
                >
                  <div 
                    className={`max-w-[85%] rounded-2xl text-sm font-semibold leading-relaxed shadow-2xs group relative ${
                      isUser 
                        ? "bg-[#2563EB] text-white rounded-br-xs p-4" 
                        : isSafety
                          ? "bg-white text-[#111827] border-2 border-red-200/80 rounded-bl-xs p-6 sm:p-7 shadow-xs"
                          : "bg-white text-[#111827] border border-[#111827]/5 rounded-bl-xs p-4"
                    }`}
                  >
                    {isSafety && (
                      <div className="flex items-center gap-2 mb-3 text-red-600">
                        <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">Support Guardrail</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap select-text">{msg.content}</p>
                    
                    {/* Timestamp on hover */}
                    <span className="absolute bottom-1 right-2 text-[8px] opacity-0 group-hover:opacity-75 transition-opacity text-slate-455 font-mono font-medium">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Active suggested widgets */}
            {latestSuggestedMoodCheck && (
              <div className="my-4 pt-1">
                <MoodCheck
                  question={latestSuggestedMoodCheck.question}
                  min={1}
                  max={10}
                  labels={{ min: latestSuggestedMoodCheck.minLabel || "calm", max: latestSuggestedMoodCheck.maxLabel || "overwhelmed" }}
                  onAnswer={handleMoodCheckAnswer}
                />
              </div>
            )}
            
            {activeReframeOriginalThought && (
              <div className="my-4 pt-1">
                <ReframeWidget
                  originalThought={activeReframeOriginalThought}
                  onDone={handleReframeDone}
                  reframeAction={async (thought) => {
                    return await reframeNegativeThoughtAction(thought, thread.slice(-6), profile);
                  }}
                />
              </div>
            )}

            {latestSuggestedChoice && (
              <div className="my-4 pt-1">
                <CompanionChoice
                  id={latestSuggestedChoice.id}
                  question={latestSuggestedChoice.question}
                  options={latestSuggestedChoice.options}
                  allowMultiple={latestSuggestedChoice.allowMultiple}
                  allowSkip={latestSuggestedChoice.allowSkip}
                  onAnswer={handleChoiceAnswer}
                />
              </div>
            )}

            {/* Live Typing bubble */}
            {isTyping && (
              <div className="flex w-full justify-start animate-pulse">
                <div className="bg-white text-[#111827] border border-[#111827]/5 rounded-2xl rounded-bl-xs p-4 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
              </>
            )}
          </div>

          {/* Bottom Controls — hidden during onboarding */}
          <div className={`shrink-0 space-y-4 ${isOnboarding ? "hidden" : ""}`}>
            
            {/* Input Form */}
            {isClosed ? (
              <div className="p-4 bg-slate-50 border border-slate-200/50 rounded-2xl text-center space-y-2.5">
                <p className="text-xs text-slate-500 font-bold leading-relaxed">This conversation sitting has ended and been analyzed.</p>
                <button
                  onClick={handleStartNewConversation}
                  className="text-xs font-bold text-[#2563EB] hover:text-blue-700 bg-white border border-blue-100 hover:bg-blue-50/50 px-5 py-2.5 rounded-full shadow-2xs transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  Start a new conversation to continue →
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="relative">
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
            )}

            {/* Actions Trimmings */}
            <div className="flex flex-wrap items-center gap-3 pt-2 justify-between">
              <div className="flex items-center gap-2">
                {thread.length > 0 && !isClosed && (
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

              {latestSuggestedAction && (
                <div className="pt-1">
                  <MicroActionCard
                    title={latestSuggestedAction.label}
                    description="Take a moment to reset before continuing."
                    durationSeconds={latestSuggestedAction.durationMinutes * 60}
                    actionType={
                      latestSuggestedAction.label.toLowerCase().includes("breath") ? "box_breathing" :
                      latestSuggestedAction.label.toLowerCase().includes("ground") ? "grounding_pause" :
                      latestSuggestedAction.label.toLowerCase().includes("stretch") ? "quick_stretch" :
                      undefined
                    }
                    reducedMotion={reducedMotion}
                    onComplete={handleMicroActionComplete}
                  />
                </div>
              )}
            </div>

          </div>
        </main>

        {/* FOOTER */}
        <footer className="px-6 py-4 flex items-center justify-center text-center text-[#111827]/40 z-10 shrink-0 border-t border-[#111827]/5">
          <p className="text-[9px] uppercase tracking-widest font-extrabold">
            MindPulse — Distraction-free Dialogue Space
          </p>
        </footer>

      </div>

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

    </div>
  );
}
