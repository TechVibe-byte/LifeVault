import { format, parseISO } from 'date-fns';

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
    const timeLabel = format(new Date(), 'hh:mm a'); // Current timestamp for the update message
    const currency = localStorage.getItem('hybrid_pref_currency') || 'INR';
    const currencySym = currency === 'INR' ? '₹' : '$';

    // Status lines with greetings and time info
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

    // Build beautiful formatted message body
    let text = `✨ <b>${config.customGreeting}</b> ✨\n\n`;
    text += `📅 <b>Date:</b> ${dayLabel}\n`;
    text += `⏰ <b>Time:</b> ${timeLabel}\n\n`;
    text += `${statusLine}\n\n`;

    // Add optional custom messages
    if (config.customMsg && config.customMsg.trim() !== '') {
      text += `📝 <i>"${config.customMsg}"</i>\n\n`;
    }

    // Add travel outlays, wifi bills formats
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
      headers: {
        'Content-Type': 'application/json'
      },
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
