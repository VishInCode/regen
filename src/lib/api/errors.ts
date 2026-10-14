import type { ApiError } from "@/types/api";

export function apiErrorResponse(
  error: string,
  status: number,
  code: string,
  details?: unknown,
): Response {
  const body: ApiError = {
    error,
    code,
    ...(details === undefined ? {} : { details }),
  };
  return Response.json(body, { status });
}
