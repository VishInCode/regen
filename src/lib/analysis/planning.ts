import type {
	PlanningAnalysis,
	PlanningIndicatorGroup,
	PlanningAnalysisRequest,
} from "@/types/planning";

export function analyzePlanning(
	request: PlanningAnalysisRequest,
): PlanningAnalysis {
	const group = (summary: string): PlanningIndicatorGroup => ({
		summary,
		indicators: { status: "unavailable" },
	});
	return {
		request,
		population: group("Population data requires a configured government dataset."),
		infrastructure: group("Infrastructure data requires a configured government dataset."),
		landUse: group("Land-use data is not yet connected to an official planning source."),
		environment: group("Environmental indicators are not yet connected to planning datasets."),
		services: group("Public-service data is unavailable for this analysis."),
		development: group("Development planning data is unavailable for this analysis."),
		riskResilience: group("Risk and resilience indicators are unavailable for this analysis."),
		agriculture: group("Agriculture indicators are unavailable for this analysis."),
		connectivity: group("Connectivity planning data is unavailable for this analysis."),
		livelihoodResources: group("Livelihood and resource indicators are unavailable for this analysis."),
		insights: ["Configure an official data.gov.in resource to enable public planning analysis."],
		dataAvailability: {
			source: "REGEN planning contract",
			isMock: false,
			available: [],
			unavailable: ["all planning indicators"],
		},
	};
}
