-- Add cancellation_reason to custom_requests
ALTER TABLE custom_requests ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Create admin_suggestions table
CREATE TABLE IF NOT EXISTS admin_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('مهم وعاجل', 'مهم وغير عاجل', 'غير مهم وعاجل', 'غير مهم وغير عاجل')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_suggestions ENABLE ROW LEVEL SECURITY;

-- Admins can view all suggestions
CREATE POLICY "Admins can view suggestions" 
    ON admin_suggestions FOR SELECT 
    USING (EXISTS(SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Admins can insert suggestions
CREATE POLICY "Admins can insert suggestions" 
    ON admin_suggestions FOR INSERT 
    WITH CHECK (EXISTS(SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin') AND admin_id = auth.uid());

-- All Admins can update any suggestion (per user request)
CREATE POLICY "Admins can update suggestions" 
    ON admin_suggestions FOR UPDATE 
    USING (EXISTS(SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- All Admins can delete any suggestion (per user request)
CREATE POLICY "Admins can delete suggestions" 
    ON admin_suggestions FOR DELETE 
    USING (EXISTS(SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
