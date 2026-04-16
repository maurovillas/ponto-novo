# Ponto Novo - Database Setup Guide

## Overview

This guide explains how to set up the complete Supabase database schema for the Ponto Novo time tracking application.

## Database Architecture

The application uses **7 main tables** with **Row Level Security (RLS)** policies to ensure users can only access their own data:

### 1. **profiles** - User Information
- Stores user metadata: name, email, role, company, department, avatar, etc.
- Linked to Supabase Auth users table
- **RLS**: Users can only view/edit their own profile

### 2. **logs** - Time Tracking Records
- Captures all time registration events (in, out, break_start, break_end, nsr)
- Stores timestamp, location, coordinates, ticket images, observations
- **Indexes**: user_id, timestamp, user_id+timestamp for fast queries
- **RLS**: Users can only access their own logs

### 3. **medical_certificates** - Medical Absences (Atestados)
- Stores medical certificate uploads with dates and time ranges
- Status tracking (pending, approved, rejected)
- **Indexes**: user_id, date, user_id+date
- **RLS**: Users can only manage their own certificates

### 4. **custom_shifts** - Special Day Configurations
- Manages special days: Folga (off), Férias (vacation), Atestado (medical), Feriado (holiday), etc.
- Stores shift details, reasons, and justifications
- **Unique constraint**: One record per user per date
- **Indexes**: user_id, date_key, user_id+date_key
- **RLS**: Users can only manage their own shifts

### 5. **settings** - User Preferences
- Stores all user configuration:
  - Theme, notifications, color palette
  - Workload settings (daily, weekly, monthly hours)
  - Vacation mode, night shift settings
  - Bank of hours configuration
- **RLS**: Users can only manage their own settings

### 6. **requests** - Adjustment Requests
- Tracks point adjustments and absence justifications
- Status management (pending, approved, rejected)
- File attachments for supporting documents
- **Indexes**: user_id, status
- **RLS**: Users can only manage their own requests

### 7. **tickets** - NSR (Non-Standard Registration)
- Records non-standard time registrations with NSR numbers
- Image attachments for ticket documentation
- Status tracking (open, closed, resolved)
- **Indexes**: user_id, nsr_number
- **RLS**: Users can only manage their own tickets

## Setup Instructions

### Step 1: Access Supabase SQL Editor

1. Go to your [Supabase Project Dashboard](https://app.supabase.com)
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Execute Database Schema

1. Open [`database-schema.sql`](../database-schema.sql) from the project root
2. Copy all the SQL content
3. Paste it into the Supabase SQL Editor
4. Click **Run** to execute

The schema will:
- ✅ Create all 7 tables with proper types and constraints
- ✅ Create indexes for optimal query performance
- ✅ Enable Row Level Security (RLS) on all tables
- ✅ Create RLS policies restricting access to user's own data
- ✅ Handle dropping existing policies before recreating (safe to run multiple times)

### Step 3: Create Storage Buckets

Storage buckets cannot be created via SQL and must be created manually:

#### 3a. Create bucket: `ticket-images`
1. Go to **Storage** in the Supabase dashboard
2. Click **New Bucket**
3. Name: `ticket-images`
4. Public: **Yes** (for displaying images)
5. Create Bucket

#### 3b. Create bucket: `medical-certificates`
1. Same steps as above
2. Name: `medical-certificates`
3. Public: **No** (private, more secure)

#### 3c. Create bucket: `supporting-documents`
1. Same steps as above
2. Name: `supporting-documents`
3. Public: **No** (private)

### Step 4: Configure Storage RLS Policies (Optional but Recommended)

For each storage bucket, you can configure RLS policies to restrict access:

#### Example policy for ticket-images bucket:
```sql
-- Allow users to upload their own files
CREATE POLICY "Users can upload to their folder" ON storage.objects
  FOR INSERT 
  WITH CHECK (bucket_id = 'ticket-images' AND (auth.uid())::text = split_part(name, '/', 1));

-- Allow users to download their own files
CREATE POLICY "Users can download their files" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'ticket-images' AND (auth.uid())::text = split_part(name, '/', 1));
```

## Verification

### Check if tables were created:

```sql
-- List all public tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected output should show:
- custom_shifts
- logs
- medical_certificates
- profiles
- requests
- settings
- tickets

### Check RLS status:

```sql
-- Check RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

All should show `t` (true) for rowsecurity.

### Check RLS policies:

```sql
-- List all RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## Database Relationships

```
┌─────────────┐
│   profiles  │ (User accounts, linked to auth.users)
└──────┬──────┘
       │ id (PRIMARY KEY)
       │
       ├─→ logs (one-to-many: 1 user has many logs)
       ├─→ medical_certificates (one-to-many)
       ├─→ custom_shifts (one-to-many)
       ├─→ settings (one-to-one: unique constraint)
       ├─→ requests (one-to-many)
       └─→ tickets (one-to-many)
```

## Row Level Security (RLS) Policies

All tables implement consistent RLS policies:

- **SELECT**: `auth.uid() = user_id` - Users see only their own records
- **INSERT**: `auth.uid() = user_id` - Users create only their own records
- **UPDATE**: `auth.uid() = user_id` - Users modify only their own records
- **DELETE**: `auth.uid() = user_id` - Users delete only their own records

This ensures data isolation and prevents cross-user data access.

## Indexes for Performance

The schema includes indexes on frequently queried columns:

| Table | Indexes |
|-------|---------|
| logs | user_id, timestamp, (user_id, timestamp DESC) |
| medical_certificates | user_id, date, (user_id, date) |
| custom_shifts | user_id, date_key, (user_id, date_key) |
| requests | user_id, status |
| tickets | user_id, nsr_number |

These indexes optimize filtering and sorting operations.

## Troubleshooting

### Issue: "Policy already exists"
**Solution**: The schema script uses `DROP POLICY IF EXISTS` before creating policies, so it's safe to run multiple times.

### Issue: "Table already exists"
**Solution**: The schema script uses `CREATE TABLE IF NOT EXISTS`, so it won't fail on existing tables.

### Issue: "Permission denied for schema public"
**Solution**: Make sure you're using a Supabase account with admin access to the project.

### Issue: RLS blocking writes
**Solution**: 
1. Ensure RLS is enabled correctly
2. Check that auth.uid() is returning a value
3. Verify the user exists in profiles table
4. Check browser console for detailed error messages

## API Documentation

### Upload to Storage

```typescript
// Upload ticket image
const { data, error } = await supabase.storage
  .from('ticket-images')
  .upload(`${userId}/${Date.now()}.jpg`, imageBlob);

// Get URL
if (data) {
  const url = supabase.storage
    .from('ticket-images')
    .getPublicUrl(data.path).data.publicUrl;
}
```

### Query User's Logs

```typescript
// Fetch all logs for current user
const { data, error } = await supabase
  .from('logs')
  .select('*')
  .eq('user_id', userId)
  .order('timestamp', { ascending: false });
```

### Insert New Log

```typescript
// Create new time tracking entry
const { data, error } = await supabase
  .from('logs')
  .insert({
    user_id: userId,
    type: 'in',
    timestamp: new Date().toISOString(),
    location: 'Office',
    observations: 'Regular entry'
  });
```

## Related Files

- [`database-schema.sql`](../database-schema.sql) - Complete SQL schema
- [`app/api/setup-database/route.ts`](../app/api/setup-database/route.ts) - Setup API endpoint
- [`app/supabase.ts`](../app/supabase.ts) - Supabase client initialization

## Support

For issues or questions about the database:
- Check the [Supabase Documentation](https://supabase.com/docs)
- Review RLS policies for permission issues
- Check browser console for detailed error messages
