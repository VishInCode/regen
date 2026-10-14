import { getSavedItems, saveItem } from "@/lib/storage/memory";
import type { SavedItem, SavedItemType, SavedItemsResponse } from "@/types/saved";
import { apiErrorResponse } from "@/lib/api/errors";

function isSavedType(value: unknown): value is SavedItemType {
  return value === "location" || value === "land" || value === "business" || value === "report";
}

export function GET(): Response {
  const response: SavedItemsResponse = { items: getSavedItems() };
  return Response.json(response);
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null) {
      return apiErrorResponse("Invalid saved item", 400, "INVALID_REQUEST");
    }
    const value = body as Record<string, unknown>;
    if (typeof value.title !== "string" || !isSavedType(value.type) || typeof value.payload !== "object" || value.payload === null) {
      return apiErrorResponse("title, type, and payload are required", 400, "INVALID_REQUEST");
    }
    const item: SavedItem = {
      id: crypto.randomUUID(),
      title: value.title,
      type: value.type,
      payload: value.payload as Record<string, unknown>,
      createdAt: new Date().toISOString(),
    };
    return Response.json(saveItem(item), { status: 201 });
  } catch {
    return apiErrorResponse("Invalid saved item", 400, "INVALID_REQUEST");
  }
}
