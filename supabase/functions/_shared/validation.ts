/**
 * Shared input validation utilities for Edge Functions
 * Provides consistent validation and sanitization across all functions
 */

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ISO 8601 date pattern (basic validation)
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;

// URL pattern (basic validation)
const URL_REGEX = /^https?:\/\/[^\s<>"{}|\\^`[\]]+$/;

// Email pattern (basic validation)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validation result type
 */
export interface ValidationResult<T = unknown> {
  valid: boolean;
  value?: T;
  error?: string;
}

/**
 * Size limits for common fields (in characters)
 */
export const SIZE_LIMITS = {
  UUID: 36,
  TITLE: 500,
  DESCRIPTION: 5000,
  TRANSCRIPT: 500000, // 500KB
  EMAIL_BODY: 100000, // 100KB
  URL: 2048,
  EMAIL: 255,
  ALIAS: 100,
  JSON_PAYLOAD: 1000000, // 1MB
  MEETING_TITLE: 500,
  SUBJECT: 500,
} as const;

/**
 * Validate UUID format
 */
export function validateUUID(value: unknown, fieldName = 'ID'): ValidationResult<string> {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const trimmed = value.trim();
  
  if (trimmed.length !== 36) {
    return { valid: false, error: `${fieldName} must be a valid UUID` };
  }
  
  if (!UUID_REGEX.test(trimmed)) {
    return { valid: false, error: `${fieldName} format is invalid` };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Validate optional UUID (returns valid if empty)
 */
export function validateOptionalUUID(value: unknown, fieldName = 'ID'): ValidationResult<string | undefined> {
  if (value === undefined || value === null || value === '') {
    return { valid: true, value: undefined };
  }
  
  return validateUUID(value, fieldName);
}

/**
 * Validate string with length limits
 */
export function validateString(
  value: unknown,
  fieldName: string,
  options: { required?: boolean; maxLength?: number; minLength?: number } = {}
): ValidationResult<string> {
  const { required = true, maxLength = SIZE_LIMITS.TITLE, minLength = 0 } = options;
  
  if (value === undefined || value === null || value === '') {
    if (required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true, value: '' };
  }
  
  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  
  const trimmed = value.trim();
  
  if (trimmed.length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }
  
  if (trimmed.length > maxLength) {
    return { valid: false, error: `${fieldName} exceeds maximum length (${maxLength} characters)` };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Validate optional string
 */
export function validateOptionalString(
  value: unknown,
  fieldName: string,
  maxLength: number = SIZE_LIMITS.DESCRIPTION
): ValidationResult<string | undefined> {
  if (value === undefined || value === null || value === '') {
    return { valid: true, value: undefined };
  }
  
  return validateString(value, fieldName, { required: false, maxLength });
}

/**
 * Validate email format
 */
export function validateEmail(value: unknown, fieldName = 'Email'): ValidationResult<string> {
  const stringResult = validateString(value, fieldName, { maxLength: SIZE_LIMITS.EMAIL });
  if (!stringResult.valid) return stringResult;
  
  if (!EMAIL_REGEX.test(stringResult.value!)) {
    return { valid: false, error: `${fieldName} format is invalid` };
  }
  
  return { valid: true, value: stringResult.value!.toLowerCase() };
}

/**
 * Validate optional email
 */
export function validateOptionalEmail(value: unknown, fieldName = 'Email'): ValidationResult<string | undefined> {
  if (value === undefined || value === null || value === '') {
    return { valid: true, value: undefined };
  }
  
  return validateEmail(value, fieldName);
}

/**
 * Validate URL format
 */
export function validateURL(value: unknown, fieldName = 'URL'): ValidationResult<string> {
  const stringResult = validateString(value, fieldName, { maxLength: SIZE_LIMITS.URL });
  if (!stringResult.valid) return stringResult;
  
  if (!URL_REGEX.test(stringResult.value!)) {
    return { valid: false, error: `${fieldName} must be a valid URL` };
  }
  
  return { valid: true, value: stringResult.value! };
}

/**
 * Validate optional URL
 */
export function validateOptionalURL(value: unknown, fieldName = 'URL'): ValidationResult<string | undefined> {
  if (value === undefined || value === null || value === '') {
    return { valid: true, value: undefined };
  }
  
  return validateURL(value, fieldName);
}

/**
 * Validate ISO date string
 */
export function validateISODate(value: unknown, fieldName = 'Date'): ValidationResult<string> {
  const stringResult = validateString(value, fieldName, { maxLength: 30 });
  if (!stringResult.valid) return stringResult;
  
  if (!ISO_DATE_REGEX.test(stringResult.value!)) {
    return { valid: false, error: `${fieldName} must be a valid ISO date` };
  }
  
  // Verify it's actually a valid date
  const date = new Date(stringResult.value!);
  if (isNaN(date.getTime())) {
    return { valid: false, error: `${fieldName} is not a valid date` };
  }
  
  return { valid: true, value: stringResult.value! };
}

/**
 * Validate optional ISO date
 */
export function validateOptionalISODate(value: unknown, fieldName = 'Date'): ValidationResult<string | undefined> {
  if (value === undefined || value === null || value === '') {
    return { valid: true, value: undefined };
  }
  
  return validateISODate(value, fieldName);
}

/**
 * Validate array of strings (e.g., participants)
 */
export function validateStringArray(
  value: unknown,
  fieldName: string,
  options: { maxItems?: number; maxItemLength?: number } = {}
): ValidationResult<string[]> {
  const { maxItems = 100, maxItemLength = 255 } = options;
  
  if (!Array.isArray(value)) {
    return { valid: true, value: [] }; // Treat non-arrays as empty
  }
  
  if (value.length > maxItems) {
    return { valid: false, error: `${fieldName} exceeds maximum of ${maxItems} items` };
  }
  
  const result: string[] = [];
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (typeof item === 'string') {
      const trimmed = item.trim().slice(0, maxItemLength);
      if (trimmed) result.push(trimmed);
    }
  }
  
  return { valid: true, value: result };
}

/**
 * Validate and parse JSON request body with size limit
 */
export async function parseAndValidateBody<T = Record<string, unknown>>(
  req: Request,
  maxSize = SIZE_LIMITS.JSON_PAYLOAD
): Promise<ValidationResult<T>> {
  try {
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
    
    if (contentLength > maxSize) {
      return { valid: false, error: 'Request body too large' };
    }
    
    const text = await req.text();
    
    if (text.length > maxSize) {
      return { valid: false, error: 'Request body too large' };
    }
    
    if (!text.trim()) {
      return { valid: false, error: 'Request body is empty' };
    }
    
    const body = JSON.parse(text) as T;
    return { valid: true, value: body };
  } catch (e) {
    return { valid: false, error: 'Invalid JSON in request body' };
  }
}

/**
 * Sanitize a string for safe storage (remove control characters, trim)
 */
export function sanitizeString(value: string, maxLength?: number): string {
  // Remove control characters except newlines and tabs
  let sanitized = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Trim and optionally limit length
  sanitized = sanitized.trim();
  
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitize error message for client response (remove sensitive details)
 */
export function sanitizeErrorForClient(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Check for sensitive information patterns
    if (
      message.includes('secret') ||
      message.includes('token') ||
      message.includes('password') ||
      message.includes('key') ||
      message.includes('credential') ||
      message.includes('auth')
    ) {
      return 'Internal server error';
    }
    
    // Don't expose database error details
    if (
      message.includes('duplicate key') ||
      message.includes('violates') ||
      message.includes('constraint') ||
      message.includes('relation') ||
      message.includes('column')
    ) {
      return 'Database operation failed';
    }
    
    // Return first 200 chars of non-sensitive errors
    return error.message.slice(0, 200);
  }
  
  return 'Unknown error';
}

/**
 * Create a standardized validation error response
 */
export function validationErrorResponse(
  error: string,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ error, code: 'VALIDATION_ERROR' }),
    { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}
