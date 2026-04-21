import { http } from "@/lib/http";
import type { Athlete } from "@/types/entities";

export interface ParentChild {
  id: number;
  athlete_id: number;
  athlete: Athlete;
  relationship: string;
}

export const parentAthletesApi = {
  getChildren: () => http.get<ParentChild[]>("/parent/children/"),
};