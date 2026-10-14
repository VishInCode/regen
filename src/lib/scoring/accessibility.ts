import type { AccessibilityMetrics } from "@/types/analysis";

export function calculateAccessibilityScore(metrics: AccessibilityMetrics): number {
	const distanceScore = Math.max(0, 100 - metrics.nearestRoadDistance * 20);
	return Math.round(distanceScore * 0.35 + metrics.transportScore * 0.65);
}

export function calculateRouteAccessibilityScore(
	distanceMeters: number,
	durationSeconds: number,
): number {
	return Math.max(0, Math.min(100, Math.round(
		100 - distanceMeters / 100 - durationSeconds / 60,
	)));
}
