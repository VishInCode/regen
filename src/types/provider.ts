import type { DataAvailability } from "./api";

export interface ProviderResult<T> {
  data: T | null;
  availability: DataAvailability;
}
