CREATE FUNCTION app.handle_new_auth_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_org uuid;
BEGIN
  SELECT o.id INTO v_org
    FROM public.organizations o
   WHERE o.org_type = 'tenant'
   ORDER BY o.created_at, o.id
   LIMIT 1;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'no tenant organization exists: create the tenant organization before the first signup';
  END IF;
  INSERT INTO public.users (id, organization_id, email, role)
  VALUES (NEW.id, v_org, COALESCE(NULLIF(btrim(NEW.email), ''), NEW.id::text || '@no-email.invalid'), 'viewer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION app.handle_new_auth_user();
