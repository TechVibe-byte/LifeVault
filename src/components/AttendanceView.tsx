import React, { useState, useMemo, useEffect, FormEvent } from 'react';
import { useAttendance, markAttendance, deleteAttendance } from '../db/hooks';
import { 
  format, 
  subMonths, 
  addMonths,
  lastDayOfMonth, 
  eachDayOfInterval, 
  startOfMonth, 
  isFuture, 
  isToday, 
  isWeekend,
  parseISO
} from 'date-fns';
import { 
  Briefcase, 
  Home as HomeIcon, 
  Coffee, 
  Clock, 
  Calendar as CalendarIcon, 
  Check, 
  Copy, 
  Info,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  X,
  FileText,
  Trash2,
  Receipt,
  Coins,
  IndianRupee,
  Wifi,
  Car,
  CalendarDays,
  Plus,
  BadgeAlert,
  Send,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { sendTelegramNotification } from '../utils/telegram';

const STATUS_DETAILS = {
  'Office': {
    color: '#6366f1', // Indigo
    bgClass: 'bg-indigo-500/10 hover:bg-indigo-500/25 border-indigo-500/30 text-indigo-400',
    activeClass: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border-indigo-600',
    badgeClass: 'bg-indigo-600 text-white',
    dotClass: 'bg-indigo-500',
    icon: Briefcase,
    label: 'Office'
  },
  'Work From Home': {
    color: '#10b981', // Emerald
    bgClass: 'bg-emerald-500/10 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-400',
    activeClass: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border-emerald-600',
    badgeClass: 'bg-emerald-600 text-white',
    dotClass: 'bg-emerald-550',
    icon: HomeIcon,
    label: 'WFH'
  },
  'Leave': {
    color: '#f59e0b', // Amber
    bgClass: 'bg-amber-500/10 hover:bg-amber-500/25 border-amber-500/30 text-amber-400',
    activeClass: 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 border-amber-500',
    badgeClass: 'bg-amber-500 text-neutral-900',
    dotClass: 'bg-amber-400',
    icon: Coffee,
    label: 'Leave'
  },
  'Holiday': {
    color: '#ec4899', // Pink
    bgClass: 'bg-pink-500/10 hover:bg-pink-500/25 border-pink-500/30 text-pink-400',
    activeClass: 'bg-pink-600 text-white shadow-lg shadow-pink-600/30 border-pink-600',
    badgeClass: 'bg-pink-600 text-white',
    dotClass: 'bg-pink-400',
    icon: CalendarIcon,
    label: 'Holiday'
  },
  'Absent': {
    color: '#ef4444', // Red
    bgClass: 'bg-red-500/10 hover:bg-red-500/25 border-red-500/30 text-red-100',
    activeClass: 'bg-red-600 text-white shadow-lg shadow-red-600/30 border-red-600',
    badgeClass: 'bg-red-600 text-white',
    dotClass: 'bg-red-500',
    icon: X,
    label: 'Absent'
  }
} as const;

export default function AttendanceView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Custom states for the daily interactive date click details modal
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [noteText, setNoteText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<keyof typeof STATUS_DETAILS | 'Clear' | null>(null);
  const [travelCost, setTravelCost] = useState('');
  const [foodCost, setFoodCost] = useState('');
  const [wifiCost, setWifiCost] = useState('');

  // --- DEDICATED DIRECT LOGGER FORM STATES ---
  const [formDate, setFormDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [formStatus, setFormStatus] = useState<keyof typeof STATUS_DETAILS>('Office');
  const [formTravel, setFormTravel] = useState('');
  const [formFood, setFormFood] = useState('');
  const [formWifi, setFormWifi] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  // Default Currency (Defaults strictly to INR Rupees as requested by the user)
  const [currency, setCurrency] = useState<'INR' | 'USD'>(() => {
    return (localStorage.getItem('hybrid_pref_currency') as 'INR' | 'USD') || 'INR';
  });

  // Flat Wi-Fi Monthly Bill limits
  const [wifiBillSetting, setWifiBillSetting] = useState(() => {
    const saved = localStorage.getItem('hybrid_wifi_bill');
    return saved ? parseFloat(saved) : 0;
  });

  const [wifiReimbursementPercent, setWifiReimbursementPercent] = useState(() => {
    const saved = localStorage.getItem('hybrid_wifi_percent');
    return saved ? parseInt(saved, 10) : 100;
  });

  const [copiedType, setCopiedType] = useState<'office' | 'wfh' | 'all' | 'expense' | null>(null);
  const [activeExpTab, setActiveExpTab] = useState<'monthly' | 'yearly'>('monthly');

  // Telegram feedback states
  const [tgNotificationState, setTgNotificationState] = useState<{
    show: boolean;
    status: 'success' | 'error' | 'sending';
    message: string;
  }>({ show: false, status: 'success', message: '' });

  const triggerTelegramBroadcast = async (
    dateStr: string,
    status: string,
    notes?: string,
    travel?: number,
    food?: number,
    wifi?: number
  ) => {
    const isTelegramActive = localStorage.getItem('hybrid_telegram_enabled') === 'true';
    if (!isTelegramActive) return;

    setTgNotificationState({
      show: true,
      status: 'sending',
      message: 'Broadcasting telemetry to Telegram Bot...'
    });

    const result = await sendTelegramNotification(dateStr, status, notes, travel, food, wifi);
    
    if (result.success) {
      setTgNotificationState({
        show: true,
        status: 'success',
        message: result.message
      });
    } else {
      setTgNotificationState({
        show: true,
        status: 'error',
        message: result.message
      });
    }

    // Dismiss message after 4.5 seconds
    setTimeout(() => {
      setTgNotificationState(prev => ({ ...prev, show: false }));
    }, 4500);
  };

  useEffect(() => {
    localStorage.setItem('hybrid_pref_currency', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('hybrid_wifi_bill', wifiBillSetting.toString());
  }, [wifiBillSetting]);

  useEffect(() => {
    localStorage.setItem('hybrid_wifi_percent', wifiReimbursementPercent.toString());
  }, [wifiReimbursementPercent]);

  const monthStr = format(currentDate, 'yyyy-MM');
  const monthName = format(currentDate, 'MMMM yyyy');
  const currentYearStr = format(currentDate, 'yyyy');
  
  const records = useAttendance(monthStr) || [];
  const allRecords = useAttendance() || []; // for streaks and yearly statistics

  // Build quick map for lookup
  const recordMap = useMemo(() => {
    return new Map(records.map(r => [r.date, r]));
  }, [records]);

  // Calendar dates
  const monthStart = startOfMonth(currentDate);
  const monthEnd = lastDayOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // --- PREFILL DIRECT FORM AUTOMATICALLY WHEN THE DATE CHOOSER CHANGES ---
  useEffect(() => {
    const existing = allRecords.find(r => r.date === formDate);
    if (existing) {
      setFormStatus((existing.status as keyof typeof STATUS_DETAILS) || 'Office');
      setFormTravel(existing.travelExpense?.toString() || '');
      setFormFood(existing.foodExpense?.toString() || '');
      setFormWifi(existing.wifiExpense?.toString() || '');
      setFormNotes(existing.notes || '');
    } else {
      // It's a brand new/unlogged day: Reset fields but keep weekend intelligence
      const parsedDate = parseISO(formDate);
      if (isValidDate(parsedDate) && isWeekend(parsedDate)) {
        // weekend defaults to holiday or clear depending on preference, but we leave travel/food costs empty
        setFormStatus('Holiday');
      } else {
        setFormStatus('Office');
      }
      setFormTravel('');
      setFormFood('');
      setFormWifi('');
      setFormNotes('');
    }
  }, [formDate, allRecords]);

  function isValidDate(d: any) {
    return d instanceof Date && !isNaN(d.getTime());
  }

  // Handle opening custom date selection drawer/modal (keeps compatibility with calendar clicks)
  const handleSelectDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existing = recordMap.get(dateStr);
    
    setSelectedDate(date);
    setNoteText(existing?.notes || '');
    setSelectedStatus((existing?.status as keyof typeof STATUS_DETAILS) || null);
    setTravelCost(existing?.travelExpense?.toString() || '');
    setFoodCost(existing?.foodExpense?.toString() || '');
    setWifiCost(existing?.wifiExpense?.toString() || '');
  };

  // Save Modal Attendance log details
  const handleSaveAttendance = async () => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    if (selectedStatus === 'Clear' || !selectedStatus) {
      await deleteAttendance(dateStr);
    } else {
      const travelVal = parseFloat(travelCost) || 0;
      const foodVal = parseFloat(foodCost) || 0;
      const wifiVal = parseFloat(wifiCost) || 0;
      
      await markAttendance(
        dateStr, 
        selectedStatus, 
        noteText.trim(), 
        travelVal >= 0 ? travelVal : 0, 
        foodVal >= 0 ? foodVal : 0, 
        wifiVal >= 0 ? wifiVal : 0
      );

      // Async Telegram notifications trigger
      triggerTelegramBroadcast(
        dateStr,
        selectedStatus,
        noteText.trim(),
        travelVal >= 0 ? travelVal : 0,
        foodVal >= 0 ? foodVal : 0,
        wifiVal >= 0 ? wifiVal : 0
      );
    }

    // Reset details
    setSelectedDate(null);
    setNoteText('');
    setSelectedStatus(null);
    setTravelCost('');
    setFoodCost('');
    setWifiCost('');
  };

  // --- DIRECT LOGGER FORM SUBMIT ---
  const handleSaveFormAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDate) return;

    const travelVal = parseFloat(formTravel) || 0;
    const foodVal = parseFloat(formFood) || 0;
    const wifiVal = parseFloat(formWifi) || 0;

    await markAttendance(
      formDate,
      formStatus,
      formNotes.trim(),
      travelVal >= 0 ? travelVal : 0,
      foodVal >= 0 ? foodVal : 0,
      wifiVal >= 0 ? wifiVal : 0
    );

    // Trigger Telegram Broadcast asynchronously
    triggerTelegramBroadcast(
      formDate,
      formStatus,
      formNotes.trim(),
      travelVal >= 0 ? travelVal : 0,
      foodVal >= 0 ? foodVal : 0,
      wifiVal >= 0 ? wifiVal : 0
    );

    setShowSavedFeedback(true);
    setTimeout(() => {
      setShowSavedFeedback(false);
    }, 3000);
  };

  // Quick mark "Today" trigger (reserves previous values if just clicked)
  const handleQuickMarkToday = async (status: keyof typeof STATUS_DETAILS) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const existing = recordMap.get(todayStr);
    
    await markAttendance(
      todayStr, 
      status, 
      existing?.notes || '', 
      existing?.travelExpense || 0,
      existing?.foodExpense || 0,
      existing?.wifiExpense || 0
    );

    // Trigger Telegram Broadcast asynchronously
    triggerTelegramBroadcast(
      todayStr,
      status,
      existing?.notes || '',
      existing?.travelExpense || 0,
      existing?.foodExpense || 0,
      existing?.wifiExpense || 0
    );

    // Also auto-sync our logger form date if it happens to be showing today
    if (formDate === todayStr) {
      setFormStatus(status);
    }
  };

  // Calculate stats & elegant Hybrid Expense splits in Indian Currency (₹)
  const stats = useMemo(() => {
    const counts = {
      Office: 0,
      'Work From Home': 0,
      Leave: 0,
      Holiday: 0,
      Absent: 0
    };

    let monthlySpentTravel = 0;
    let monthlySpentFood = 0;
    let monthlySpentWifi = 0;

    records.forEach(r => {
      if (counts[r.status] !== undefined) {
        counts[r.status]++;
      }
      monthlySpentTravel += r.travelExpense || 0;
      monthlySpentFood += r.foodExpense || 0;
      monthlySpentWifi += r.wifiExpense || 0;
    });

    const totalWorkDays = counts.Office + counts['Work From Home'];
    const officeRatio = totalWorkDays > 0 ? Math.round((counts.Office / totalWorkDays) * 100) : 0;
    const wfhRatio = totalWorkDays > 0 ? Math.round((counts['Work From Home'] / totalWorkDays) * 100) : 0;

    // Filter weekend work entries specifically (Saturday & Sunday with active work status)
    const weekendWorkDays = records.filter(r => {
      try {
        const d = parseISO(r.date);
        return isWeekend(d) && (r.status === 'Office' || r.status === 'Work From Home');
      } catch {
        return false;
      }
    }).length;

    // Calculate active continuous work streak sequence
    let activeStreak = 0;
    const sortedAll = [...allRecords].sort((a,b) => b.date.localeCompare(a.date));
    for (const r of sortedAll) {
      if (r.status === 'Office' || r.status === 'Work From Home') {
        activeStreak++;
      } else if (r.status === 'Holiday') {
        continue; // holidays preserve the working streak
      } else {
        break; // streak is broken
      }
    }

    // Reimbursables: travel + company wifi reimbursable coverage amount
    const wifiReimbursementAmount = Math.round(wifiBillSetting * (wifiReimbursementPercent / 100));
    const totalMonthlySpent = monthlySpentTravel + monthlySpentFood + monthlySpentWifi + wifiBillSetting;
    const totalPotentialReimbursement = monthlySpentTravel + wifiReimbursementAmount + monthlySpentWifi;

    return {
      ...counts,
      officeRatio,
      wfhRatio,
      totalWorkDays,
      weekendWorkDays,
      activeStreak,
      monthlySpentTravel,
      monthlySpentFood,
      monthlySpentWifi,
      totalMonthlySpent,
      wifiReimbursementAmount,
      totalPotentialReimbursement
    };
  }, [records, allRecords, wifiBillSetting, wifiReimbursementPercent]);

  // Yearly statistics
  const yearlyStats = useMemo(() => {
    const currentYear = format(currentDate, 'yyyy');
    const yearlyRecords = allRecords.filter(r => r.date.startsWith(currentYear));

    let travelSum = 0;
    let foodSum = 0;
    let wifiDailySum = 0;

    yearlyRecords.forEach(r => {
      travelSum += r.travelExpense || 0;
      foodSum += r.foodExpense || 0;
      wifiDailySum += r.wifiExpense || 0;
    });

    const activeMonths = new Set(yearlyRecords.map(r => r.date.substring(0, 7)));
    const wifiFlatCumulative = activeMonths.size * wifiBillSetting;
    const wifiFlatReimbursedCumulative = activeMonths.size * (wifiBillSetting * (wifiReimbursementPercent / 100));

    const grandTotalSpent = travelSum + foodSum + wifiDailySum + wifiFlatCumulative;
    const grandPotentialReimbursed = travelSum + wifiDailySum + wifiFlatReimbursedCumulative;

    return {
      travelSum,
      foodSum,
      wifiDailySum,
      wifiFlatCumulative,
      grandTotalSpent,
      grandPotentialReimbursed,
      activeMonthsCount: activeMonths.size
    };
  }, [allRecords, currentDate, wifiBillSetting, wifiReimbursementPercent]);

  // Currency utility helper defaults proudly to Indian Rupee (₹)
  const fmtVal = (val: number) => {
    return currency === 'INR' 
      ? `₹${val.toLocaleString('en-IN')}`
      : `$${val.toLocaleString('en-US')}`;
  };

  // Generate complete copy summaries
  const getTimesheetText = (type: 'office' | 'wfh' | 'all' | 'expense') => {
    const officeDays: string[] = [];
    const wfhDays: string[] = [];
    const offDays: string[] = [];

    const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));

    sortedRecords.forEach(r => {
      const parsed = parseISO(r.date);
      const formatted = format(parsed, 'MMM d (eee)');
      if (r.status === 'Office') {
        officeDays.push(formatted);
      } else if (r.status === 'Work From Home') {
        wfhDays.push(formatted);
      } else {
        offDays.push(`${formatted} (${r.status})`);
      }
    });

    if (type === 'office') {
      return officeDays.length > 0 
        ? `Corporate Office Presence (${officeDays.length} Days):\n- ${officeDays.join('\n- ')}` 
        : 'No corporate office days logged in this month.';
    }
    if (type === 'wfh') {
      return wfhDays.length > 0
        ? `Work From Home (${wfhDays.length} Days):\n- ${wfhDays.join('\n- ')}`
        : 'No home-office days logged in this month.';
    }

    if (type === 'expense') {
      let expText = `--- HYBRID EXPENSE CLAIM REPORT (${monthName}) ---\n\n`;
      expText += `🚗 Total Travel Cost: ${fmtVal(stats.monthlySpentTravel)}\n`;
      expText += `🍲 Total Work Food Cost: ${fmtVal(stats.monthlySpentFood)}\n`;
      expText += `🌐 Daily WiFi Charge: ${fmtVal(stats.monthlySpentWifi)}\n`;
      expText += `🏡 Monthly Flat Internet: ${fmtVal(wifiBillSetting)} (${wifiReimbursementPercent}% Reimbursable: ${fmtVal(stats.wifiReimbursementAmount)})\n\n`;
      expText += `💸 Total Monthly Outpocket Incurred: ${fmtVal(stats.totalMonthlySpent)}\n`;
      expText += `🏢 ELIGIBLE FOR OFFICIAL CORPORATE REIMBURSEMENT: ${fmtVal(stats.totalPotentialReimbursement)}`;
      return expText;
    }

    let summaryText = `--- HYBRID WORK TIMESHEET SUMMARY (${monthName}) ---\n\n`;
    summaryText += `🏢 corporate Office Presence (${officeDays.length} Days):\n${officeDays.length > 0 ? officeDays.join(', ') : 'None'}\n\n`;
    summaryText += `🏡 Work From Home (${wfhDays.length} Days):\n${wfhDays.length > 0 ? wfhDays.join(', ') : 'None'}\n\n`;
    summaryText += `☕ Off / Non-Working Cycles (${offDays.length} Days):\n${offDays.length > 0 ? offDays.join(', ') : 'None'}`;
    return summaryText;
  };

  const handleCopyTimesheet = (type: 'office' | 'wfh' | 'all' | 'expense') => {
    const text = getTimesheetText(type);
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayRecord = recordMap.get(todayStr);

  return (
    <div className="p-5 h-full overflow-y-auto pb-44 hide-scrollbar space-y-6">
      
      {/* Premium Hybrid Consistence Head Widget */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-neutral-900 to-[#0A0A0A] border border-indigo-500/10 rounded-3xl p-5 shadow-xl">
        <div className="absolute top-0 right-0 p-3 opacity-10 transform translate-x-3 -translate-y-3">
          <TrendingUp className="w-24 h-24 text-indigo-400 rotate-12" />
        </div>
        
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <div className="flex gap-2 items-center">
              <span className="text-[10px] font-bold tracking-widest text-indigo-300 uppercase">Hybrid Consistency</span>
              {/* Currency Selector microtoggle */}
              <button 
                onClick={() => setCurrency(prev => prev === 'INR' ? 'USD' : 'INR')}
                className="text-[9px] bg-neutral-800 hover:bg-neutral-700 text-neutral-350 font-extrabold px-1.5 py-0.5 rounded border border-white/5 transition-colors cursor-pointer"
                title="Change currency notation layout"
              >
                Display ({currency === 'INR' ? '₹ INR' : '$ USD'})
              </button>

              {/* Telegram Status indicator badge */}
              <div 
                className={cn(
                  "text-[9px] font-extrabold px-1.5 py-0.5 rounded border flex items-center gap-1 select-none",
                  localStorage.getItem('hybrid_telegram_enabled') === 'true'
                    ? "bg-indigo-950/40 border-indigo-500/20 text-indigo-300 animate-pulse"
                    : "bg-neutral-800/60 border-neutral-700 text-neutral-400"
                )}
                title={localStorage.getItem('hybrid_telegram_enabled') === 'true' ? "Telegram channel alerts are enabled! They'll send upon logger saves" : "Telegram channel alerts are disabled. Configure in settings."}
              >
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  localStorage.getItem('hybrid_telegram_enabled') === 'true' ? "bg-indigo-400" : "bg-neutral-500"
                )} />
                Telegram {localStorage.getItem('hybrid_telegram_enabled') === 'true' ? "ON" : "OFF"}
              </div>
            </div>
            <h2 className="text-3xl font-extrabold text-white mt-1 font-display tracking-tight flex items-baseline gap-1">
              {stats.activeStreak} <span className="text-xs font-semibold text-neutral-400">Streak Days</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-2 flex items-center gap-1.5">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              Keep tracking for seamless corporate claims
            </p>
          </div>
          
          <div className="flex flex-col items-end shrink-0 gap-1 bg-white/5 backdrop-blur-md px-3 py-2 rounded-xl border border-white/5">
            <span className="text-[9px] text-neutral-400 font-extrabold uppercase">Presence Split</span>
            <div className="text-xs font-bold text-neutral-200">
              <span className="text-indigo-400">{stats.officeRatio}%</span> Office
            </div>
            <div className="text-xs font-bold text-neutral-200">
              <span className="text-emerald-400">{stats.wfhRatio}%</span> WFH
            </div>
          </div>
        </div>

        {/* Proportional visual ratio slider */}
        {stats.totalWorkDays > 0 && (
          <div className="mt-4">
            <div className="h-2 w-full rounded-full bg-neutral-850 flex overflow-hidden border border-white/5">
              <div 
                className="bg-indigo-505 bg-indigo-500 transition-all duration-500" 
                style={{ width: `${stats.officeRatio}%` }}
              />
              <div 
                className="bg-emerald-505 bg-emerald-500 transition-all duration-550" 
                style={{ width: `${stats.wfhRatio}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Quick Mark Today Widget */}
      <div className="bg-[#121212]/30 border border-neutral-800/40 rounded-3xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xs font-bold text-neutral-250 flex items-center gap-2 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Easy-Log: Where are you working today?
            </h3>
            <p className="text-[11px] text-neutral-400">Instantly register desk layout</p>
          </div>
          {todayRecord && (
            <span className={cn(
              "text-[9px] uppercase font-bold px-2 py-0.5 rounded border leading-none",
              todayRecord.status === 'Office' && "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
              todayRecord.status === 'Work From Home' && "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
              todayRecord.status === 'Leave' && "bg-amber-500/10 text-amber-300 border-amber-500/20",
              todayRecord.status === 'Holiday' && "bg-pink-500/10 text-pink-300 border-pink-500/20",
              todayRecord.status === 'Absent' && "bg-red-500/10 text-red-300 border-red-500/20",
            )}>
              {todayRecord.status}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button 
            onClick={() => handleQuickMarkToday('Office')} 
            className={cn(
              "flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl font-semibold border text-xs transition-all active:scale-95 cursor-pointer",
              todayRecord?.status === 'Office' 
                ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/15" 
                : "bg-indigo-500/5 hover:bg-indigo-500/15 border-indigo-500/20 text-indigo-400"
            )}
          >
            <Briefcase className="w-4 h-4 shrink-0" /> Office
          </button>
          
          <button 
            onClick={() => handleQuickMarkToday('Work From Home')} 
            className={cn(
              "flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl font-semibold border text-xs transition-all active:scale-95 cursor-pointer",
              todayRecord?.status === 'Work From Home' 
                ? "bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-500/15" 
                : "bg-emerald-500/5 hover:bg-emerald-500/15 border-emerald-500/20 text-emerald-400"
            )}
          >
            <HomeIcon className="w-4 h-4 shrink-0" /> WFH
          </button>
        </div>
      </div>

      {/* --- NEW! DEDICATED ATTENDANCE & EXPENSE LOG FORM (PROMINENT INPUT PANEL) --- */}
      <form 
        onSubmit={handleSaveFormAttendance}
        className="bg-gradient-to-br from-[#121212] to-[#0D0D0D] border-2 border-slate-800/80 rounded-3xl p-5 space-y-4 shadow-xl"
      >
        <div className="flex justify-between items-center border-b border-neutral-800/70 pb-2.5">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-widest text-[#6366f1]">
              <IndianRupee className="w-4 h-4 text-indigo-400" />
              Workspace & Expense Logger
            </h3>
            <p className="text-[10px] text-neutral-400">Log past days, weekends, travel outlays, & WiFi bills</p>
          </div>
          {showSavedFeedback && (
            <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold px-2.5 py-1 rounded-full animate-pulse">
              ✓ Log Saved
            </span>
          )}
        </div>

        {/* Date Selector & Status Dropdowns */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[9.5px] font-bold text-neutral-405 text-neutral-400 uppercase tracking-wider block">
              1. Date (Choose any Day)
            </label>
            <input 
              type="date"
              value={formDate}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-white font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9.5px] font-bold text-neutral-405 text-neutral-400 uppercase tracking-wider block">
              2. Status
            </label>
            <select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as any)}
              className="w-full px-2 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-white font-bold focus:outline-none focus:border-indigo-500"
            >
              <option value="Office">💼 Offce Presence</option>
              <option value="Work From Home">🏠 Work From Home</option>
              <option value="Leave">☕ Vacation / Leave</option>
              <option value="Holiday">🌸 Holiday / Weekend</option>
              <option value="Absent">⚡ Absent</option>
            </select>
          </div>
        </div>

        {/* Specific Indian Currency Expenses Inputs */}
        <div className="space-y-2 bg-[#171717]/60 p-3 rounded-2xl border border-neutral-850/50">
          <div className="flex justify-between items-center">
            <span className="text-[9.5px] font-bold text-neutral-300 uppercase tracking-widest flex items-center gap-1">
              <Coins className="w-3 h-3 text-emerald-400" />
              3. Costs ({currency === 'INR' ? '₹ INR Rupees' : '$ USD'})
            </span>
            <span className="text-[9px] text-neutral-500">Auto-fill enabled</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <span className="text-[8.5px] font-semibold text-neutral-400 block">🚗 Travel Outlay</span>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-[10px] text-neutral-500 font-bold">
                  {currency === 'INR' ? '₹' : '$'}
                </span>
                <input 
                  type="number"
                  placeholder="e.g. 150"
                  value={formTravel}
                  min="0"
                  onChange={(e) => setFormTravel(e.target.value)}
                  className="w-full pl-6 pr-2 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[8.5px] font-semibold text-neutral-400 block">🍲 Meal / Food</span>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-[10px] text-neutral-500 font-bold">
                  {currency === 'INR' ? '₹' : '$'}
                </span>
                <input 
                  type="number"
                  placeholder="e.g. 200"
                  value={formFood}
                  min="0"
                  onChange={(e) => setFormFood(e.target.value)}
                  className="w-full pl-6 pr-2 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[8.5px] font-semibold text-neutral-400 block">🌐 WiFi / Mobile</span>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-[10px] text-neutral-500 font-bold">
                  {currency === 'INR' ? '₹' : '$'}
                </span>
                <input 
                  type="number"
                  placeholder="e.g. 50"
                  value={formWifi}
                  min="0"
                  onChange={(e) => setFormWifi(e.target.value)}
                  className="w-full pl-6 pr-2 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Optional Comments / Notes & Quick Save triggers */}
        <div className="grid grid-cols-4 gap-2 items-center">
          <div className="col-span-3">
            <input 
              type="text"
              placeholder="Comments (Overtime, Taxi, WiFi down etc.)"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
              maxLength={70}
            />
          </div>
          <button
            type="submit"
            className="col-span-1 py-2 bg-indigo-600 hover:bg-indigo-505 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1"
          >
            <Check className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      </form>

      {/* Main Interactive Calendar Heatmap */}
      <div className="bg-[#121212]/30 border border-neutral-800/40 rounded-3xl p-5">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="text-sm font-bold text-white tracking-widest uppercase text-neutral-300">Monthly Workspace Grid</h3>
            <p className="text-[11px] text-[#8e8e8e]">Click any calendar square to fast-populate the fields above</p>
          </div>
          <div className="flex gap-1.5 bg-neutral-900 border border-neutral-800 rounded-xl p-1 shrink-0">
            <button 
              onClick={() => setCurrentDate(subMonths(currentDate, 1))} 
              className="p-1 px-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentDate(addMonths(currentDate, 1))} 
              className="p-1 px-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {/* Calendar Day Header Label */}
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
            <div key={`${d}-${i}`} className={cn(
              "text-[10px] font-bold py-1 select-none", 
              (d === 'Sun' || d === 'Sat') ? "text-rose-400/80" : "text-neutral-550"
            )}>
              {d}
            </div>
          ))}
          
          {/* Empty slots for start of month alignment */}
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="p-1" />
          ))}

          {/* Actual days */}
          {daysInMonth.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const record = recordMap.get(dateStr);
            const isTodayDate = isToday(date);
            const isWeekendDay = isWeekend(date);
            const isFutureDate = isFuture(date);

            // Determine if date has any logged expenses
            const dayExpenseSum = (record?.travelExpense || 0) + (record?.foodExpense || 0) + (record?.wifiExpense || 0);

            let dayStyle = "bg-neutral-900/45 hover:bg-neutral-800/40 border border-neutral-900 text-neutral-400";
            let indicatorClass = "";

            if (record) {
              if (record.status === 'Office') {
                dayStyle = "bg-indigo-600/10 border-indigo-550/45 text-indigo-300 font-bold hover:bg-indigo-600/20";
                indicatorClass = "bg-indigo-500";
              } else if (record.status === 'Work From Home') {
                dayStyle = "bg-emerald-600/10 border-emerald-555/45 text-emerald-300 font-bold hover:bg-emerald-600/20";
                indicatorClass = "bg-emerald-555";
              } else if (record.status === 'Leave') {
                dayStyle = "bg-amber-600/10 border-amber-555/45 text-amber-300 font-bold hover:bg-amber-600/20";
                indicatorClass = "bg-amber-400";
              } else if (record.status === 'Holiday') {
                dayStyle = "bg-pink-600/10 border-pink-555/45 text-pink-350 font-bold hover:bg-pink-600/20";
                indicatorClass = "bg-pink-400";
              } else if (record.status === 'Absent') {
                dayStyle = "bg-red-600/10 border-red-555/45 text-red-350 font-bold hover:bg-red-600/20";
                indicatorClass = "bg-red-500";
              }
            } else if (isTodayDate) {
              dayStyle = "bg-neutral-800 border-[1.5px] border-indigo-505 border-indigo-500 text-white font-bold shadow shadow-indigo-505/20";
            } else if (isWeekendDay) {
              dayStyle = "bg-red-500/5 hover:bg-neutral-800/40 border border-dashed border-red-500/10 text-neutral-450";
            }

            return (
              <button
                key={dateStr}
                onClick={() => {
                  setFormDate(dateStr);
                  handleSelectDate(date);
                }}
                disabled={isFutureDate}
                type="button"
                className={cn(
                  "relative aspect-square rounded-2xl flex flex-col items-center justify-center text-xs shadow-inner transition-all hover:scale-110 active:scale-95 cursor-pointer select-none", 
                  dayStyle,
                  isFutureDate && "opacity-20 cursor-not-allowed hover:scale-100 pointer-events-none"
                )}
                title={record ? `${format(date, 'MMM d')}: ${record.status}` : format(date, 'MMM d')}
              >
                <span>{format(date, 'd')}</span>
                
                {/* Active indicator dot */}
                {indicatorClass && (
                  <span className={cn("absolute bottom-1.5 w-1 h-1 rounded-full", indicatorClass)} />
                )}

                {/* Expense tag indicates that this day had costs logged */}
                {dayExpenseSum > 0 && (
                  <span className="absolute top-[3px] right-[4px] text-[7.5px] font-black text-emerald-400/90 leading-none">₹</span>
                )}

                {/* Weekend Indicator (small label) */}
                {isWeekendDay && !record && (
                  <span className="absolute top-[2px] left-[3px] text-[7px] font-bold text-red-500/20">w</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Inline Legend indicator bar */}
        <div className="flex flex-wrap gap-2.5 mt-5 pt-4 border-t border-neutral-800/40 justify-center text-[10px]/none select-none">
          <div className="flex items-center gap-1 text-indigo-450 text-indigo-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-indigo-500" /> Office
          </div>
          <div className="flex items-center gap-1 text-emerald-450 text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> WFH
          </div>
          <div className="flex items-center gap-1 text-amber-450 text-amber-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Leave
          </div>
          <div className="flex items-center gap-1 text-pink-450 text-pink-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-pink-400" /> Holiday
          </div>
          <div className="flex items-center gap-1 text-red-405 text-red-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-red-400" /> Absent
          </div>
          <div className="flex items-center gap-1 text-emerald-350 text-emerald-400 font-extrabold flex-row">
            <span className="text-[10px] font-bold">₹</span> Cost Logged
          </div>
        </div>
      </div>

      {/* NEW HYBRID EXPENSE & REIMBURSEMENT CALCULATOR DESK */}
      <div className="bg-[#121212]/30 border border-neutral-800/40 rounded-3xl p-5 space-y-4">
        
        {/* Navigation Selector for Monthly vs Yearly tracking */}
        <div className="flex justify-between items-center border-b border-neutral-800/50 pb-2">
          <div className="flex gap-2 items-center">
            <Coins className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-widest text-[#10b981]">Claim Desk & Estimates</h3>
          </div>
          <div className="flex bg-neutral-900 border border-neutral-800 rounded-xl p-0.5 shrink-0 text-[10px]">
            <button 
              type="button"
              onClick={() => setActiveExpTab('monthly')}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                activeExpTab === 'monthly' ? "bg-neutral-800 text-white" : "text-neutral-450 hover:text-white"
              )}
            >
              Monthly Claim
            </button>
            <button 
              type="button"
              onClick={() => setActiveExpTab('yearly')}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                activeExpTab === 'yearly' ? "bg-neutral-800 text-white" : "text-neutral-450 hover:text-white"
              )}
            >
              Annual Cumulative
            </button>
          </div>
        </div>

        {/* Dynamic Display Layout depending on chosen Desk Tab */}
        {activeExpTab === 'monthly' ? (
          <div className="space-y-4">
            
            {/* Split Metrics Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-neutral-900/60 border border-neutral-800/50 p-3 rounded-2xl">
                <div className="flex items-center gap-1 text-neutral-400 text-[9px] font-bold uppercase select-none">
                  <Car className="w-3 h-3 text-indigo-455 text-indigo-400" /> Travel Spent
                </div>
                <div className="text-sm font-extrabold text-white mt-1">{fmtVal(stats.monthlySpentTravel)}</div>
              </div>

              <div className="bg-neutral-900/60 border border-neutral-800/50 p-3 rounded-2xl">
                <div className="flex items-center gap-1 text-neutral-400 text-[9px] font-bold uppercase select-none">
                  <Coffee className="w-3 h-3 text-amber-455 text-amber-400" /> Food Spent
                </div>
                <div className="text-sm font-extrabold text-white mt-1">{fmtVal(stats.monthlySpentFood)}</div>
              </div>

              <div className="bg-neutral-900/60 border border-neutral-800/50 p-3 rounded-2xl">
                <div className="flex items-center gap-1 text-neutral-400 text-[9px] font-bold uppercase select-none">
                  <Wifi className="w-3 h-3 text-emerald-455 text-emerald-400" /> Wi-Fi Daily
                </div>
                <div className="text-sm font-extrabold text-white mt-1">{fmtVal(stats.monthlySpentWifi)}</div>
              </div>
            </div>

            {/* Flat Monthly Wi-Fi Bill Configurator */}
            <div className="bg-[#121212]/60 border border-neutral-850 rounded-2xl p-4 space-y-3.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 select-none">
                  <Wifi className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-bold text-neutral-200">Company Paid Flat Internet Plan</span>
                </div>
                <span className="text-[10px] text-indigo-300 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-md">
                  Reimbursable: {fmtVal(stats.wifiReimbursementAmount)}
                </span>
              </div>

              {/* Editable Fields For Wi-Fi Configuration */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-neutral-400 uppercase select-none">Monthly Internet Cost</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-neutral-550 text-neutral-400 font-bold">
                      {currency === 'INR' ? '₹' : '$'}
                    </span>
                    <input 
                      type="number"
                      placeholder="e.g. 999"
                      value={wifiBillSetting || ''}
                      onChange={(e) => {
                        const parsed = parseFloat(e.target.value);
                        setWifiBillSetting(parsed >= 0 ? parsed : 0);
                      }}
                      className="w-full pl-6 pr-2.5 py-1.5 text-xs bg-neutral-900 border border-neutral-850 border-neutral-800 rounded-xl text-white focus:outline-none focus:border-indigo-505 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-neutral-400 uppercase select-none">Reimbursement Slab (%)</label>
                  <select
                    value={wifiReimbursementPercent}
                    onChange={(e) => setWifiReimbursementPercent(parseInt(e.target.value, 10))}
                    className="w-full px-2 py-1.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value="100">100% Covered</option>
                    <option value="75">75% Covered</option>
                    <option value="50">50% Covered</option>
                    <option value="25">25% Covered</option>
                    <option value="0">0% Not Covered</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Total Consolidation Calculations Card */}
            <div className="bg-[#151a2e] border border-indigo-500/15 rounded-2xl p-4 flex justify-between items-center relative overflow-hidden">
              <div className="absolute right-0 bottom-0 p-1 opacity-5">
                <Receipt className="w-16 h-16 text-indigo-400" />
              </div>
              <div className="z-10">
                <span className="text-[9px] uppercase font-bold text-neutral-405 text-neutral-400 tracking-wider">Eligible Office Reimbursements</span>
                <p className="text-xl font-extrabold text-white mt-0.5">{fmtVal(stats.totalPotentialReimbursement)}</p>
                <span className="text-[9px] text-indigo-300">Travel, and internet claims portion</span>
              </div>
              <div className="text-right z-10 shrink-0 select-none">
                <span className="text-[9px] uppercase font-bold text-neutral-405 text-neutral-400 tracking-wider font-sans">Total Spent</span>
                <p className="text-md font-bold text-neutral-300">{fmtVal(stats.totalMonthlySpent)}</p>
                <span className="text-[8.5px] text-neutral-500">Incl. food costs</span>
              </div>
            </div>

          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Cumulative Yearly Stats */}
            <div className="bg-[#0c2e21] border border-emerald-500/15 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">Yearly Eligible Reimbursements ({currentYearStr})</span>
                <p className="text-2xl font-extrabold text-white mt-1">{fmtVal(yearlyStats.grandPotentialReimbursed)}</p>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Accrued from <span className="text-neutral-200 font-bold">{yearlyStats.activeMonthsCount} Months</span> of active logs
                </p>
              </div>
              <div className="text-right shrink-0 select-none">
                <span className="text-[9px] uppercase font-bold text-neutral-400 tracking-wider">Total Yearly Spent</span>
                <p className="text-md font-bold text-neutral-300 mt-1">{fmtVal(yearlyStats.grandTotalSpent)}</p>
                <span className="text-[8.5px] text-neutral-500">Cumulative total spent</span>
              </div>
            </div>

            {/* Breakdown itemizer for yearly */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs bg-neutral-900/40 p-2.5 rounded-xl border border-neutral-850">
                <span className="text-neutral-400 flex items-center gap-1.5"><Car className="w-3.5 h-3.5 text-indigo-400" /> Total Route Traveling Outlays</span>
                <span className="font-bold text-white">{fmtVal(yearlyStats.travelSum)}</span>
              </div>
              <div className="flex justify-between items-center text-xs bg-neutral-900/40 p-2.5 rounded-xl border border-neutral-850">
                <span className="text-neutral-400 flex items-center gap-1.5"><Coffee className="w-3.5 h-3.5 text-amber-400" /> Total Office Meal Outlays</span>
                <span className="font-bold text-white">{fmtVal(yearlyStats.foodSum)}</span>
              </div>
              <div className="flex justify-between items-center text-xs bg-neutral-900/40 p-2.5 rounded-xl border border-neutral-850">
                <span className="text-neutral-400 flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5 text-emerald-400" /> Combined Flat + Daily Wi-Fi Coverage</span>
                <span className="font-bold text-white">{fmtVal(yearlyStats.wifiDailySum + yearlyStats.wifiFlatCumulative)}</span>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Corporate Timesheet & Expense Claim copy-paste actions */}
      <div className="bg-gradient-to-r from-neutral-900 to-[#121212] border border-neutral-800 rounded-3xl p-5 space-y-4">
        <div className="flex gap-2.5 items-start">
          <div className="p-2 bg-indigo-500/10 rounded-xl">
            <FileText className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight font-display">Time & Claim Copier</h3>
            <p className="text-xs text-neutral-400">Export structured reports straight into your timesheet portal.</p>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <button 
            onClick={() => handleCopyTimesheet('office')} 
            type="button"
            className="w-full flex justify-between items-center px-4 py-2.5 text-xs bg-neutral-900 hover:bg-neutral-800/80 rounded-xl border border-neutral-800 text-neutral-300 transition-colors active:scale-95 group cursor-pointer"
          >
            <span className="font-semibold flex items-center gap-1.5">🏢 Print Office Attendance ({stats.Office} Days)</span>
            {copiedType === 'office' ? (
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Copied!
              </span>
            ) : (
              <Copy className="w-3.5 h-3.5 text-neutral-550 text-neutral-500 group-hover:text-neutral-300 transition-colors" />
            )}
          </button>

          <button 
            onClick={() => handleCopyTimesheet('wfh')} 
            type="button"
            className="w-full flex justify-between items-center px-4 py-2.5 text-xs bg-neutral-900 hover:bg-neutral-800/80 rounded-xl border border-neutral-800 text-neutral-300 transition-colors active:scale-95 group cursor-pointer"
          >
            <span className="font-semibold flex items-center gap-1.5">🏠 Print WFH Attendance ({stats['Work From Home']} Days)</span>
            {copiedType === 'wfh' ? (
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Copied!
              </span>
            ) : (
              <Copy className="w-3.5 h-3.5 text-neutral-550 text-neutral-500 group-hover:text-neutral-300 transition-colors" />
            )}
          </button>

          <button 
            onClick={() => handleCopyTimesheet('expense')} 
            type="button"
            className="w-full flex justify-between items-center px-4 py-2.5 text-xs bg-[#11241f] hover:bg-[#152e27] rounded-xl border border-emerald-500/20 text-emerald-350 transition-colors active:scale-95 group cursor-pointer"
          >
            <span className="font-bold flex items-center gap-1.5 text-emerald-400">📁 Copy Formatted Reimbursement Slip</span>
            {copiedType === 'expense' ? (
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                <Check className="w-3.5 h-3.5" /> Ready to Paste!
              </span>
            ) : (
              <Copy className="w-3.5 h-3.5 text-emerald-400/80" />
            )}
          </button>
        </div>
      </div>

      {/* --- BACKWARD COMPATIBLE CLICK-BASED CALENDAR MODAL --- */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/95 backdrop-blur-sm transition-opacity cursor-pointer" 
            onClick={() => setSelectedDate(null)}
          />
          
          <div className="relative z-10 w-full max-w-sm overflow-hidden bg-[#121212] border border-neutral-800 rounded-[32px] p-6 shadow-2xl space-y-5 animate-in fade-in-50 zoom-in-95 duration-120">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider select-none">Record Logs & Expenses</span>
                <h4 className="text-md font-bold text-white mt-0.5">{format(selectedDate, 'eeee, MMMM d')}</h4>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedDate(null)} 
                className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-850 transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Attendance Status select grids */}
            <div className="space-y-2">
              <label className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider select-none">Attendance Status</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(STATUS_DETAILS).map(([statusKey, spec]) => {
                  const IconComponent = spec.icon;
                  return (
                    <button
                      key={statusKey}
                      type="button"
                      onClick={() => setSelectedStatus(statusKey as any)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-2xl border transition-all cursor-pointer",
                        selectedStatus === statusKey ? spec.activeClass : spec.bgClass
                      )}
                    >
                      <IconComponent className="w-3.5 h-3.5 shrink-0" />
                      <span>{spec.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expenses Fields (Travel, Food, Wi-Fi) only relevant if status is determined */}
            {selectedStatus && selectedStatus !== 'Clear' && (
              <div className="space-y-2 bg-neutral-900/60 p-3.5 rounded-2xl border border-neutral-850/60">
                <div className="flex justify-between items-center pb-1">
                  <label className="text-[9px] text-neutral-300 font-bold uppercase tracking-wider flex items-center gap-1 select-none">
                    <Coins className="w-3 h-3 text-emerald-400" />
                    Associate Costs
                  </label>
                  <span className="text-[8.5px] text-neutral-500">Optional outlays</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <span className="text-[8.5px] font-bold text-neutral-400 block uppercase">🚗 Travel ({currency === 'INR' ? '₹' : '$'})</span>
                    <input 
                      type="number"
                      placeholder="e.g. 150"
                      value={travelCost}
                      min="0"
                      onChange={(e) => setTravelCost(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-[8.5px] font-bold text-neutral-400 block uppercase">🍲 Food ({currency === 'INR' ? '₹' : '$'})</span>
                    <input 
                      type="number"
                      placeholder="e.g. 250"
                      value={foodCost}
                      min="0"
                      onChange={(e) => setFoodCost(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8.5px] font-bold text-neutral-400 block uppercase font-sans">🌐 WiFi ({currency === 'INR' ? '₹' : '$'})</span>
                    <input 
                      type="number"
                      placeholder="e.g. 50"
                      value={wifiCost}
                      min="0"
                      onChange={(e) => setWifiCost(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-505"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Optional activity details */}
            <div className="space-y-1.5">
              <label className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block select-none">Activity Notes (Optional)</label>
              <input 
                type="text"
                placeholder="Taxi, overtime comments, sick bill etc."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-2xl text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
                maxLength={80}
              />
            </div>

            {/* Saving Actions Panel */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  const dateStr = format(selectedDate, 'yyyy-MM-dd');
                  await deleteAttendance(dateStr);
                  setSelectedDate(null);
                }}
                className="flex items-center justify-center gap-2 py-3 bg-neutral-900 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 text-neutral-400 rounded-2xl border border-neutral-800 transition-all text-xs font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Record
              </button>

              <button
                type="button"
                onClick={handleSaveAttendance}
                className="flex items-center justify-center gap-1.5 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-2xl font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Check className="w-4.5 h-4.5" /> Keep Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Telegram Broadcast Result Toast Alert */}
      {tgNotificationState.show && (
        <div className={cn(
          "fixed bottom-24 right-5 left-5 md:left-auto md:right-8 md:w-80 z-50 p-3.5 rounded-2xl border flex items-center gap-3 shadow-xl transition-all animate-bounce",
          tgNotificationState.status === 'sending' && "bg-[#18181b] border-indigo-500/20 text-indigo-400 dark:bg-zinc-900 border-zinc-805",
          tgNotificationState.status === 'success' && "bg-[#0c2e21] border-emerald-500/20 text-emerald-300",
          tgNotificationState.status === 'error' && "bg-rose-950/90 border-red-500/30 text-rose-100"
        )}>
          {tgNotificationState.status === 'sending' && (
            <div className="h-4 w-4 border-2 border-t-transparent border-indigo-500 rounded-full animate-spin shrink-0" />
          )}
          {tgNotificationState.status === 'success' && (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          {tgNotificationState.status === 'error' && (
            <BadgeAlert className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <div className="text-xs font-bold leading-tight">
            <div className="font-extrabold text-[9px] uppercase tracking-wider opacity-60">Telegram Broadcast</div>
            <div>{tgNotificationState.message}</div>
          </div>
        </div>
      )}

    </div>
  );
}
