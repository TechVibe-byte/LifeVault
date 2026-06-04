import { useEffect, useState } from 'react';
import { useAppStore } from './store/useAppStore';
import { useNavigationStore } from './store/useNavigationStore';
import { Calendar, CheckSquare, Briefcase, Settings, Home, Plus } from 'lucide-react';
import { cn } from './lib/utils';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import AttendanceView from './components/AttendanceView';
import ActivitiesView from './components/ActivitiesView';
import SettingsView from './components/SettingsView';

function StatusBar() {
  const [time, setTime] = useState(new Date());
  const { timeFormat } = useAppStore();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-10 w-full flex justify-between items-center px-8 text-[12px] font-bold z-20 shrink-0 mt-2">
      <span>
        {time.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: timeFormat === '12h'
        })}
      </span>
      <div className="flex items-center gap-2">
        <svg width="16" height="12" viewBox="0 0 14 10" fill="currentColor"><path d="M0 2a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2z"/></svg>
      </div>
    </div>
  );
}

export default function App() {
  const { theme, fabMenuOpen, setFabMenuOpen } = useAppStore();
  const { currentTab, setCurrentTab, setAddEventOpen } = useNavigationStore();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light');
    root.classList.add('dark');
  }, [theme]);

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard />;
      case 'calendar': return <CalendarView />;
      case 'attendance': return <AttendanceView />;
      case 'activities': return <ActivitiesView />;
      case 'settings': return <SettingsView />;
      default: return <Dashboard />;
    }
  };

  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Home' },
    { id: 'calendar', icon: Calendar, label: 'Events' },
    { id: 'attendance', icon: Briefcase, label: 'Work' },
    { id: 'activities', icon: CheckSquare, label: 'To-Do' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ] as const;

  return (
    <div className="relative w-full h-full sm:w-[375px] sm:h-[704px] text-white bg-[#0A0A0A] selection:bg-indigo-500/30 max-w-md mx-auto shadow-2xl overflow-hidden border-[#1A1A1A] sm:border-[8px] sm:rounded-[48px] flex flex-col">
      
      {/* Background blobs for visual flavor */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-indigo-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-64 h-64 bg-purple-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-64 h-64 bg-pink-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

      <StatusBar />

      {/* Main Content Area */}
      <main className="relative z-10 w-full h-full flex-1 overflow-hidden">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="absolute z-20 bottom-0 left-0 w-full p-4 glass-nav rounded-t-3xl">
        <ul className="flex justify-between items-center px-2">
          {navItems.map((item) => (
            <li key={item.id} className="relative z-10">
              <button
                onClick={() => {
                  setCurrentTab(item.id as any);
                  setFabMenuOpen(false);
                }}
                className={cn(
                  "flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 ease-out",
                  currentTab === item.id 
                    ? "text-primary scale-110" 
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                )}
                aria-label={item.label}
              >
                <item.icon className="w-6 h-6 mb-1" strokeWidth={currentTab === item.id ? 2.5 : 2} />
                <span className={cn(
                  "text-[10px] font-medium transition-opacity duration-200", 
                  currentTab === item.id ? "opacity-100" : "opacity-0 absolute"
                )}>
                  {item.label}
                </span>
                
                {/* Active Indicator Dot */}
                {currentTab === item.id && (
                  <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* FAB */}
      <button 
        onClick={() => setFabMenuOpen(!fabMenuOpen)}
        className="absolute z-30 bottom-24 w-14 h-14 bg-primary text-white left-1/2 -translate-x-1/2 rounded-2xl shadow-lg shadow-primary/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className={cn("w-6 h-6 transition-transform duration-300", fabMenuOpen ? "rotate-45" : "rotate-0")} strokeWidth={3} />
      </button>

      {/* FAB Menu */}
      <div 
        className={cn(
          "absolute z-20 bottom-40 left-1/2 -translate-x-1/2 flex flex-col gap-3 items-center transition-all duration-300 ease-spring",
          fabMenuOpen ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95 pointer-events-none"
        )}
      >
         <button 
            onClick={() => {
              setCurrentTab('calendar');
              setAddEventOpen(true);
              setFabMenuOpen(false);
            }}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-4 py-2.5 rounded-full shadow-md border border-gray-100 dark:border-gray-700 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer active:scale-95"
         >
            <Calendar className="w-4 h-4 text-primary" />
            Add Event
         </button>
         <button 
            onClick={() => {
              setCurrentTab('attendance');
              setFabMenuOpen(false);
            }}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-4 py-2.5 rounded-full shadow-md border border-gray-100 dark:border-gray-700 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer active:scale-95"
         >
            <Briefcase className="w-4 h-4 text-orange-500" />
            Mark Attendance
         </button>
         <button 
            onClick={() => {
              setCurrentTab('activities');
              setFabMenuOpen(false);
            }}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-4 py-2.5 rounded-full shadow-md border border-gray-100 dark:border-gray-700 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer active:scale-95"
         >
            <CheckSquare className="w-4 h-4 text-green-500" />
            Log Activity
         </button>
      </div>

    </div>
  );
}
