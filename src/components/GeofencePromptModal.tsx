import React, { useEffect, useState } from 'react';
import { MapPin, Briefcase, X, CheckCircle2, Navigation } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { checkUserAtOfficeLocation } from '../utils/geofence';
import { markAttendance } from '../db/hooks';
import { format } from 'date-fns';
import { db } from '../db/db';

export default function GeofencePromptModal() {
  const {
    officeLat,
    officeLng,
    officeRadius,
    geofenceEnabled,
    lastGeofencePromptDate,
    setLastGeofencePromptDate,
    commuteDistance,
    commuteRate,
    commuteRoundTrip
  } = useAppStore();

  const [isOpen, setIsOpen] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [isLogging, setIsLogging] = useState(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!geofenceEnabled || officeLat === null || officeLng === null) return;
    if (lastGeofencePromptDate === todayStr) return;

    // Check if today's attendance is already marked
    const checkAttendance = async () => {
      const existing = await db.attendance.where('date').equals(todayStr).first();
      if (existing) return; // Already logged today!

      try {
        const res = await checkUserAtOfficeLocation(officeLat, officeLng, officeRadius);
        if (res.isAtOffice) {
          setDistance(res.distance);
          setIsOpen(true);
        }
      } catch (err) {
        console.warn('Geofence check silently skipped:', err);
      }
    };

    // Run check 1.5 seconds after load
    const timer = setTimeout(checkAttendance, 1500);
    return () => clearTimeout(timer);
  }, [geofenceEnabled, officeLat, officeLng, officeRadius, lastGeofencePromptDate, todayStr]);

  const handleConfirmOffice = async () => {
    setIsLogging(true);
    try {
      const travelCost = commuteDistance && commuteRate
        ? commuteDistance * commuteRate * (commuteRoundTrip ? 2 : 1)
        : undefined;

      await markAttendance(
        todayStr,
        'Office',
        `Auto-detected via GPS Geofence (~${distance}m from Office)`,
        travelCost
      );

      setLastGeofencePromptDate(todayStr);
      setIsOpen(false);
      alert("🏢 Marked today as Office presence! Commute expenses updated.");
    } catch (err: any) {
      console.error(err);
      alert(`Failed to log attendance: ${err.message}`);
    } finally {
      setIsLogging(false);
    }
  };

  const handleDismiss = () => {
    setLastGeofencePromptDate(todayStr);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-zinc-900 border border-indigo-500/40 text-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in fade-in slide-in-from-bottom-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600/30 border border-indigo-400/30 rounded-xl text-indigo-400">
              <MapPin className="w-5 h-5 animate-bounce text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Geofence Office Detected!</h3>
              <p className="text-[11px] text-zinc-400">You are at your office coordinates</p>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-indigo-950/40 border border-indigo-500/20 p-3.5 rounded-2xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-indigo-400" />
              Proximity Alert:
            </span>
            <span className="text-[11px] font-mono bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-400/30 font-bold">
              ~{distance}m away
            </span>
          </div>
          <p className="text-xs text-zinc-300 leading-normal pt-1">
            Would you like to mark today (<strong className="text-white">{todayStr}</strong>) as an <strong className="text-indigo-400">Office Day</strong> with 1-tap?
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDismiss}
            className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-xs transition-all"
          >
            Dismiss
          </button>
          <button
            onClick={handleConfirmOffice}
            disabled={isLogging}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Briefcase className="w-4 h-4" />
            {isLogging ? 'Marking...' : '🏢 Mark Office'}
          </button>
        </div>
      </div>
    </div>
  );
}
