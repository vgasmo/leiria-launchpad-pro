/**
 * Text formatting utilities for consistent display.
 */

/**
 * Convert a string to Title Case for display.
 * Does NOT modify stored data - only for UI display.
 * 
 * @example
 * toTitleCase("validate idea") // "Validate Idea"
 * toTitleCase("MVP LAUNCH") // "Mvp Launch"
 * toTitleCase("first meeting with investor") // "First Meeting With Investor"
 */
export function toTitleCase(text: string): string {
  if (!text) return '';
  
  // List of words to keep lowercase (unless first word)
  const minorWords = new Set([
    'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'yet', 'so',
    'at', 'by', 'for', 'in', 'of', 'on', 'to', 'up', 'with', 'as'
  ]);
  
  return text
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Always capitalize first word
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      // Keep minor words lowercase
      if (minorWords.has(word)) {
        return word;
      }
      // Capitalize other words
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Truncate text with ellipsis if it exceeds max length.
 */
export function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
