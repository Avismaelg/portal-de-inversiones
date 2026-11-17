-- Ventaja temporal: cuándo salió el mismo hecho en un medio (solo nombre, enlace y hora; sin texto del medio).
ALTER TABLE public.news_items
  ADD COLUMN media_source       text,
  ADD COLUMN media_url          text CHECK (media_url IS NULL OR media_url ~ '^https://'),
  ADD COLUMN media_published_at timestamptz;

CREATE POLICY news_items_update_media ON public.news_items FOR UPDATE TO authenticated
  USING (app.is_staff()) WITH CHECK (app.is_staff());
GRANT UPDATE (media_source, media_url, media_published_at) ON public.news_items TO authenticated;
