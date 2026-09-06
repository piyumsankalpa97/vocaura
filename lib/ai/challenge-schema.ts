import { z } from "zod";

export const dailyChallengeSchema = z.object({
  title: z.string().min(1, "Title is required").describe("Short, engaging title for the challenge"),
  reason: z.string().min(1, "Reason is required").describe("Why this challenge was chosen based on the user's recent weaknesses"),
  prompt: z.string().min(1, "Prompt is required").describe("The speaking task or question to answer (speakable in 60 to 120 seconds)"),
  expected_skill: z.string().min(1, "Expected skill is required").describe("The primary communication skill or weakness targeted"),
  estimated_minutes: z.number().int().min(1).max(30).default(5).describe("Estimated time to prepare and speak in minutes"),
});

export type DailyChallenge = z.infer<typeof dailyChallengeSchema>;
