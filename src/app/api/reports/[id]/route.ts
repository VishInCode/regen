import { getReport } from "@/lib/storage/memory";
import { apiErrorResponse } from "@/lib/api/errors";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const report = getReport(id);
  if (!report) return apiErrorResponse("Report not found", 404, "REPORT_NOT_FOUND");
  return Response.json(report);
}