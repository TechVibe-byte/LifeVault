import { create } from 'zustand';

interface NavigationState {
  currentTab: 'calendar' | 'attendance' | 'activities' | 'dashboard' | 'settings';
  setCurrentTab: (tab: 'calendar' | 'attendance' | 'activities' | 'dashboard' | 'settings') => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentTab: 'dashboard',
  setCurrentTab: (tab) => set({ currentTab: tab }),
}));
