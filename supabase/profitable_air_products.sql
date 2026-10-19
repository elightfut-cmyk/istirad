-- ====================================================================
-- JIIBHA PLATFORM: PROFITABLE AIR FREIGHT PRODUCTS (أمثلة منتجات الشحن الجوي)
-- ====================================================================
-- This script documents the structure and default data stored in platform_policies
-- with policy_type = 'PROFITABLE_AIR_PRODUCTS'.

-- 1. Ensure platform_policies has an upsert index on policy_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'platform_policies' 
    AND indexname = 'platform_policies_policy_type_unique'
  ) THEN
    ALTER TABLE IF EXISTS platform_policies 
    ADD CONSTRAINT platform_policies_policy_type_unique UNIQUE (policy_type);
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- 2. Query the current active profitable air products
SELECT 
  id,
  policy_type,
  updated_at,
  json_array_length(content::json) as total_products
FROM platform_policies
WHERE policy_type = 'PROFITABLE_AIR_PRODUCTS';

-- 3. RLS policy to ensure public read access
ALTER TABLE platform_policies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'platform_policies' 
    AND policyname = 'Public can read platform policies'
  ) THEN
    CREATE POLICY "Public can read platform policies" 
    ON platform_policies FOR SELECT 
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'platform_policies' 
    AND policyname = 'Admins can manage platform policies'
  ) THEN
    CREATE POLICY "Admins can manage platform policies" 
    ON platform_policies FOR ALL 
    TO authenticated 
    USING (
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
      )
    );
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;
