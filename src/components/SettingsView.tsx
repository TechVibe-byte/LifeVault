import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { db } from '../db/db';
import { Download, Upload, Trash2, Shield, Monitor, Send, HelpCircle, CheckCircle2, Car, MapPin, Navigation, Calendar, BarChart2 } from 'lucide-react';
import { getTelegramConfig, saveTelegramConfig, sendTelegramNotification, sendDailyTelegramPrompt, sendWeeklyTelegramDigest, TelegramConfig } from '../utils/telegram';
import { getCurrentLocation, calculateDistance } from '../utils/geofence';

export default function SettingsView() {
  const {
    timeFormat,
    setTimeFormat,
    commuteDistance,
    setCommuteDistance,
    commuteUnit,
    setCommuteUnit,
    commuteRate,
    setCommuteRate,
    commuteRoundTrip,
    setCommuteRoundTrip,
    officeLat,
    officeLng,
    officeRadius,
    geofenceEnabled,
    setOfficeCoordinates,
    setOfficeRadius,
    setGeofenceEnabled,
    officeKeywords,
    setOfficeKeywords
  } = useAppStore();

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Telegram States
  const [tgConfig, setTgConfig] = useState<TelegramConfig>(getTelegramConfig());
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSendingPrompt, setIsSendingPrompt] = useState(false);
  const [isSendingDigest, setIsSendingDigest] = useState(false);

  // Geofence states
  const [isLocating, setIsLocating] = useState(false);
  const [geoTestResult, setGeoTestResult] = useState('');

  // Live Chat ID Fetcher States
  const [retractedChats, setRetractedChats] = useState<{ id: string; name: string }[]>([]);
  const [isFetchingChats, setIsFetchingChats] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const handleFetchChatId = async () => {
    if (!tgConfig.botToken) {
      alert("Please enter your Bot API Token first to scan incoming messages.");
      return;
    }
    setIsFetchingChats(true);
    setFetchError('');
    setRetractedChats([]);
    try {
      const response = await fetch(`https://api.telegram.org/bot${tgConfig.botToken}/getUpdates`);
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.description || 'Failed to retrieve updates from Telegram server.');
      }
      
      const results = data.result || [];
      const chatMap = new Map<string, string>();
      
      results.forEach((item: any) => {
        const msg = item.message || item.edited_message || item.channel_post || item.my_chat_member;
        if (msg && msg.chat) {
          const id = String(msg.chat.id);
          const name = msg.chat.title || 
                       `${msg.chat.first_name || ''} ${msg.chat.last_name || ''}`.trim() || 
                       msg.chat.username || 
                       'Private Chat';
          const details = `${name} (${msg.chat.username ? '@' + msg.chat.username : 'ID: ' + id})`;
          chatMap.set(id, details);
        }
      });
      
      if (chatMap.size === 0) {
        setFetchError('No active messages found. Search for your bot on Telegram, type a message, then click again.');
      } else {
        const list: { id: string; name: string }[] = [];
        chatMap.forEach((name, id) => {
          list.push({ id, name });
        });
        setRetractedChats(list);
      }
    } catch (err: any) {
      console.error(err);
      setFetchError(err.message || 'Could not fetch updates. Please verify your Bot API Token.');
    } finally {
      setIsFetchingChats(false);
    }
  };

  const handleSaveTelegram = (e: React.FormEvent) => {
    e.preventDefault();
    saveTelegramConfig(tgConfig);
    setShowSavedFeedback(true);
    setTimeout(() => setShowSavedFeedback(false), 3000);
  };

  const handleTestTelegram = async () => {
    saveTelegramConfig(tgConfig);
    if (!tgConfig.botToken || !tgConfig.chatId) {
      alert("Please configure both Bot Token and Chat ID before testing.");
      return;
    }
    setIsTesting(true);
    const result = await sendTelegramNotification(
      new Date().toISOString().split('T')[0],
      'Office',
      'This is a test broadcast from Hybrid Tracker! ⚡',
      150, 200, 50
    );
    if (result.success) {
      alert("🎉 Success! Test message sent to your Telegram bot.");
    } else {
      alert(`❌ Connection failed:\n${result.message}`);
    }
    setIsTesting(false);
  };

  const handleSendPromptNow = async () => {
    saveTelegramConfig(tgConfig);
    setIsSendingPrompt(true);
    const res = await sendDailyTelegramPrompt();
    if (res.success) {
      alert("🚀 Sent 6:00 PM Daily Check-in Prompt with inline buttons to Telegram!");
    } else {
      alert(`Failed to send prompt: ${res.message}`);
    }
    setIsSendingPrompt(false);
  };

  const handleSendDigestNow = async () => {
    saveTelegramConfig(tgConfig);
    setIsSendingDigest(true);
    const res = await sendWeeklyTelegramDigest();
    if (res.success) {
      alert("📊 Weekly summary digest delivered to your Telegram channel!");
    } else {
      alert(`Failed to send digest: ${res.message}`);
    }
    setIsSendingDigest(false);
  };

  const handleGrabCurrentLocation = async () => {
    setIsLocating(true);
    setGeoTestResult('');
    try {
      const coords = await getCurrentLocation();
      setOfficeCoordinates(coords.lat, coords.lng);
      setGeoTestResult(`📍 Office coordinates captured: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
    } catch (err: any) {
      alert(`Location Error: ${err.message}`);
    } finally {
      setIsLocating(false);
    }
  };

  const handleTestGeofence = async () => {
    if (officeLat === null || officeLng === null) {
      alert("Please set office GPS coordinates first.");
      return;
    }
    try {
      const coords = await getCurrentLocation();
      const dist = calculateDistance(officeLat, officeLng, coords.lat, coords.lng);
      if (dist <= officeRadius) {
        alert(`✅ Geofence Match! You are ~${dist}m from office (within ${officeRadius}m radius).`);
      } else {
        alert(`📍 Outside Geofence: You are ~${dist}m away from office (Radius: ${officeRadius}m).`);
      }
    } catch (err: any) {
      alert(`Geofence test failed: ${err.message}`);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const events = await db.events.toArray();
      const attendance = await db.attendance.toArray();
      const activities = await db.activities.toArray();

      const data = {
        version: 1,
        timestamp: Date.now(),
        events,
        attendance,
        activities
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifevault-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export:", err);
      alert("Export failed.");
    }
    setIsExporting(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.version || !data.events) throw new Error("Invalid backup format");

      await db.transaction('rw', db.events, db.attendance, db.activities, async () => {
        await db.events.clear();
        await db.attendance.clear();
        await db.activities.clear();

        if (data.events.length) await db.events.bulkAdd(data.events);
        if (data.attendance?.length) await db.attendance.bulkAdd(data.attendance);
        if (data.activities?.length) await db.activities.bulkAdd(data.activities);
      });
      
      alert("Data restored successfully!");
      window.location.reload();
    } catch (err) {
      console.error("Failed to import:", err);
      alert("Import failed. Invalid file or version.");
    }
    setIsImporting(false);
  };

  const handleClear = async () => {
    if (confirm("Are you sure you want to delete ALL data? This action cannot be undone.")) {
      await db.events.clear();
      await db.attendance.clear();
      await db.activities.clear();
      alert("All data cleared.");
      window.location.reload();
    }
  };

  const currency = localStorage.getItem('hybrid_pref_currency') || 'INR';
  const currencySym = currency === 'INR' ? '₹' : '$';
  const estimatedCommuteTotal = commuteDistance * commuteRate * (commuteRoundTrip ? 2 : 1);

  return (
    <div className="p-5 h-full overflow-y-auto pb-32 hide-scrollbar space-y-6">
      <header>
        <h1 className="text-3xl font-bold font-display tracking-tight text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-500 font-medium">Preferences & Automation</p>
      </header>
      
      {/* --- APPEARANCE --- */}
      <div className="glass-card p-5 space-y-5">
        <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
          <Monitor className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">Time Format</span>
          <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg flex gap-1">
            <button 
              onClick={() => setTimeFormat('12h')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${timeFormat === '12h' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}
            >
              12H
            </button>
            <button 
              onClick={() => setTimeFormat('24h')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${timeFormat === '24h' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}
            >
              24H
            </button>
          </div>
        </div>
      </div>

      {/* --- PRESET COMMUTE DISTANCE & RATES --- */}
      <div className="glass-card p-5 space-y-5 border border-indigo-500/10 shadow-lg shadow-indigo-500/5">
        <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
          <Car className="w-5 h-5 text-indigo-500" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Preset Commute & Rates</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">1-click travel expense autofill calculation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              One-Way Distance ({commuteUnit}):
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={commuteDistance}
                onChange={(e) => setCommuteDistance(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500"
              />
              <select
                value={commuteUnit}
                onChange={(e) => setCommuteUnit(e.target.value as 'km' | 'mile')}
                className="px-2 py-2 text-xs dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-gray-100"
              >
                <option value="km">km</option>
                <option value="mile">mile</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Per-{commuteUnit} Rate ({currencySym}):
            </label>
            <input
              type="number"
              step="0.01"
              value={commuteRate}
              onChange={(e) => setCommuteRate(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-xs dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="roundtrip"
              checked={commuteRoundTrip}
              onChange={(e) => setCommuteRoundTrip(e.target.checked)}
              className="rounded accent-indigo-600"
            />
            <label htmlFor="roundtrip" className="text-xs font-bold text-gray-300 cursor-pointer">
              Calculate Round Trip (2× Distance)
            </label>
          </div>
          <span className="text-xs font-mono font-extrabold text-indigo-400">
            = {currencySym}{estimatedCommuteTotal.toLocaleString('en-IN')} / office day
          </span>
        </div>
      </div>

      {/* --- GEOFENCE AUTO-DETECTION --- */}
      <div className="glass-card p-5 space-y-5 border border-emerald-500/10 shadow-lg shadow-emerald-500/5">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-emerald-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Geofence Auto-Detection</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Prompt with 1-tap confirmation when at office GPS coordinates</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={geofenceEnabled}
              onChange={(e) => setGeofenceEnabled(e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600" />
          </label>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-gray-400">Office Latitude</span>
              <input
                type="number"
                step="any"
                placeholder="e.g. 28.6139"
                value={officeLat !== null ? officeLat : ''}
                onChange={(e) => setOfficeCoordinates(e.target.value ? parseFloat(e.target.value) : null, officeLng)}
                className="w-full px-3 py-1.5 text-xs dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-gray-400">Office Longitude</span>
              <input
                type="number"
                step="any"
                placeholder="e.g. 77.2090"
                value={officeLng !== null ? officeLng : ''}
                onChange={(e) => setOfficeCoordinates(officeLat, e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-1.5 text-xs dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-gray-400">Radius (meters)</span>
              <input
                type="number"
                value={officeRadius}
                onChange={(e) => setOfficeRadius(parseInt(e.target.value, 10) || 100)}
                className="w-full px-3 py-1.5 text-xs dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleGrabCurrentLocation}
              disabled={isLocating}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Navigation className="w-3.5 h-3.5" />
              {isLocating ? 'Locating...' : 'Set Current GPS as Office'}
            </button>
            <button
              type="button"
              onClick={handleTestGeofence}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Test Proximity
            </button>
          </div>

          {geoTestResult && (
            <p className="text-xs text-emerald-400 font-mono bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/20">
              {geoTestResult}
            </p>
          )}
        </div>
      </div>

      {/* --- TELEGRAM BOT INTEGRATION & TWO-WAY AUTOMATION MODULE --- */}
      <div className="glass-card p-5 space-y-5 border border-indigo-500/10 shadow-lg shadow-indigo-500/5">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-3">
            <Send className="w-5 h-5 text-indigo-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Telegram Bot & Inline Automation</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Two-way logging inline buttons & weekly summary digest</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={tgConfig.enabled}
              onChange={(e) => setTgConfig(prev => ({ ...prev, enabled: e.target.checked }))}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600" />
            <span className="ml-2 text-xs font-bold text-gray-700 dark:text-gray-300">
              {tgConfig.enabled ? "ACTIVE" : "DISABLED"}
            </span>
          </label>
        </div>

        {/* Dynamic setup form */}
        <form onSubmit={handleSaveTelegram} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                Bot API Token
                <span className="text-red-500">*</span>
              </label>
              <input 
                type="password"
                placeholder="e.g. 123456:ABC-DEF1234ghIkl..."
                value={tgConfig.botToken}
                onChange={(e) => setTgConfig(prev => ({ ...prev, botToken: e.target.value }))}
                className="w-full px-3 py-2 text-xs dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                required={tgConfig.enabled}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                Chat ID or Secret ID
                <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                placeholder="e.g. 9876543210 or -1001552233..."
                value={tgConfig.chatId}
                onChange={(e) => setTgConfig(prev => ({ ...prev, chatId: e.target.value }))}
                className="w-full px-3 py-2 text-xs dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                required={tgConfig.enabled}
              />
            </div>
          </div>

          {/* Quick Action Triggers: 6:00 PM Prompt & Weekly Digest */}
          <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-4 space-y-3">
            <span className="text-xs font-extrabold text-indigo-400 uppercase tracking-widest block">
              ⚡ Telegram Automation Actions
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleSendPromptNow}
                disabled={isSendingPrompt || !tgConfig.botToken}
                className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {isSendingPrompt ? 'Dispatching...' : 'Send 6:00 PM Daily Prompt'}
              </button>

              <button
                type="button"
                onClick={handleSendDigestNow}
                disabled={isSendingDigest || !tgConfig.botToken}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                {isSendingDigest ? 'Generating...' : 'Send Weekly Summary Digest'}
              </button>
            </div>
          </div>

          {/* Live Chat ID Assistant */}
          <div className="bg-indigo-50/20 dark:bg-indigo-950/20 border border-indigo-500/10 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                ⚡ Live Chat ID Finder
              </span>
              <button
                type="button"
                onClick={handleFetchChatId}
                disabled={isFetchingChats}
                className="text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-3 py-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-1 cursor-pointer disabled:opacity-50 inline-flex"
              >
                {isFetchingChats ? "Scanning Telegram Updates..." : "Retrieve Chat ID from Bot"}
              </button>
            </div>
            
            {fetchError && (
              <div className="text-[11px] text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-3 py-2 rounded-xl border border-rose-500/10 font-medium">
                {fetchError}
              </div>
            )}

            {retractedChats.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
                  Select detected profile:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {retractedChats.map((chat) => (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => {
                        setTgConfig(prev => ({ ...prev, chatId: chat.id }));
                        alert(`Selected "${chat.name}"! Chat ID set to: ${chat.id}`);
                      }}
                      className="text-left px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-indigo-400 text-zinc-200 font-bold text-xs flex items-center justify-between"
                    >
                      <span className="truncate max-w-[180px]">{chat.name}</span>
                      <span className="text-[10px] text-indigo-400 font-mono">Use ID</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2.5 pt-1.5">
            <button 
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {showSavedFeedback ? "Saved Successfully! ✓" : "Save Telegram Settings"}
            </button>
            <button 
              type="button"
              onClick={handleTestTelegram}
              disabled={isTesting}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isTesting ? "Testing..." : "Send Test Ping"}
            </button>
          </div>
        </form>
      </div>

      {/* --- DATA & BACKUP --- */}
      <div className="glass-card p-5 space-y-5">
        <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
          <Shield className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Data & Privacy</h2>
        </div>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          Your data is stored <strong>locally on this device</strong>. We do not use cloud databases.
        </p>

        <div className="space-y-3 pt-2">
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 py-3 rounded-xl font-medium transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-800/50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export Backup JSON'}
          </button>

          <label className="w-full flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 py-3 rounded-xl font-medium cursor-pointer transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-800/50">
            <Upload className="w-4 h-4" />
            {isImporting ? 'Restoring...' : 'Restore from Backup'}
            <input type="file" accept=".json" className="hidden" onChange={handleImport} disabled={isImporting} />
          </label>

          <button 
            onClick={handleClear}
            className="w-full flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 py-3 rounded-xl font-medium transition-colors hover:bg-red-100 dark:hover:bg-red-800/50 mt-8 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Local Data
          </button>
        </div>
      </div>
    </div>
  );
}
