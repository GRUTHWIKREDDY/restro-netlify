-- Migration to add secure staff credentials table
CREATE TABLE IF NOT EXISTS staff_credentials (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('restadmin', 'kitchen')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_credentials_email ON staff_credentials(email);
CREATE INDEX IF NOT EXISTS idx_staff_credentials_restaurant ON staff_credentials(restaurant_id);

-- Enable RLS to keep credentials safe from public frontend queries
ALTER TABLE staff_credentials ENABLE ROW LEVEL SECURITY;
