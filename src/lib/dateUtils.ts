import { differenceInMinutes, differenceInHours, differenceInDays, differenceInWeeks, differenceInMonths, differenceInYears, format, isValid, parseISO, isFuture } from 'date-fns';
import i18n from '@/i18n';

/**
 * Returns a localized relative time string (e.g., "há 2 horas" or "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) return '';
  
  const now = new Date();
  const future = isFuture(dateObj);
  
  const minutes = Math.abs(differenceInMinutes(now, dateObj));
  const hours = Math.abs(differenceInHours(now, dateObj));
  const days = Math.abs(differenceInDays(now, dateObj));
  const weeks = Math.abs(differenceInWeeks(now, dateObj));
  const months = Math.abs(differenceInMonths(now, dateObj));
  const years = Math.abs(differenceInYears(now, dateObj));
  
  if (minutes < 1) {
    return i18n.t('relativeTime.justNow');
  }
  
  if (future) {
    if (minutes < 60) {
      return i18n.t('relativeTime.inMinutes', { count: minutes });
    }
    if (hours < 24) {
      return i18n.t('relativeTime.inHours', { count: hours });
    }
    return i18n.t('relativeTime.inDays', { count: days });
  }
  
  if (minutes < 60) {
    return i18n.t('relativeTime.minutesAgo', { count: minutes });
  }
  
  if (hours < 24) {
    return i18n.t('relativeTime.hoursAgo', { count: hours });
  }
  
  if (days < 7) {
    return i18n.t('relativeTime.daysAgo', { count: days });
  }
  
  if (weeks < 4) {
    return i18n.t('relativeTime.weeksAgo', { count: weeks });
  }
  
  if (months < 12) {
    return i18n.t('relativeTime.monthsAgo', { count: months });
  }
  
  return i18n.t('relativeTime.yearsAgo', { count: years });
}

/**
 * Format a date according to the current locale
 */
export function formatLocalizedDate(date: Date | string | null | undefined, formatStr: string = 'PPP'): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) return '';
  
  return format(dateObj, formatStr);
}

/**
 * Get the day of week name localized
 */
export function getLocalizedDayName(dayIndex: number): string {
  const days = [
    'settingsPage.sunday',
    'settingsPage.monday',
    'settingsPage.tuesday',
    'settingsPage.wednesday',
    'settingsPage.thursday',
    'settingsPage.friday',
    'settingsPage.saturday'
  ];
  return i18n.t(days[dayIndex] || days[0]);
}
