import { getReports, saveReport } from "@/lib/storage/memory";
import type { Report, ReportsResponse } from "@/types/report";
import { apiErrorResponse } from "@/lib/api/errors";

export function GET(): Response {
  const response: ReportsResponse = { reports: getReports() };
  return Response.json(response);
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null) {
      return apiErrorResponse("Invalid report request", 400, "INVALID_REQUEST");
    }
    const value = body as Record<string, unknown>;
    const report: Report = {
      id: crypto.randomUUID(),
      title: typeof value.title === "string" ? value.title : "REGEN analysis report",
      status: "complete",
      payload: value,
      createdAt: new Date().toISOString(),
    };
    return Response.json(saveReport(report), { status: 201 });
  } catch {
    return apiErrorResponse("Invalid report request", 400, "INVALID_REQUEST");
  }
}
