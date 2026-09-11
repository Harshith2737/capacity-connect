export type CapabilityLevel = 0 | 1 | 2 | 3 | 4;

export type CapabilityRecord = {
  current: number;
  target: number;
};

/**
 * Readiness is weighted competency coverage: total validated level divided by
 * total required level, capped at 100. It intentionally does not use course
 * completion as a proxy for capability.
 */
export function calculateReadiness(records: CapabilityRecord[]): number {
  if (records.length === 0) return 0;
  const target = records.reduce((sum, record) => sum + Math.max(record.target, 0), 0);
  if (target === 0) return 100;
  const current = records.reduce((sum, record) => sum + Math.min(Math.max(record.current, 0), record.target), 0);
  return Math.round(Math.min(current / target, 1) * 100);
}

export function calculateGap(current: number, target: number): number {
  return Math.max(0, target - current);
}

export type TrainerMatchInputs = {
  competencyFit: number;
  domainExperience: number;
  assessmentQuality: number;
  deliveryQuality: number;
  availability: number;
  recency: number;
};

/** Transparent weighted matching model from the product brief. */
export function calculateTrainerMatch(input: TrainerMatchInputs): number {
  const score = input.competencyFit * 0.35 + input.domainExperience * 0.25 + input.assessmentQuality * 0.15 + input.deliveryQuality * 0.1 + input.availability * 0.1 + input.recency * 0.05;
  return Math.round(Math.min(Math.max(score, 0), 100));
}
