CREATE OR REPLACE FUNCTION app.users_org_must_be_tenant() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = NEW.organization_id AND o.org_type = 'tenant') THEN
    RAISE EXCEPTION 'users.organization_id must reference an organization of type tenant';
  END IF;
  RETURN NEW;
END $$;
ALTER FUNCTION app.touch_updated_at() SET search_path = '';
ALTER FUNCTION app.current_user_id() SET search_path = '';
ALTER FUNCTION app.source_documents_immutable() SET search_path = '';
ALTER FUNCTION app.audit_logs_block_mutation() SET search_path = '';
