import React, { useState, useEffect } from 'react';
import { useEvents, addEvent, deleteEvent, toggleEventCompletion, toggleEventPin, updateEvent } from '../db/hooks';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { 
  ChevronLeft, ChevronRight, Plus, MapPin, Gift, Clock, AlertCircle, 
  Heart, Users, CreditCard, Sparkles, Pin, CheckCircle, Trash2, Copy, Edit2, X 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { EventType, CalendarEvent, Priority } from '../db/db';
import { useNavigationStore } from '../store/useNavigationStore';

const EVENT_TYPES: EventType[] = [
  'Birthday',
  'Marriage Anniversary',
  'Office Reporting Day',
  'Personal Reminder',
  'Family Event',
  'Bill Payment',
  'Doctor Appointment',
  'Custom Event'
];

const EVENT_ICONS: Record<EventType | 'default', any> = {
  'Birthday': Gift,
  'Marriage Anniversary': Heart,
  'Office Reporting Day': MapPin,
  'Personal Reminder': Clock,
  'Family Event': Users,
  'Bill Payment': CreditCard,
  'Doctor Appointment': AlertCircle,
  'Custom Event': Sparkles,
  'default': Clock
};

const EVENT_COLORS: Record<EventType | 'default', string> = {
  'Birthday': 'bg-pink-500/20 text-pink-400 border border-pink-500/30',
  'Marriage Anniversary': 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
  'Office Reporting Day': 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
  'Personal Reminder': 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  'Family Event': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  'Bill Payment': 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
  'Doctor Appointment': 'bg-red-500/20 text-red-400 border border-red-500/30',
  'Custom Event': 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  'default': 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
};

export default function CalendarView() {
  const { addEventOpen, setAddEventOpen } = useNavigationStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Form states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<EventType>('Custom Event');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [eventTime, setEventTime] = useState('12:00');
  const [priority, setPriority] = useState<Priority>('medium');
  const [notes, setNotes] = useState('');
  const [reminder, setReminder] = useState(false);
  const [tagsInput, setTagsInput] = useState('');

  const allEvents = useEvents() || [];

  // Sync event date form field with selected calendar date
  useEffect(() => {
    setEventDate(format(selectedDate, 'yyyy-MM-dd'));
  }, [selectedDate]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);

  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const endDate = new Date(monthEnd);
  if (endDate.getDay() !== 6) {
      endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
  }

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const selectedDateEvents = allEvents.filter(e => e.date === format(selectedDate, 'yyyy-MM-dd'));

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setEditingId(null);
    setTitle('');
    setEventType('Custom Event');
    setDescription('');
    setEventDate(format(selectedDate, 'yyyy-MM-dd'));
    setEventTime('12:00');
    setPriority('medium');
    setNotes('');
    setReminder(false);
    setTagsInput('');
    setAddEventOpen(true);
  };

  const handleOpenEdit = (event: CalendarEvent) => {
    setIsEditMode(true);
    setEditingId(event.id);
    setTitle(event.title);
    setEventType(event.type);
    setDescription(event.description || '');
    setEventDate(event.date);
    setEventTime(event.time || '12:00');
    setPriority(event.priority);
    setNotes(event.notes || '');
    setReminder(event.reminder || false);
    setTagsInput((event.tags || []).join(', '));
    setAddEventOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const parsedTags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const eventData = {
      title: title.trim(),
      type: eventType,
      description: description.trim() || undefined,
      date: eventDate,
      time: eventTime || undefined,
      priority,
      notes: notes.trim() || undefined,
      reminder,
      completed: false,
      pinned: false,
      tags: parsedTags.length > 0 ? parsedTags : undefined
    };

    if (isEditMode && editingId) {
      await updateEvent(editingId, eventData);
    } else {
      await addEvent(eventData);
    }

    setAddEventOpen(false);
    // Refresh list to new events date
    const d = new Date(eventDate);
    if (!isNaN(d.getTime())) {
      setSelectedDate(d);
      setCurrentDate(d);
    }
  };

  const handleDuplicate = async (event: CalendarEvent) => {
    await addEvent({
      ...event,
      title: `${event.title} (Copy)`,
      completed: false
    });
  };

  return (
    <div className="p-5 h-full overflow-y-auto pb-32 hide-scrollbar space-y-6 flex flex-col relative">
      <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-white">Calendar</h1>
            <p className="text-neutral-500 font-medium">Schedule & events</p>
          </div>
          <button 
            onClick={handleOpenAdd}
            className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 active:scale-95 transition-transform"
          >
             <Plus className="w-5 h-5" />
          </button>
      </header>
      
      {/* Calendar Grid */}
      <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                  {format(currentDate, 'MMMM yyyy')}
              </h2>
              <div className="flex gap-2">
                 <button onClick={prevMonth} className="p-2 rounded-full hover:bg-white/5 text-neutral-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                 </button>
                 <button onClick={nextMonth} className="p-2 rounded-full hover:bg-white/5 text-neutral-400 hover:text-white transition-colors">
                    <ChevronRight className="w-5 h-5" />
                 </button>
              </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
             {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                 <div key={d} className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider pb-1">{d}</div>
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
                            !isInMonth && "text-neutral-700",
                            isInMonth && !isSelected && !isTodayDate && "text-neutral-300 hover:bg-white/5",
                            isTodayDate && !isSelected && "text-indigo-400 font-bold bg-indigo-500/10",
                            isSelected && "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 scale-110 z-10"
                        )}
                     >
                         <span>{format(day, 'd')}</span>
                         {hasEvent && (
                             <div className="flex gap-0.5 mt-0.5 absolute bottom-1">
                                 {dayEvents.slice(0, 3).map((e, i) => (
                                     <span key={i} className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-indigo-400")}></span>
                                 ))}
                             </div>
                         )}
                     </button>
                 )
             })}
          </div>
      </div>

      {/* Events List for Selected Day */}
      <div className="flex-1 space-y-4">
          <h3 className="text-lg font-semibold text-white">
              {isToday(selectedDate) ? "Today's Events" : format(selectedDate, 'MMMM do, yyyy')}
          </h3>
          
          {selectedDateEvents.length === 0 ? (
              <div className="py-8 text-center text-neutral-500 bg-white/[0.02] rounded-2xl border border-dashed border-neutral-800">
                  <p>No events scheduled.</p>
                  <button onClick={handleOpenAdd} className="text-indigo-400 font-medium text-sm mt-2 hover:underline">Add New Event</button>
              </div>
          ) : (
              <div className="space-y-3">
                  {selectedDateEvents.map(event => {
                      const Icon = EVENT_ICONS[event.type] || EVENT_ICONS['default'];
                      const colors = EVENT_COLORS[event.type] || EVENT_COLORS['default'];
                      
                      return (
                          <div key={event.id} className={cn("glass-card p-4 flex gap-4 transition-all relative group", event.completed && "opacity-60")}>
                              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg", colors)}>
                                  <Icon className="w-6 h-6" />
                              </div>
                              <div className="flex-1 min-w-0 pr-8">
                                  <div className="flex items-center gap-2">
                                      <h4 className={cn("font-bold text-white leading-tight truncate", event.completed && "line-through text-neutral-500")}>
                                          {event.title}
                                      </h4>
                                      {event.pinned && (
                                          <Pin className="w-3.5 h-3.5 text-indigo-400 rotate-45 shrink-0" fill="currentColor" />
                                      )}
                                      {event.priority === 'high' && (
                                          <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider shrink-0">High</span>
                                      )}
                                  </div>
                                  <p className="text-xs font-semibold text-neutral-500 mt-0.5 uppercase tracking-wide">{event.type}</p>
                                  
                                  {event.time && (
                                     <p className="text-sm text-neutral-400 mt-1.5 flex items-center gap-1">
                                         <Clock className="w-3.5 h-3.5" /> {event.time}
                                     </p>
                                  )}
                                  {event.description && (
                                      <p className="text-sm text-neutral-400 mt-1 line-clamp-2">{event.description}</p>
                                  )}
                                  {event.notes && (
                                      <p className="text-xs text-neutral-500 bg-white/[0.02] border border-white/5 p-2 rounded-lg mt-2 italic">
                                          Notes: {event.notes}
                                      </p>
                                  )}
                                  {event.tags && event.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                          {event.tags.map(tag => (
                                              <span key={tag} className="text-[10px] bg-white/5 text-neutral-400 px-2 py-0.5 rounded-full font-medium">#{tag}</span>
                                          ))}
                                      </div>
                                  )}
                              </div>

                              {/* Corner Quick Actions */}
                              <div className="absolute right-3 top-3 flex gap-1 bg-[#0A0A0A]/80 backdrop-blur-sm p-1 rounded-xl border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                      onClick={() => toggleEventCompletion(event.id, !event.completed)}
                                      className="p-1.5 text-neutral-400 hover:text-green-400 transition-colors"
                                      title={event.completed ? "Mark Incomplete" : "Mark Completed"}
                                  >
                                      <CheckCircle className={cn("w-4 h-4", event.completed && "text-green-400")} />
                                  </button>
                                  <button 
                                      onClick={() => toggleEventPin(event.id, !event.pinned)}
                                      className="p-1.5 text-neutral-400 hover:text-indigo-400 transition-colors"
                                      title="Pin / Unpin"
                                  >
                                      <Pin className={cn("w-4 h-4", event.pinned && "text-indigo-400 rotate-45")} />
                                  </button>
                                  <button 
                                      onClick={() => handleOpenEdit(event)}
                                      className="p-1.5 text-neutral-400 hover:text-white transition-colors"
                                      title="Edit"
                                  >
                                      <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                      onClick={() => handleDuplicate(event)}
                                      className="p-1.5 text-neutral-400 hover:text-white transition-colors"
                                      title="Duplicate"
                                  >
                                      <Copy className="w-4 h-4" />
                                  </button>
                                  <button 
                                      onClick={() => deleteEvent(event.id)}
                                      className="p-1.5 text-neutral-400 hover:text-red-400 transition-colors"
                                      title="Delete"
                                  >
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </div>
                          </div>
                      );
                  })}
              </div>
          )}
      </div>

      {/* Add / Edit Event Modal */}
      {addEventOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-[#121212] border border-[#222] rounded-[32px] w-full max-w-sm p-6 space-y-4 max-h-[90vh] overflow-y-auto hide-scrollbar shadow-2xl">
                  <div className="flex justify-between items-center pb-2 border-b border-[#222]">
                      <h4 className="text-lg font-bold text-white">
                          {isEditMode ? 'Edit Event' : 'Add New Event'}
                      </h4>
                      <button 
                          onClick={() => setAddEventOpen(false)}
                          className="w-8 h-8 rounded-full bg-white/5 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
                      >
                          <X className="w-4 h-4" />
                      </button>
                  </div>

                  <form onSubmit={handleSave} className="space-y-4 text-sm">
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Event Title *</label>
                          <input 
                              type="text" 
                              required
                              value={title}
                              onChange={(e) => setTitle(e.target.value)}
                              placeholder="e.g., Sarah's Birthday"
                              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500"
                          />
                      </div>

                      <div className="space-y-1">
                          <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Event Type</label>
                          <select 
                              value={eventType}
                              onChange={(e) => setEventType(e.target.value as EventType)}
                              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                          >
                              {EVENT_TYPES.map(type => (
                                  <option key={type} value={type} className="bg-[#121212]">{type}</option>
                              ))}
                          </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Date</label>
                              <input 
                                  type="date" 
                                  required
                                  value={eventDate}
                                  onChange={(e) => setEventDate(e.target.value)}
                                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-3 py-3 text-white focus:outline-none focus:border-indigo-500"
                              />
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Time</label>
                              <input 
                                  type="time" 
                                  value={eventTime}
                                  onChange={(e) => setEventTime(e.target.value)}
                                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-3 py-3 text-white focus:outline-none focus:border-indigo-500"
                              />
                          </div>
                      </div>

                      <div className="space-y-1">
                          <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Priority</label>
                          <div className="grid grid-cols-3 gap-2">
                              {(['low', 'medium', 'high'] as Priority[]).map(p => (
                                  <button
                                      key={p}
                                      type="button"
                                      onClick={() => setPriority(p)}
                                      className={cn(
                                          "py-2 rounded-xl font-bold uppercase text-[10px] tracking-wider border transition-colors",
                                          priority === p 
                                              ? p === 'high' 
                                                  ? "bg-red-500/20 text-red-400 border-red-500" 
                                                  : p === 'medium'
                                                      ? "bg-indigo-500/20 text-indigo-400 border-indigo-500"
                                                      : "bg-emerald-500/20 text-emerald-400 border-emerald-500"
                                              : "bg-[#1A1A1A] text-neutral-400 border-transparent hover:border-neutral-700"
                                      )}
                                  >
                                      {p}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div className="space-y-1">
                          <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Description</label>
                          <textarea 
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                              placeholder="Detail of the event..."
                              rows={2}
                              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 resize-none"
                          />
                      </div>

                      <div className="space-y-1">
                          <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Tags (comma separated)</label>
                          <input 
                              type="text" 
                              value={tagsInput}
                              onChange={(e) => setTagsInput(e.target.value)}
                              placeholder="family, urgent, party"
                              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500"
                          />
                      </div>

                      <div className="space-y-1">
                          <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Notes & Rich text</label>
                          <textarea 
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Address, contacts, or extra checklists..."
                              rows={2}
                              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 resize-none"
                          />
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                          <input 
                              type="checkbox" 
                              id="reminder"
                              checked={reminder}
                              onChange={(e) => setReminder(e.target.checked)}
                              className="accent-indigo-600 h-4 w-4 rounded"
                          />
                          <label htmlFor="reminder" className="text-neutral-300 font-semibold cursor-pointer">Enable device local reminder alert</label>
                      </div>

                      <div className="pt-4 flex gap-3">
                          <button 
                              type="button"
                              onClick={() => setAddEventOpen(false)}
                              className="flex-1 bg-white/5 text-neutral-400 font-bold py-3.5 rounded-2xl border border-transparent hover:border-neutral-700 transition-colors uppercase text-xs"
                          >
                              Cancel
                          </button>
                          <button 
                              type="submit"
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl transition-colors uppercase text-xs shadow-lg shadow-indigo-600/20"
                          >
                              {isEditMode ? 'Update' : 'Save Event'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}
