export type ReportStatus = "pending" | "complete" | "failed";

export interface Report {
  id: string;
  title: string;
  status: ReportStatus;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface ReportsResponse {
  reports: Report[];
}