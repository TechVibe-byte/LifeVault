import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { db } from '../db/db';
import { Download, Upload, Trash2, Shield, Moon, Sun, Monitor } from 'lucide-react';

export default function SettingsView() {
  const { theme, setTheme, timeFormat, setTimeFormat } = useAppStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

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

  return (
    <div className="p-5 h-full overflow-y-auto pb-32 hide-scrollbar space-y-6">
      <header>
          <h1 className="text-3xl font-bold font-display tracking-tight text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-gray-500 font-medium">Preferences & Backup</p>
      </header>
      
      <div className="glass-card p-5 space-y-5">
        <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
            <Monitor className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700 dark:text-gray-300">Theme</span>
          <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg flex gap-1">
             <button 
                onClick={() => setTheme('light')}
                className={`p-2 rounded-md transition-colors ${theme === 'light' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-500'}`}
             >
                 <Sun className="w-4 h-4" />
             </button>
             <button 
                onClick={() => setTheme('dark')}
                className={`p-2 rounded-md transition-colors ${theme === 'dark' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-500'}`}
             >
                 <Moon className="w-4 h-4" />
             </button>
             <button 
                onClick={() => setTheme('system')}
                className={`p-2 rounded-md transition-colors ${theme === 'system' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-500'}`}
             >
                 <Monitor className="w-4 h-4" />
             </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="font-medium text-gray-700 dark:text-gray-300">Time Format</span>
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

      <div className="glass-card p-5 space-y-5">
        <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
            <Shield className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Data & Privacy</h2>
        </div>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Your data is stored <strong>locally on this device</strong>. We do not use cloud databases.
            Backup your data regularly to prevent accidental loss.
        </p>

        <div className="space-y-3 pt-2">
            <button 
                onClick={handleExport}
                disabled={isExporting}
                className="w-full flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 py-3 rounded-xl font-medium transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-800/50"
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
                className="w-full flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 py-3 rounded-xl font-medium transition-colors hover:bg-red-100 dark:hover:bg-red-800/50 mt-8"
            >
                <Trash2 className="w-4 h-4" />
                Clear All Local Data
            </button>
        </div>
      </div>
    </div>
  );
}
