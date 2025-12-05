-- Add soft delete support to users table
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Partial index for active (non-deleted) users - improves query performance
CREATE INDEX idx_users_active ON users(id) WHERE deleted_at IS NULL;
