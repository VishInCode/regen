import type { HealthResponse } from "@/types/api";

export function GET(): Response {
  const body: HealthResponse = {
    status: "ok",
    service: "regen-api",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  };

  return Response.json(body, { status: 200 });
}
