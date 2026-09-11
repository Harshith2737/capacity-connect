import { describe, expect, it } from "vitest";
import { calculateGap, calculateReadiness, calculateTrainerMatch } from "../shared/capacity";

describe("capacity engine", () => {
  it("calculates readiness from validated levels and role targets", () => {
    expect(calculateReadiness([
      { current: 1, target: 3 },
      { current: 3, target: 4 },
      { current: 1, target: 3 },
      { current: 2, target: 3 },
    ])).toBe(54);
  });

  it("caps current levels at the required target", () => {
    expect(calculateReadiness([{ current: 5, target: 3 }])).toBe(100);
    expect(calculateReadiness([])).toBe(0);
  });

  it("never returns a negative skill gap", () => {
    expect(calculateGap(1, 3)).toBe(2);
    expect(calculateGap(4, 3)).toBe(0);
  });

  it("uses the documented transparent trainer weights", () => {
    expect(calculateTrainerMatch({ competencyFit: 100, domainExperience: 80, assessmentQuality: 80, deliveryQuality: 80, availability: 80, recency: 80 })).toBe(87);
    expect(calculateTrainerMatch({ competencyFit: 0, domainExperience: 0, assessmentQuality: 0, deliveryQuality: 0, availability: 0, recency: 0 })).toBe(0);
  });
});
