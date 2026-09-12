import { calculateGap } from "./capacity";

export type CompetencySignal = { id: number; name: string; currentLevel: number; targetLevel: number; criticality: number; roleImportance: number; lastVerifiedAt?: Date | null; hasBlockingPrerequisite?: boolean };
export type LearningCandidate = { id: number; title: string; competencyIds: number[]; targetLevel: number; prerequisitesMet: boolean };

export function calculatePriority(signal: CompetencySignal, now = new Date()) {
  const gap = calculateGap(signal.currentLevel, signal.targetLevel);
  const daysSinceVerification = signal.lastVerifiedAt ? Math.max(0, (now.getTime() - signal.lastVerifiedAt.getTime()) / 86_400_000) : 365;
  const recencyFactor = Math.min(daysSinceVerification / 365, 1);
  const prerequisiteFactor = signal.hasBlockingPrerequisite ? 1.15 : 1;
  return Math.round((gap * 0.45 + signal.criticality * 0.25 + signal.roleImportance * 0.2 + recencyFactor * 0.1) * prerequisiteFactor * 100) / 100;
}

export function generateLearningRecommendations(signal: CompetencySignal, candidates: LearningCandidate[]) {
  return candidates.filter((candidate) => candidate.competencyIds.includes(signal.id) && candidate.prerequisitesMet && candidate.targetLevel >= Math.max(signal.currentLevel + 1, 1)).map((candidate) => ({ ...candidate, priority: calculatePriority(signal), reason: `Mapped to ${signal.name}, closes a gap of ${calculateGap(signal.currentLevel, signal.targetLevel)}, and meets prerequisites.` })).sort((a, b) => b.priority - a.priority);
}
