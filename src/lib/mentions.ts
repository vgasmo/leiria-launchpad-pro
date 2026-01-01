import { useMemo, useCallback } from 'react';

// Regex to match @mentions like @john.doe or @JohnDoe
const MENTION_REGEX = /@([a-zA-Z0-9._-]+)/g;

export interface MentionMatch {
  username: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Extract all @mentions from a text string
 */
export function extractMentions(text: string): MentionMatch[] {
  const mentions: MentionMatch[] = [];
  let match;
  
  while ((match = MENTION_REGEX.exec(text)) !== null) {
    mentions.push({
      username: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }
  
  return mentions;
}

/**
 * Check if text contains any @mentions
 */
export function hasMentions(text: string): boolean {
  return MENTION_REGEX.test(text);
}

/**
 * Replace @mentions with styled spans for display
 */
export function highlightMentions(text: string): string {
  return text.replace(
    MENTION_REGEX,
    '<span class="mention bg-primary/10 text-primary px-1 rounded">@$1</span>'
  );
}

/**
 * Hook for managing mentions in a textarea
 */
export function useMentions(profiles: Array<{ id: string; full_name: string | null; email: string }>) {
  // Create a map of usernames to user IDs
  const usernameMap = useMemo(() => {
    const map = new Map<string, string>();
    profiles.forEach(profile => {
      // Use email prefix or full name (normalized) as username
      const emailPrefix = profile.email.split('@')[0].toLowerCase();
      map.set(emailPrefix, profile.id);
      
      if (profile.full_name) {
        const normalizedName = profile.full_name.toLowerCase().replace(/\s+/g, '.');
        map.set(normalizedName, profile.id);
      }
    });
    return map;
  }, [profiles]);

  // Resolve mentions to user IDs
  const resolveMentions = useCallback((text: string): string[] => {
    const mentions = extractMentions(text);
    const userIds: string[] = [];
    
    mentions.forEach(mention => {
      const userId = usernameMap.get(mention.username.toLowerCase());
      if (userId && !userIds.includes(userId)) {
        userIds.push(userId);
      }
    });
    
    return userIds;
  }, [usernameMap]);

  // Get suggestions based on partial input
  const getSuggestions = useCallback((query: string): Array<{ id: string; name: string; email: string }> => {
    const lowerQuery = query.toLowerCase();
    return profiles
      .filter(p => {
        const name = p.full_name?.toLowerCase() || '';
        const email = p.email.toLowerCase();
        return name.includes(lowerQuery) || email.includes(lowerQuery);
      })
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        name: p.full_name || p.email.split('@')[0],
        email: p.email,
      }));
  }, [profiles]);

  return {
    resolveMentions,
    getSuggestions,
    extractMentions,
    hasMentions,
  };
}
