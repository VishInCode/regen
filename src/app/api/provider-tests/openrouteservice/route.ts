import { testOpenRouteServiceRouting } from "@/lib/api/openrouteservice";

export async function GET(): Promise<Response> {
  return Response.json(await testOpenRouteServiceRouting());
}