-- Add columns for the Custom Window / Cards Slider
ALTER TABLE platform_settings
ADD COLUMN IF NOT EXISTS custom_window_cards JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS custom_window_active BOOLEAN DEFAULT true;

-- Add columns for News Ticker
ALTER TABLE platform_settings
ADD COLUMN IF NOT EXISTS news_ticker_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS news_ticker_active BOOLEAN DEFAULT true;

-- Add columns for YouTube Playlist/Video
ALTER TABLE platform_settings
ADD COLUMN IF NOT EXISTS youtube_playlist_url TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS youtube_playlist_active BOOLEAN DEFAULT false;
