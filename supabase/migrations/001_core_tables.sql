-- Core Tables for kCodeIT Restaurant SaaS
-- Run this in Supabase SQL Editor

-- 1. Restaurants (tenants)
CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  locked_by_super_admin BOOLEAN DEFAULT false,
  total_tables INTEGER NOT NULL DEFAULT 8,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geofence_radius_meters DOUBLE PRECISION DEFAULT 150,
  verification_pin TEXT DEFAULT '',
  floors JSONB DEFAULT '[]'::jsonb,
  admin_username TEXT,
  admin_password TEXT,
  chef_username TEXT,
  chef_password TEXT,
  lock_all_items BOOLEAN DEFAULT false,
  disable_qr_generation BOOLEAN DEFAULT false,
  hide_history_older_than_one_day BOOLEAN DEFAULT false,
  disable_admin_portal BOOLEAN DEFAULT false,
  disable_kds_portal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE restaurants;

-- 2. Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true,
  is_limited_time_offer BOOLEAN DEFAULT false,
  offer_details TEXT DEFAULT '',
  promo_value NUMERIC(10, 2) DEFAULT 0,
  is_veg BOOLEAN DEFAULT true,
  avg_rating NUMERIC(3, 2),
  ratings_count INTEGER DEFAULT 0,
  image_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;

-- 3. Orders
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  user_phone TEXT DEFAULT '',
  user_name TEXT NOT NULL DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'rejected')),
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  released BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  geofence_verified BOOLEAN DEFAULT false,
  geofence_distance NUMERIC(10, 2),
  user_latitude DOUBLE PRECISION,
  user_longitude DOUBLE PRECISION,
  requires_handshake BOOLEAN DEFAULT false,
  handshake_code TEXT,
  handshake_approved BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- 4. Dine-in Users (renamed from 'users' to avoid reserved word)
CREATE TABLE IF NOT EXISTS dine_in_users (
  phone TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  global_order_history JSONB DEFAULT '[]'::jsonb,
  rated_dishes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE dine_in_users;

-- 5. Buzzers (waiter service requests)
CREATE TABLE IF NOT EXISTS buzzers (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buzzers_restaurant ON buzzers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_buzzers_status ON buzzers(status);
ALTER PUBLICATION supabase_realtime ADD TABLE buzzers;
