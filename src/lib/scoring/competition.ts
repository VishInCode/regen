import type { BusinessMetrics } from "@/types/analysis";

export function calculateCompetitionScore(metrics: BusinessMetrics): number {
	// Use a diminishing-returns penalty so a real count cannot collapse the score
	// to zero solely because a large search area contains many businesses.
	const competitorPressure = metrics.competitors / 25;
	return Math.round(100 / (1 + competitorPressure));
}
