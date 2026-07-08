import { describe, expect, it } from "vitest";
import {
  normalizeFeedbackMessage,
  validateFeedbackMessage,
} from "@/lib/feedback-service";

describe("feedback-service validation", () => {
  it("rejects empty messages", () => {
    expect(validateFeedbackMessage("   ")).toBe("Message is required");
  });

  it("accepts trimmed messages", () => {
    expect(validateFeedbackMessage("  Love the feed  ")).toBeNull();
    expect(normalizeFeedbackMessage("  Love the feed  ")).toBe("Love the feed");
  });

  it("rejects messages over the limit", () => {
    expect(validateFeedbackMessage("a".repeat(2001))).toBe(
      "Message must be 2000 characters or fewer",
    );
  });
});
