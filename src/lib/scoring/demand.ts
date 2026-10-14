import type { BusinessMetrics, PopulationMetrics } from "@/types/analysis";

export function calculateDemandScore(
	population: PopulationMetrics,
	business: BusinessMetrics,
): number {
	const populationScore = Math.min(100, population.population / 10_000);
	const growthScore = Math.min(100, population.populationGrowth * 20);
	const businessScore = Math.min(100, business.businesses / 25);
	return Math.round(populationScore * 0.5 + growthScore * 0.25 + businessScore * 0.25);
}
