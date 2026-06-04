import { useLiveQuery } from 'dexie-react-hooks';
import { db, EventType, Priority, CalendarEvent, AttendanceStatus, AttendanceRecord, DailyActivity } from './db';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';

export function useEvents(date?: Date) {
  return useLiveQuery(
    () => {
      let q = db.events.orderBy('date');
      if (date) {
        const dateStr = format(date, 'yyyy-MM-dd');
        return q.filter(e => e.date === dateStr).toArray();
      }
      return q.toArray();
    },
    [date]
  );
}

export function useDashboardStats() {
  return useLiveQuery(async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayEvents = await db.events.where('date').equals(today).count();
    
    // Calculate simple streak (very basic implementation for UI demo)
    const recentAttendance = await db.attendance.orderBy('date').reverse().limit(30).toArray();
    let currentStreak = 0;
    for (const record of recentAttendance) {
        if (record.status === 'Office') {
            currentStreak++;
        } else if (record.status === 'Work From Home') {
             // WFH might count as streak or not, depending on preference. Let's count it.
             currentStreak++;
        } else {
             break; // streak broken by leave/holiday
        }
    }
    
    return { todayEvents, currentStreak };
  }, []);
}

export async function addEvent(event: Omit<CalendarEvent, 'id' | 'createdAt'>) {
    return db.events.add({
        ...event,
        id: crypto.randomUUID(),
        createdAt: Date.now()
    });
}

export async function deleteEvent(id: string) {
    return db.events.delete(id);
}

export async function toggleEventCompletion(id: string, completed: boolean) {
    return db.events.update(id, { completed });
}

export function useAttendance(monthStr?: string /* YYYY-MM */) {
    return useLiveQuery(() => {
        let q = db.attendance.orderBy('date');
        if (monthStr) {
            return q.filter(a => a.date.startsWith(monthStr)).toArray();
        }
        return q.toArray();
    }, [monthStr]);
}

export async function markAttendance(date: string, status: AttendanceStatus, notes?: string) {
    const existing = await db.attendance.where('date').equals(date).first();
    if (existing) {
        return db.attendance.update(existing.id, { status, notes });
    }
    return db.attendance.add({
        id: crypto.randomUUID(),
        date,
        status,
        notes,
        createdAt: Date.now()
    });
}
