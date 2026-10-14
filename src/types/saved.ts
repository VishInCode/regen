export type SavedItemType = "location" | "land" | "business" | "report";

export interface SavedItem {
  id: string;
  type: SavedItemType;
  title: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface SavedItemsResponse {
  items: SavedItem[];
}