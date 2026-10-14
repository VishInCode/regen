import type { DashboardSummary } from "@/types/analysis";

export function GET(): Response {
  const summary: DashboardSummary = {
    population: 569578,
    businesses: 1840,
    availableLandOpportunities: 1,
    activeDevelopmentProjects: 1,
    dataAvailability: {
      source: "REGEN dashboard demo dataset",
      isMock: true,
      available: ["demo summary metrics"],
      unavailable: ["live dashboard aggregation"],
    },
  };
  return Response.json(summary);
}