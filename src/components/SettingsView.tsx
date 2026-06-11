import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { db } from '../db/db';
import { Download, Upload, Trash2, Shield, Moon, Sun, Monitor, Send, Bell, ExternalLink, HelpCircle, CheckCircle2 } from 'lucide-react';
import { getTelegramConfig, saveTelegramConfig, sendTelegramNotification, TelegramConfig } from '../utils/telegram';

export default function SettingsView() {
  const { theme, setTheme, timeFormat, setTimeFormat } = useAppStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Telegram States
  const [tgConfig, setTgConfig] = useState<TelegramConfig>(getTelegramConfig());
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Live Chat ID Fetcher States
  const [retractedChats, setRetractedChats] = useState<{ id: string; name: string }[]>([]);
  const [isFetchingChats, setIsFetchingChats] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [hadSearchRequest, setHadSearchRequest] = useState(false);

  const handleFetchChatId = async () => {
    if (!tgConfig.botToken) {
      alert("Please enter your Bot API Token first to scan incoming messages.");
      return;
    }
    setIsFetchingChats(true);
    setFetchError('');
    setRetractedChats([]);
    setHadSearchRequest(true);
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
        setFetchError('No active messages found. Please search for your bot on Telegram, click "Start" (or send a message to it first), then click "Retrieve Chat ID" again.');
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
      'This is a test broadcast to verify your bot token! ⚡ It was sent successfully from your Hybrid workspace app.',
      150,
      200,
      50
    );
    if (result.success) {
      alert("🎉 Success! Test message sent to your Telegram bot. Check your chat or group!");
    } else {
      alert(`❌ Connection failed:\n${result.message}\n\nPlease check your Bot Token, Chat ID, or internet status and try again.`);
    }
    setIsTesting(false);
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

      {/* --- TELEGRAM BOT INTEGRATION MODULE --- */}
      <div className="glass-card p-5 space-y-5 border border-indigo-500/10 shadow-lg shadow-indigo-500/5">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-3">
            <Send className="w-5 h-5 text-indigo-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Telegram Notifications</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Broadcast your logs automatically upon saving</p>
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
                {isFetchingChats ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-t-transparent border-white rounded-full animate-spin shrink-0" />
                    Scanning Telegram Updates...
                  </>
                ) : (
                  "Retrieve Chat ID from Bot"
                )}
              </button>
            </div>
            
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
              <strong>Easiest Method:</strong> Enter your Bot API Token above, start a direct chat with your new bot on Telegram, send any quick message like <span className="text-gray-900 dark:text-white font-semibold">"hello"</span>, and then click <strong className="text-indigo-600 dark:text-indigo-400">Retrieve Chat ID from Bot</strong>! We will check Telegram for your message and populate your Chat ID instantly.
            </p>

            {fetchError && (
              <div className="text-[11px] text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 px-3 py-2 rounded-xl border border-rose-500/10 font-medium leading-relaxed">
                {fetchError}
              </div>
            )}

            {retractedChats.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold text-gray-600 dark:text-gray-400 block uppercase tracking-wider">
                  Select your profile/group from detected chats:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {retractedChats.map((chat) => (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => {
                        setTgConfig(prev => ({ ...prev, chatId: chat.id }));
                        alert(`Selected "${chat.name}"! Chat ID is set to: ${chat.id}`);
                      }}
                      className="text-left px-3 py-2.5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 text-gray-800 dark:text-zinc-200 font-bold transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <span className="truncate max-w-[180px]">{chat.name}</span>
                      <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-mono group-hover:underline">Use ID</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 bg-gray-50 dark:bg-neutral-900/40 p-3.5 rounded-2xl border border-gray-100 dark:border-zinc-800">
            <h4 className="text-xs font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1">
              💬 Message Layout Customization
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 block">Greeting Header</span>
                <input 
                  type="text"
                  placeholder="e.g. 📢 Hybrid Presence Registered!"
                  value={tgConfig.customGreeting || ''}
                  onChange={(e) => setTgConfig(prev => ({ ...prev, customGreeting: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs dark:bg-zinc-950 rounded-lg border border-gray-200 dark:border-zinc-800 focus:outline-none text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 block">Custom Status Note</span>
                <input 
                  type="text"
                  placeholder="e.g. Transparent reporting rocks!"
                  value={tgConfig.customMsg || ''}
                  onChange={(e) => setTgConfig(prev => ({ ...prev, customMsg: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs dark:bg-zinc-950 rounded-lg border border-gray-200 dark:border-zinc-800 focus:outline-none text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 block">Footer Sign-off</span>
                <input 
                  type="text"
                  placeholder="e.g. Hybrid Tracker"
                  value={tgConfig.customFooter || ''}
                  onChange={(e) => setTgConfig(prev => ({ ...prev, customFooter: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs dark:bg-zinc-950 rounded-lg border border-gray-200 dark:border-zinc-800 focus:outline-none text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Quick instructions panel */}
          <div className="text-[11px] text-gray-500 dark:text-gray-400 bg-indigo-50/20 dark:bg-indigo-950/20 border border-indigo-500/10 rounded-2xl p-4 space-y-1.5">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" /> How to create a Telegram Bot inside 2 minutes:
            </span>
            <ol className="list-decimal pl-4.5 space-y-1 dark:text-zinc-350">
              <li>Open your Telegram client & search for <strong className="text-gray-900 dark:text-white">@BotFather</strong></li>
              <li>Send command <code className="bg-gray-100 dark:bg-zinc-800 px-1 rounded dark:text-indigo-400">/newbot</code> and follow instructions to save your API Token.</li>
              <li>Start a direct chat with your new bot and type a quick "hello".</li>
              <li>To obtain your <strong className="text-gray-900 dark:text-white">Chat ID</strong>, search for <strong className="text-gray-900 dark:text-white">@userinfobot</strong> on Telegram and look up your ID (or add the bot to a channel and fetch its channel ID). Paste them above!</li>
            </ol>
          </div>

          <div className="flex gap-2.5 pt-1.5">
            <button 
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {showSavedFeedback ? "Saved Successfully! ✓" : "Save Telegram Configuration"}
            </button>
            <button 
              type="button"
              onClick={handleTestTelegram}
              disabled={isTesting}
              className="px-4 py-2.5 bg-neutral-200 hover:bg-neutral-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-neutral-800 dark:text-zinc-100 font-bold rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              title="Dispatches a formatted dummy log entry to ensure variables are correct"
            >
              {isTesting ? "Testing..." : "Send Test Ping"}
            </button>
          </div>
        </form>
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
