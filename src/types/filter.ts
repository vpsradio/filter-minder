export type FilterType = 
  | "Claris 250"
  | "Claris 500"
  | "Claris 1000"
  | "Claris 1500"
  | "Claris 2000"
  | "Brita";

export interface FilterRecord {
  id: string;
  location: string;
  installationDate: Date;
  filterType: FilterType;
  expirationDate: Date;
  notes?: string;
}

export type FilterStatus = "ok" | "warning" | "urgent" | "expired";

export function getFilterStatus(expirationDate: Date): FilterStatus {
  const now = new Date();
  const diff = expirationDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) return "expired";
  if (daysLeft <= 15) return "urgent";
  if (daysLeft <= 30) return "warning";
  return "ok";
}

export function getDaysUntilExpiration(expirationDate: Date): number {
  const now = new Date();
  const diff = expirationDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export const FILTER_TYPES: FilterType[] = [
  "HEPA",
  "Carbón Activo",
  "Osmosis Inversa",
  "Sedimentos",
  "UV",
  "Mecánico",
  "Otro",
];
