export function calculateOverallScore(scores: {
	demand: number;
	accessibility: number;
	competition: number;
	infrastructure: number;
}): number {
	return Math.round(
		scores.demand * 0.3 +
			scores.accessibility * 0.25 +
			scores.competition * 0.2 +
			scores.infrastructure * 0.25,
	);
}

export function calculateOverallScoreFromAvailable(
	scores: Array<number | null>,
): number | null {
	const available = scores.filter((score): score is number => score !== null);
	if (available.length === 0) return null;
	return Math.round(available.reduce((total, score) => total + score, 0) / available.length);
}
