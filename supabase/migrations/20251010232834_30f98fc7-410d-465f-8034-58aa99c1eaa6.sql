-- Add color column to shift_slots table
ALTER TABLE shift_slots ADD COLUMN color text;

-- Add a comment to describe the column
COMMENT ON COLUMN shift_slots.color IS 'Color for the shift cell (e.g., green, yellow, purple, red, or hex value)';