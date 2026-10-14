import type { Report } from "@/types/report";
import type { SavedItem } from "@/types/saved";

interface MemoryStore {
  savedItems: SavedItem[];
  reports: Report[];
}

const globalStore = globalThis as typeof globalThis & { __regenStore?: MemoryStore };
const store: MemoryStore =
  globalStore.__regenStore ?? { savedItems: [], reports: [] };
globalStore.__regenStore = store;

export function getSavedItems(): SavedItem[] {
  return [...store.savedItems];
}

export function saveItem(item: SavedItem): SavedItem {
  store.savedItems.push(item);
  return item;
}

export function deleteSavedItem(id: string): boolean {
  const index = store.savedItems.findIndex((item) => item.id === id);
  if (index < 0) return false;
  store.savedItems.splice(index, 1);
  return true;
}

export function getReports(): Report[] {
  return [...store.reports];
}

export function getReport(id: string): Report | null {
  return store.reports.find((report) => report.id === id) ?? null;
}

export function saveReport(report: Report): Report {
  store.reports.push(report);
  return report;
}