import { format, parseISO, subDays } from 'date-fns';
import { db, AttendanceStatus } from '../db/db';
import { markAttendance } from '../db/hooks';

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  customGreeting?: string;
  customMsg?: string;
  customFooter?: string;
}

export function getTelegramConfig(): TelegramConfig {
  const enabled = localStorage.getItem('hybrid_telegram_enabled') === 'true';
  const botToken = localStorage.getItem('hybrid_telegram_bot_token') || '';
  const chatId = localStorage.getItem('hybrid_telegram_chat_id') || '';
  const customGreeting = localStorage.getItem('hybrid_telegram_custom_greeting') || '📢 Hybrid Office Attendance Update!';
  const customMsg = localStorage.getItem('hybrid_telegram_custom_msg') || 'Happy to share my workday location for transparency!';
  const customFooter = localStorage.getItem('hybrid_telegram_custom_footer') || '⚡ Sent automatically from Hybrid Attendance Companion';
  
  return {
    enabled,
    botToken,
    chatId,
    customGreeting,
    customMsg,
    customFooter
  };
}

export function saveTelegramConfig(config: TelegramConfig) {
  localStorage.setItem('hybrid_telegram_enabled', String(config.enabled));
  localStorage.setItem('hybrid_telegram_bot_token', config.botToken);
  localStorage.setItem('hybrid_telegram_chat_id', config.chatId);
  if (config.customGreeting !== undefined) localStorage.setItem('hybrid_telegram_custom_greeting', config.customGreeting);
  if (config.customMsg !== undefined) localStorage.setItem('hybrid_telegram_custom_msg', config.customMsg);
  if (config.customFooter !== undefined) localStorage.setItem('hybrid_telegram_custom_footer', config.customFooter);
}

export async function sendTelegramNotification(
  dateStr: string,
  status: string,
  notes?: string,
  travelExpense?: number,
  foodExpense?: number,
  wifiExpense?: number
): Promise<{ success: boolean; message: string }> {
  const config = getTelegramConfig();
  if (!config.enabled) {
    return { success: false, message: 'Telegram updates are disabled in settings.' };
  }
  if (!config.botToken || !config.chatId) {
    return { success: false, message: 'Please configure both Bot Token and Chat ID first.' };
  }

  try {
    const parsedDate = parseISO(dateStr);
    const dayLabel = format(parsedDate, 'EEEE, MMMM d, yyyy');
    const timeLabel = format(new Date(), 'hh:mm a');
    const currency = localStorage.getItem('hybrid_pref_currency') || 'INR';
    const currencySym = currency === 'INR' ? '₹' : '$';

    let statusLine = '';
    if (status === 'Office') {
      statusLine = `<b>💼 Status: He was in Office today!</b>`;
    } else if (status === 'Work From Home') {
      statusLine = `<b>🏠 Status: Working From Home (WFH) today!</b>`;
    } else if (status === 'Leave') {
      statusLine = `<b>☕ Status: On Leave / Vacation!</b>`;
    } else if (status === 'Holiday') {
      statusLine = `<b>🌸 Status: Enjoying a Holiday/Weekend!</b>`;
    } else {
      statusLine = `<b>⚡ Status: Absent today.</b>`;
    }

    let text = `✨ <b>${config.customGreeting}</b> ✨\n\n`;
    text += `📅 <b>Date:</b> ${dayLabel}\n`;
    text += `⏰ <b>Time:</b> ${timeLabel}\n\n`;
    text += `${statusLine}\n\n`;

    if (config.customMsg && config.customMsg.trim() !== '') {
      text += `📝 <i>"${config.customMsg}"</i>\n\n`;
    }

    const travel = travelExpense || 0;
    const food = foodExpense || 0;
    const wifi = wifiExpense || 0;
    
    if (travel > 0 || food > 0 || wifi > 0 || (notes && notes.trim() !== '')) {
      text += `⚙️ <b>Details Incurred:</b>\n`;
      if (travel > 0) text += `• 🚗 <b>Travel Outlay:</b> ${currencySym}${travel.toLocaleString('en-IN')}\n`;
      if (food > 0) text += `• 🍲 <b>Meal Expense:</b> ${currencySym}${food.toLocaleString('en-IN')}\n`;
      if (wifi > 0) text += `• 🌐 <b>WiFi Expense:</b> ${currencySym}${wifi.toLocaleString('en-IN')}\n`;
      if (notes && notes.trim() !== '') text += `• 💬 <b>Notes:</b> ${notes}\n`;
      text += `\n`;
    }

    if (config.customFooter && config.customFooter.trim() !== '') {
      text += `🕊️ <i>${config.customFooter}</i>`;
    }

    const payload = {
      chat_id: config.chatId,
      text: text,
      parse_mode: 'HTML'
    };

    const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const resJson = await response.json();
    if (response.ok && resJson.ok) {
      return { success: true, message: 'Notification sent successfully to Telegram!' };
    } else {
      const errMsg = resJson.description || 'Unknown Telegram API response error.';
      return { success: false, message: `Telegram Error: ${errMsg}` };
    }
  } catch (err: any) {
    console.error('Telegram dispatch crashed:', err);
    return { success: false, message: `Failed to connect to Telegram: ${err.message}` };
  }
}

/**
 * Sends a daily prompt at 6:00 PM with inline buttons [🏢 Office] [🏠 WFH] [🌴 Leave]
 */
export async function sendDailyTelegramPrompt(customDateStr?: string): Promise<{ success: boolean; message: string }> {
  const config = getTelegramConfig();
  if (!config.enabled || !config.botToken || !config.chatId) {
    return { success: false, message: 'Telegram bot credentials not configured.' };
  }

  const targetDate = customDateStr || format(new Date(), 'yyyy-MM-dd');
  const dayLabel = format(parseISO(targetDate), 'EEEE, MMMM d, yyyy');

  const text = `⏰ <b>Daily Workplace Check-in</b>\n\nWhere did you work today (<b>${dayLabel}</b>)?\n\n<i>Tap a button below to log your status directly from Telegram:</i>`;

  const payload = {
    chat_id: config.chatId,
    text: text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🏢 Office', callback_data: `log_Office_${targetDate}` },
          { text: '🏠 WFH', callback_data: `log_Work From Home_${targetDate}` },
          { text: '🌴 Leave', callback_data: `log_Leave_${targetDate}` }
        ]
      ]
    }
  };

  try {
    const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      return { success: true, message: 'Daily prompt sent with Telegram inline buttons!' };
    } else {
      return { success: false, message: data.description || 'Failed to send prompt.' };
    }
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Polls Telegram /getUpdates for incoming inline button clicks (callback_queries),
 * logs attendance directly into Dexie DB, answers callback, and updates message in Telegram.
 */
export async function pollTelegramCallbackQueries(): Promise<{ processedCount: number }> {
  const config = getTelegramConfig();
  if (!config.enabled || !config.botToken) return { processedCount: 0 };

  const lastOffsetKey = 'hybrid_tg_last_update_id';
  const lastOffset = parseInt(localStorage.getItem(lastOffsetKey) || '0', 10);

  try {
    const res = await fetch(`https://api.telegram.org/bot${config.botToken}/getUpdates?offset=${lastOffset}`);
    const data = await res.json();
    if (!res.ok || !data.ok || !data.result) return { processedCount: 0 };

    let processedCount = 0;
    const updates = data.result;

    for (const update of updates) {
      const updateId = update.update_id;
      localStorage.setItem(lastOffsetKey, String(updateId + 1));

      if (update.callback_query) {
        const cb = update.callback_query;
        const cbData: string = cb.data || '';

        if (cbData.startsWith('log_')) {
          // Format: log_STATUS_YYYY-MM-DD
          const parts = cbData.split('_');
          if (parts.length >= 3) {
            const statusStr = parts[1] as AttendanceStatus;
            const dateStr = parts[2];

            // 1. Mark attendance in IndexedDB
            await markAttendance(dateStr, statusStr, 'Logged directly via Telegram inline button');
            processedCount++;

            // 2. Answer callback query popup
            try {
              await fetch(`https://api.telegram.org/bot${config.botToken}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  callback_query_id: cb.id,
                  text: `✅ Recorded ${statusStr} for ${dateStr}!`,
                  show_alert: false
                })
              });
            } catch (e) {
              console.error('Failed to answer callback query', e);
            }

            // 3. Edit telegram prompt text to confirm vote
            if (cb.message && cb.message.chat) {
              try {
                await fetch(`https://api.telegram.org/bot${config.botToken}/editMessageText`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: cb.message.chat.id,
                    message_id: cb.message.message_id,
                    text: `✨ <b>Work Log Recorded!</b> ✨\n\n📅 <b>Date:</b> ${dateStr}\n💼 <b>Status:</b> ${statusStr}\n\n<i>Logged directly from Telegram.</i>`,
                    parse_mode: 'HTML'
                  })
                });
              } catch (e) {
                console.error('Failed to edit telegram message text', e);
              }
            }
          }
        }
      }
    }

    return { processedCount };
  } catch (err) {
    console.error('Error polling Telegram updates:', err);
    return { processedCount: 0 };
  }
}

/**
 * Generates and sends a weekly summary digest to Telegram (streak tally, office days, total expenses).
 */
export async function sendWeeklyTelegramDigest(): Promise<{ success: boolean; message: string }> {
  const config = getTelegramConfig();
  if (!config.enabled || !config.botToken || !config.chatId) {
    return { success: false, message: 'Telegram bot credentials not configured.' };
  }

  try {
    const today = new Date();
    const last7Days: string[] = [];
    for (let i = 0; i < 7; i++) {
      last7Days.push(format(subDays(today, i), 'yyyy-MM-dd'));
    }

    const records = await db.attendance.where('date').anyOf(last7Days).toArray();

    let officeDays = 0;
    let wfhDays = 0;
    let leaveDays = 0;
    let totalTravel = 0;
    let totalFood = 0;
    let totalWifi = 0;

    for (const r of records) {
      if (r.status === 'Office') officeDays++;
      else if (r.status === 'Work From Home') wfhDays++;
      else if (r.status === 'Leave') leaveDays++;

      totalTravel += r.travelExpense || 0;
      totalFood += r.foodExpense || 0;
      totalWifi += r.wifiExpense || 0;
    }

    // Calculate overall active streak from DB
    const allRecent = await db.attendance.orderBy('date').reverse().limit(30).toArray();
    let currentStreak = 0;
    for (const record of allRecent) {
      if (record.status === 'Office' || record.status === 'Work From Home') {
        currentStreak++;
      } else {
        break;
      }
    }

    const currency = localStorage.getItem('hybrid_pref_currency') || 'INR';
    const currencySym = currency === 'INR' ? '₹' : '$';
    const grandTotal = totalTravel + totalFood + totalWifi;

    let text = `📊 <b>Weekly Telegram Summary Digest</b> 📊\n\n`;
    text += `🔥 <b>Current Work Streak:</b> ${currentStreak} Days\n`;
    text += `🏢 <b>Total Office Days:</b> ${officeDays} / 7\n`;
    text += `🏠 <b>Total WFH Days:</b> ${wfhDays} / 7\n`;
    if (leaveDays > 0) text += `🌴 <b>Leave Days:</b> ${leaveDays}\n`;
    text += `\n💰 <b>Weekly Expenses Logged:</b>\n`;
    text += `• 🚗 <b>Travel Outlay:</b> ${currencySym}${totalTravel.toLocaleString('en-IN')}\n`;
    text += `• 🍲 <b>Meal Expense:</b> ${currencySym}${totalFood.toLocaleString('en-IN')}\n`;
    text += `• 🌐 <b>WiFi Expense:</b> ${currencySym}${totalWifi.toLocaleString('en-IN')}\n`;
    text += `\n💵 <b>Grand Total Outlay:</b> ${currencySym}${grandTotal.toLocaleString('en-IN')}\n\n`;
    text += `⚡ <i>Generated automatically by Hybrid Tracker</i>`;

    const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });

    const data = await response.json();
    if (response.ok && data.ok) {
      return { success: true, message: 'Weekly summary digest sent to Telegram!' };
    } else {
      return { success: false, message: data.description || 'Failed to send weekly digest.' };
    }
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
