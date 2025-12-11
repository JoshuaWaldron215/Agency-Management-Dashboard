-- Add profile image support to models table
ALTER TABLE public.models ADD COLUMN image_url text;

-- Create storage bucket for model images
INSERT INTO storage.buckets (id, name, public)
VALUES ('model-images', 'model-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for model images
CREATE POLICY "Model images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'model-images');

CREATE POLICY "Admins can upload model images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'model-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update model images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'model-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete model images"
ON storage.objects FOR DELETE
USING (bucket_id = 'model-images' AND has_role(auth.uid(), 'admin'::app_role));