-- Enable realtime for chatter_daily_hours table
ALTER TABLE chatter_daily_hours REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE chatter_daily_hours;