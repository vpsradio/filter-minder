import { create } from "zustand";
import { FilterRecord } from "@/types/filter";

interface FilterStore {
  filters: FilterRecord[];
  addFilter: (filter: FilterRecord) => void;
  removeFilter: (id: string) => void;
  updateFilter: (id: string, updates: Partial<FilterRecord>) => void;
}

// Demo data
const today = new Date();
const demoFilters: FilterRecord[] = [
  {
    id: "demo-1",
    location: "Oficina Central - Planta Baja",
    installationDate: new Date(today.getFullYear(), today.getMonth() - 6, 15),
    filterType: "HEPA",
    expirationDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10),
    notes: "Filtro del sistema de climatización principal",
  },
  {
    id: "demo-2",
    location: "Laboratorio A",
    installationDate: new Date(today.getFullYear(), today.getMonth() - 3, 1),
    filterType: "Carbón Activo",
    expirationDate: new Date(today.getFullYear(), today.getMonth() + 1, 5),
    notes: "Campana extractora",
  },
  {
    id: "demo-3",
    location: "Cocina Industrial",
    installationDate: new Date(today.getFullYear(), today.getMonth() - 8, 20),
    filterType: "Osmosis Inversa",
    expirationDate: new Date(today.getFullYear(), today.getMonth() - 0, today.getDate() - 3),
  },
  {
    id: "demo-4",
    location: "Sala de Servidores",
    installationDate: new Date(today.getFullYear(), today.getMonth() - 1, 10),
    filterType: "Sedimentos",
    expirationDate: new Date(today.getFullYear(), today.getMonth() + 3, 10),
  },
];

export const useFilterStore = create<FilterStore>((set) => ({
  filters: demoFilters,
  addFilter: (filter) =>
    set((state) => ({ filters: [...state.filters, filter] })),
  removeFilter: (id) =>
    set((state) => ({ filters: state.filters.filter((f) => f.id !== id) })),
  updateFilter: (id, updates) =>
    set((state) => ({
      filters: state.filters.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    })),
}));
