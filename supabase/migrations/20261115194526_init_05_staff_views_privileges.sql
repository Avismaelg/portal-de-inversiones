SET search_path = public, extensions;
CREATE VIEW public.staff_economic_events AS
  SELECT e.* FROM public.economic_events e WHERE app.is_staff();
CREATE VIEW public.staff_investment_opportunities AS
  SELECT o.* FROM public.investment_opportunities o WHERE app.is_staff();
CREATE VIEW public.staff_verification_records AS
  SELECT v.* FROM public.verification_records v WHERE app.is_staff();
CREATE VIEW public.staff_users AS
  SELECT u.id, u.organization_id, u.display_name, u.role, u.is_active,
         u.deleted_at, u.pseudonymized_at
    FROM public.users u
   WHERE app.is_staff()
     AND (app.is_platform_admin() OR u.organization_id = app.current_org_id());
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
  app.current_user_id(), app.current_user_role(), app.current_org_id(),
  app.is_staff(), app.is_manager(), app.is_org_admin(), app.is_platform_admin(),
  app.subject_published(entity_type, uuid),
  app.evidence_parent_published(uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid)
  TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;   -- identidad de audit_logs
GRANT SELECT ON sectors, geographic_locations, organizations, sources,
                projects, permits, public_tenders, contracts,
                financial_instruments, instrument_auctions,
                evidence, entity_relationships
  TO authenticated;
GRANT SELECT (id, title, summary, event_kind, primary_source_document_id, organization_id,
              sector_id, location_id, occurred_at, published_at, timezone_assumed, detected_at,
              verification_status, verification_reason, verification_checked_at, reviewed_at,
              publisher_role, released_at, publication_status, trust_layer,
              classification_confidence, ai_run_id, dedup_key, merged_into_id, is_demo,
              search_vector, created_at, updated_at)
  ON economic_events TO authenticated;
GRANT SELECT (id, opportunity_type, title, description, originating_event_id, sector_id,
              location_id, estimated_capital, capital_currency, capital_basis,
              participation_requirements, risks, horizon_value, horizon_unit, confidence,
              confidence_explanation, next_steps, trust_layer, publication_status,
              reviewed_at, publisher_role, published_at, version, supersedes_id, ai_run_id,
              dedup_key, is_demo, search_vector, created_at, updated_at)
  ON investment_opportunities TO authenticated;
GRANT SELECT (id, subject_type, subject_id, check_type, result, reasons, ai_run_id,
              reviewer_role, created_at)
  ON verification_records TO authenticated;
REVOKE ALL ON staff_economic_events, staff_investment_opportunities,
              staff_verification_records, staff_users
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON staff_economic_events, staff_investment_opportunities,
                staff_verification_records, staff_users
  TO authenticated;
GRANT SELECT (id, source_id, external_id, canonical_url, final_url, content_hash, mime_type,
              byte_size, ingest_method, title, language, published_at, detected_at,
              source_updated_at, terms_version, redistribution_allowed, parse_status,
              supersedes_id, is_demo, created_at)
  ON source_documents TO authenticated;
GRANT INSERT, UPDATE ON organizations, projects, permits, public_tenders, contracts,
                       financial_instruments, instrument_auctions, investment_opportunities,
                       evidence, entity_relationships
  TO authenticated;
GRANT INSERT ON verification_records TO authenticated;      -- revisión humana
GRANT INSERT (title, summary, event_kind, primary_source_document_id, organization_id, sector_id,
              location_id, occurred_at, published_at, timezone_assumed, classification_confidence,
              dedup_key, trust_layer, is_demo)
  ON economic_events TO authenticated;
GRANT UPDATE (title, summary, event_kind, organization_id, sector_id, location_id, occurred_at,
              published_at, timezone_assumed, classification_confidence, merged_into_id,
              publication_status, reviewed_by, review_notes)
  ON economic_events TO authenticated;
GRANT SELECT ON users TO authenticated;
GRANT UPDATE (display_name, locale, timezone, theme, consent_accepted_at, consent_version)
  ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON watchlists, user_alert_preferences TO authenticated;
GRANT SELECT ON notifications TO authenticated;
GRANT UPDATE (read_at) ON notifications TO authenticated;
GRANT SELECT ON ingestion_jobs, ai_analysis_runs TO authenticated;
GRANT SELECT ON audit_logs TO authenticated;
