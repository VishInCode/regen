import { deleteSavedItem } from "@/lib/storage/memory";
import { apiErrorResponse } from "@/lib/api/errors";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  if (!deleteSavedItem(id)) return apiErrorResponse("Saved item not found", 404, "SAVED_ITEM_NOT_FOUND");
  return new Response(null, { status: 204 });
}