import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LatLng } from "../lib/types";

export interface AppLocation extends LatLng {
  label: string;
}

export type Theme = "light" | "dark" | "system";

interface AppState {
  location: AppLocation;
  theme: Theme;
  setLocation: (location: AppLocation) => void;
  setTheme: (theme: Theme) => void;
}

const JAKARTA: AppLocation = { label: "Jakarta, Indonesia", lat: -6.2088, lng: 106.8456 };

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      location: JAKARTA,
      theme: "system",
      setLocation: (location) => set({ location }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: "flowwatch:app-store" }
  )
);
