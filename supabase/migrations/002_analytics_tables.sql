-- Analytics Tables for kCodeIT Restaurant SaaS
-- Run this AFTER 001_core_tables.sql

-- 6. Daily Summaries
CREATE TABLE IF NOT EXISTS daily_summaries (
  id TEXT PRIMARY KEY,  -- restaurantId_YYYY-MM-DD
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  total_revenue NUMERIC(12, 2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  avg_ticket_size NUMERIC(10, 2) DEFAULT 0,
  total_discount NUMERIC(10, 2) DEFAULT 0,
  discount_percent NUMERIC(5, 2) DEFAULT 0,
  top_items JSONB DEFAULT '[]'::jsonb,
  labor_cost NUMERIC(10, 2) DEFAULT 0,
  orders_by_hour JSONB DEFAULT '{}'::jsonb,
  orders_by_status JSONB DEFAULT '{"pending":0,"accepted":0,"completed":0,"rejected":0}'::jsonb,
  payment_breakdown JSONB DEFAULT '{"upi":0,"card":0,"cash":0,"wallet":0}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_summaries_restaurant ON daily_summaries(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date);

-- 7. Staff Shifts
CREATE TABLE IF NOT EXISTS staff_shifts (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  staff_id TEXT DEFAULT '',
  staff_name TEXT NOT NULL,
  role TEXT DEFAULT '',
  shift_start TIMESTAMPTZ NOT NULL,
  shift_end TIMESTAMPTZ NOT NULL,
  actual_end TIMESTAMPTZ,
  hourly_rate NUMERIC(10, 2) DEFAULT 0,
  total_hours NUMERIC(5, 2) DEFAULT 0,
  orders_handled INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_staff_shifts_restaurant ON staff_shifts(restaurant_id);

-- 8. Inventory
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'pieces',
  current_stock NUMERIC(10, 2) DEFAULT 0,
  par_level NUMERIC(10, 2) DEFAULT 0,
  cost_per_unit NUMERIC(10, 2) DEFAULT 0,
  supplier_id TEXT DEFAULT '',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_restaurant ON inventory(restaurant_id);

-- 9. Waste Logs
CREATE TABLE IF NOT EXISTS waste_logs (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  ingredient_id TEXT DEFAULT '',
  ingredient_name TEXT NOT NULL,
  quantity_wasted NUMERIC(10, 2) DEFAULT 0,
  unit TEXT DEFAULT 'kg',
  reason TEXT DEFAULT '',
  cost NUMERIC(10, 2) DEFAULT 0,
  logged_by TEXT DEFAULT '',
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waste_logs_restaurant ON waste_logs(restaurant_id);

-- 10. Recipes
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_item_id TEXT NOT NULL,
  menu_item_name TEXT NOT NULL,
  ingredients JSONB DEFAULT '[]'::jsonb,
  yield_qty NUMERIC(5, 2) DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_recipes_restaurant ON recipes(restaurant_id);

-- 11. Customer Profiles
CREATE TABLE IF NOT EXISTS customer_profiles (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  phone TEXT DEFAULT '',
  device_fingerprint TEXT DEFAULT '',
  first_visit TIMESTAMPTZ,
  last_visit TIMESTAMPTZ,
  visit_count INTEGER DEFAULT 0,
  total_spend NUMERIC(12, 2) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_restaurant ON customer_profiles(restaurant_id);

-- 12. Feedback Responses
CREATE TABLE IF NOT EXISTS feedback_responses (
  id TEXT PRIMARY KEY,
  order_id TEXT DEFAULT '',
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  sentiment_label TEXT DEFAULT 'neutral' CHECK (sentiment_label IN ('positive', 'neutral', 'negative')),
  theme_tags JSONB DEFAULT '[]'::jsonb,
  actionable BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_restaurant ON feedback_responses(restaurant_id);

-- 13. KDS Events
CREATE TABLE IF NOT EXISTS kds_events (
  id TEXT PRIMARY KEY,
  order_id TEXT DEFAULT '',
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('received', 'started', 'completed', 'sent')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  staff_id TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_kds_events_restaurant ON kds_events(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_kds_events_order ON kds_events(order_id);
