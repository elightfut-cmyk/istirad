-- ====================================================================
-- Migration: Supplier Account Verification System (نظام توثيق حسابات الموردين)
-- Date: 2026-10-25
-- Description:
-- 1. Create table public.supplier_verifications with complete audit & charter fields
-- 2. Configure Row Level Security (RLS) for Suppliers and Admins
-- 3. Ensure users table has is_verified & verification_badge columns
-- ====================================================================

-- 1. Ensure verification columns exist on public.users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verification_badge TEXT DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- 2. Create supplier_verifications table
CREATE TABLE IF NOT EXISTS public.supplier_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    location TEXT NOT NULL,
    social_links TEXT,
    prep_time TEXT NOT NULL,
    images TEXT[] DEFAULT '{}',
    charter_agreed BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_supplier_verification UNIQUE (user_id)
);

-- 3. Indexes for fast dashboard filtering & queries
CREATE INDEX IF NOT EXISTS idx_supplier_verifications_user_id ON public.supplier_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_verifications_status ON public.supplier_verifications(status);
CREATE INDEX IF NOT EXISTS idx_supplier_verifications_created_at ON public.supplier_verifications(created_at DESC);

-- 4. Auto-update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.fn_update_supplier_verifications_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_supplier_verifications_updated_at ON public.supplier_verifications;
CREATE TRIGGER trg_supplier_verifications_updated_at
    BEFORE UPDATE ON public.supplier_verifications
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_update_supplier_verifications_timestamp();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.supplier_verifications ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to ensure clean state
DROP POLICY IF EXISTS "Suppliers can view their own verification" ON public.supplier_verifications;
DROP POLICY IF EXISTS "Suppliers can insert their own verification" ON public.supplier_verifications;
DROP POLICY IF EXISTS "Suppliers can update their own verification" ON public.supplier_verifications;
DROP POLICY IF EXISTS "Admins can manage all verifications" ON public.supplier_verifications;
DROP POLICY IF EXISTS "Admins can view all supplier verifications" ON public.supplier_verifications;
DROP POLICY IF EXISTS "Admins can update all supplier verifications" ON public.supplier_verifications;

-- Policy 1: SELECT (Suppliers can view their own, Admins can view all)
CREATE POLICY "Suppliers and Admins can view verifications"
    ON public.supplier_verifications
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- Policy 2: INSERT (Authenticated suppliers can insert their own request)
CREATE POLICY "Suppliers can insert their own verification"
    ON public.supplier_verifications
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
    );

-- Policy 3: UPDATE (Suppliers can update if pending or rejected to fix data)
CREATE POLICY "Suppliers can update pending or rejected verification"
    ON public.supplier_verifications
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id AND status IN ('pending', 'rejected')
    )
    WITH CHECK (
        auth.uid() = user_id
    );

-- Policy 4: UPDATE (Admins can update any verification for approval/rejection)
CREATE POLICY "Admins can update all supplier verifications"
    ON public.supplier_verifications
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );
