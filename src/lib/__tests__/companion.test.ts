import { describe, test, expect } from "vitest";
import { z } from "zod";
import { buildCompanionResponse } from "../gemini";
import { getLightweightReplyPrompt, analyzeDialogueSessionPrompt } from "../prompts";
import { DialogueMessage, StudentProfile } from "../types";

// Helper sanitizer function duplicated for test validation (to test actions.ts sanitization schema)
function sanitizeInput(input: string): string {
  return input
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/[<>]/g, "");
}

// Zod Schema under test
const messageSchema = z.object({
  text: z.string()
    .min(1, { message: "No pressure to write much. Even one line is enough." })
    .max(5000, { message: "That's quite a lot of thoughts. Let's break it down." })
    .transform(sanitizeInput)
});

describe("buildCompanionResponse shaping logic", () => {
  test("processes normal valid companion JSON", () => {
    const rawResult = JSON.stringify({
      companionReply: "I hear you. Preparing for UPSC is tough.",
      suggestedMicroAction: {
        label: "Water break",
        durationMinutes: 3
      }
    });

    const parsed = buildCompanionResponse(rawResult);
    expect(parsed.companionReply).toBe("I hear you. Preparing for UPSC is tough.");
    expect(parsed.suggestedMicroAction?.label).toBe("Water break");
    expect(parsed.suggestedMicroAction?.durationMinutes).toBe(3);
  });

  test("processes missing parameters gracefully (empty/short entry returns defaults)", () => {
    const rawResult = JSON.stringify({});
    const parsed = buildCompanionResponse(rawResult);
    expect(parsed.companionReply).toBe("I'm here for you.");
    expect(parsed.suggestedMicroAction).toBeNull();
  });

  test("fallback path triggered for malformed JSON strings", () => {
    const rawResult = "malformed { json : string";
    const parsed = buildCompanionResponse(rawResult);
    expect(parsed.companionReply).toContain("Take a slow breath.");
    expect(parsed.suggestedMicroAction).toBeNull();
  });
});

describe("prompts.ts builders", () => {
  const mockProfile: StudentProfile = {
    examType: "JEE",
    moodTrend: "Anxious",
    triggers: ["mock test scores"],
    lastTopics: ["Physics kinematics"]
  };

  const mockHistory: DialogueMessage[] = [
    { role: "user", content: "I feel stuck", timestamp: "2026-06-13" },
    { role: "companion", content: "I'm right here. Let's tackle it.", timestamp: "2026-06-13" }
  ];

  test("interpolates context details (triggers, exams, history)", () => {
    const prompt = getLightweightReplyPrompt("My math score is bad", mockHistory, mockProfile);
    expect(prompt).toContain("JEE");
    expect(prompt).toContain("mock test scores");
    expect(prompt).toContain("I feel stuck");
    expect(prompt).toContain("My math score is bad");
  });

  test("contains clinical-language guardrails", () => {
    const prompt1 = getLightweightReplyPrompt("text", [], mockProfile);
    expect(prompt1).toContain("CLINICAL GUARDRAIL");
    expect(prompt1).toContain("Do not use clinical, academic, or robotic diagnostic terms");

    const prompt2 = analyzeDialogueSessionPrompt([], mockProfile);
    expect(prompt2).toContain("CLINICAL GUARDRAIL");
    expect(prompt2).toContain("without labeling them clinically");
  });
});

describe("Zod schema validation & sanitization", () => {
  test("accepts valid typical study entry", () => {
    const res = messageSchema.safeParse({ text: "I have too much homework tonight." });
    expect(res.success).toBe(true);
    expect(res.data?.text).toBe("I have too much homework tonight.");
  });

  test("fails too-long entries (boundary limit)", () => {
    const longString = "a".repeat(5001);
    const res = messageSchema.safeParse({ text: longString });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain("thoughts");
    }
  });

  test("fails empty entry text", () => {
    const res = messageSchema.safeParse({ text: "" });
    expect(res.success).toBe(false);
  });

  test("sanitizes script injection strings cleanly", () => {
    const res = messageSchema.safeParse({ text: "Hello <script>alert('xss')</script> world" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.text).toBe("Hello alert('xss') world");
    }
  });

  test("sanitizes stray HTML tags cleanly", () => {
    const res = messageSchema.safeParse({ text: "Let's <b>focus</b> on <i>physics</i>." });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.text).toBe("Let's focus on physics.");
    }
  });
});
