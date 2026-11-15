SET search_path = public, extensions;
CREATE FUNCTION app.subject_published(p_type entity_type, p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE p_type
    WHEN 'event'       THEN EXISTS (SELECT 1 FROM public.economic_events e WHERE e.id = p_id AND e.publication_status = 'published')
    WHEN 'opportunity' THEN EXISTS (SELECT 1 FROM public.investment_opportunities o WHERE o.id = p_id AND o.publication_status = 'published')
    WHEN 'project'     THEN EXISTS (SELECT 1 FROM public.projects p WHERE p.id = p_id AND p.publication_status = 'published')
    WHEN 'permit'      THEN EXISTS (SELECT 1 FROM public.permits p WHERE p.id = p_id AND p.publication_status = 'published')
    WHEN 'tender'      THEN EXISTS (SELECT 1 FROM public.public_tenders t WHERE t.id = p_id AND t.publication_status = 'published')
    WHEN 'contract'    THEN EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = p_id AND c.publication_status = 'published')
    WHEN 'instrument'  THEN EXISTS (SELECT 1 FROM public.financial_instruments i WHERE i.id = p_id AND i.publication_status = 'published')
    WHEN 'organization' THEN EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = p_id AND o.publication_status = 'published')
    ELSE true      -- sector, location, document: referencia pública
  END
$$;
CREATE FUNCTION app.evidence_parent_published(
  p_opp uuid, p_event uuid, p_project uuid, p_permit uuid,
  p_tender uuid, p_contract uuid, p_instrument uuid, p_auction uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE
    WHEN p_opp        IS NOT NULL THEN app.subject_published('opportunity', p_opp)
    WHEN p_event      IS NOT NULL THEN app.subject_published('event', p_event)
    WHEN p_project    IS NOT NULL THEN app.subject_published('project', p_project)
    WHEN p_permit     IS NOT NULL THEN app.subject_published('permit', p_permit)
    WHEN p_tender     IS NOT NULL THEN app.subject_published('tender', p_tender)
    WHEN p_contract   IS NOT NULL THEN app.subject_published('contract', p_contract)
    WHEN p_instrument IS NOT NULL THEN app.subject_published('instrument', p_instrument)
    WHEN p_auction    IS NOT NULL THEN EXISTS (
      SELECT 1 FROM public.instrument_auctions a WHERE a.id = p_auction AND a.publication_status = 'published')
    ELSE false
  END
$$;
CREATE FUNCTION app.orphan_relationships() RETURNS SETOF entity_relationships
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT r.* FROM public.entity_relationships r
  WHERE NOT (
    CASE r.from_type
      WHEN 'organization' THEN EXISTS (SELECT 1 FROM public.organizations   x WHERE x.id = r.from_id)
      WHEN 'project'      THEN EXISTS (SELECT 1 FROM public.projects        x WHERE x.id = r.from_id)
      WHEN 'permit'       THEN EXISTS (SELECT 1 FROM public.permits         x WHERE x.id = r.from_id)
      WHEN 'tender'       THEN EXISTS (SELECT 1 FROM public.public_tenders  x WHERE x.id = r.from_id)
      WHEN 'contract'     THEN EXISTS (SELECT 1 FROM public.contracts       x WHERE x.id = r.from_id)
      WHEN 'instrument'   THEN EXISTS (SELECT 1 FROM public.financial_instruments x WHERE x.id = r.from_id)
      WHEN 'event'        THEN EXISTS (SELECT 1 FROM public.economic_events x WHERE x.id = r.from_id)
      WHEN 'opportunity'  THEN EXISTS (SELECT 1 FROM public.investment_opportunities x WHERE x.id = r.from_id)
      WHEN 'sector'       THEN EXISTS (SELECT 1 FROM public.sectors         x WHERE x.id = r.from_id)
      WHEN 'location'     THEN EXISTS (SELECT 1 FROM public.geographic_locations x WHERE x.id = r.from_id)
      WHEN 'document'     THEN EXISTS (SELECT 1 FROM public.source_documents x WHERE x.id = r.from_id)
    END
    AND
    CASE r.to_type
      WHEN 'organization' THEN EXISTS (SELECT 1 FROM public.organizations   x WHERE x.id = r.to_id)
      WHEN 'project'      THEN EXISTS (SELECT 1 FROM public.projects        x WHERE x.id = r.to_id)
      WHEN 'permit'       THEN EXISTS (SELECT 1 FROM public.permits         x WHERE x.id = r.to_id)
      WHEN 'tender'       THEN EXISTS (SELECT 1 FROM public.public_tenders  x WHERE x.id = r.to_id)
      WHEN 'contract'     THEN EXISTS (SELECT 1 FROM public.contracts       x WHERE x.id = r.to_id)
      WHEN 'instrument'   THEN EXISTS (SELECT 1 FROM public.financial_instruments x WHERE x.id = r.to_id)
      WHEN 'event'        THEN EXISTS (SELECT 1 FROM public.economic_events x WHERE x.id = r.to_id)
      WHEN 'opportunity'  THEN EXISTS (SELECT 1 FROM public.investment_opportunities x WHERE x.id = r.to_id)
      WHEN 'sector'       THEN EXISTS (SELECT 1 FROM public.sectors         x WHERE x.id = r.to_id)
      WHEN 'location'     THEN EXISTS (SELECT 1 FROM public.geographic_locations x WHERE x.id = r.to_id)
      WHEN 'document'     THEN EXISTS (SELECT 1 FROM public.source_documents x WHERE x.id = r.to_id)
    END
  )
$$;
REVOKE ALL ON FUNCTION app.orphan_relationships() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.orphan_relationships() TO service_role;
CREATE TABLE watchlists (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- se borran con la cuenta (RN-11)
  list_name    text NOT NULL DEFAULT 'default',
  entity_type  entity_type NOT NULL CHECK (entity_type IN
                 ('organization', 'project', 'permit', 'tender', 'contract', 'instrument', 'event', 'opportunity')),
  entity_id    uuid NOT NULL,
  private_note text,                           -- solo visible para el dueño
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT watchlists_item_uq UNIQUE (user_id, list_name, entity_type, entity_id)
);
CREATE INDEX watchlists_entity_idx ON watchlists (entity_type, entity_id);
CREATE TRIGGER watchlists_touch BEFORE UPDATE ON watchlists
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TABLE user_alert_preferences (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  entity_types entity_type[] NOT NULL DEFAULT '{}',
  sector_ids   uuid[] NOT NULL DEFAULT '{}',
  location_ids uuid[] NOT NULL DEFAULT '{}',
  keywords     text[] NOT NULL DEFAULT '{}',
  min_confidence smallint CHECK (min_confidence BETWEEN 0 AND 100),
  channels     alert_channel[] NOT NULL DEFAULT '{in_app}' CHECK (cardinality(channels) > 0),
  frequency    alert_frequency NOT NULL DEFAULT 'immediate',
  tender_deadline_days integer[] NOT NULL DEFAULT '{7,3,1}',     -- ventanas propuestas (RF-D-09)
  instrument_maturity_days integer[] NOT NULL DEFAULT '{30,7}',  -- [PENDIENTE] valores
  is_paused    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_alert_preferences_name_uq UNIQUE (user_id, name)
);
CREATE TRIGGER user_alert_preferences_touch BEFORE UPDATE ON user_alert_preferences
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TABLE notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preference_id uuid REFERENCES user_alert_preferences(id) ON DELETE SET NULL,
  entity_type   entity_type NOT NULL,
  entity_id     uuid NOT NULL,
  reason        text NOT NULL,                 -- new_event, tender_deadline, status_change, ...
  title         text NOT NULL,
  body          text,
  priority      smallint NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  channel       alert_channel NOT NULL DEFAULT 'in_app',
  status        notification_status NOT NULL DEFAULT 'pending',  -- 'superseded' solo lo fija el servidor (B-019)
  dedup_key     text NOT NULL CHECK (btrim(dedup_key) <> ''),
  attempts      integer NOT NULL DEFAULT 0,
  error         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  delivered_at  timestamptz,
  read_at       timestamptz,
  superseded_at timestamptz,                   -- B-019: contenido despublicado
  CONSTRAINT notifications_dedup_uq UNIQUE (user_id, channel, dedup_key),
  CONSTRAINT notifications_superseded_consistent
    CHECK ((status = 'superseded') = (superseded_at IS NOT NULL))
);
CREATE INDEX notifications_inbox_idx ON notifications (user_id, created_at DESC);
CREATE INDEX notifications_pending_idx ON notifications (created_at) WHERE status = 'pending';
CREATE FUNCTION app.notifications_mark_read() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.read_at IS NOT NULL AND OLD.read_at IS NULL AND NEW.status = 'delivered' THEN
    NEW.status := 'read';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER notifications_mark_read BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION app.notifications_mark_read();
CREATE FUNCTION app.supersede_notifications() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF OLD.publication_status = 'published' AND NEW.publication_status <> 'published' THEN
    UPDATE public.notifications
       SET status = 'superseded',
           superseded_at = now(),
           title = 'Contenido no disponible',
           body = NULL,
           error = NULL
     WHERE entity_type = TG_ARGV[0]::public.entity_type
       AND entity_id = NEW.id
       AND status <> 'superseded';
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER economic_events_supersede_notifications
  AFTER UPDATE ON economic_events
  FOR EACH ROW EXECUTE FUNCTION app.supersede_notifications('event');
CREATE TRIGGER opportunities_supersede_notifications
  AFTER UPDATE ON investment_opportunities
  FOR EACH ROW EXECUTE FUNCTION app.supersede_notifications('opportunity');
CREATE TABLE audit_logs (
  id              bigint GENERATED ALWAYS AS IDENTITY,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  actor_kind      actor_kind NOT NULL DEFAULT 'user',
  actor_user_id   uuid,                        -- SIN FK: se conserva tras borrar la cuenta
  actor_org_id    uuid,
  actor_role      user_role,
  action          text NOT NULL,               -- INSERT | UPDATE | DELETE | login | role_change | publish ...
  table_name      text,
  row_id          text,
  old_data        jsonb,
  new_data        jsonb,
  request_id      text,
  ip_address      inet,                        -- dato personal: retención corta [PENDIENTE LEGAL]
  user_agent      text,
  PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);
CREATE TABLE audit_logs_2026_11 PARTITION OF audit_logs FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE audit_logs_2026_12 PARTITION OF audit_logs FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
CREATE TABLE audit_logs_default PARTITION OF audit_logs DEFAULT;
ALTER TABLE audit_logs_2026_11   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_2026_12   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_default   ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON audit_logs_2026_11, audit_logs_2026_12, audit_logs_default
  FROM PUBLIC, anon, authenticated;
CREATE FUNCTION app.create_audit_partition(p_month date) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_start date := date_trunc('month', p_month)::date;
  v_end   date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_name  text := format('audit_logs_%s', to_char(date_trunc('month', p_month), 'YYYY_MM'));
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.audit_logs FOR VALUES FROM (%L) TO (%L)',
    v_name, v_start, v_end);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_name);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', v_name);
  RETURN v_name;
END $$;
REVOKE ALL ON FUNCTION app.create_audit_partition(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.create_audit_partition(date) TO service_role;
CREATE INDEX audit_logs_table_row_idx ON audit_logs (table_name, row_id, occurred_at DESC);
CREATE INDEX audit_logs_actor_idx     ON audit_logs (actor_user_id, occurred_at DESC);
CREATE INDEX audit_logs_org_idx       ON audit_logs (actor_org_id, occurred_at DESC);
CREATE FUNCTION app.audit_logs_block_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END $$;
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION app.audit_logs_block_mutation();
CREATE FUNCTION app.audit_row_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_uid  uuid := app.current_user_id();
  v_row  jsonb := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  v_old  jsonb := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END;
  v_new  jsonb := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END;
BEGIN
  IF TG_TABLE_NAME = 'users' THEN
    v_old := v_old - 'email' - 'display_name' - 'consent_accepted_at' - 'consent_version';
    v_new := v_new - 'email' - 'display_name' - 'consent_accepted_at' - 'consent_version';
  END IF;
  INSERT INTO public.audit_logs
    (actor_kind, actor_user_id, actor_org_id, actor_role, action, table_name, row_id, old_data, new_data, request_id)
  VALUES (
    CASE WHEN v_uid IS NULL THEN 'service'::public.actor_kind ELSE 'user'::public.actor_kind END,
    v_uid, app.current_org_id(), app.current_user_role(),
    TG_OP, TG_TABLE_NAME, v_row ->> 'id',
    v_old,
    v_new,
    NULLIF(current_setting('app.request_id', true), '')
  );
  RETURN NULL;   -- AFTER trigger
END $$;
CREATE TRIGGER audit_users                  AFTER INSERT OR UPDATE OR DELETE ON users                    FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();
CREATE TRIGGER audit_organizations          AFTER INSERT OR UPDATE OR DELETE ON organizations            FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();
CREATE TRIGGER audit_sources                AFTER INSERT OR UPDATE OR DELETE ON sources                  FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();
CREATE TRIGGER audit_economic_events        AFTER INSERT OR UPDATE OR DELETE ON economic_events          FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();
CREATE TRIGGER audit_projects               AFTER INSERT OR UPDATE OR DELETE ON projects                 FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();
CREATE TRIGGER audit_permits                AFTER INSERT OR UPDATE OR DELETE ON permits                  FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();
CREATE TRIGGER audit_public_tenders         AFTER INSERT OR UPDATE OR DELETE ON public_tenders           FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();
CREATE TRIGGER audit_contracts              AFTER INSERT OR UPDATE OR DELETE ON contracts                FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();
CREATE TRIGGER audit_financial_instruments  AFTER INSERT OR UPDATE OR DELETE ON financial_instruments    FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();
CREATE TRIGGER audit_instrument_auctions    AFTER INSERT OR UPDATE OR DELETE ON instrument_auctions      FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();
CREATE TRIGGER audit_investment_opps        AFTER INSERT OR UPDATE OR DELETE ON investment_opportunities FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();
CREATE TRIGGER audit_entity_relationships   AFTER INSERT OR UPDATE OR DELETE ON entity_relationships     FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();
CREATE FUNCTION app.set_user_role(p_target uuid, p_role user_role) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_role public.user_role := app.current_user_role();
  v_actor_org  uuid := app.current_org_id();
  v_target_org uuid;
BEGIN
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('org_admin', 'platform_admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT organization_id INTO v_target_org FROM public.users WHERE id = p_target;
  IF v_target_org IS NULL THEN
    RAISE EXCEPTION 'target user not found';
  END IF;
  IF v_actor_role = 'org_admin' AND (v_target_org <> v_actor_org OR p_role = 'platform_admin') THEN
    RAISE EXCEPTION 'org_admin cannot manage other organizations nor grant platform_admin';
  END IF;
  UPDATE public.users SET role = p_role WHERE id = p_target;   -- queda en audit_logs por el trigger
END $$;
REVOKE ALL ON FUNCTION app.set_user_role(uuid, public.user_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.set_user_role(uuid, public.user_role) TO authenticated;
CREATE FUNCTION app.pseudonymize_user(p_target uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_target) THEN
    RAISE EXCEPTION 'target user not found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.users
              WHERE id = p_target AND pseudonymized_at IS NOT NULL) THEN
    RETURN;   -- idempotente
  END IF;
  UPDATE public.users
     SET email = 'deleted+' || p_target::text || '@invalid.local',
         display_name = 'Revisor eliminado',
         locale = 'es-DO',
         timezone = 'America/Santo_Domingo',
         theme = 'system',
         consent_accepted_at = NULL,
         consent_version = NULL,
         is_active = false,
         deleted_at = COALESCE(deleted_at, now()),
         pseudonymized_at = now()
   WHERE id = p_target;
  DELETE FROM public.watchlists             WHERE user_id = p_target;
  DELETE FROM public.user_alert_preferences WHERE user_id = p_target;
  DELETE FROM public.notifications          WHERE user_id = p_target;
END $$;
REVOKE ALL ON FUNCTION app.pseudonymize_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.pseudonymize_user(uuid) TO service_role;
