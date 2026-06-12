import { useEffect, useState } from 'react';
import { useAppStore } from './store/useAppStore';
import { useNavigationStore } from './store/useNavigationStore';
import { Settings, ArrowLeft, CalendarDays } from 'lucide-react';
import { cn } from './lib/utils';
import AttendanceView from './components/AttendanceView';
import SettingsView from './components/SettingsView';

function StatusBar() {
  const [time, setTime] = useState(new Date());
  const { timeFormat } = useAppStore();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-10 w-full flex justify-between items-center px-6 text-[12px] font-bold z-20 shrink-0 mt-1 select-none text-neutral-350">
      <span className="tabular-nums lowercase">
        {time.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: timeFormat === '12h'
        })}
      </span>
    </div>
  );
}

export default function App() {
  const { theme } = useAppStore();
  const { currentTab, setCurrentTab } = useNavigationStore();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light');
    root.classList.add('dark');
  }, [theme]);

  // Enforce attendance tracking as default view on load
  useEffect(() => {
    if (currentTab !== 'attendance' && currentTab !== 'settings') {
      setCurrentTab('attendance');
    }
  }, [currentTab, setCurrentTab]);

  return (
    <div className="relative w-full h-full sm:w-[375px] sm:h-[730px] text-white bg-[#0A0A0A] selection:bg-indigo-500/30 max-w-md mx-auto shadow-2xl overflow-hidden border-[#1A1A1A] sm:border-[8px] sm:rounded-[48px] flex flex-col">
      
      {/* Dynamic ambient colored backgrounds to provide premium vibe */}
      <div className="absolute top-[-5%] left-[-5%] w-72 h-72 bg-indigo-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-80 pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-72 h-72 bg-emerald-500/5 rounded-full mix-blend-screen filter blur-3xl opacity-50 pointer-events-none" />

      {/* iPhone Status Bar */}
      <StatusBar />

      {/* Mini App Header View with Centered Hybrid Tracker Title */}
      <header className="px-6 py-3 flex justify-center items-center border-b border-white/[0.03] relative z-10 shrink-0 select-none">
        <div className="flex flex-col items-center justify-center text-center gap-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-lg text-white shadow-sm shadow-indigo-500/10">
              <CalendarDays className="w-4 h-4" />
            </div>
            <h1 className="text-sm font-extrabold text-white tracking-widest uppercase">Hybrid Tracker</h1>
          </div>
          <span className="text-[9px] text-neutral-450 font-medium tracking-wider">Secure Offline Companion</span>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="relative z-10 w-full h-full flex-1 overflow-hidden">
        <AttendanceView />
      </main>

    </div>
  );
}
