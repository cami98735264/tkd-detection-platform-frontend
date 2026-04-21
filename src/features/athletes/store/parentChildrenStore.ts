import { create } from "zustand";
import { parentAthletesApi, type ParentChild } from "@/features/athletes/api/parentAthletesApi";

interface ParentChildrenState {
  children: ParentChild[];
  selectedChildId: number | null;
  loading: boolean;
  error: string | null;
  fetchChildren: () => Promise<void>;
  selectChild: (id: number | null) => void;
}

export const useParentChildrenStore = create<ParentChildrenState>()((set, get) => ({
  children: [],
  selectedChildId: null,
  loading: false,
  error: null,

  fetchChildren: async () => {
    set({ loading: true, error: null });
    try {
      const children = await parentAthletesApi.getChildren();
      const current = get().selectedChildId;
      set({
        children,
        selectedChildId: current ?? (children.length > 0 ? children[0].athlete_id : null),
        loading: false,
      });
    } catch {
      set({ error: "No se pudieron cargar los atletas.", loading: false });
    }
  },

  selectChild: (id) => set({ selectedChildId: id }),
}));