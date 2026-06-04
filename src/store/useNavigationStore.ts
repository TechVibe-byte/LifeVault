import { create } from 'zustand';

interface NavigationState {
  currentTab: 'calendar' | 'attendance' | 'activities' | 'dashboard' | 'settings';
  setCurrentTab: (tab: 'calendar' | 'attendance' | 'activities' | 'dashboard' | 'settings') => void;
  addEventOpen: boolean;
  setAddEventOpen: (open: boolean) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentTab: 'dashboard',
  setCurrentTab: (tab) => set({ currentTab: tab }),
  addEventOpen: false,
  setAddEventOpen: (open) => set({ addEventOpen: open }),
}));

