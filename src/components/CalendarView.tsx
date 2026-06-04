import { useState } from 'react';
import { useEvents } from '../db/hooks';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, MapPin, Gift, Clock, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { EventType } from '../db/db';

const EVENT_ICONS: Record<string, any> = {
  'Birthday': Gift,
  'Office Reporting Day': MapPin,
  'Doctor Appointment': AlertCircle,
  'default': Clock
};

const EVENT_COLORS: Record<string, string> = {
  'Birthday': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'Office Reporting Day': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'Family Event': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Doctor Appointment': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'default': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
};

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  
  // Need to get all events for to decorate the calendar
  // Since useLiveQuery requires static deps or hooks, we just get all events or filter.
  // For offline PWA, fetching all events is usually instant. 
  // For simplicity, we just use useEvents() to get all if we don't pass date. 
  // Wait, I designed useEvents(date?) to get specific day or ALL. So we get all.
  const allEvents = useEvents() || [];

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // Determine starting day offset (0 = Sunday)
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const endDate = new Date(monthEnd);
  if (endDate.getDay() !== 6) {
      endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
  }

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const selectedDateEvents = allEvents.filter(e => e.date === format(selectedDate, 'yyyy-MM-dd'));

  return (
    <div className="p-5 h-full overflow-y-auto pb-32 hide-scrollbar space-y-6 flex flex-col">
      <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-gray-900 dark:text-gray-100">Calendar</h1>
            <p className="text-gray-500 font-medium">Schedule & events</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform">
             <Plus className="w-5 h-5" />
          </button>
      </header>
      
      <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {format(currentDate, 'MMMM yyyy')}
              </h2>
              <div className="flex gap-2">
                 <button onClick={prevMonth} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">
                    <ChevronLeft className="w-5 h-5" />
                 </button>
                 <button onClick={nextMonth} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">
                    <ChevronRight className="w-5 h-5" />
                 </button>
              </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
             {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                 <div key={d} className="text-[10px] uppercase font-bold text-gray-400 tracking-wider pb-1">{d}</div>
             ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
             {calendarDays.map(day => {
                 const isSelected = isSameDay(day, selectedDate);
                 const isTodayDate = isToday(day);
                 const isInMonth = isSameMonth(day, currentDate);
                 
                 const dayEvents = allEvents.filter(e => e.date === format(day, 'yyyy-MM-dd'));
                 const hasEvent = dayEvents.length > 0;

                 return (
                     <button 
                        key={day.toISOString()} 
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                            "aspect-square rounded-full flex flex-col items-center justify-center text-sm relative transition-all duration-200",
                            !isInMonth && "text-gray-300 dark:text-gray-700",
                            isInMonth && !isSelected && !isTodayDate && "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                            isTodayDate && !isSelected && "text-primary font-bold bg-primary/10",
                            isSelected && "bg-primary text-white font-bold shadow-md shadow-primary/30 scale-110 z-10"
                        )}
                     >
                         <span>{format(day, 'd')}</span>
                         {hasEvent && (
                             <div className="flex gap-0.5 mt-0.5">
                                 {dayEvents.slice(0,3).map((_, i) => (
                                     <span key={i} className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-primary")}></span>
                                 ))}
                             </div>
                         )}
                     </button>
                 )
             })}
          </div>
      </div>

      <div className="flex-1 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {isToday(selectedDate) ? "Today's Events" : format(selectedDate, 'MMMM do, yyyy')}
          </h3>
          
          {selectedDateEvents.length === 0 ? (
              <div className="py-8 text-center text-gray-500 bg-gray-50/50 dark:bg-gray-900/10 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                  <p>No events scheduled.</p>
                  <button className="text-primary font-medium text-sm mt-2">Add New Event</button>
              </div>
          ) : (
              <div className="space-y-3">
                  {selectedDateEvents.map(event => {
                      const Icon = EVENT_ICONS[event.type] || EVENT_ICONS['default'];
                      const colors = EVENT_COLORS[event.type] || EVENT_COLORS['default'];
                      
                      return (
                          <div key={event.id} className="glass-card p-4 flex gap-4">
                              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", colors)}>
                                  <Icon className="w-6 h-6" />
                              </div>
                              <div>
                                  <h4 className="font-semibold text-gray-900 dark:text-white leading-tight">{event.title}</h4>
                                  <p className="text-xs font-medium text-gray-500 mt-0.5">{event.type}</p>
                                  {event.time && (
                                     <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-1">
                                         <Clock className="w-3 h-3" /> {event.time}
                                     </p>
                                  )}
                                  {event.description && (
                                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{event.description}</p>
                                  )}
                              </div>
                          </div>
                      );
                  })}
              </div>
          )}
      </div>

    </div>
  );
}
