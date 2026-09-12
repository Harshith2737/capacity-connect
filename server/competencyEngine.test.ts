import { describe, expect, it } from "vitest";
import { calculatePriority, generateLearningRecommendations } from "../shared/competencyEngine";

describe("competency engine", () => {
  it("prioritizes a large, critical, stale gap", () => {
    const score = calculatePriority({ id: 1, name: "Radar", currentLevel: 1, targetLevel: 3, criticality: 3, roleImportance: 3, lastVerifiedAt: null });
    expect(score).toBeGreaterThan(2);
  });

  it("returns only mapped, prerequisite-ready learning candidates", () => {
    const result = generateLearningRecommendations({ id: 1, name: "Radar", currentLevel: 1, targetLevel: 3, criticality: 3, roleImportance: 3 }, [
      { id: 10, title: "Radar fundamentals", competencyIds: [1], targetLevel: 3, prerequisitesMet: true },
      { id: 11, title: "Unrelated course", competencyIds: [2], targetLevel: 3, prerequisitesMet: true },
      { id: 12, title: "Blocked course", competencyIds: [1], targetLevel: 3, prerequisitesMet: false },
    ]);
    expect(result.map((item) => item.id)).toEqual([10]);
    expect(result[0]?.reason).toContain("closes a gap of 2");
  });
});
