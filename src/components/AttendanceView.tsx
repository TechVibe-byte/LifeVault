import { useState } from 'react';
import { useAttendance, markAttendance } from '../db/hooks';
import { format, subMonths, lastDayOfMonth, eachDayOfInterval, startOfMonth, isFuture } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { cn } from '../lib/utils';
import { MapPin, Home as HomeIcon, Coffee, Sun } from 'lucide-react';

const COLORS = {
  'Office': '#6366f1', // Primary
  'Work From Home': '#10b981', // Emerald
  'Leave': '#f59e0b', // Amber
  'Holiday': '#ec4899', // Pink
  'Absent': '#ef4444', // Red
};

export default function AttendanceView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthStr = format(currentDate, 'yyyy-MM');
  const monthName = format(currentDate, 'MMMM yyyy');
  
  const records = useAttendance(monthStr) || [];

  const handleMark = async (status: any) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    await markAttendance(todayStr, status);
  };

  // Compute stats
  const stats = records.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(stats).map(([name, value]) => ({ name, value }));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = lastDayOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const recordMap = new Map(records.map(r => [r.date, r]));

  return (
    <div className="p-5 h-full overflow-y-auto pb-32 hide-scrollbar space-y-6">
      <header>
          <h1 className="text-3xl font-bold font-display tracking-tight text-gray-900 dark:text-gray-100 mb-1">Attendance</h1>
          <p className="text-gray-500 font-medium">Track your work days</p>
      </header>

      <div className="glass-card p-5 space-y-4">
         <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Log Today</h2>
         <div className="grid grid-cols-2 gap-3">
             <button onClick={() => handleMark('Office')} className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100 dark:hover:bg-indigo-800/40 transition-colors border border-indigo-100 dark:border-indigo-800">
                <MapPin className="w-5 h-5" /> Office
             </button>
             <button onClick={() => handleMark('Work From Home')} className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium hover:bg-emerald-100 dark:hover:bg-emerald-800/40 transition-colors border border-emerald-100 dark:border-emerald-800">
                <HomeIcon className="w-5 h-5" /> WFH
             </button>
             <button onClick={() => handleMark('Leave')} className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium hover:bg-amber-100 dark:hover:bg-amber-800/40 transition-colors border border-amber-100 dark:border-amber-800">
                <Coffee className="w-5 h-5" /> Leave
             </button>
             <button onClick={() => handleMark('Holiday')} className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 font-medium hover:bg-pink-100 dark:hover:bg-pink-800/40 transition-colors border border-pink-100 dark:border-pink-800">
                <Sun className="w-5 h-5" /> Holiday
             </button>
         </div>
      </div>

      <div className="glass-card p-5">
         <div className="flex justify-between items-center mb-4">
             <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{monthName}</h2>
             <div className="flex gap-2">
                 <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="text-gray-400 hover:text-gray-600">&larr;</button>
                 <button onClick={() => setCurrentDate(subMonths(currentDate, -1))} className="text-gray-400 hover:text-gray-600">&rarr;</button>
             </div>
         </div>
         
         <div className="h-48 w-full">
            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        className="focus:outline-none"
                        stroke="none"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                        ))}
                    </Pie>
                    <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--card)' }}
                        itemStyle={{ color: 'var(--foreground)' }}
                    />
                    <Legend />
                    </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-gray-400 italic">No data this month</div>
            )}
         </div>
      </div>

      <div className="glass-card p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Calendar Heatmap</h2>
          <div className="grid grid-cols-7 gap-1 text-center">
             {['S','M','T','W','T','F','S'].map((d, i) => <div key={`${d}-${i}`} className="text-xs font-semibold text-gray-400 pb-2">{d}</div>)}
             
             {/* Empty slots for start of month alignment */}
             {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                 <div key={`empty-${i}`} />
             ))}

             {daysInMonth.map(date => {
                 const dateStr = format(date, 'yyyy-MM-dd');
                 const record = recordMap.get(dateStr);
                 const future = isFuture(date);
                 
                 let bgClass = "bg-gray-100 dark:bg-gray-800/50";
                 if (record) {
                     if (record.status === 'Office') bgClass = "bg-indigo-500 shadow-indigo-500/30";
                     else if (record.status === 'Work From Home') bgClass = "bg-emerald-500 shadow-emerald-500/30";
                     else if (record.status === 'Leave') bgClass = "bg-amber-400";
                     else if (record.status === 'Holiday') bgClass = "bg-pink-400";
                     else if (record.status === 'Absent') bgClass = "bg-red-500";
                 } else if (future) {
                     bgClass = "bg-gray-50 dark:bg-gray-900/10 opacity-30 cursor-not-allowed border outline-dashed outline-1 outline-gray-200 dark:outline-gray-800";
                 }

                 return (
                     <div 
                        key={dateStr} 
                        className={cn("aspect-square rounded-md flex items-center justify-center text-xs shadow-sm transition-transform hover:scale-110", bgClass, record ? "text-white font-bold" : "text-gray-600 dark:text-gray-400", future && "pointer-events-none text-transparent")}
                        title={record ? `${format(date, 'MMM d')}: ${record.status}` : format(date, 'MMM d')}
                     >
                         {format(date, 'd')}
                     </div>
                 )
             })}
          </div>
      </div>

    </div>
  );
}
