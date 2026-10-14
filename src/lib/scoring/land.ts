import type {
	LandInfrastructureMetrics,
	LandOpportunityScore,
} from "@/types/land";
import type { RouteMetrics } from "@/lib/api/openrouteservice";

interface LandScoreInput {
	landUse: string;
	purpose?: string;
	infrastructure: LandInfrastructureMetrics;
	route: RouteMetrics | null;
	terrainAvailable: boolean;
}

export function calculateLandOpportunityScore(
	input: LandScoreInput,
): LandOpportunityScore {
	const factors: string[] = [];
	const unavailable: string[] = [];
	const developmentPotential = input.landUse === "commercial"
		? 82
		: input.landUse === "mixed-use"
			? 78
			: input.landUse === "residential"
				? 72
				: input.landUse === "industrial"
					? 65
					: input.landUse === "agricultural"
						? 48
						: 40;
	factors.push(`Land-use category ${input.landUse} contributes ${developmentPotential}/100 development potential.`);
	if (input.purpose && input.purpose.toLowerCase().includes(input.landUse)) {
		factors.push("Requested purpose matches the normalized land-use category.");
	}

	const infrastructureSignals = [
		input.infrastructure.roadConnectivityScore,
		input.infrastructure.transportScore,
		input.infrastructure.waterAvailable === undefined ? null : input.infrastructure.waterAvailable ? 100 : 0,
		input.infrastructure.electricityAvailable === undefined ? null : input.infrastructure.electricityAvailable ? 100 : 0,
	].filter((value): value is number => value !== null);
	const infrastructure = infrastructureSignals.length > 0
		? Math.round(infrastructureSignals.reduce((sum, value) => sum + value, 0) / infrastructureSignals.length)
		: null;
	if (infrastructure === null) {
		unavailable.push("measured infrastructure quality");
	} else {
		factors.push("Infrastructure score uses measured connectivity, transport, or utility signals.");
	}

	const route = input.route;
	const accessibility = route
		? Math.max(0, Math.round(100 - route.distanceMeters / 100 - route.durationSeconds / 60))
		: null;
	if (!route) {
		unavailable.push("route distance and travel time");
	} else {
		factors.push(`Accessibility uses ${Math.round(route.distanceMeters)}m road distance and ${Math.round(route.durationSeconds)}s travel time.`);
	}
	if (!input.terrainAvailable) unavailable.push("elevation/terrain");

	const components = [developmentPotential, infrastructure, accessibility].filter(
		(value): value is number => value !== null,
	);
	const overall = components.length > 0
		? Math.round(components.reduce((sum, value) => sum + value, 0) / components.length)
		: null;
	if (overall === null) unavailable.push("all score inputs");

	return {
		developmentPotentialScore: developmentPotential,
		accessibilityScore: accessibility,
		infrastructureScore: infrastructure,
		overallScore: overall,
		factors,
		unavailable,
	};
}
