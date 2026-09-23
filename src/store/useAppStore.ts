import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type TimeFormat = '12h' | '24h';
type CommuteUnit = 'km' | 'mile';

interface AppState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  timeFormat: TimeFormat;
  setTimeFormat: (format: TimeFormat) => void;
  fabMenuOpen: boolean;
  setFabMenuOpen: (isOpen: boolean) => void;

  // Preset Commute Parameters
  commuteDistance: number;
  setCommuteDistance: (distance: number) => void;
  commuteUnit: CommuteUnit;
  setCommuteUnit: (unit: CommuteUnit) => void;
  commuteRate: number;
  setCommuteRate: (rate: number) => void;
  commuteRoundTrip: boolean;
  setCommuteRoundTrip: (roundTrip: boolean) => void;

  // Geofence Auto-Detection Parameters
  officeLat: number | null;
  officeLng: number | null;
  officeRadius: number; // in meters
  geofenceEnabled: boolean;
  lastGeofencePromptDate: string | null;
  setOfficeCoordinates: (lat: number | null, lng: number | null) => void;
  setOfficeRadius: (radius: number) => void;
  setGeofenceEnabled: (enabled: boolean) => void;
  setLastGeofencePromptDate: (dateStr: string | null) => void;

  // Calendar Intelligence Settings
  officeKeywords: string;
  setOfficeKeywords: (keywords: string) => void;

  // Telegram Automation Parameters
  telegramPromptTime: string;
  telegramPromptEnabled: boolean;
  weeklyDigestEnabled: boolean;
  setTelegramPromptTime: (time: string) => void;
  setTelegramPromptEnabled: (enabled: boolean) => void;
  setWeeklyDigestEnabled: (enabled: boolean) => void;
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

      // Preset Commute Defaults (e.g., 18 km at ₹12/km or $0.67/mile round trip)
      commuteDistance: 18,
      setCommuteDistance: (commuteDistance) => set({ commuteDistance }),
      commuteUnit: 'km',
      setCommuteUnit: (commuteUnit) => set({ commuteUnit }),
      commuteRate: 12,
      setCommuteRate: (commuteRate) => set({ commuteRate }),
      commuteRoundTrip: true,
      setCommuteRoundTrip: (commuteRoundTrip) => set({ commuteRoundTrip }),

      // Geofence Defaults
      officeLat: null,
      officeLng: null,
      officeRadius: 300,
      geofenceEnabled: false,
      lastGeofencePromptDate: null,
      setOfficeCoordinates: (officeLat, officeLng) => set({ officeLat, officeLng }),
      setOfficeRadius: (officeRadius) => set({ officeRadius }),
      setGeofenceEnabled: (geofenceEnabled) => set({ geofenceEnabled }),
      setLastGeofencePromptDate: (lastGeofencePromptDate) => set({ lastGeofencePromptDate }),

      // Calendar Keywords Defaults
      officeKeywords: 'office, hq, lab, building, on-site, onsite, room, floor',
      setOfficeKeywords: (officeKeywords) => set({ officeKeywords }),

      // Telegram Automation Defaults
      telegramPromptTime: '18:00',
      telegramPromptEnabled: true,
      weeklyDigestEnabled: true,
      setTelegramPromptTime: (telegramPromptTime) => set({ telegramPromptTime }),
      setTelegramPromptEnabled: (telegramPromptEnabled) => set({ telegramPromptEnabled }),
      setWeeklyDigestEnabled: (weeklyDigestEnabled) => set({ weeklyDigestEnabled }),
    }),
    {
      name: 'lifevault-settings',
    }
  )
);
