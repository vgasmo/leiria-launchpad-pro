import { z } from 'zod';

// URL validation - allows empty string or valid URL
const optionalUrl = z.string().trim().refine(
  (val) => val === '' || /^https?:\/\/.+/.test(val),
  { message: 'Must be a valid URL starting with http:// or https://' }
).transform(val => val || null);

// LinkedIn URL validation
const linkedinUrl = z.string().trim().refine(
  (val) => val === '' || /^https?:\/\/(www\.)?linkedin\.com\/.+/.test(val),
  { message: 'Must be a valid LinkedIn URL' }
).transform(val => val || null);

// Phone validation - allows common formats
const optionalPhone = z.string().trim().max(30, 'Phone number is too long').refine(
  (val) => val === '' || /^[\d\s\+\-\(\)\.]+$/.test(val),
  { message: 'Invalid phone number format' }
).transform(val => val || null);

// Text fields with length limits
const shortText = (maxLength: number = 100) => 
  z.string().trim().max(maxLength, `Must be ${maxLength} characters or less`);

const longText = (maxLength: number = 2000) => 
  z.string().trim().max(maxLength, `Must be ${maxLength} characters or less`).transform(val => val || null);

// Expertise/tags array validation
const expertiseArray = z.array(z.string().trim().min(1).max(50))
  .max(20, 'Maximum 20 expertise areas')
  .transform(arr => arr.length > 0 ? arr.filter(s => s.length > 0) : null);

// Startup form validation - returns non-null values for compatibility
export const startupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().trim().max(2000, 'Description must be 2000 characters or less').optional().transform(val => val || null),
  website: z.string().trim().refine(
    (val) => !val || /^https?:\/\/.+/.test(val),
    { message: 'Must be a valid URL starting with http:// or https://' }
  ).optional().transform(val => val || null),
});

export type StartupFormData = z.infer<typeof startupSchema>;

// Profile update validation
export const profileUpdateSchema = z.object({
  full_name: shortText(100).optional().transform(val => val?.trim() || null),
  avatar_url: optionalUrl.optional(),
  phone: optionalPhone.optional(),
  linkedin_url: linkedinUrl.optional(),
  bio: longText(1000).optional(),
  expertise: expertiseArray.optional(),
});

export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;

// Mentor connection message validation
export const connectionMessageSchema = z.object({
  message: longText(500).optional(),
});

export type ConnectionMessageData = z.infer<typeof connectionMessageSchema>;

// Meeting validation
export const meetingSchema = z.object({
  title: shortText(200).min(1, 'Title is required'),
  description: longText(2000).optional(),
  location: shortText(200).optional().transform(val => val || null),
  join_url: optionalUrl.optional(),
  starts_at: z.string().min(1, 'Start time is required'),
  ends_at: z.string().min(1, 'End time is required'),
});

export type MeetingFormData = z.infer<typeof meetingSchema>;

// Action item validation
export const actionItemSchema = z.object({
  title: shortText(200).min(1, 'Title is required'),
  description: longText(2000).optional(),
  due_date: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  owner_user_id: z.string().uuid().nullable().optional(),
});

export type ActionItemFormData = z.infer<typeof actionItemSchema>;

// Milestone validation
export const milestoneSchema = z.object({
  title: shortText(200).min(1, 'Title is required'),
  description: longText(2000).optional(),
  target_date: z.string().nullable().optional(),
});

export type MilestoneFormData = z.infer<typeof milestoneSchema>;

// Session validation  
export const sessionSchema = z.object({
  title: shortText(200).min(1, 'Title is required'),
  agenda: longText(5000).optional(),
  notes: longText(10000).optional(),
  decisions: longText(5000).optional(),
  scheduled_at: z.string().min(1, 'Scheduled time is required'),
  duration: z.number().int().min(15).max(480).optional(),
});

export type SessionFormData = z.infer<typeof sessionSchema>;

// Document validation
export const documentSchema = z.object({
  name: shortText(200).min(1, 'Name is required'),
  description: longText(1000).optional(),
  category: shortText(50).optional().transform(val => val || null),
  external_url: optionalUrl.optional(),
  document_type: z.string().min(1, 'Document type is required'),
});

export type DocumentFormData = z.infer<typeof documentSchema>;

// KPI value validation
export const kpiValueSchema = z.object({
  value: z.number().nullable().optional(),
  target_value: z.number().nullable().optional(),
  notes: longText(500).optional(),
  period_month: z.string().min(1, 'Period is required'),
});

export type KpiValueFormData = z.infer<typeof kpiValueSchema>;

// Helper function to validate and return parsed data or show toast error
export function validateFormData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  onError?: (message: string) => void
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const firstError = result.error.errors[0];
    if (onError && firstError) {
      onError(firstError.message);
    }
    return { success: false, error: result.error };
  }
  
  return { success: true, data: result.data };
}
