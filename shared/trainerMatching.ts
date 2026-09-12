import { calculateTrainerMatch } from "./capacity";

export type TrainerCandidate = { id: number; name: string; competencyLevel: number; requiredLevel: number; domainExperience: number; assessmentQuality: number; deliveryQuality: number; availability: number; recency: number };

export function rankTrainerCandidates(candidates: TrainerCandidate[]) {
  return candidates.map((candidate) => {
    const competencyFit = candidate.requiredLevel > 0 ? Math.min(100, Math.round((candidate.competencyLevel / candidate.requiredLevel) * 100)) : 0;
    const matchScore = calculateTrainerMatch({ competencyFit, domainExperience: candidate.domainExperience, assessmentQuality: candidate.assessmentQuality, deliveryQuality: candidate.deliveryQuality, availability: candidate.availability, recency: candidate.recency });
    return { ...candidate, matchScore, explanation: [`${competencyFit}% competency fit`, candidate.domainExperience >= 75 ? "Strong domain experience" : "Developing domain experience", candidate.availability >= 70 ? "Available" : "Limited availability", candidate.recency >= 70 ? "Recent training activity" : "Needs recent activity"] };
  }).sort((a, b) => b.matchScore - a.matchScore);
}
