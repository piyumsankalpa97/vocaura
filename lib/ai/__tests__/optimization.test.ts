import { describe, it, expect } from "vitest";
import {
  applyCorrectionsToText,
  filterApplicableCorrections,
  splitTextByCorrections,
  transcriptOptimizationResultSchema,
} from "../optimization-schema";
import { generateTranscriptOptimizationPrompt } from "../prompts";

describe("Transcript Optimization Logic & Schema", () => {
  describe("applyCorrectionsToText", () => {
    it("accurately replaces misheard proper nouns with word boundaries", () => {
      const rawText = "I went to Columbo and then traveled to gum bar with Aloka.";
      const corrections = [
        { original: "Columbo", corrected: "Colombo" },
        { original: "gum bar", corrected: "Gampaha" },
      ];

      const result = applyCorrectionsToText(rawText, corrections);
      expect(result).toBe("I went to Colombo and then traveled to Gampaha with Aloka.");
    });

    it("does not replace substrings within unrelated words", () => {
      // e.g. "bar" shouldn't replace "embarrassed" or "barrier"
      const rawText = "The barrier was embarrassing for the bar tender.";
      const corrections = [{ original: "bar", corrected: "pub" }];

      const result = applyCorrectionsToText(rawText, corrections);
      expect(result).toBe("The barrier was embarrassing for the pub tender.");
    });

    it("handles case insensitivity while preserving overall grammar", () => {
      const rawText = "He is studying at Sliit in colombo.";
      const corrections = [
        { original: "sliit", corrected: "SLIIT" },
        { original: "colombo", corrected: "Colombo" },
      ];

      const result = applyCorrectionsToText(rawText, corrections);
      expect(result).toBe("He is studying at SLIIT in Colombo.");
    });

    it("returns original text if corrections list is empty", () => {
      const text = "Everything was transcribed perfectly.";
      expect(applyCorrectionsToText(text, [])).toBe(text);
    });
  });

  describe("Zod schema validation", () => {
    it("validates well-formed optimization corrections", () => {
      const data = {
        corrections: [
          {
            original: "gum bar",
            corrected: "Gampaha",
            category: "Location",
            reason: "Matched user location vocabulary",
          },
        ],
      };

      const parsed = transcriptOptimizationResultSchema.safeParse(data);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.corrections.length).toBe(1);
        expect(parsed.data.corrections[0].corrected).toBe("Gampaha");
      }
    });

    it("accepts empty corrections array", () => {
      const parsed = transcriptOptimizationResultSchema.safeParse({
        corrections: [],
      });
      expect(parsed.success).toBe(true);
    });
  });

  describe("single-pass matching", () => {
    it("does not chain one correction's output into another", () => {
      const result = applyCorrectionsToText("from Kandy to Galle", [
        { original: "Kandy", corrected: "Galle" },
        { original: "Galle", corrected: "Matara" },
      ]);
      expect(result).toBe("from Galle to Matara");
    });

    it("prefers the longest matching phrase", () => {
      const pieces = splitTextByCorrections("I live in gum bar now", [
        { original: "gum", corrected: "Gum" },
        { original: "gum bar", corrected: "Gampaha" },
      ]);
      expect(pieces.map((p) => p.text)).toEqual(["I live in ", "gum bar", " now"]);
      expect(pieces[1].correction?.corrected).toBe("Gampaha");
    });

    it("matches originals that end in punctuation", () => {
      expect(applyCorrectionsToText("Ask Dr. Perera.", [{ original: "Dr.", corrected: "Doctor" }])).toBe(
        "Ask Doctor Perera."
      );
    });
  });

  describe("filterApplicableCorrections", () => {
    it("drops corrections whose original is not in the transcript", () => {
      const result = filterApplicableCorrections("I went to Columbo.", [
        { original: "Columbo", corrected: "Colombo", category: "Location" },
        { original: "Kandi", corrected: "Kandy", category: "Location" },
      ]);
      expect(result.map((c) => c.corrected)).toEqual(["Colombo"]);
    });

    it("drops no-op and duplicate corrections", () => {
      const result = filterApplicableCorrections("Columbo and Colombo", [
        { original: "Colombo", corrected: "Colombo", category: "Location" },
        { original: "Columbo", corrected: "Colombo", category: "Location" },
        { original: "columbo", corrected: "Colombo City", category: "Location" },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].corrected).toBe("Colombo");
    });
  });

  describe("Prompt generation", () => {
    it("formats user optimization prompt with personal vocabulary", () => {
      const prompt = generateTranscriptOptimizationPrompt("I live in gum bar.", [
        { entity: "Gampaha", category: "Location" },
        { entity: "Aloka", category: "Person" },
      ]);

      expect(prompt).toContain("Gampaha (Location)");
      expect(prompt).toContain("Aloka (Person)");
      expect(prompt).toContain("I live in gum bar.");
    });
  });
});
