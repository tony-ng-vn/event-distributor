import { describe, expect, it, vi } from "vitest";
import {
  buildClassificationPrompt,
  classifyEventInput,
  classifyWithRules,
  parseModelClassification,
  resolveClassifierMode,
  shouldSkipExistingTypeSource,
} from "@/lib/event-type-classifier";
import {
  matchesEventTypeFilter,
  parseEventTypeId,
} from "@/lib/event-type-taxonomy";

describe("event-type-taxonomy", () => {
  it("parses closed ids only", () => {
    expect(parseEventTypeId("social")).toBe("social");
    expect(parseEventTypeId("nope")).toBeNull();
  });

  it("Other filter excludes untyped rows", () => {
    expect(matchesEventTypeFilter("other", "untyped", "other")).toBe(false);
    expect(matchesEventTypeFilter("other", "fallback", "other")).toBe(true);
    expect(matchesEventTypeFilter("other", "rules", "other")).toBe(true);
    expect(matchesEventTypeFilter("social", "rules", "other")).toBe(false);
    expect(matchesEventTypeFilter("other", "untyped", "all")).toBe(true);
  });

  it("type filter matches primary type", () => {
    expect(matchesEventTypeFilter("builders", "model", "builders")).toBe(true);
    expect(matchesEventTypeFilter("builders", "untyped", "builders")).toBe(
      true,
    );
  });
});

describe("event-type-classifier", () => {
  it("resolves classifier mode with rules default", () => {
    expect(resolveClassifierMode("")).toBe("rules");
    expect(resolveClassifierMode("insforge")).toBe("insforge");
    expect(resolveClassifierMode("weird")).toBe("rules");
    expect(resolveClassifierMode("off")).toBe("off");
  });

  it("classifies builders titles via rules", () => {
    const result = classifyWithRules({
      title: "AI Builders Meetup",
      description: "Monthly gathering for people building with AI.",
      location: "San Francisco, CA",
      hostName: "Community Host",
      isOnline: false,
    });
    expect(result.primaryType).toBe("builders");
    expect(result.source).toBe("rules");
  });

  it("classifies social titles via rules", () => {
    const result = classifyWithRules({
      title: "Poker Night",
      description: "",
      location: "San Francisco, CA",
      hostName: null,
      isOnline: false,
    });
    expect(result.primaryType).toBe("social");
  });

  it("falls back to other when nothing matches", () => {
    const result = classifyWithRules({
      title: "PXL ■ KIM ASENDORF",
      description: "",
      location: "NODE",
      hostName: "NODE",
      isOnline: false,
    });
    expect(result.primaryType).toBe("other");
  });

  it("returns null when mode is off", async () => {
    const result = await classifyEventInput(
      {
        title: "AI Meetup",
        description: "",
        location: "",
        hostName: null,
        isOnline: false,
      },
      { mode: "off" },
    );
    expect(result).toBeNull();
  });

  it("parses model JSON and applies confidence threshold", () => {
    const ok = parseModelClassification(
      {
        primary_type: "talks",
        secondary_types: ["social"],
        confidence: 0.8,
        rationale: "Panel discussion",
      },
      0.55,
    );
    expect(ok).toEqual({
      primaryType: "talks",
      secondaryTypes: ["social"],
      confidence: 0.8,
      rationale: "Panel discussion",
      source: "model",
    });

    const low = parseModelClassification(
      {
        primary_type: "sports",
        secondary_types: [],
        confidence: 0.2,
        rationale: "guess",
      },
      0.55,
    );
    expect(low.primaryType).toBe("other");
    expect(low.source).toBe("fallback");

    const missing = parseModelClassification(
      {
        primary_type: "builders",
        secondary_types: [],
        rationale: "no score",
      },
      0.55,
    );
    expect(missing.primaryType).toBe("other");
    expect(missing.source).toBe("fallback");
  });

  it("skips overwriting human type sources unless forced", () => {
    expect(shouldSkipExistingTypeSource("human")).toBe(true);
    expect(shouldSkipExistingTypeSource("human", true)).toBe(false);
    expect(shouldSkipExistingTypeSource("rules")).toBe(false);
    expect(shouldSkipExistingTypeSource("untyped")).toBe(false);
  });

  it("rejects invalid model primary_type", () => {
    expect(() =>
      parseModelClassification({ primary_type: "party" }, 0.55),
    ).toThrow(/Invalid primary_type/);
  });

  it("uses injectable chat completion in insforge mode", async () => {
    const chatCompletion = vi.fn(async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              primary_type: "arts",
              secondary_types: [],
              confidence: 0.9,
              rationale: "Museum night",
            }),
          },
        },
      ],
    }));

    const result = await classifyEventInput(
      {
        title: "Art & Us at SFMOMA",
        description: "",
        location: "SFMOMA",
        hostName: null,
        isOnline: false,
      },
      { mode: "insforge", chatCompletion },
    );

    expect(result?.primaryType).toBe("arts");
    expect(result?.source).toBe("model");
    expect(chatCompletion).toHaveBeenCalledOnce();
  });

  it("falls back to rules when chat fails", async () => {
    const result = await classifyEventInput(
      {
        title: "World Cup Watch Party",
        description: "",
        location: "SF",
        hostName: null,
        isOnline: false,
      },
      {
        mode: "insforge",
        chatCompletion: async () => {
          throw new Error("boom");
        },
      },
    );
    expect(result?.primaryType).toBe("social");
    expect(result?.source).toBe("rules");
  });

  it("builds a prompt that lists the closed taxonomy", () => {
    const { system, user } = buildClassificationPrompt({
      title: "Demo",
      description: "",
      location: "",
      hostName: null,
      isOnline: true,
    });
    expect(system).toContain("builders");
    expect(user).toContain("Title: Demo");
  });
});
