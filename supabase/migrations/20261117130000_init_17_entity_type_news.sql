-- Las noticias de fuentes primarias pueden ser sujeto de notificaciones y de ejecuciones de IA.
-- Va sola: un valor nuevo de enum no puede usarse en la misma transacción que lo crea.
ALTER TYPE public.entity_type ADD VALUE IF NOT EXISTS 'news';
