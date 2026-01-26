/**
 * Date formatting utilities with i18n locale support
 */

import { format, formatRelative, formatDistance } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

export type SupportedLocale = 'pt' | 'en';

const localeMap = {
  pt: ptBR,
  en: enUS,
};

/**
 * Get date-fns locale from i18n language code
 */
export function getDateLocale(lang: string) {
  const shortLang = lang.split('-')[0] as SupportedLocale;
  return localeMap[shortLang] || enUS;
}

/**
 * Format a date with locale awareness
 * @param date - Date to format
 * @param formatStr - date-fns format string
 * @param lang - Language code (e.g., 'pt', 'en', 'pt-BR')
 */
export function formatDateLocale(
  date: Date | string,
  formatStr: string,
  lang: string = 'en'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = getDateLocale(lang);
  return format(dateObj, formatStr, { locale });
}

/**
 * Format a date relative to now (e.g., "yesterday", "last Friday")
 */
export function formatDateRelative(
  date: Date | string,
  baseDate: Date = new Date(),
  lang: string = 'en'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = getDateLocale(lang);
  return formatRelative(dateObj, baseDate, { locale });
}

/**
 * Format distance between dates (e.g., "3 days ago", "in 2 months")
 */
export function formatDateDistance(
  date: Date | string,
  baseDate: Date = new Date(),
  lang: string = 'en',
  options?: { addSuffix?: boolean }
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = getDateLocale(lang);
  return formatDistance(dateObj, baseDate, { 
    locale,
    addSuffix: options?.addSuffix ?? true,
  });
}

/**
 * Format short date for UI display (e.g., "15 Jan" or "Jan 15" depending on locale)
 */
export function formatShortDate(
  date: Date | string,
  lang: string = 'en'
): string {
  const formatStr = lang.startsWith('pt') ? 'd MMM' : 'MMM d';
  return formatDateLocale(date, formatStr, lang);
}

/**
 * Format month and year (e.g., "Janeiro 2024" or "January 2024")
 */
export function formatMonthYear(
  date: Date | string,
  lang: string = 'en'
): string {
  return formatDateLocale(date, 'MMMM yyyy', lang);
}
