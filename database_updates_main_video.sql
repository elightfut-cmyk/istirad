ALTER TABLE platform_settings
ADD COLUMN IF NOT EXISTS main_video_title text DEFAULT 'فيديو تعريفي',
ADD COLUMN IF NOT EXISTS main_video_url text,
ADD COLUMN IF NOT EXISTS main_video_description text DEFAULT 'شاهد هذا الفيديو لتتعرف أكثر على خدماتنا',
ADD COLUMN IF NOT EXISTS main_video_active boolean DEFAULT false;
