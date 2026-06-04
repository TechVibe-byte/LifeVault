import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { format } from 'date-fns';
import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ActivitiesView() {
  const [currentDate] = useState(new Date());
  const [newTask, setNewTask] = useState('');
  const todayStr = format(currentDate, 'yyyy-MM-dd');

  const activities = useLiveQuery(
      () => db.activities.where('date').equals(todayStr).toArray(),
      [todayStr]
  ) || [];

  const handleAdd = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTask.trim()) return;
      
      await db.activities.add({
          id: crypto.randomUUID(),
          date: todayStr,
          type: newTask.trim(),
          completed: false,
          createdAt: Date.now()
      });
      setNewTask('');
  };

  const toggleComplete = async (id: string, completed: boolean) => {
      await db.activities.update(id, { completed });
  };

  const handleDelete = async (id: string) => {
      await db.activities.delete(id);
  };

  const progress = activities.length > 0 
      ? Math.round((activities.filter(a => a.completed).length / activities.length) * 100) 
      : 0;

  return (
    <div className="p-5 h-full overflow-y-auto pb-32 hide-scrollbar space-y-6">
      <header>
          <h1 className="text-3xl font-bold font-display tracking-tight text-gray-900 dark:text-gray-100 mb-1">To-Do List</h1>
          <p className="text-gray-500 font-medium">Daily activities checklist</p>
      </header>

      <div className="glass-card p-5 relative overflow-hidden">
          <div className="flex justify-between items-end mb-2 relative z-10">
              <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Today's Progress</h2>
              <span className="text-2xl font-bold text-primary">{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden relative z-10">
              <div 
                  className="h-full bg-gradient-to-r from-primary to-indigo-400 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
              ></div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4"></div>
      </div>

      <form onSubmit={handleAdd} className="relative">
          <input 
              type="text" 
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full glass-card py-4 pl-4 pr-14 focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
          />
          <button 
              type="submit"
              disabled={!newTask.trim()}
              className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-primary text-white rounded-xl disabled:opacity-50 transition-colors hover:bg-primary/90"
          >
              <Plus className="w-5 h-5" />
          </button>
      </form>

      <div className="space-y-2 pt-2">
         {activities.length === 0 ? (
             <div className="py-10 text-center text-gray-400 italic">
                 No activities added for today.
             </div>
         ) : (
             activities.sort((a, b) => {
                 if (a.completed === b.completed) return b.createdAt - a.createdAt;
                 return a.completed ? 1 : -1;
             }).map(activity => (
                 <div 
                    key={activity.id} 
                    className={cn(
                        "glass-card p-4 flex items-center gap-3 transition-opacity duration-300 group",
                        activity.completed ? "opacity-60" : "opacity-100"
                    )}
                 >
                     <button onClick={() => toggleComplete(activity.id, !activity.completed)} className="shrink-0 text-primary transition-transform hover:scale-110">
                         {activity.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6 text-gray-300 dark:text-gray-600" />}
                     </button>
                     <span className={cn(
                         "flex-1 text-gray-900 dark:text-gray-100 transition-all",
                         activity.completed && "line-through text-gray-500"
                     )}>
                         {activity.type}
                     </span>
                     <button 
                        onClick={() => handleDelete(activity.id)} 
                        className="opacity-0 group-hover:opacity-100 shrink-0 p-2 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                     >
                         <Trash2 className="w-4 h-4" />
                     </button>
                 </div>
             ))
         )}
      </div>

    </div>
  );
}
