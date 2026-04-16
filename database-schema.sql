-- =====================================================
-- Ponto Novo - Complete Database Schema Setup
-- =====================================================
-- This SQL script creates all necessary tables and policies
-- for the Ponto Novo time tracking application.
-- Execute this in the Supabase SQL Editor
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. PROFILES TABLE (User information)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  email VARCHAR(255),
  role VARCHAR(100),
  company VARCHAR(255),
  department VARCHAR(255),
  avatar VARCHAR(500),
  registration_number VARCHAR(50),
  cpf VARCHAR(20),
  matricula VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. LOGS TABLE (Time tracking records)
-- ============================================
CREATE TABLE IF NOT EXISTS public.logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'in', 'out', 'break_start', 'break_end', 'nsr'
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  location VARCHAR(255),
  coords JSONB, -- {latitude: number, longitude: number}
  ticket_image VARCHAR(1000), -- URL to uploaded image in storage
  observations VARCHAR(500),
  nsr VARCHAR(100), -- NSR number if applicable
  worked_ms INTEGER, -- milliseconds worked
  note VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT valid_log_type CHECK (type IN ('in', 'out', 'break_start', 'break_end', 'nsr'))
);

-- Create indexes for logs
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON public.logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON public.logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_user_timestamp ON public.logs(user_id, timestamp DESC);

-- Enable RLS for logs
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own logs" ON public.logs;
DROP POLICY IF EXISTS "Users can insert their own logs" ON public.logs;
DROP POLICY IF EXISTS "Users can update their own logs" ON public.logs;
DROP POLICY IF EXISTS "Users can delete their own logs" ON public.logs;

-- Create policies for logs
CREATE POLICY "Users can view their own logs" ON public.logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own logs" ON public.logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own logs" ON public.logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own logs" ON public.logs
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 3. MEDICAL_CERTIFICATES TABLE (Atestados médicos)
-- ============================================
CREATE TABLE IF NOT EXISTS public.medical_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_full_day BOOLEAN DEFAULT true,
  start_time TIME,
  end_time TIME,
  image VARCHAR(1000), -- URL to uploaded certificate image
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create indexes for medical certificates
CREATE INDEX IF NOT EXISTS idx_medical_certs_user_id ON public.medical_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_certs_date ON public.medical_certificates(date);
CREATE INDEX IF NOT EXISTS idx_medical_certs_user_date ON public.medical_certificates(user_id, date);

-- Enable RLS for medical certificates
ALTER TABLE public.medical_certificates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own certificates" ON public.medical_certificates;
DROP POLICY IF EXISTS "Users can insert their own certificates" ON public.medical_certificates;
DROP POLICY IF EXISTS "Users can update their own certificates" ON public.medical_certificates;

-- Create policies for medical certificates
CREATE POLICY "Users can view their own certificates" ON public.medical_certificates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own certificates" ON public.medical_certificates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own certificates" ON public.medical_certificates
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 4. CUSTOM_SHIFTS TABLE (Special day configurations)
-- ============================================
CREATE TABLE IF NOT EXISTS public.custom_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_key VARCHAR(10) NOT NULL, -- YYYY-MM-DD format
  is_off BOOLEAN DEFAULT false,
  is_holiday BOOLEAN DEFAULT false,
  is_vacation BOOLEAN DEFAULT false,
  is_medical BOOLEAN DEFAULT false,
  is_training BOOLEAN DEFAULT false,
  is_absence BOOLEAN DEFAULT false,
  is_manual_adjustment BOOLEAN DEFAULT false,
  is_different_workload BOOLEAN DEFAULT false,
  shift VARCHAR(100), -- e.g., "09:00 - 18:00" or "Folga"
  reason VARCHAR(255),
  justification TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(user_id, date_key)
);

-- Create indexes for custom shifts
CREATE INDEX IF NOT EXISTS idx_custom_shifts_user_id ON public.custom_shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_shifts_date_key ON public.custom_shifts(date_key);
CREATE INDEX IF NOT EXISTS idx_custom_shifts_user_date ON public.custom_shifts(user_id, date_key);

-- Enable RLS for custom shifts
ALTER TABLE public.custom_shifts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own shifts" ON public.custom_shifts;
DROP POLICY IF EXISTS "Users can insert their own shifts" ON public.custom_shifts;
DROP POLICY IF EXISTS "Users can update their own shifts" ON public.custom_shifts;

-- Create policies for custom shifts
CREATE POLICY "Users can view their own shifts" ON public.custom_shifts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shifts" ON public.custom_shifts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shifts" ON public.custom_shifts
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 5. SETTINGS TABLE (User preferences and configurations)
-- ============================================
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  notifications BOOLEAN DEFAULT true,
  notification_prefs JSONB DEFAULT '{"alerts": true, "reminders": true, "system": true}'::jsonb,
  theme VARCHAR(50) DEFAULT 'system', -- 'light', 'dark', 'system'
  color_palette VARCHAR(50) DEFAULT 'default', -- custom color themes
  vacation_mode JSONB DEFAULT '{"active": false, "startDate": "", "endDate": ""}'::jsonb,
  workload JSONB DEFAULT '{"daily": "08:00", "weekly": "44:00", "monthly": "176:00", "break": "01:00"}'::jsonb,
  tolerance INTEGER DEFAULT 10, -- tolerance in minutes
  night_shift JSONB DEFAULT '{"active": false, "start": "22:00", "end": "05:00", "multiplier": 1.2}'::jsonb,
  bank_of_hours JSONB DEFAULT '{"active": false, "initialBalance": 0}'::jsonb,
  total_balance_view VARCHAR(50) DEFAULT 'week', -- 'day', 'week', 'month'
  week_start VARCHAR(10) DEFAULT 'sunday', -- 'sunday' or 'monday'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS for settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.settings;

-- Create policies for settings
CREATE POLICY "Users can view their own settings" ON public.settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON public.settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON public.settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 6. REQUESTS TABLE (Adjustment and justification requests)
-- ============================================
CREATE TABLE IF NOT EXISTS public.requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL, -- 'Ajuste de Ponto', 'Justificativa de Falta', etc.
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  request_date DATE NOT NULL,
  reason TEXT,
  description TEXT,
  supporting_document VARCHAR(1000), -- URL to uploaded proof
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create indexes for requests
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON public.requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests(status);

-- Enable RLS for requests
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can insert their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON public.requests;

-- Create policies for requests
CREATE POLICY "Users can view their own requests" ON public.requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own requests" ON public.requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own requests" ON public.requests
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 7. TICKETS/NSR TABLE (Non-standard registrations)
-- ============================================
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nsr_number VARCHAR(100) NOT NULL,
  ticket_date DATE NOT NULL,
  ticket_time TIME,
  description TEXT,
  image VARCHAR(1000), -- URL to ticket image
  location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'closed', 'resolved'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create indexes for tickets
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_nsr_number ON public.tickets(nsr_number);

-- Enable RLS for tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can insert their own tickets" ON public.tickets;

-- Create policies for tickets
CREATE POLICY "Users can view their own tickets" ON public.tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tickets" ON public.tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- END OF SCHEMA
-- ============================================
-- 
-- STORAGE BUCKETS NEEDED (must be created via Supabase Dashboard):
-- 1. ticket-images: for time log ticket images
-- 2. medical-certificates: for medical certificate images  
-- 3. supporting-documents: for request supporting documents
--
-- To create storage buckets:
-- 1. Go to Supabase Dashboard
-- 2. Navigate to Storage
-- 3. Click "New Bucket" for each bucket name above
-- 4. Configure RLS policies as needed
-- ============================================
