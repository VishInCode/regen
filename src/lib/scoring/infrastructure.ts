import type { InfrastructureMetrics } from "@/types/analysis";

export function calculateInfrastructureScore(metrics: InfrastructureMetrics): number {
	// Count thresholds keep a large OSM feature set from automatically becoming 100.
	const hospitalScore = Math.min(100, metrics.hospitals * 5);
	const schoolScore = Math.min(100, metrics.schools);
	const publicFacilityScore = Math.min(100, metrics.publicFacilities / 2);
	const facilityScore = hospitalScore * 0.4 + schoolScore * 0.35 + publicFacilityScore * 0.25;
	if (metrics.roadConnectivity === null) {
		return Math.round(facilityScore);
	}
	const roadScore = Math.min(100, metrics.roadConnectivity);
	return Math.round(facilityScore * 0.55 + roadScore * 0.45);
}
