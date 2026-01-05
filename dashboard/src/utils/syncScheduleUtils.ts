// Utilidades para calcular horarios de sincronización
// Basado en los triggers configurados en syncSupabase.js
// Los horarios están definidos para Brisbane, Australia (UTC+10/UTC+11)

// Zona horaria de referencia para los horarios de sincronización
const SYNC_TIMEZONE = 'Australia/Brisbane';

/**
 * Gets the current date in the sync timezone
 */
const getCurrentTimeInSyncTimezone = (): Date => {
  const now = new Date();
  // Convert to sync timezone
  return new Date(now.toLocaleString('en-US', { timeZone: SYNC_TIMEZONE }));
};

/**
 * Gets all sync times for a specific day of the week
 * @param dayOfWeek - Day of week (0=Sunday, 1=Monday, etc.)
 */
const getSyncTimesForDay = (dayOfWeek: number): number[] => {
  // Monday, Tuesday, Wednesday, Friday: 7:00, 9:00, 11:00, 14:00
  const monTueWedFri = [7, 9, 11, 14];
  
  // Thursday: 9:00, 12:00, 14:00
  const thursday = [9, 12, 14];
  
  // Saturday: 14:00
  const saturday = [14];
  
  if (dayOfWeek === 1 || dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 5) {
    // Monday, Tuesday, Wednesday, Friday
    return monTueWedFri;
  } else if (dayOfWeek === 4) {
    // Thursday
    return thursday;
  } else if (dayOfWeek === 6) {
    // Saturday
    return saturday;
  } else {
    // Sunday: no sync
    return [];
  }
};

/**
 * Gets the day name in English
 * @param dayOfWeek - Day of week (0=Sunday, 1=Monday, etc.)
 */
const getDayName = (dayOfWeek: number): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek];
};

/**
 * Calculates the next sync time based on scheduled times
 * Schedule: Mon,Tue,Wed,Fri: 7:00, 9:00, 11:00, 14:00 | Thu: 9:00, 12:00, 14:00 | Sat: 14:00
 * All times are in Brisbane, Australia timezone (UTC+10/UTC+11)
 */
export const getNextSyncTime = (): string => {
  const now = getCurrentTimeInSyncTimezone();
  const currentDay = now.getDay(); // 0=Sunday, 1=Monday, etc.
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour + (currentMinute / 60);

  // Get all sync times for current day
  const todayTimes = getSyncTimesForDay(currentDay);
  
  // Find next sync time today
  const nextTimeToday = todayTimes.find(time => time > currentTime);
  
  if (nextTimeToday) {
    return `Today at ${formatTime(nextTimeToday)} (Brisbane)`;
  }

  // If no more times today, return tomorrow's first time
  const tomorrowDay = (currentDay + 1) % 7;
  const tomorrowTimes = getSyncTimesForDay(tomorrowDay);
  const firstTimeTomorrow = tomorrowTimes[0];
  
  const dayName = getDayName(tomorrowDay);
  return `${dayName} at ${formatTime(firstTimeTomorrow)} (Brisbane)`;
};

/**
 * Calculates the last sync time (simulated based on schedules)
 */
export const getLastSyncTime = (): string => {
  const now = getCurrentTimeInSyncTimezone();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour + (currentMinute / 60);

  // Get all sync times for current day
  const todayTimes = getSyncTimesForDay(currentDay);
  
  // Find last sync time today
  const lastTimeToday = [...todayTimes].reverse().find(time => time < currentTime);
  
  if (lastTimeToday) {
    return `Today at ${formatTime(lastTimeToday)} (Brisbane)`;
  }

  // If no sync today, return yesterday's last time
  const yesterdayDay = (currentDay - 1 + 7) % 7;
  const yesterdayTimes = getSyncTimesForDay(yesterdayDay);
  const lastTimeYesterday = yesterdayTimes[yesterdayTimes.length - 1];
  
  const dayName = getDayName(yesterdayDay);
  return `${dayName} at ${formatTime(lastTimeYesterday)} (Brisbane)`;
};

/**
 * Formats time in readable format
 * @param time - Time in decimal format (e.g: 14.58 = 2:35 PM)
 */
const formatTime = (time: number): string => {
  const hours = Math.floor(time);
  const minutes = Math.round((time % 1) * 60);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

