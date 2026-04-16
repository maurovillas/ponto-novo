# Ponto Novo Database Setup Checklist

Complete this checklist to fully set up the Ponto Novo database.

## ✅ Pre-Setup Requirements

- [ ] Supabase project created and accessible
- [ ] Environment variables configured (.env.local):
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` set correctly
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set correctly
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` set (for server operations)
- [ ] You have write access to the Supabase project
- [ ] Authentication is working (users can sign in)

## 📊 Database Schema Setup

### Step 1: Execute SQL Schema

- [ ] Open Supabase Dashboard → SQL Editor
- [ ] Create new query
- [ ] Copy content from `database-schema.sql`
- [ ] Execute the query
- [ ] Verify no errors in execution

### Step 2: Verify Tables Created

- [ ] Run verification query in SQL Editor:
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' ORDER BY table_name;
  ```
- [ ] Confirm all 7 tables exist:
  - [ ] `profiles`
  - [ ] `logs`
  - [ ] `medical_certificates`
  - [ ] `custom_shifts`
  - [ ] `settings`
  - [ ] `requests`
  - [ ] `tickets`

### Step 3: Verify RLS Policies

- [ ] Run RLS verification query:
  ```sql
  SELECT schemaname, tablename, policyname 
  FROM pg_policies WHERE schemaname = 'public' 
  ORDER BY tablename, policyname;
  ```
- [ ] Verify each table has at least 3 policies (SELECT, INSERT, UPDATE minimum)

## 💾 Storage Buckets Setup

### Create Storage Buckets (via Dashboard)

- [ ] Navigate to Storage in Supabase Dashboard

#### Bucket 1: ticket-images
- [ ] Create new bucket named: `ticket-images`
- [ ] Set to **Public** (✓ Public)
- [ ] Click Create Bucket
- [ ] Verify it appears in bucket list

#### Bucket 2: medical-certificates
- [ ] Create new bucket named: `medical-certificates`
- [ ] Set to **Private** (☐ Public unchecked)
- [ ] Click Create Bucket
- [ ] Verify it appears in bucket list

#### Bucket 3: supporting-documents
- [ ] Create new bucket named: `supporting-documents`
- [ ] Set to **Private** (☐ Public unchecked)
- [ ] Click Create Bucket
- [ ] Verify it appears in bucket list

## 🔐 Security Configuration

### RLS Policies

- [ ] All table RLS policies created successfully
- [ ] Row-level security enabled on all tables
- [ ] Test RLS by attempting to query another user's data (should fail)

### Storage Security

- [ ] Configure storage CORS settings if needed
- [ ] Test file uploads with bucket restrictions

## 🧪 Testing & Verification

### Application Level Tests

- [ ] User authentication works
- [ ] User can create profile
- [ ] User can create time log entry
- [ ] User can upload ticket image
- [ ] User can create medical certificate
- [ ] User can update settings
- [ ] User can create request
- [ ] User can manage custom shifts

### Data Isolation Tests

- [ ] User A cannot see User B's logs
- [ ] User A cannot see User B's certificates
- [ ] User A cannot modify User B's settings
- [ ] Storage files are properly isolated

### API Tests

- [ ] GET /api/setup-database returns setup instructions
- [ ] Time logs are queryable with proper filtering
- [ ] Medical certificates can be CRUD'd
- [ ] Settings persist correctly

## 📝 Application Configuration

### Environment Variables

- [ ] Copy `.env.example` to `.env.local` (if not done)
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Restart development server

### Database Types

- [ ] Import types from `app/types/database.ts` in components
- [ ] Use TypeScript interfaces for type safety
- [ ] Follow RLS documentation when querying

## 🚀 Deployment Preparation

- [ ] Database schema documented in `DATABASE_SETUP.md`
- [ ] README updated with database setup instructions
- [ ] `.env` template created (`.env.example`)
- [ ] Type definitions reviewed and validated
- [ ] All RLS policies working as expected
- [ ] Storage buckets accessible and tested
- [ ] Performance indexes verified via Supabase Dashboard

## 📋 Git Commits

- [ ] Commit database schema file: `database-schema.sql`
- [ ] Commit setup documentation: `DATABASE_SETUP.md`
- [ ] Commit TypeScript types: `app/types/database.ts`
- [ ] Commit setup API endpoint: `app/api/setup-database/route.ts`
- [ ] Commit this checklist: `DATABASE_SETUP_CHECKLIST.md`

## 🔗 Related Documentation

- **Setup Guide**: [`DATABASE_SETUP.md`](./DATABASE_SETUP.md)
- **Schema File**: [`database-schema.sql`](./database-schema.sql)
- **Type Definitions**: [`app/types/database.ts`](./app/types/database.ts)
- **API Endpoint**: [`app/api/setup-database/route.ts`](./app/api/setup-database/route.ts)

## ❓ Troubleshooting

### Issue: "CREATE TABLE" fails with permission denied

**Solution**: Ensure you're using a role with sufficient permissions. Use the Supabase project admin account.

### Issue: RLS policies not working (permission denied errors)

**Solution**: 
1. Verify user is authenticated: `console.log(auth.user())`
2. Check user exists in profiles table
3. Ensure user_id matches auth.uid()
4. Look at browser Network tab for detailed error

### Issue: Table exists but no data appears

**Solution**:
- Check RLS policies are correct
- Verify user is authenticated
- Test query with: `SELECT * FROM logs WHERE user_id = auth.uid()`

### Issue: File upload fails to storage

**Solution**:
1. Verify bucket exists and is created
2. Check bucket public/private settings match your use case
3. Verify bucket name is exactly correct
4. Check storage RLS policies if configured

## ✨ Success Indicators

Your database is correctly set up when:
- ✅ All 7 tables exist in the database
- ✅ All RLS policies are active
- ✅ All 3 storage buckets are created
- ✅ Users can perform CRUD operations on their own data
- ✅ Users cannot see other users' data
- ✅ File uploads succeed to correct buckets
- ✅ Application loads without database errors
- ✅ Settings persist correctly
- ✅ Multiple concurrent users work without conflicts

## 📞 Support

If you encounter issues:
1. Check Supabase project status page
2. Review browser console for error messages
3. Check Supabase dashboard Logs section
4. Refer to [`DATABASE_SETUP.md`](./DATABASE_SETUP.md) troubleshooting section
5. Consult [Supabase Documentation](https://supabase.com/docs)

---

**Last Updated**: 2024
**Status**: Ready for Production
