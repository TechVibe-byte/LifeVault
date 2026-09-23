import { format, parse, isValid } from 'date-fns';
import { markAttendance } from '../db/hooks';

export interface CalendarOfficeSuggestion {
  date: string; // YYYY-MM-DD
  title: string;
  location: string;
  matchedKeyword: string;
}

/**
 * Parses an iCalendar (.ics) string format and extracts meeting events.
 */
export function parseICS(icsText: string): Array<{ summary: string; location: string; description: string; dateStr: string }> {
  const events: Array<{ summary: string; location: string; description: string; dateStr: string }> = [];
  
  // Unfold lines (iCalendar spec: lines split by CRLF followed by space/tab)
  const unfoldedText = icsText.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfoldedText.split(/\r?\n/);

  let currentEvent: { summary: string; location: string; description: string; dateStr: string } | null = null;

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      currentEvent = { summary: '', location: '', description: '', dateStr: '' };
    } else if (line.startsWith('END:VEVENT')) {
      if (currentEvent && currentEvent.dateStr) {
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      if (line.startsWith('SUMMARY:')) {
        currentEvent.summary = line.substring(8).trim();
      } else if (line.startsWith('LOCATION:')) {
        currentEvent.location = line.substring(9).trim();
      } else if (line.startsWith('DESCRIPTION:')) {
        currentEvent.description = line.substring(12).trim();
      } else if (line.startsWith('DTSTART')) {
        // Handle formats like DTSTART:20260923T140000Z or DTSTART;VALUE=DATE:20260923
        const val = line.split(':')[1]?.trim() || '';
        const cleanVal = val.split('T')[0]; // Extract YYYYMMDD
        if (cleanVal && cleanVal.length >= 8) {
          const year = cleanVal.substring(0, 4);
          const month = cleanVal.substring(4, 6);
          const day = cleanVal.substring(6, 8);
          const formattedDate = `${year}-${month}-${day}`;
          if (/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
            currentEvent.dateStr = formattedDate;
          }
        }
      }
    }
  }

  return events;
}

/**
 * Filters parsed ICS events against office keywords (e.g. "office", "hq", "lab", "building 4")
 * to identify suggested office work days.
 */
export function findSuggestedOfficeDays(icsText: string, keywordsStr: string): CalendarOfficeSuggestion[] {
  const parsedEvents = parseICS(icsText);
  const keywords = keywordsStr
    .split(',')
    .map(k => k.trim().toLowerCase())
    .filter(k => k.length > 0);

  if (keywords.length === 0) return [];

  const suggestionsMap = new Map<string, CalendarOfficeSuggestion>();

  for (const event of parsedEvents) {
    const fullSearchableText = `${event.summary} ${event.location} ${event.description}`.toLowerCase();
    
    for (const keyword of keywords) {
      if (fullSearchableText.includes(keyword)) {
        if (!suggestionsMap.has(event.dateStr)) {
          suggestionsMap.set(event.dateStr, {
            date: event.dateStr,
            title: event.summary || 'Office Meeting',
            location: event.location || 'Tagged Office Location',
            matchedKeyword: keyword
          });
        }
        break;
      }
    }
  }

  // Sort chronologically
  return Array.from(suggestionsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Batch logs selected calendar suggestions as 'Office' attendance in Dexie DB.
 */
export async function batchLogOfficeDays(
  suggestions: CalendarOfficeSuggestion[],
  travelExpense?: number
): Promise<number> {
  let count = 0;
  for (const item of suggestions) {
    await markAttendance(
      item.date,
      'Office',
      `Auto-synced from Calendar: ${item.title} (${item.location})`,
      travelExpense
    );
    count++;
  }
  return count;
}
