SET search_path = public, extensions;
ALTER TABLE users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_jobs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE permits                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_tenders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_instruments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE instrument_auctions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic_locations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_relationships     ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists               ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_alert_preferences   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_runs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs               ENABLE ROW LEVEL SECURITY;
CREATE POLICY sectors_read ON sectors FOR SELECT TO authenticated USING (true);
CREATE POLICY geo_read     ON geographic_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY sources_read ON sources FOR SELECT TO authenticated USING (true);   -- sin secretos en esta tabla
CREATE POLICY users_select ON users FOR SELECT TO authenticated
  USING (
    id = app.current_user_id()
    OR (app.is_org_admin() AND organization_id = app.current_org_id())
    OR app.is_platform_admin()
  );
CREATE POLICY users_update_self ON users FOR UPDATE TO authenticated
  USING (id = app.current_user_id())
  WITH CHECK (id = app.current_user_id());
CREATE POLICY organizations_select ON organizations FOR SELECT TO authenticated
  USING (
    (org_type <> 'tenant' AND (publication_status = 'published' OR app.is_staff()))
    OR id = app.current_org_id()
    OR app.is_platform_admin()
  );
CREATE POLICY organizations_insert ON organizations FOR INSERT TO authenticated
  WITH CHECK (app.is_staff() AND org_type <> 'tenant');
CREATE POLICY organizations_update ON organizations FOR UPDATE TO authenticated
  USING (app.is_staff() AND org_type <> 'tenant')
  WITH CHECK (app.is_staff() AND org_type <> 'tenant');
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'economic_events', 'projects', 'permits', 'public_tenders', 'contracts',
    'financial_instruments', 'instrument_auctions', 'entity_relationships'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (publication_status = ''published'' OR app.is_staff())',
      t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (app.is_staff())',
      t || '_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (app.is_staff()) WITH CHECK (app.is_staff())',
      t || '_update', t);
  END LOOP;
END $$;
CREATE POLICY opportunities_select ON investment_opportunities FOR SELECT TO authenticated
  USING (publication_status = 'published' OR app.is_staff());
CREATE POLICY opportunities_insert ON investment_opportunities FOR INSERT TO authenticated
  WITH CHECK (app.is_staff() AND publication_status <> 'published');
CREATE POLICY opportunities_update ON investment_opportunities FOR UPDATE TO authenticated
  USING (app.is_staff() AND (publication_status <> 'published' OR app.is_manager()))
  WITH CHECK (app.is_staff() AND (publication_status <> 'published' OR app.is_manager()));
CREATE POLICY evidence_select ON evidence FOR SELECT TO authenticated
  USING (
    app.is_staff()
    OR app.evidence_parent_published(opportunity_id, event_id, project_id, permit_id,
                                     tender_id, contract_id, instrument_id, auction_id)
  );
CREATE POLICY evidence_insert ON evidence FOR INSERT TO authenticated
  WITH CHECK (app.is_staff());
CREATE POLICY evidence_update ON evidence FOR UPDATE TO authenticated
  USING (app.is_staff()) WITH CHECK (app.is_staff());
CREATE POLICY verification_select ON verification_records FOR SELECT TO authenticated
  USING (app.is_staff() OR app.subject_published(subject_type, subject_id));
CREATE POLICY verification_insert ON verification_records FOR INSERT TO authenticated
  WITH CHECK (app.is_staff() AND check_type = 'human_review' AND reviewer_id = app.current_user_id());
CREATE POLICY source_documents_select ON source_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY ingestion_jobs_select ON ingestion_jobs FOR SELECT TO authenticated
  USING (app.is_org_admin());
CREATE POLICY ai_runs_select ON ai_analysis_runs FOR SELECT TO authenticated
  USING (app.is_staff());
CREATE POLICY watchlists_owner ON watchlists FOR ALL TO authenticated
  USING (user_id = app.current_user_id()) WITH CHECK (user_id = app.current_user_id());
CREATE POLICY alert_prefs_owner ON user_alert_preferences FOR ALL TO authenticated
  USING (user_id = app.current_user_id()) WITH CHECK (user_id = app.current_user_id());
CREATE POLICY notifications_select_own ON notifications FOR SELECT TO authenticated
  USING (user_id = app.current_user_id());
CREATE POLICY notifications_update_own ON notifications FOR UPDATE TO authenticated
  USING (user_id = app.current_user_id()) WITH CHECK (user_id = app.current_user_id());
CREATE POLICY audit_logs_select ON audit_logs FOR SELECT TO authenticated
  USING (
    app.is_platform_admin()
    OR (app.is_org_admin() AND actor_org_id = app.current_org_id())
  );
