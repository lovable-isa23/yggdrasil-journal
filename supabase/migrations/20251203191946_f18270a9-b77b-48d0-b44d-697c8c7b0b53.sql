-- Add framework preference columns to user_preferences table
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS enable_theravada boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_freudian boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_jungian boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_hermetic boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_advaita boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_taoist boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_attachment boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_ifs boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_cbt boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_dbt boolean DEFAULT true;