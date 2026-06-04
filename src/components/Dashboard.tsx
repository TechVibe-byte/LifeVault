import { useDashboardStats, useEvents } from '../db/hooks';
import { format } from 'date-fns';
import { Calendar, CheckSquare, Award, Clock } from 'lucide-react';

export default function Dashboard() {
  const stats = useDashboardStats();
  const todayEvents = useEvents(new Date());

  const todayStr = format(new Date(), 'EEEE, MMMM do');

  return (
    <div className="p-5 space-y-6 pb-32 h-full overflow-y-auto hide-scrollbar">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold font-display tracking-tight text-gray-900 dark:text-gray-100">
          Good Morning
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium">{todayStr}</p>
      </header>
      
      <div className="grid grid-cols-2 gap-4">
         <div className="glass-card p-5 relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
           <Calendar className="w-6 h-6 text-primary mb-3 relative z-10" />
           <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 relative z-10">Events Today</h3>
           <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white relative z-10">{stats?.todayEvents ?? 0}</p>
         </div>
         <div className="glass-card p-5 relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-16 h-16 bg-orange-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
           <Award className="w-6 h-6 text-orange-500 mb-3 relative z-10" />
           <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 relative z-10">Work Streak</h3>
           <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white relative z-10">{stats?.currentStreak ?? 0} <span className="text-lg font-medium text-gray-400">Days</span></p>
         </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Today's Agenda</h2>
            <button className="text-sm font-medium text-primary">View All</button>
        </div>
        
        {todayEvents === undefined ? (
            <div className="animate-pulse flex flex-col gap-3">
                <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-xl w-full"></div>
                <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-xl w-full"></div>
            </div>
        ) : todayEvents.length === 0 ? (
            <div className="glass-card p-6 flex flex-col items-center justify-center text-center gap-3 border-dashed border-2">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                   <CheckSquare className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                   <p className="font-medium text-gray-900 dark:text-gray-100">No events today</p>
                   <p className="text-sm text-gray-500">Take a break or plan ahead.</p>
                </div>
            </div>
        ) : (
            <div className="space-y-3">
                {todayEvents.map(event => (
                    <div key={event.id} className="glass-card p-4 flex items-center gap-4">
                        <div className="w-2 rounded-full absolute left-0 top-3 bottom-3 bg-primary"></div>
                        <div className="pl-2 flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">{event.title}</h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                                <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{event.type}</span>
                                {event.time && (
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {event.time}</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </section>
    </div>
  );
}
