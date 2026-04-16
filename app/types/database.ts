/**
 * Database Type Definitions for Ponto Novo
 * 
 * This file contains all TypeScript interfaces that correspond to
 * the database tables. Use these types for type-safe database operations.
 */

// ============================================
// User & Authentication Types
// ============================================

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  user_metadata?: Record<string, any>;
}

export interface UserProfile {
  id: string; // UUID, links to auth.users.id
  name?: string;
  email?: string;
  role?: string;
  company?: string;
  department?: string;
  avatar?: string;
  registration_number?: string;
  cpf?: string;
  matricula?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// Time Tracking Types
// ============================================

export interface TimeLog {
  id?: string;
  user_id: string;
  type: 'in' | 'out' | 'break_start' | 'break_end' | 'nsr';
  timestamp: string | Date;
  location?: string;
  coords?: {
    latitude: number;
    longitude: number;
  };
  ticket_image?: string; // URL to image in storage
  observations?: string;
  nsr?: string; // NSR number
  worked_ms?: number; // milliseconds worked
  note?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LogFilter {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  type?: TimeLog['type'];
  sortBy?: 'timestamp' | 'created_at';
  ascending?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================
// Medical Certificate Types
// ============================================

export interface MedicalCertificate {
  id?: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  is_full_day: boolean;
  start_time?: string; // HH:MM format
  end_time?: string; // HH:MM format
  image?: string; // URL to certificate image in storage
  status: 'pending' | 'approved' | 'rejected';
  created_at?: string;
  updated_at?: string;
}

// ============================================
// Custom Shifts & Special Days Types
// ============================================

export interface CustomShift {
  id?: string;
  user_id: string;
  date_key: string; // YYYY-MM-DD format
  is_off: boolean;
  is_holiday: boolean;
  is_vacation: boolean;
  is_medical: boolean;
  is_training: boolean;
  is_absence: boolean;
  is_manual_adjustment: boolean;
  is_different_workload: boolean;
  shift?: string; // e.g., "09:00 - 18:00" or "Folga"
  reason?: string;
  justification?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DayStatus {
  isOff: boolean;
  isHoliday: boolean;
  isVacation: boolean;
  isMedical: boolean;
  isTraining: boolean;
  isAbsence: boolean;
  isManualAdjustment: boolean;
  isDifferentWorkload: boolean;
  shift: string;
  reason?: string;
  justification?: string;
}

// ============================================
// Settings & Preferences Types
// ============================================

export interface NotificationPreferences {
  alerts: boolean;
  reminders: boolean;
  system: boolean;
}

export interface VacationMode {
  active: boolean;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface Workload {
  daily: string; // HH:MM format
  weekly: string; // HH:MM format
  monthly: string; // HH:MM format
  break: string; // HH:MM format
  shiftStart?: string; // HH:MM format
}

export interface NightShift {
  active: boolean;
  start: string; // HH:MM format
  end: string; // HH:MM format
  multiplier: number; // e.g., 1.2 for 20% increase
}

export interface BankOfHours {
  active: boolean;
  initialBalance: number; // hours
}

export interface UserSettings {
  id?: string;
  user_id: string;
  notifications: boolean;
  notification_prefs: NotificationPreferences;
  theme: 'light' | 'dark' | 'system';
  color_palette: string;
  vacation_mode: VacationMode;
  workload: Workload;
  tolerance: number; // minutes
  night_shift: NightShift;
  bank_of_hours: BankOfHours;
  total_balance_view: 'day' | 'week' | 'month';
  week_start: 'sunday' | 'monday';
  created_at?: string;
  updated_at?: string;
}

// ============================================
// Request Types (Adjustments & Justifications)
// ============================================

export interface Request {
  id?: string;
  user_id: string;
  type: string; // 'Ajuste de Ponto', 'Justificativa de Falta', etc.
  status: 'pending' | 'approved' | 'rejected';
  request_date: string; // YYYY-MM-DD
  reason?: string;
  description?: string;
  supporting_document?: string; // URL to uploaded file in storage
  created_at?: string;
  updated_at?: string;
}

// ============================================
// Ticket/NSR Types
// ============================================

export interface Ticket {
  id?: string;
  user_id: string;
  nsr_number: string; // Non-Standard Registration number
  ticket_date: string; // YYYY-MM-DD
  ticket_time?: string; // HH:MM format
  description?: string;
  image?: string; // URL to ticket image in storage
  location?: string;
  status: 'open' | 'closed' | 'resolved';
  created_at?: string;
  updated_at?: string;
}

// ============================================
// Common Response Types
// ============================================

export interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
}

export interface QueryResult<T> {
  data: T | null;
  error: DatabaseError | null;
}

export interface ListResult<T> {
  data: T[];
  count: number;
  error: DatabaseError | null;
}

// ============================================
// Utility Types
// ============================================

export type UserID = string;
export type TableID = string;

/**
 * Pagination options for list queries
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
  page?: number;
}

/**
 * Sort configuration for queries
 */
export interface SortConfig {
  column: string;
  ascending?: boolean;
}

/**
 * Date range for filtering
 */
export interface DateRange {
  start: Date | string;
  end: Date | string;
}

// ============================================
// Storage Types
// ============================================

export interface StorageBucket {
  name:
    | 'ticket-images'
    | 'medical-certificates'
    | 'supporting-documents';
  public: boolean;
}

export interface UploadFile {
  bucket: string;
  path: string; // e.g., "user-id/filename.jpg"
  file: Blob | File;
  contentType?: string;
}

export interface UploadResult {
  path: string;
  fullPath: string;
  publicUrl?: string;
  error?: DatabaseError;
}

// ============================================
// RLS Policy Documentation
// ============================================

/**
 * Row Level Security (RLS) Validation
 * 
 * All database operations use RLS policies to ensure:
 * - SELECT: User can only see their own records (auth.uid() = user_id)
 * - INSERT: User can only create records for themselves (auth.uid() = user_id)
 * - UPDATE: User can only update their own records (auth.uid() = user_id)
 * - DELETE: User can only delete their own records (auth.uid() = user_id)
 * 
 * If you encounter "row-level security policy violation" errors:
 * 1. Ensure user is authenticated (auth.uid() is set)
 * 2. Verify user exists in profiles table
 * 3. Check user_id matches auth.uid()
 * 4. Verify RLS policies are correctly configured
 */

export const RLSDocumentation = {
  profiles: {
    description: 'User profile information',
    rlsPolicies: [
      'SELECT: auth.uid() = id',
      'INSERT: auth.uid() = id',
      'UPDATE: auth.uid() = id'
    ]
  },
  logs: {
    description: 'Time tracking records',
    rlsPolicies: [
      'SELECT: auth.uid() = user_id',
      'INSERT: auth.uid() = user_id',
      'UPDATE: auth.uid() = user_id',
      'DELETE: auth.uid() = user_id'
    ]
  },
  medical_certificates: {
    description: 'Medical absence records',
    rlsPolicies: [
      'SELECT: auth.uid() = user_id',
      'INSERT: auth.uid() = user_id',
      'UPDATE: auth.uid() = user_id'
    ]
  },
  custom_shifts: {
    description: 'Special day configurations',
    rlsPolicies: [
      'SELECT: auth.uid() = user_id',
      'INSERT: auth.uid() = user_id',
      'UPDATE: auth.uid() = user_id'
    ]
  },
  settings: {
    description: 'User preferences and configuration',
    rlsPolicies: [
      'SELECT: auth.uid() = user_id',
      'INSERT: auth.uid() = user_id',
      'UPDATE: auth.uid() = user_id'
    ]
  },
  requests: {
    description: 'Adjustment and justification requests',
    rlsPolicies: [
      'SELECT: auth.uid() = user_id',
      'INSERT: auth.uid() = user_id',
      'UPDATE: auth.uid() = user_id'
    ]
  },
  tickets: {
    description: 'Non-standard registration records',
    rlsPolicies: [
      'SELECT: auth.uid() = user_id',
      'INSERT: auth.uid() = user_id'
    ]
  }
};

// ============================================
// Type Guards
// ============================================

export function isTimeLog(obj: any): obj is TimeLog {
  return (
    typeof obj === 'object' &&
    'user_id' in obj &&
    'type' in obj &&
    'timestamp' in obj &&
    ['in', 'out', 'break_start', 'break_end', 'nsr'].includes(obj.type)
  );
}

export function isMedicalCertificate(obj: any): obj is MedicalCertificate {
  return (
    typeof obj === 'object' &&
    'user_id' in obj &&
    'date' in obj &&
    'is_full_day' in obj
  );
}

export function isCustomShift(obj: any): obj is CustomShift {
  return (
    typeof obj === 'object' &&
    'user_id' in obj &&
    'date_key' in obj
  );
}

export function isUserSettings(obj: any): obj is UserSettings {
  return (
    typeof obj === 'object' &&
    'user_id' in obj &&
    'notifications' in obj &&
    'theme' in obj
  );
}
