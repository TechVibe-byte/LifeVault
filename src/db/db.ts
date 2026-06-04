import Dexie, { type EntityTable } from 'dexie';

export type EventType = 'Birthday' | 'Marriage Anniversary' | 'Office Reporting Day' | 'Personal Reminder' | 'Family Event' | 'Bill Payment' | 'Doctor Appointment' | 'Custom Event';
export type Priority = 'low' | 'medium' | 'high';

export interface CalendarEvent {
  id: string;
  title: string;
  type: EventType;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  priority: Priority;
  notes?: string;
  reminder?: boolean;
  completed: boolean;
  pinned: boolean;
  tags?: string[];
  createdAt: number;
}

export type AttendanceStatus = 'Office' | 'Work From Home' | 'Leave' | 'Holiday' | 'Absent';

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  notes?: string;
  createdAt: number;
}

export interface DailyActivity {
  id: string;
  date: string; // YYYY-MM-DD
  type: string; // Custom string
  notes?: string;
  completed: boolean;
  createdAt: number;
}

const db = new Dexie('LifeVaultDB') as Dexie & {
  events: EntityTable<CalendarEvent, 'id'>,
  attendance: EntityTable<AttendanceRecord, 'id'>,
  activities: EntityTable<DailyActivity, 'id'>
};

// Schema version 1
db.version(1).stores({
  events: 'id, date, type, priority, completed, pinned', // Primary key and indexed props
  attendance: 'id, date, status',
  activities: 'id, date, type'
});

export { db };
