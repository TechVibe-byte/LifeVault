import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type TimeFormat = '12h' | '24h';

interface AppState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  timeFormat: TimeFormat;
  setTimeFormat: (format: TimeFormat) => void;
  fabMenuOpen: boolean;
  setFabMenuOpen: (isOpen: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      timeFormat: '12h',
      setTimeFormat: (format) => set({ timeFormat: format }),
      fabMenuOpen: false,
      setFabMenuOpen: (isOpen) => set({ fabMenuOpen: isOpen }),
    }),
    {
      name: 'lifevault-settings',
    }
  )
);
