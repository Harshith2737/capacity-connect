import { describe, expect, it } from "vitest";
import { rankTrainerCandidates } from "../shared/trainerMatching";

describe("trainer matching", () => {
  it("ranks by the transparent weighted model and explains the result", () => {
    const result = rankTrainerCandidates([
      { id: 1, name: "A", competencyLevel: 4, requiredLevel: 3, domainExperience: 90, assessmentQuality: 80, deliveryQuality: 80, availability: 90, recency: 90 },
      { id: 2, name: "B", competencyLevel: 2, requiredLevel: 3, domainExperience: 90, assessmentQuality: 80, deliveryQuality: 80, availability: 90, recency: 90 },
    ]);
    expect(result[0]?.id).toBe(1);
    expect(result[0]?.matchScore).toBeGreaterThan(result[1]?.matchScore ?? 0);
    expect(result[0]?.explanation.join(" ")).toContain("competency fit");
  });
});
