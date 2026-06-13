import { describe, test, expect } from "vitest";
import { reframeNegativeThoughtPrompt } from "../prompts";
import { DialogueMessage, StudentProfile } from "../types";

describe("reframeNegativeThoughtPrompt builder", () => {
  const mockProfile: StudentProfile = {
    name: "Test User",
    examType: "NEET",
    moodTrend: "Stuck",
    triggers: ["mock test scores"],
    lastTopics: ["Physics kinematics"]
  };

  const mockHistory: DialogueMessage[] = [
    { role: "user", content: "I will fail", timestamp: "2026-06-13" }
  ];

  test("generates reframe prompt correctly", () => {
    const prompt = reframeNegativeThoughtPrompt("I'm not good at NEET", mockHistory, mockProfile);
    expect(prompt).toContain("I'm not good at NEET");
    expect(prompt).toContain("NEET");
    expect(prompt).toContain("I will fail");
    expect(prompt).toContain("reframe this negative thought");
  });
});
