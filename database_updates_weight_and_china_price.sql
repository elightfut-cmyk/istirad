ALTER TABLE platform_settings ADD COLUMN shipping_price_per_kilo NUMERIC DEFAULT 10;
ALTER TABLE platform_settings ADD COLUMN bid_window_exchange_rate NUMERIC DEFAULT 135;
ALTER TABLE custom_requests ADD COLUMN approx_weight_grams NUMERIC DEFAULT 0;
ALTER TABLE custom_requests ADD COLUMN avg_price_china NUMERIC DEFAULT 0;