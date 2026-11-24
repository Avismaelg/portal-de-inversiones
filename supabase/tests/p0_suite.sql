-- =============================================================================
-- Suite P0 (guardias, RLS y privilegios) — AviTech Investment Intelligence
-- Consolidada el 2026-11-15 a partir de los scripts ejecutados contra Supabase
-- `xzlwrlgjsdymcidlmqew`. NO modifica nada: cada bloque DO termina con un
-- RAISE EXCEPTION que revierte la transacción y devuelve el informe en el mensaje.
--
-- Uso: ejecutar CADA bloque DO por separado (SQL Editor o MCP execute_sql) en un
-- entorno de pruebas con el esquema aplicado. El resultado aparece como un error
-- "RESULTADOS (revertido)". Compara cada línea con el texto "esperado".
-- Requisitos: ejecutar como `postgres` (puede hacer SET ROLE y escribir en auth.users).
-- Estado: los bloques A, B y C se ejecutaron el 2026-11-15 con el esquema de las migraciones 01–09 y dieron el resultado esperado en todas las líneas (los textos de A y B se pegaron con comentarios abreviados; la lógica es la misma);
-- una ejecución del archivo íntegro desde cero queda pendiente (no hay psql ni CLI en esta máquina; se ejecuta con el MCP o el SQL Editor).
-- =============================================================================

-- ------------------------------ BLOQUE A: eventos ----------------------------
DO $$
DECLARE
  res text := '';
  tn uuid := '00000000-0000-0000-0000-0000000000a1';
  m  uuid := '00000000-0000-0000-0000-0000000000b1';
  a  uuid := '00000000-0000-0000-0000-0000000000b2';
  v  uuid := '00000000-0000-0000-0000-0000000000b3';
  s  uuid := '00000000-0000-0000-0000-0000000000c1';
  d  uuid := '00000000-0000-0000-0000-0000000000c2';
  e2 uuid; e3 uuid; n int; st text;
BEGIN
  -- El trigger on_auth_user_created (migración 09) crea la fila de users; por eso la
  -- organización tenant debe existir ANTES de insertar en auth.users, y se actualiza el rol después.
  INSERT INTO organizations (id, org_type, legal_name) VALUES (tn,'tenant','Tenant de prueba');
  INSERT INTO auth.users (id, email) VALUES (m,'m@test.invalid'),(a,'a@test.invalid'),(v,'v@test.invalid');
  UPDATE users SET role = 'opportunity_manager' WHERE id = m;
  UPDATE users SET role = 'analyst' WHERE id = a;
  INSERT INTO sources (id, code, name, base_url, allowed_hosts, access_method) VALUES (s,'test_src','Fuente de prueba','https://example.invalid',ARRAY['example.invalid'],'manual');
  INSERT INTO source_documents (id, source_id, canonical_url, content_hash) VALUES (d, s, 'https://example.invalid/d', repeat('b',64));

  BEGIN
    INSERT INTO economic_events (title, primary_source_document_id, dedup_key, verification_status, publication_status)
    VALUES ('E-p0-01', d, repeat('1',64), 'partially_verified', 'published');
    res := res || E'P0-01 INESPERADO: se publicó\n';
  EXCEPTION WHEN others THEN res := res || 'P0-01 OK (esperado error de gestor humano): ' || SQLERRM || E'\n'; END;

  INSERT INTO economic_events (title, primary_source_document_id, dedup_key, verification_status, publication_status)
  VALUES ('E-p0-02', d, repeat('2',64), 'verified', 'published') RETURNING id INTO e2;
  SELECT (released_at IS NOT NULL)::text || '/reviewed_by=' || coalesce(reviewed_by::text,'NULL') INTO st FROM economic_events WHERE id = e2;
  res := res || 'P0-02 (esperado true/reviewed_by=NULL): ' || st || E'\n';

  BEGIN
    INSERT INTO economic_events (title, primary_source_document_id, dedup_key, verification_status, publication_status)
    VALUES ('E-p0-03', d, repeat('3',64), 'pending', 'published');
    res := res || E'P0-03 INESPERADO\n';
  EXCEPTION WHEN others THEN res := res || 'P0-03 OK (esperado: pending nunca se publica): ' || SQLERRM || E'\n'; END;

  INSERT INTO economic_events (title, primary_source_document_id, dedup_key, verification_status, publication_status)
  VALUES ('E-p0-04', d, repeat('4',64), 'partially_verified', 'in_review') RETURNING id INTO e3;

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE economic_events SET publication_status='published', reviewed_by=a WHERE id = e3;
    GET DIAGNOSTICS n = ROW_COUNT;
    RESET ROLE;
    res := res || 'P0-04 INESPERADO: filas=' || n || E'\n';
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'P0-04 OK (esperado: analista no publica): ' || SQLERRM || E'\n'; END;

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', m)::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE economic_events SET publication_status='published', reviewed_by=a WHERE id = e3;
    RESET ROLE;
    res := res || E'P0-05 INESPERADO\n';
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'P0-05 OK (esperado: reviewed_by debe ser quien actúa): ' || SQLERRM || E'\n'; END;

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', m)::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE economic_events SET publication_status='published', reviewed_by=m WHERE id = e3;
    GET DIAGNOSTICS n = ROW_COUNT;
    RESET ROLE;
    SELECT publisher_role::text || '/released=' || (released_at IS NOT NULL) || '/reviewed_at=' || (reviewed_at IS NOT NULL) INTO st FROM economic_events WHERE id = e3;
    res := res || 'P0-06 (esperado filas=1 opportunity_manager/released=true/reviewed_at=true): filas=' || n || ' ' || st || E'\n';
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'P0-06 FALLÓ: ' || SQLERRM || E'\n'; END;

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE economic_events SET verification_status='verified' WHERE id = e3;
    RESET ROLE;
    res := res || E'P0-08 INESPERADO\n';
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'P0-08 OK (esperado: permiso denegado): ' || SQLERRM || E'\n'; END;

  BEGIN
    UPDATE economic_events SET review_notes='cambio' WHERE id = e3;
    res := res || E'P0-09 INESPERADO\n';
  EXCEPTION WHEN others THEN res := res || 'P0-09 OK (esperado: inmutable): ' || SQLERRM || E'\n'; END;

  INSERT INTO notifications (user_id, entity_type, entity_id, reason, title, body, status, dedup_key)
  VALUES (v, 'event', e3, 'new_event', 'Nuevo evento', 'cuerpo', 'delivered', 'k1');
  UPDATE economic_events SET publication_status='in_review' WHERE id = e3;
  SELECT nn.status::text || '/' || nn.title || '/body=' || coalesce(nn.body,'NULL') || '/released=' || coalesce(ev.released_at::text,'NULL')
    INTO st FROM notifications nn, economic_events ev WHERE nn.entity_id = e3 AND ev.id = e3;
  res := res || 'P0-16 (esperado superseded/Contenido no disponible/body=NULL/released=NULL): ' || st || E'\n';

  BEGIN
    INSERT INTO verification_records (subject_type, subject_id, check_type, result, reasons)
    VALUES ('event', e2, 'contradiction', 'disputed', '["amount_mismatch"]'::jsonb);
    SELECT publication_status::text || '/' || verification_status::text || '/released=' || coalesce(released_at::text,'NULL') INTO st FROM economic_events WHERE id = e2;
    res := res || 'P0-07 (esperado in_review/disputed/released=NULL): ' || st || E'\n';
  EXCEPTION WHEN others THEN res := res || 'P0-07 FALLÓ: ' || SQLERRM || E'\n'; END;

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', m)::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE economic_events SET publication_status='published', reviewed_by=m WHERE id = e2;
    RESET ROLE;
    SELECT publication_status::text || '/' || verification_status::text || '/' || publisher_role::text INTO st FROM economic_events WHERE id = e2;
    res := res || 'P0-06b (esperado published/disputed/opportunity_manager): ' || st || E'\n';
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'P0-06b FALLÓ: ' || SQLERRM || E'\n'; END;

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v)::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO n FROM economic_events WHERE publication_status <> 'published';
    res := res || 'P0-10 viewer ve no publicados (esperado 0): ' || n || E'\n';
    SELECT count(*) INTO n FROM economic_events;
    res := res || '   viewer ve publicados (esperado 1): ' || n || E'\n';
    BEGIN
      PERFORM review_notes FROM economic_events;
      res := res || E'P0-12 INESPERADO\n';
    EXCEPTION WHEN others THEN res := res || 'P0-12 OK (esperado: permiso denegado): ' || SQLERRM || E'\n'; END;
    SELECT count(*) INTO n FROM staff_economic_events;
    res := res || 'P0-13 viewer en staff_economic_events (esperado 0): ' || n || E'\n';
    RESET ROLE;
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'viewer-tests FALLÓ: ' || SQLERRM || E'\n'; END;
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO n FROM staff_economic_events;
    res := res || 'P0-13 analista en staff_economic_events (esperado 2): ' || n || E'\n';
    RESET ROLE;
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'analyst-view FALLÓ: ' || SQLERRM || E'\n'; END;

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v)::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE notifications SET status='read' WHERE user_id = v;
    RESET ROLE;
    res := res || E'P0-20 INESPERADO\n';
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'P0-20 OK (esperado: permiso denegado): ' || SQLERRM || E'\n'; END;

  BEGIN
    SET LOCAL ROLE anon;
    PERFORM 1 FROM sectors;
    RESET ROLE;
    res := res || E'ANON INESPERADO\n';
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'ANON sin acceso OK: ' || SQLERRM || E'\n'; END;

  PERFORM set_config('request.jwt.claims', '', true);   -- limpiar el JWT simulado (si no, el siguiente INSERT hereda el actor)
  INSERT INTO watchlists (user_id, entity_type, entity_id, private_note) VALUES (m, 'event', e3, 'nota privada');
  PERFORM app.pseudonymize_user(m);
  SELECT email || '/' || is_active || '/watchlists=' || (SELECT count(*) FROM watchlists WHERE user_id = m) INTO st FROM users WHERE id = m;
  res := res || 'P0-18 (esperado deleted+...@invalid.local/false/watchlists=0): ' || st || E'\n';
  BEGIN
    DELETE FROM users WHERE id = m;
    res := res || E'P0-18b INESPERADO: borró al revisor\n';
  EXCEPTION WHEN others THEN res := res || 'P0-18b OK (esperado RESTRICT): ' || left(SQLERRM, 90) || E'\n'; END;
  SELECT count(*) INTO n FROM audit_logs WHERE table_name='users' AND (old_data ? 'email' OR new_data ? 'email');
  res := res || 'P0-18c audit_logs de users con email (esperado 0): ' || n || E'\n';

  BEGIN
    INSERT INTO investment_opportunities (opportunity_type, title, description, originating_event_id, dedup_key, publication_status, confidence, confidence_explanation, reviewed_by, reviewed_at, publisher_role, published_at)
    VALUES ('services','t','d', e2, repeat('9',64), 'published', 50, 'x', a, now(), 'analyst', now());
    res := res || E'OPP INESPERADO\n';
  EXCEPTION WHEN others THEN res := res || 'OPP worker no publica OK: ' || SQLERRM || E'\n'; END;

  RAISE EXCEPTION E'RESULTADOS A (revertido):\n%', res;
END $$;

-- ------------------------ BLOQUE B: oportunidades, roles, vistas --------------
DO $$
DECLARE
  res text := '';
  tn uuid := '00000000-0000-0000-0000-0000000000a1';
  t2 uuid := '00000000-0000-0000-0000-0000000000a2';
  m  uuid := '00000000-0000-0000-0000-0000000000b1';
  a  uuid := '00000000-0000-0000-0000-0000000000b2';
  v  uuid := '00000000-0000-0000-0000-0000000000b3';
  pa uuid := '00000000-0000-0000-0000-0000000000b4';
  a2 uuid := '00000000-0000-0000-0000-0000000000b5';
  s  uuid := '00000000-0000-0000-0000-0000000000c1';
  d  uuid := '00000000-0000-0000-0000-0000000000c2';
  e1 uuid; op uuid; n int; st text;
BEGIN
  -- Con el trigger de alta (migración 09), los usuarios se crean con rol viewer en el PRIMER tenant.
  -- t2 se crea después y a2 se inserta en users directamente (con FK a auth.users ya creado).
  INSERT INTO organizations (id, org_type, legal_name) VALUES (tn,'tenant','Tenant 1');
  INSERT INTO auth.users (id, email) VALUES (m,'m@t.invalid'),(a,'a@t.invalid'),(v,'v@t.invalid'),(pa,'pa@t.invalid');
  INSERT INTO organizations (id, org_type, legal_name) VALUES (t2,'tenant','Tenant 2');
  INSERT INTO auth.users (id, email) VALUES (a2,'a2@t.invalid');
  UPDATE users SET role='opportunity_manager', display_name='Manager Uno' WHERE id = m;
  UPDATE users SET role='analyst', display_name='Analista Uno' WHERE id = a;
  UPDATE users SET role='viewer', display_name='Viewer Uno' WHERE id = v;
  UPDATE users SET role='platform_admin', display_name='Admin Plat' WHERE id = pa;
  UPDATE users SET organization_id = t2, role='analyst', display_name='Analista Dos' WHERE id = a2;
  INSERT INTO sources (id, code, name, base_url, allowed_hosts, access_method) VALUES (s,'test_src','F','https://example.invalid',ARRAY['example.invalid'],'manual');
  INSERT INTO source_documents (id, source_id, canonical_url, content_hash, extracted_text, storage_path) VALUES (d, s, 'https://example.invalid/d', repeat('b',64), 'texto secreto', 'ruta/x');
  INSERT INTO economic_events (title, primary_source_document_id, dedup_key, verification_status, publication_status)
    VALUES ('E1', d, repeat('1',64), 'verified', 'published') RETURNING id INTO e1;
  INSERT INTO evidence (event_id, source_document_id, claim_field, quote, quote_hash, literal_verified)
    VALUES (e1, d, 'title', 'cita', repeat('c',64), true);

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO verification_records (subject_type, subject_id, check_type, result, reviewer_id, reviewer_role)
      VALUES ('event', e1, 'human_review', 'verified', a, 'platform_admin');
    RESET ROLE;
    SELECT reviewer_role::text INTO st FROM verification_records WHERE check_type='human_review';
    res := res || 'P0-15 (esperado analyst, aunque el cliente diga platform_admin): ' || st || E'\n';
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'P0-15 FALLÓ: ' || SQLERRM || E'\n'; END;
  PERFORM set_config('request.jwt.claims', '', true);   -- sin actor: debe rechazarse
  BEGIN
    INSERT INTO verification_records (subject_type, subject_id, check_type, result, reviewer_id)
      VALUES ('event', e1, 'human_review', 'verified', a);
    res := res || E'P0-15b INESPERADO: human_review sin actor humano\n';
  EXCEPTION WHEN others THEN res := res || 'P0-15b OK (esperado CHECK): ' || left(SQLERRM, 80) || E'\n'; END;
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v)::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO n FROM verification_records;
    BEGIN PERFORM reviewer_id FROM verification_records; res := res || E'P0-14 INESPERADO reviewer_id legible\n';
    EXCEPTION WHEN others THEN res := res || 'P0-14 viewer ve verification_records=' || n || ' (esperado 1), reviewer_id denegado OK' || E'\n'; END;
    RESET ROLE;
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'P0-14 FALLÓ: ' || SQLERRM || E'\n'; END;

  INSERT INTO investment_opportunities (opportunity_type, title, description, originating_event_id, dedup_key, confidence, confidence_explanation)
    VALUES ('services','O1','desc', e1, repeat('9',64), 60, 'x') RETURNING id INTO op;
  INSERT INTO evidence (opportunity_id, source_document_id, claim_field, quote, quote_hash, literal_verified)
    VALUES (op, d, 'need', 'cita2', repeat('d',64), true);
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', m)::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE investment_opportunities SET publication_status='published', reviewed_by=m WHERE id = op;
    RESET ROLE;
    SELECT publication_status::text || '/' || publisher_role::text || '/published_at=' || (published_at IS NOT NULL) INTO st FROM investment_opportunities WHERE id = op;
    res := res || 'OPP (esperado published/opportunity_manager/published_at=true): ' || st || E'\n';
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'OPP gestor FALLÓ: ' || SQLERRM || E'\n'; END;
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', m)::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE investment_opportunities SET review_notes='x' WHERE id = op;
    RESET ROLE;
    res := res || E'P0-19 INESPERADO\n';
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'P0-19 OK (esperado inmutable): ' || SQLERRM || E'\n'; END;
  PERFORM set_config('request.jwt.claims', '', true);
  UPDATE investment_opportunities SET publication_status='rejected' WHERE id = op;
  SELECT coalesce(published_at::text,'NULL') INTO st FROM investment_opportunities WHERE id = op;
  res := res || 'P0-25 (esperado NULL): ' || st || E'\n';

  BEGIN
    INSERT INTO investment_opportunities (opportunity_type, title, description, originating_event_id, dedup_key, confidence, confidence_explanation)
      VALUES ('supply','O2','desc', e1, repeat('8',64), 60, 'x') RETURNING id INTO op;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', m)::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE investment_opportunities SET publication_status='published', reviewed_by=m WHERE id = op;
    RESET ROLE;
    res := res || E'OPP-sin-evidencia INESPERADO\n';
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'OPP sin evidencia no se publica OK: ' || SQLERRM || E'\n'; END;

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v)::text, true);
    SET LOCAL ROLE authenticated; SELECT count(*) INTO n FROM staff_users; RESET ROLE;
    res := res || 'P0-21 viewer en staff_users (esperado 0): ' || n || E'\n';
    PERFORM set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
    SET LOCAL ROLE authenticated; SELECT count(*) INTO n FROM staff_users; RESET ROLE;
    res := res || 'P0-21 analista Tenant1 (esperado 4): ' || n || E'\n';
    PERFORM set_config('request.jwt.claims', json_build_object('sub', pa)::text, true);
    SET LOCAL ROLE authenticated; SELECT count(*) INTO n FROM staff_users; RESET ROLE;
    res := res || 'P0-21 platform_admin (esperado 5): ' || n || E'\n';
    PERFORM set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
    SET LOCAL ROLE authenticated;
    BEGIN PERFORM email FROM staff_users; res := res || E'P0-21 INESPERADO: email visible\n';
    EXCEPTION WHEN others THEN res := res || 'P0-21 staff_users sin columna email OK' || E'\n'; END;
    RESET ROLE;
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'P0-21 FALLÓ: ' || SQLERRM || E'\n'; END;

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v)::text, true);
    SET LOCAL ROLE authenticated;
    BEGIN PERFORM * FROM economic_events; res := res || E'P0-22 INESPERADO: SELECT * funciona\n';
    EXCEPTION WHEN others THEN res := res || 'P0-22 SELECT * denegado OK' || E'\n'; END;
    PERFORM id, title, publisher_role FROM economic_events;
    res := res || E'P0-22 columnas públicas OK\n';
    RESET ROLE;
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'P0-22 FALLÓ: ' || SQLERRM || E'\n'; END;

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v)::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO n FROM source_documents;
    BEGIN PERFORM extracted_text FROM source_documents; res := res || E'DOC INESPERADO: extracted_text legible\n';
    EXCEPTION WHEN others THEN res := res || 'DOC viewer ve ' || n || ' documento(s); extracted_text denegado OK' || E'\n'; END;
    RESET ROLE;
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'DOC FALLÓ: ' || SQLERRM || E'\n'; END;

  PERFORM set_config('request.jwt.claims', '', true);
  BEGIN
    INSERT INTO notifications (user_id, entity_type, entity_id, reason, title, status, dedup_key) VALUES (v,'event',e1,'r','t','superseded','z1');
    res := res || E'P0-23 INESPERADO\n';
  EXCEPTION WHEN others THEN res := res || 'P0-23 OK (esperado CHECK): ' || left(SQLERRM, 80) || E'\n'; END;
  INSERT INTO notifications (user_id, entity_type, entity_id, reason, title, status, dedup_key) VALUES (v,'event',e1,'r','t','delivered','z2');
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v)::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE notifications SET read_at = now() WHERE user_id = v AND dedup_key='z2';
    RESET ROLE;
    SELECT status::text INTO st FROM notifications WHERE dedup_key='z2';
    res := res || 'P0-20b read_at -> status (esperado read): ' || st || E'\n';
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'P0-20b FALLÓ: ' || SQLERRM || E'\n'; END;

  PERFORM set_config('request.jwt.claims', '', true);
  INSERT INTO watchlists (user_id, entity_type, entity_id, private_note) VALUES (a, 'event', e1, 'mi nota');
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', pa)::text, true);
    SET LOCAL ROLE authenticated; SELECT count(*) INTO n FROM watchlists; RESET ROLE;
    res := res || 'WATCHLIST platform_admin ve ajenas (esperado 0): ' || n || E'\n';
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'WATCHLIST FALLÓ: ' || SQLERRM || E'\n'; END;
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
    SET LOCAL ROLE authenticated; SELECT count(*) INTO n FROM audit_logs; RESET ROLE;
    res := res || 'AUDIT analista (esperado 0): ' || n || E'\n';
    PERFORM set_config('request.jwt.claims', json_build_object('sub', pa)::text, true);
    SET LOCAL ROLE authenticated; SELECT count(*) INTO n FROM audit_logs; RESET ROLE;
    res := res || 'AUDIT platform_admin (esperado >0): ' || n || E'\n';
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'AUDIT FALLÓ: ' || SQLERRM || E'\n'; END;
  BEGIN
    DELETE FROM audit_logs;
    res := res || E'AUDIT INESPERADO: DELETE permitido\n';
  EXCEPTION WHEN others THEN res := res || 'AUDIT append-only OK: ' || SQLERRM || E'\n'; END;

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v)::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE users SET role='platform_admin' WHERE id = v;
    RESET ROLE;
    res := res || E'ROL INESPERADO: viewer cambió su rol\n';
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'ROL viewer no cambia role OK: ' || SQLERRM || E'\n'; END;
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v)::text, true);
    SET LOCAL ROLE authenticated; PERFORM app.set_user_role(v, 'platform_admin'); RESET ROLE;
    res := res || E'ROL INESPERADO: set_user_role por viewer\n';
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'ROL set_user_role por viewer rechazado OK: ' || SQLERRM || E'\n'; END;
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', a2)::text, true);
    SET LOCAL ROLE authenticated; PERFORM app.set_user_role(a, 'viewer'); RESET ROLE;
    res := res || E'ROL INESPERADO: analista sin rol de administración\n';
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'ROL analista rechazado OK: ' || SQLERRM || E'\n'; END;
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
    SET LOCAL ROLE authenticated; SELECT count(*) INTO n FROM ingestion_jobs; RESET ROLE;
    res := res || 'JOBS analista (esperado 0): ' || n || E'\n';
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'JOBS FALLÓ: ' || SQLERRM || E'\n'; END;

  RAISE EXCEPTION E'RESULTADOS B (revertido):\n%', res;
END $$;

-- ----------------------------- BLOQUE C: alta de usuarios ---------------------
DO $$
DECLARE res text := ''; tn uuid := gen_random_uuid(); u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); u3 uuid := gen_random_uuid(); r record;
BEGIN
  BEGIN
    INSERT INTO auth.users (id, email) VALUES (u1, 'x1@t3.invalid');
    res := res || E'SIGNUP-1 INESPERADO: alta sin tenant\n';
  EXCEPTION WHEN others THEN res := res || 'SIGNUP-1 OK (esperado: se rechaza sin organización tenant): ' || left(SQLERRM, 90) || E'\n'; END;
  INSERT INTO organizations (id, org_type, legal_name) VALUES (tn, 'tenant', 'Tenant prueba');
  INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES (u2, 'x2@t3.invalid', '{"role":"platform_admin"}'::jsonb);
  SELECT role::text AS role, (organization_id = tn) AS org_ok, email, is_active INTO r FROM users WHERE id = u2;
  res := res || 'SIGNUP-2 (esperado role=viewer org_ok=t active=t; la metadata se ignora): role=' || r.role || ' org_ok=' || r.org_ok || ' active=' || r.is_active || E'\n';
  INSERT INTO auth.users (id, email) VALUES (u3, NULL);
  SELECT email INTO r FROM users WHERE id = u3;
  res := res || 'SIGNUP-3 sin email (esperado <uuid>@no-email.invalid): ' || r.email || E'\n';
  RAISE EXCEPTION E'RESULTADOS C (revertido):\n%', res;
END $$;

-- ------------------- BLOQUE D: publicación de licitaciones (migración 16) -------------------
-- Agregado 2026-11-17 (sprint de estabilización, auditoría 5.2). Se revierte al final.
-- Ejecutado el 2026-11-17 contra xzlwrlgjsdymcidlmqew: D-01..D-07 con el resultado esperado.
DO $$
DECLARE
  res text := ''; tn uuid := gen_random_uuid(); m uuid := gen_random_uuid(); a uuid := gen_random_uuid();
  v uuid := gen_random_uuid(); s uuid := gen_random_uuid(); t_flag uuid; t_clean uuid; st text; n int;
BEGIN
  INSERT INTO organizations (id, org_type, legal_name) VALUES (tn,'tenant','Tenant D');
  INSERT INTO auth.users (id, email) VALUES (m,'md@test.invalid'),(a,'ad@test.invalid'),(v,'vd@test.invalid');
  UPDATE users SET role='opportunity_manager' WHERE id=m;
  UPDATE users SET role='analyst' WHERE id=a;
  INSERT INTO sources (id, code, name, base_url, allowed_hosts, access_method) VALUES (s,'test_d','Fuente D','https://example.invalid',ARRAY['example.invalid'],'manual');

  -- D-01: el valor por defecto ya no publica.
  INSERT INTO public_tenders (source_id, external_id, process_code, title, status, data_quality_flags)
  VALUES (s,'D-1','D-1','Con bandera','unknown',ARRAY['unmapped_status:x']) RETURNING id, publication_status::text INTO t_flag, st;
  res := res || 'D-01 (esperado draft): ' || st || E'\n';
  INSERT INTO public_tenders (source_id, external_id, process_code, title, status) VALUES (s,'D-2','D-2','Limpia','open') RETURNING id INTO t_clean;

  -- D-02: sin sesión no se publica.
  BEGIN UPDATE public_tenders SET publication_status='published' WHERE id=t_clean; res := res || E'D-02 INESPERADO\n';
  EXCEPTION WHEN others THEN res := res || 'D-02 OK: ' || SQLERRM || E'\n'; END;

  -- D-03: analista (staff, no gestor) no publica, ni vía UPDATE directo como authenticated.
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE public_tenders SET publication_status='published' WHERE id=t_clean;
    RESET ROLE; res := res || E'D-03 INESPERADO\n';
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'D-03 OK: ' || SQLERRM || E'\n'; END;

  -- D-04: gestor no publica un registro con banderas sin nota.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', m)::text, true);
  BEGIN UPDATE public_tenders SET publication_status='published' WHERE id=t_flag; res := res || E'D-04 INESPERADO\n';
  EXCEPTION WHEN others THEN res := res || 'D-04 OK: ' || SQLERRM || E'\n'; END;

  -- D-05: gestor publica con nota; queda registrado responsable y fecha.
  UPDATE public_tenders SET publication_status='published', review_notes='revisado' WHERE id=t_flag;
  SELECT (reviewed_by = m)::text || '/' || (reviewed_at IS NOT NULL)::text INTO st FROM public_tenders WHERE id=t_flag;
  res := res || 'D-05 (esperado true/true): ' || st || E'\n';

  -- D-06: el revisor de un registro publicado no se puede reescribir.
  UPDATE public_tenders SET reviewed_by = NULL WHERE id=t_flag;
  SELECT (reviewed_by = m)::text INTO st FROM public_tenders WHERE id=t_flag;
  res := res || 'D-06 (esperado true): ' || st || E'\n';

  -- D-07: un lector (viewer) no ve lo que está en borrador (RLS). anon no tiene GRANT sobre la tabla.
  RESET ROLE; PERFORM set_config('request.jwt.claims', json_build_object('sub', v)::text, true);
  SET LOCAL ROLE authenticated; SELECT count(*) INTO n FROM public_tenders WHERE id = t_clean; RESET ROLE;
  res := res || 'D-07 viewer ve borrador (esperado 0): ' || n || E'\n';

  RAISE EXCEPTION E'RESULTADOS D (revertido):\n%', res;
END $$;

-- ------------- BLOQUE E: guardias P1, operación, IA y notificaciones (migración 18) -------------
-- Agregado 2026-11-17. Se revierte al final.
DO $$
DECLARE
  res text := ''; tn uuid := gen_random_uuid(); m uuid := gen_random_uuid(); a uuid := gen_random_uuid();
  v uuid := gen_random_uuid(); s uuid := gen_random_uuid(); d uuid := gen_random_uuid();
  t uuid; p uuid; nw uuid; st text; n int; x numeric;
BEGIN
  INSERT INTO organizations (id, org_type, legal_name) VALUES (tn,'tenant','Tenant E');
  INSERT INTO auth.users (id, email) VALUES (m,'me@test.invalid'),(a,'ae@test.invalid'),(v,'ve@test.invalid');
  UPDATE users SET role='opportunity_manager' WHERE id=m;
  UPDATE users SET role='analyst' WHERE id=a;
  INSERT INTO sources (id, code, name, base_url, allowed_hosts, access_method) VALUES (s,'test_e','Fuente E','https://example.invalid',ARRAY['example.invalid'],'manual');
  INSERT INTO source_documents (id, source_id, canonical_url, content_hash) VALUES (d, s, 'https://example.invalid/e', repeat('e',64));

  -- E-01: analista no edita una licitación publicada.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', m)::text, true);
  INSERT INTO public_tenders (source_id, external_id, process_code, title, status, publication_status) VALUES (s,'E-1','E-1','T','open','published') RETURNING id INTO t;
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
    SET LOCAL ROLE authenticated; UPDATE public_tenders SET title='cambiado' WHERE id=t; RESET ROLE;
    res := res || E'E-01 INESPERADO\n';
  EXCEPTION WHEN others THEN RESET ROLE; res := res || 'E-01 OK: ' || SQLERRM || E'\n'; END;

  -- E-02: proyecto no se publica sin documento; E-03 sin nota; E-04 con ambos sí.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', m)::text, true);
  INSERT INTO projects (name, dedup_key) VALUES ('Proyecto E', repeat('e',64)) RETURNING id, publication_status::text INTO p, st;
  res := res || 'E-02a (esperado draft): ' || st || E'\n';
  BEGIN UPDATE projects SET publication_status='published', review_notes='ok revisado' WHERE id=p; res := res || E'E-02 INESPERADO\n';
  EXCEPTION WHEN others THEN res := res || 'E-02 OK: ' || SQLERRM || E'\n'; END;
  BEGIN UPDATE projects SET publication_status='published', primary_source_document_id=d WHERE id=p; res := res || E'E-03 INESPERADO\n';
  EXCEPTION WHEN others THEN res := res || 'E-03 OK: ' || SQLERRM || E'\n'; END;
  UPDATE projects SET publication_status='published', primary_source_document_id=d, review_notes='revisado con documento' WHERE id=p;
  SELECT (reviewed_by=m)::text INTO st FROM projects WHERE id=p;
  res := res || 'E-04 (esperado true): ' || st || E'\n';

  -- E-05: analista no registra cargas; gestor sí y actualiza la fuente.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
  BEGIN PERFORM record_ingestion_run('test_e', true, '{}', '{}', NULL); res := res || E'E-05 INESPERADO\n';
  EXCEPTION WHEN others THEN res := res || 'E-05 OK: ' || SQLERRM || E'\n'; END;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', m)::text, true);
  PERFORM record_ingestion_run('test_e', false, '{}', '{}', 'HTTP 500');
  SELECT (last_error = 'HTTP 500')::text INTO st FROM sources WHERE id=s;
  res := res || 'E-06 error registrado (esperado true): ' || st || E'\n';

  -- E-07: un lector no registra IA; analista sí y suma gasto.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v)::text, true);
  BEGIN PERFORM record_ai_run('t', 'news', NULL, 'm', 'v', 's', 1, 1, 0.5, 1, 'succeeded', NULL); res := res || E'E-07 INESPERADO\n';
  EXCEPTION WHEN others THEN res := res || 'E-07 OK: ' || SQLERRM || E'\n'; END;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
  SELECT ai_spend_month() INTO x;
  PERFORM record_ai_run('t', 'news', NULL, 'm', 'v', 's', 1, 1, 0.5, 1, 'succeeded', NULL);
  SELECT (ai_spend_month() - x)::text INTO st;
  res := res || 'E-08 gasto sumado (esperado 0.5): ' || st || E'\n';

  -- E-09: notificaciones deduplicadas y solo propias.
  SELECT id INTO nw FROM news_items LIMIT 1;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v)::text, true);
  SELECT push_my_notifications(jsonb_build_array(
    jsonb_build_object('entity_type','news','entity_id',nw,'title','t','reason','r'),
    jsonb_build_object('entity_type','news','entity_id',nw,'title','t','reason','r'),
    jsonb_build_object('entity_type','news','entity_id',gen_random_uuid(),'title','x','reason','x'))) INTO n;
  res := res || 'E-09 insertadas (esperado 1): ' || n || E'\n';
  SELECT push_my_notifications(jsonb_build_array(jsonb_build_object('entity_type','news','entity_id',nw,'title','t','reason','r'))) INTO n;
  res := res || 'E-10 repetida (esperado 0): ' || n || E'\n';
  SELECT count(*) INTO n FROM notifications WHERE user_id = v;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
  SET LOCAL ROLE authenticated; SELECT count(*) INTO n FROM notifications WHERE user_id = v; RESET ROLE;
  res := res || 'E-11 otro usuario ve notificaciones ajenas (esperado 0): ' || n || E'\n';

  RAISE EXCEPTION E'RESULTADOS E (revertido):\n%', res;
END $$;

-- ------------- BLOQUE F: noticia -> oportunidad en borrador (migración 19) -------------
-- Agregado 2026-11-17. Se revierte al final.
DO $$
DECLARE
  res text := ''; tn uuid := gen_random_uuid(); m uuid := gen_random_uuid(); a uuid := gen_random_uuid(); v uuid := gen_random_uuid();
  nw uuid; op1 uuid; op2 uuid; st text;
BEGIN
  INSERT INTO organizations (id, org_type, legal_name) VALUES (tn,'tenant','Tenant F');
  INSERT INTO auth.users (id, email) VALUES (m,'mf@test.invalid'),(a,'af@test.invalid'),(v,'vf@test.invalid');
  UPDATE users SET role='opportunity_manager' WHERE id=m;
  UPDATE users SET role='analyst' WHERE id=a;
  SELECT id INTO nw FROM news_items LIMIT 1;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v)::text, true);
  BEGIN PERFORM propose_opportunity_from_news(nw, 'supply', 'T', 'D', NULL, NULL); res := res || E'F-01 INESPERADO\n';
  EXCEPTION WHEN others THEN res := res || 'F-01 OK (lector no propone): ' || SQLERRM || E'\n'; END;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
  op1 := propose_opportunity_from_news(nw, 'supply', 'Proveedores de fibra', 'Hipótesis de suministro', 'Plazos', 'Revisar pliegos');
  SELECT o.publication_status || '/' || o.trust_layer || '/' || e.verification_status || '/' || (d.canonical_url = n.url)::text
    INTO st FROM investment_opportunities o JOIN economic_events e ON e.id=o.originating_event_id
    JOIN source_documents d ON d.id=e.primary_source_document_id JOIN news_items n ON n.id=nw WHERE o.id=op1;
  res := res || 'F-02 (esperado draft/inference/pending/true): ' || st || E'\n';

  op2 := propose_opportunity_from_news(nw, 'services', 'Contratistas de obra', 'Otra hipótesis', NULL, NULL);
  SELECT (count(DISTINCT originating_event_id) = 1)::text INTO st FROM investment_opportunities WHERE id IN (op1, op2);
  res := res || 'F-03 mismo acontecimiento para la misma noticia (esperado true): ' || st || E'\n';

  BEGIN PERFORM propose_opportunity_from_news(nw, 'supply', 'Proveedores de fibra', 'dup', NULL, NULL); res := res || E'F-04 INESPERADO\n';
  EXCEPTION WHEN others THEN res := res || 'F-04 OK (duplicado rechazado): ' || left(SQLERRM, 80) || E'\n'; END;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', m)::text, true);
  BEGIN UPDATE investment_opportunities SET publication_status='published', reviewed_by=m, confidence=50, confidence_explanation='x' WHERE id=op1;
    res := res || E'F-05 INESPERADO\n';
  EXCEPTION WHEN others THEN res := res || 'F-05 OK (no se publica sin verificar): ' || SQLERRM || E'\n'; END;

  RAISE EXCEPTION E'RESULTADOS F (revertido):\n%', res;
END $$;

-- ------------- BLOQUE G: evidencia literal y publicación de oportunidad (migración 20) -------------
-- Agregado 2026-11-17. Se revierte al final.
DO $$
DECLARE
  res text := ''; tn uuid := gen_random_uuid(); m uuid := gen_random_uuid(); a uuid := gen_random_uuid();
  nw uuid; op uuid; ev uuid; doc uuid; eid uuid; st text;
  q text := 'cita literal de prueba suficientemente larga';
BEGIN
  INSERT INTO organizations (id, org_type, legal_name) VALUES (tn,'tenant','Tenant G');
  INSERT INTO auth.users (id, email) VALUES (m,'mg@test.invalid'),(a,'ag@test.invalid');
  UPDATE users SET role='opportunity_manager' WHERE id=m;
  UPDATE users SET role='analyst' WHERE id=a;
  SELECT id INTO nw FROM news_items LIMIT 1;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
  op := propose_opportunity_from_news(nw, 'supply', 'Prueba G evidencia', 'Hipótesis de prueba G', NULL, NULL);
  SELECT o.originating_event_id, e.primary_source_document_id INTO ev, doc
    FROM investment_opportunities o JOIN economic_events e ON e.id=o.originating_event_id WHERE o.id=op;

  SET LOCAL ROLE authenticated;
  BEGIN INSERT INTO evidence (opportunity_id, source_document_id, claim_field, quote, quote_hash, literal_verified)
          VALUES (op, doc, 'x', q, repeat('e',64), true);
    res := res || E'G-01 INESPERADO\n';
  EXCEPTION WHEN others THEN res := res || 'G-01 OK (analista no marca verificada): ' || SQLERRM || E'\n'; END;
  INSERT INTO evidence (opportunity_id, source_document_id, claim_field, quote, quote_hash, literal_verified)
    VALUES (op, doc, 'x', q, repeat('e',64), false) RETURNING id INTO eid;
  res := res || E'G-02 OK (sin verificar sí se inserta)\n';
  BEGIN UPDATE evidence SET literal_verified = true WHERE id = eid;
    res := res || E'G-03 INESPERADO\n';
  EXCEPTION WHEN others THEN res := res || 'G-03 OK (no se cambia a verificada): ' || SQLERRM || E'\n'; END;
  BEGIN PERFORM add_literal_evidence(op, q, 0, length(q)); res := res || E'G-04 INESPERADO\n';
  EXCEPTION WHEN others THEN res := res || 'G-04 OK (analista no atestigua): ' || SQLERRM || E'\n'; END;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', m)::text, true);
  BEGIN PERFORM add_literal_evidence(op, 'corta', 0, 5); res := res || E'G-05 INESPERADO\n';
  EXCEPTION WHEN others THEN res := res || 'G-05 OK (cita corta): ' || SQLERRM || E'\n'; END;
  PERFORM add_literal_evidence(op, q, 0, length(q));
  RESET ROLE;
  SELECT count(*)::text INTO st FROM evidence WHERE opportunity_id = op AND literal_verified;
  res := res || 'G-06 gestor atestigua (esperado 1): ' || st || E'\n';

  SET LOCAL ROLE authenticated;
  BEGIN UPDATE investment_opportunities SET publication_status='published', reviewed_by=m, review_notes='Revisado G' WHERE id=op;
    res := res || E'G-07 INESPERADO\n';
  EXCEPTION WHEN others THEN res := res || 'G-07 OK (acontecimiento sin verificar): ' || SQLERRM || E'\n'; END;
  INSERT INTO verification_records (subject_type, subject_id, check_type, result, reasons, reviewer_id)
    VALUES ('event', ev, 'human_review', 'verified', '["fuente oficial consultada"]'::jsonb, m);
  UPDATE investment_opportunities SET publication_status='published', reviewed_by=m, review_notes='Revisado G', confidence=55, confidence_explanation='Prueba G' WHERE id=op;
  RESET ROLE;
  SELECT o.publication_status || '/' || o.publisher_role || '/' || e.verification_status INTO st
    FROM investment_opportunities o JOIN economic_events e ON e.id=o.originating_event_id WHERE o.id=op;
  res := res || 'G-08 (esperado published/opportunity_manager/verified): ' || st || E'\n';

  SET LOCAL ROLE authenticated;
  BEGIN PERFORM add_literal_evidence(op, q || ' otra', 0, length(q) + 5); res := res || E'G-09 INESPERADO\n';
  EXCEPTION WHEN others THEN res := res || 'G-09 OK (ya publicada): ' || SQLERRM || E'\n'; END;
  RESET ROLE;

  RAISE EXCEPTION E'RESULTADOS G (revertido):\n%', res;
END $$;

-- ------------- BLOQUE H: historial de cambios de licitaciones (migración 21) -------------
-- Agregado 2026-11-17. Usa una licitación en revisión y otra publicada existentes; se revierte al final.
DO $$
DECLARE
  res text := ''; tn uuid := gen_random_uuid(); m uuid := gen_random_uuid(); v uuid := gen_random_uuid();
  t1 uuid; t2 uuid; st text; n int;
BEGIN
  INSERT INTO organizations (id, org_type, legal_name) VALUES (tn,'tenant','Tenant H');
  INSERT INTO auth.users (id, email) VALUES (m,'mh@test.invalid'),(v,'vh@test.invalid');
  UPDATE users SET role='opportunity_manager' WHERE id=m;
  SELECT id INTO t1 FROM public_tenders WHERE publication_status='in_review' AND deadline_at IS NOT NULL LIMIT 1;
  SELECT id INTO t2 FROM public_tenders WHERE publication_status='published' AND deadline_at IS NOT NULL LIMIT 1;

  UPDATE public_tenders SET title = title, extracted_at = now() WHERE id = t1;
  SELECT count(*) INTO n FROM tender_changes WHERE tender_id = t1;
  res := res || 'H-01 recarga sin cambios no registra (esperado 0): ' || n || E'\n';

  UPDATE public_tenders SET deadline_at = deadline_at + interval '2 days', budget_amount = coalesce(budget_amount, 0) + 1, extracted_at = now() + interval '1 second' WHERE id = t1;
  SELECT origin || '/' || coalesce(actor_role::text, 'sistema') || '/' || (SELECT string_agg(k, ',' ORDER BY k) FROM jsonb_object_keys(changes) k)
    INTO st FROM tender_changes WHERE tender_id = t1;
  res := res || 'H-02 (esperado ingest/sistema/budget_amount,deadline_at): ' || st || E'\n';

  UPDATE public_tenders SET deadline_at = deadline_at + interval '1 day', extracted_at = now() + interval '2 seconds' WHERE id = t2;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v)::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM tender_changes WHERE tender_id = t1;
  res := res || 'H-03 lector no ve historial de no publicada (esperado 0): ' || n || E'\n';
  SELECT count(*) INTO n FROM tender_changes WHERE tender_id = t2;
  res := res || 'H-04 lector ve historial de publicada (esperado 1): ' || n || E'\n';
  BEGIN INSERT INTO tender_changes (tender_id, origin, changes) VALUES (t2, 'edit', '{"x":1}'); res := res || E'H-05 INESPERADO\n';
  EXCEPTION WHEN others THEN res := res || 'H-05 OK (no se escribe desde la API): ' || SQLERRM || E'\n'; END;
  RESET ROLE;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', m)::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public_tenders SET publication_status = 'published', review_notes = 'Revisado en bloque H' WHERE id = t1;
  RESET ROLE;
  SELECT string_agg(origin || ':' || coalesce(actor_role::text,'sistema'), ' ') INTO st FROM tender_changes WHERE tender_id = t1 AND changes ? 'publication_status';
  res := res || 'H-06 (esperado review:opportunity_manager): ' || st || E'\n';

  RAISE EXCEPTION E'RESULTADOS H (revertido):\n%', res;
END $$;

-- ------------------- BLOQUE M23: datos BCRD (macro y tasa de cambio) ---------------
-- Ejecutado el 2026-11-18 con la migración 23 aplicada: todas las líneas dieron lo esperado.
DO $$
DECLARE res text := ''; tn uuid := '00000000-0000-0000-0000-0000000023a1'; m uuid := '00000000-0000-0000-0000-0000000023b1'; v uuid := '00000000-0000-0000-0000-0000000023b2'; s uuid; n int;
BEGIN
  SELECT id INTO s FROM sources WHERE code='bcrd_api';
  INSERT INTO organizations (id, org_type, legal_name) VALUES (tn,'tenant','Tenant prueba 23');
  INSERT INTO auth.users (id, email) VALUES (m,'m23@test.invalid'),(v,'v23@test.invalid');
  UPDATE users SET role='opportunity_manager' WHERE id=m;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN INSERT INTO macro_observations (source_id,series_key,group_name,indicator,value,observation_key) VALUES (s,'k','G','i',1,'o1'); res := res || E'23-01 INESPERADO: viewer insertó\n';
  EXCEPTION WHEN others THEN res := res || '23-01 OK viewer no inserta: ' || SQLERRM || E'\n'; END;
  BEGIN INSERT INTO exchange_rates (source_id,rate_date,buying,selling) VALUES (s,'2026-11-18',60,61); res := res || E'23-02 INESPERADO\n';
  EXCEPTION WHEN others THEN res := res || '23-02 OK viewer no inserta tasas: ' || SQLERRM || E'\n'; END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', m, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO macro_observations (source_id,series_key,group_name,indicator,value,observation_key) VALUES (s,'k','G','i',1,'o1');
  INSERT INTO exchange_rates (source_id,rate_date,buying,selling) VALUES (s,'2026-11-18',60,61)
    ON CONFLICT (source_id,currency_id,rate_date) DO UPDATE SET buying=excluded.buying, selling=excluded.selling, last_seen_at=now();
  INSERT INTO exchange_rates (source_id,rate_date,buying,selling) VALUES (s,'2026-11-18',60.1,61)
    ON CONFLICT (source_id,currency_id,rate_date) DO UPDATE SET buying=excluded.buying, selling=excluded.selling, last_seen_at=now();
  SELECT count(*) INTO n FROM exchange_rates WHERE buying=60.1; res := res || '23-03 gestor inserta y actualiza tasas (esperado 1): ' || n || E'\n';
  BEGIN UPDATE macro_observations SET value=2 WHERE observation_key='o1'; res := res || E'23-04 INESPERADO: cambió value\n';
  EXCEPTION WHEN others THEN res := res || '23-04 OK value inmutable: ' || SQLERRM || E'\n'; END;
  BEGIN UPDATE exchange_rates SET first_seen_at=now(); res := res || E'23-05 INESPERADO\n';
  EXCEPTION WHEN others THEN res := res || '23-05 OK first_seen_at inmutable: ' || SQLERRM || E'\n'; END;
  RESET ROLE;
  SET LOCAL ROLE anon;
  BEGIN SELECT count(*) INTO n FROM exchange_rates; res := res || E'23-06 INESPERADO anon lee\n';
  EXCEPTION WHEN others THEN res := res || '23-06 OK anon no lee: ' || SQLERRM || E'\n'; END;
  RESET ROLE;
  RAISE EXCEPTION E'RESULTADOS (revertido)\n%', res;
END $$;

-- ------------- BLOQUE M24: alertas macro y análisis de impacto macro ---------------
-- Ejecutado el 2026-11-18 con la migración 24 aplicada: todas las líneas dieron lo esperado.
DO $$
DECLARE res text := ''; tn uuid := '00000000-0000-0000-0000-0000000024a1'; a uuid := '00000000-0000-0000-0000-0000000024b1'; v uuid := '00000000-0000-0000-0000-0000000024b2'; obs uuid; pref uuid; n int;
BEGIN
  SELECT id INTO obs FROM macro_observations LIMIT 1;  -- requiere al menos una carga del BCRD
  INSERT INTO organizations (id, org_type, legal_name) VALUES (tn,'tenant','Tenant prueba 24');
  INSERT INTO auth.users (id, email) VALUES (a,'a24@test.invalid'),(v,'v24@test.invalid');
  UPDATE users SET role='analyst' WHERE id=a;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN INSERT INTO user_alert_preferences (user_id,name) VALUES (v,'vacía'); res := res || E'24-01 INESPERADO alerta vacía\n';
  EXCEPTION WHEN others THEN res := res || '24-01 OK alerta sin objetivo rechazada: ' || SQLERRM || E'\n'; END;
  INSERT INTO user_alert_preferences (user_id,name,macro_new_data) VALUES (v,'macro',true) RETURNING id INTO pref;
  BEGIN INSERT INTO user_alert_preferences (user_id,name,fx_daily_move_pct) VALUES (v,'fx',0); res := res || E'24-02 INESPERADO umbral 0\n';
  EXCEPTION WHEN others THEN res := res || '24-02 OK umbral 0 rechazado: ' || SQLERRM || E'\n'; END;
  SELECT push_my_notifications(jsonb_build_array(
    jsonb_build_object('entity_type','macro','entity_id',obs,'preference_id',pref,'title','t','reason','r','kind','new_data'),
    jsonb_build_object('entity_type','macro','entity_id',obs,'preference_id',pref,'title','t','reason','r','kind','trend'),
    jsonb_build_object('entity_type','macro','entity_id',obs,'preference_id',pref,'title','t','reason','r','kind','new_data'),
    jsonb_build_object('entity_type','macro','entity_id',gen_random_uuid(),'preference_id',pref,'title','t','reason','r'))) INTO n;
  res := res || '24-03 notificaciones macro (esperado 2: dos motivos, sin duplicar, id inexistente ignorado): ' || n || E'\n';
  BEGIN INSERT INTO macro_analyses (model,snapshot,summary,impact_direction,horizon,confidence,confidence_explanation) VALUES ('m','{}','s','neutral','short',10,'e'); res := res || E'24-04 INESPERADO viewer inserta análisis\n';
  EXCEPTION WHEN others THEN res := res || '24-04 OK viewer no inserta análisis: ' || SQLERRM || E'\n'; END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO macro_analyses (model,snapshot,summary,impact_direction,horizon,confidence,confidence_explanation) VALUES ('m','{}','s','neutral','short',10,'e');
  BEGIN INSERT INTO macro_analyses (model,snapshot,summary,impact_direction,horizon,confidence,confidence_explanation,trust_layer) VALUES ('m','{}','s','neutral','short',10,'e','confirmed'); res := res || E'24-05 INESPERADO análisis confirmado\n';
  EXCEPTION WHEN others THEN res := res || '24-05 OK análisis no puede ser confirmado: ' || SQLERRM || E'\n'; END;
  RESET ROLE;
  SELECT count(*) INTO n FROM macro_observations WHERE unit IS NULL AND series_key NOT LIKE 'Sector Externo › Tasas de cambio%';
  res := res || '24-06 filas sin unidad fuera de tasa de cambio (esperado 0): ' || n || E'\n';
  RAISE EXCEPTION E'RESULTADOS (revertido)\n%', res;
END $$;

-- ------------- BLOQUE M25: carga manual de proyectos y permisos (P1-05) ---------------
-- Ejecutado el 2026-11-18 con la migración 25 aplicada: las 13 líneas dieron lo esperado.
DO $$
DECLARE res text := ''; tn uuid := '00000000-0000-0000-0000-0000000025a1'; a uuid := '00000000-0000-0000-0000-0000000025b1'; m uuid := '00000000-0000-0000-0000-0000000025b2'; v uuid := '00000000-0000-0000-0000-0000000025b3';
  d uuid; d2 uuid; p uuid; pm uuid; n int; st text;
BEGIN
  INSERT INTO organizations (id, org_type, legal_name) VALUES (tn,'tenant','Tenant prueba 25');
  INSERT INTO auth.users (id, email) VALUES (a,'a25@test.invalid'),(m,'m25@test.invalid'),(v,'v25@test.invalid');
  UPDATE users SET role='analyst' WHERE id=a; UPDATE users SET role='opportunity_manager' WHERE id=m;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN PERFORM register_official_document('https://mimarena.gob.do/x.pdf','t',NULL); res := res || E'25-01 INESPERADO viewer registra\n';
  EXCEPTION WHEN others THEN res := res || '25-01 OK viewer no registra documentos: ' || SQLERRM || E'\n'; END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN PERFORM register_official_document('http://mimarena.gob.do/x.pdf','t',NULL); res := res || E'25-02 INESPERADO http\n';
  EXCEPTION WHEN others THEN res := res || '25-02 OK solo https: ' || SQLERRM || E'\n'; END;
  BEGIN PERFORM register_official_document('https://evilgob.do.example.com/x.pdf','t',NULL); res := res || E'25-03 INESPERADO dominio\n';
  EXCEPTION WHEN others THEN res := res || '25-03 OK solo dominios oficiales: ' || SQLERRM || E'\n'; END;
  BEGIN PERFORM register_official_document('https://notgob.do/x','t',NULL); res := res || E'25-03b INESPERADO notgob.do\n';
  EXCEPTION WHEN others THEN res := res || '25-03b OK notgob.do rechazado' || E'\n'; END;
  BEGIN PERFORM register_official_document('https://mimarena.gob.do/x.pdf','t',(now()+interval '5 days')::date); res := res || E'25-04 INESPERADO fecha futura\n';
  EXCEPTION WHEN others THEN res := res || '25-04 OK fecha futura rechazada' || E'\n'; END;
  d := register_official_document('https://mimarena.gob.do/x.pdf','Resolución','2026-11-01');
  d2 := register_official_document('https://mimarena.gob.do/x.pdf','otro título',NULL);
  res := res || '25-05 mismo URL reutiliza el documento (esperado true): ' || (d = d2) || E'\n';
  BEGIN INSERT INTO projects (name, dedup_key) VALUES ('Sin doc', repeat('a',64)); res := res || E'25-06 INESPERADO proyecto sin documento\n';
  EXCEPTION WHEN others THEN res := res || '25-06 OK proyecto exige documento: ' || SQLERRM || E'\n'; END;
  INSERT INTO projects (name, dedup_key, primary_source_document_id, status, trust_layer) VALUES ('Parque solar prueba', repeat('b',64), d, 'announced', 'inference') RETURNING id INTO p;
  UPDATE projects SET status = 'permit_applied' WHERE id = p;
  UPDATE projects SET description = 'x' WHERE id = p;
  SELECT count(*) INTO n FROM registry_status_changes WHERE project_id = p;
  res := res || '25-07 historial del proyecto (esperado 2: alta y cambio; editar otro campo no cuenta): ' || n || E'\n';
  SELECT string_agg(coalesce(from_status,'∅') || '→' || to_status || ':' || changed_by_role, ', ' ORDER BY changed_at, to_status) INTO st FROM registry_status_changes WHERE project_id = p;
  res := res || '    ' || st || E'\n';
  BEGIN UPDATE projects SET status = 'permit_approved' WHERE id = p; res := res || E'25-08 INESPERADO aprobado sin documento oficial\n';
  EXCEPTION WHEN others THEN res := res || '25-08 OK aprobado exige documento oficial: ' || SQLERRM || E'\n'; END;
  BEGIN INSERT INTO registry_status_changes (project_id, to_status) VALUES (p, 'operating'); res := res || E'25-09 INESPERADO escribe historial\n';
  EXCEPTION WHEN others THEN res := res || '25-09 OK historial solo por disparador: ' || SQLERRM || E'\n'; END;
  BEGIN UPDATE projects SET publication_status = 'published', review_notes = 'ok' WHERE id = p; res := res || E'25-10 INESPERADO analista publica\n';
  EXCEPTION WHEN others THEN res := res || '25-10 OK analista no publica: ' || SQLERRM || E'\n'; END;
  INSERT INTO permits (project_id, permit_type, status, official_document_id, dedup_key, trust_layer) VALUES (p, 'environmental', 'requested', d, repeat('c',64), 'inference') RETURNING id INTO pm;
  SELECT count(*) INTO n FROM registry_status_changes WHERE permit_id = pm;
  res := res || '25-11 historial del permiso (esperado 1): ' || n || E'\n';
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM registry_status_changes WHERE project_id = p;
  res := res || '25-12 viewer ve historial de borrador (esperado 0): ' || n || E'\n';
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', m, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE projects SET publication_status = 'published', review_notes = 'Revisado contra la resolución', trust_layer = 'confirmed' WHERE id = p;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM registry_status_changes WHERE project_id = p;
  res := res || '25-13 viewer ve historial del publicado (esperado 2): ' || n || E'\n';
  RESET ROLE;
  RAISE EXCEPTION E'RESULTADOS (revertido)\n%', res;
END $$;

-- ------------- BLOQUE M26: ejecuciones del agente de extracci�n (T-AI-01/T-AI-02) ---------------
DO $$
DECLARE res text := ''; tn uuid := '00000000-0000-0000-0000-0000000026a1'; a uuid := '00000000-0000-0000-0000-0000000026b1'; v uuid := '00000000-0000-0000-0000-0000000026b2';
  u uuid; n int; ag text; tk text; st text; out jsonb;
BEGIN
  INSERT INTO organizations (id, org_type, legal_name) VALUES (tn,'tenant','Tenant prueba 26');
  INSERT INTO auth.users (id, email) VALUES (a,'a26@test.invalid'),(v,'v26@test.invalid');
  UPDATE users SET role='analyst' WHERE id=a;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN PERFORM record_extraction_run(gen_random_uuid(),'claude-haiku-5-5','p','s',10,10,0.001,100,'succeeded',NULL,'{}'::jsonb);
    res := res || E'26-01 INESPERADO viewer registra\n';
  EXCEPTION WHEN others THEN res := res || '26-01 OK viewer no registra: ' || SQLERRM || E'\n'; END;
  SELECT count(*) INTO n FROM ai_analysis_runs;
  res := res || '26-02 viewer no ve ejecuciones (esperado 0): ' || n || E'\n';
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  u := record_extraction_run(gen_random_uuid(),'claude-haiku-5-5','extraction@1.0.0','extraction-schema@1.0.0',100,50,0.0001,250,
        'succeeded',NULL,
        jsonb_build_object('extraction',jsonb_build_object('event',NULL),'injection_suspected',false,'used_full_text',true,'truncated',false));
  SELECT agent::text, task, subject_type::text, output INTO ag, tk, st, out FROM ai_analysis_runs WHERE id=u;
  res := res || '26-03 analista registra (esperado extraction/news_extraction/news): ' || ag || '/' || tk || '/' || st || E'\n';
  res := res || '26-04 salida guardada (esperado false): ' || (out->>'injection_suspected') || E'\n';
  BEGIN PERFORM record_extraction_run(gen_random_uuid(),'m','p','s',1,1,0,1,'succeeded',NULL,
          jsonb_build_object('x',repeat('a',300000)));
    res := res || E'26-05 INESPERADO salida enorme\n';
  EXCEPTION WHEN others THEN res := res || '26-05 OK salida limitada: ' || SQLERRM || E'\n'; END;
  BEGIN PERFORM record_extraction_run(gen_random_uuid(),'m','p','s',1,1,-1,1,'succeeded',NULL,NULL);
    res := res || E'26-06 INESPERADO costo negativo\n';
  EXCEPTION WHEN others THEN res := res || '26-06 OK costo no negativo: ' || SQLERRM || E'\n'; END;
  BEGIN PERFORM record_extraction_run(gen_random_uuid(),NULL,'p','s',1,1,0,1,'succeeded',NULL,NULL);
    res := res || E'26-07 INESPERADO modelo vac�o\n';
  EXCEPTION WHEN others THEN res := res || '26-07 OK modelo obligatorio: ' || SQLERRM || E'\n'; END;
  RESET ROLE;
  RAISE EXCEPTION E'RESULTADOS (revertido)\n%', res;
END $$;

-- ------------- BLOQUE M27: notas de inteligencia multi-fuente (intelligence_briefs) ---------------
DO $$
DECLARE res text := '';
  a uuid := '00000000-0000-0000-0000-0000000027b1'; v uuid := '00000000-0000-0000-0000-0000000027b2'; m uuid := '00000000-0000-0000-0000-0000000027b3';
  n1 uuid; n2 uuid; b uuid; r uuid; n int; ag text; tk text; st text; rb uuid; pa timestamptz;
  pl jsonb := jsonb_build_object('facts', jsonb_build_array(), 'stats', jsonb_build_object('sources', 2));
BEGIN
  INSERT INTO auth.users (id, email) VALUES (a,'a27@test.invalid'),(v,'v27@test.invalid'),(m,'m27@test.invalid');
  UPDATE users SET role='analyst' WHERE id=a;
  UPDATE users SET role='opportunity_manager' WHERE id=m;
  INSERT INTO news_items (source_key, source_name, url, title)
    VALUES ('test27','Prueba 27','https://test.invalid/27/1','Noticia de prueba 27 uno') RETURNING id INTO n1;
  INSERT INTO news_items (source_key, source_name, url, title)
    VALUES ('test27','Prueba 27','https://test.invalid/27/2','Noticia de prueba 27 dos') RETURNING id INTO n2;

  -- Lector: no registra
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN PERFORM record_intelligence_brief('Tema prueba', current_date-7, current_date, 'Titular de prueba 27',
          repeat('Entradilla de prueba. ',3), ARRAY[n1,n2], pl, 'm','p','s',1,1,0,1,'succeeded',NULL);
    res := res || E'27-01 INESPERADO viewer registra\n';
  EXCEPTION WHEN others THEN res := res || '27-01 OK viewer no registra: ' || SQLERRM || E'\n'; END;
  RESET ROLE;

  -- Analista: registra borrador y su ejecución
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  b := record_intelligence_brief('Tema prueba', current_date-7, current_date, 'Titular de prueba 27',
         repeat('Entradilla de prueba. ',3), ARRAY[n1,n2], pl, 'claude-sonnet-5-5','brief@1.0.0','brief-schema@1.0.0',100,50,0.001,900,'succeeded',NULL);
  SELECT publication_status::text INTO st FROM intelligence_briefs WHERE id=b;
  res := res || '27-02 analista crea nota (esperado draft): ' || coalesce(st,'NULL') || E'\n';
  BEGIN PERFORM record_intelligence_brief('Tema prueba', current_date-7, current_date, 'Titular de prueba 27',
          repeat('Entradilla de prueba. ',3), ARRAY[n1], pl, 'm','p','s',1,1,0,1,'succeeded',NULL);
    res := res || E'27-03 INESPERADO una sola fuente\n';
  EXCEPTION WHEN others THEN res := res || '27-03 OK exige 2-8 noticias: ' || SQLERRM || E'\n'; END;
  BEGIN PERFORM record_intelligence_brief('Tema prueba', current_date-7, current_date, 'Titular de prueba 27',
          repeat('Entradilla de prueba. ',3), ARRAY[n1,gen_random_uuid()], pl, 'm','p','s',1,1,0,1,'succeeded',NULL);
    res := res || E'27-04 INESPERADO noticia inexistente\n';
  EXCEPTION WHEN others THEN res := res || '27-04 OK noticia debe existir: ' || SQLERRM || E'\n'; END;
  BEGIN PERFORM record_intelligence_brief('Tema prueba', current_date-7, current_date, 'Titular de prueba 27',
          repeat('Entradilla de prueba. ',3), ARRAY[n1,n2], jsonb_build_object('x',repeat('a',300000)), 'm','p','s',1,1,0,1,'succeeded',NULL);
    res := res || E'27-05 INESPERADO payload enorme\n';
  EXCEPTION WHEN others THEN res := res || '27-05 OK payload limitado: ' || SQLERRM || E'\n'; END;
  r := record_intelligence_brief(NULL,NULL,NULL,NULL,NULL,NULL,NULL,'claude-sonnet-5-5','brief@1.0.0','brief-schema@1.0.0',10,0,0.0001,50,'failed','timeout');
  BEGIN PERFORM review_intelligence_brief(b,'publish','Revisado por el analista');
    res := res || E'27-07 INESPERADO analista publica\n';
  EXCEPTION WHEN others THEN res := res || '27-07 OK analista no publica: ' || SQLERRM || E'\n'; END;
  BEGIN UPDATE intelligence_briefs SET publication_status='published' WHERE id=b;
    GET DIAGNOSTICS n = ROW_COUNT; res := res || '27-08 INESPERADO update directo, filas: ' || n || E'\n';
  EXCEPTION WHEN others THEN res := res || '27-08 OK sin update directo: ' || SQLERRM || E'\n'; END;
  RESET ROLE;
  SELECT r2.agent::text, r2.task INTO ag, tk FROM ai_analysis_runs r2 JOIN intelligence_briefs ib ON ib.ai_run_id=r2.id WHERE ib.id=b;
  res := res || '27-09 ejecución trazada (esperado opportunity_intelligence/intelligence_brief): ' || coalesce(ag,'NULL') || '/' || coalesce(tk,'NULL') || E'\n';
  SELECT count(*) INTO n FROM intelligence_briefs WHERE ai_run_id=r;  -- ai_run_id no se concede a authenticated
  res := res || '27-06 fallo registra solo la ejecución (esperado 0 notas): ' || n || E'\n';

  -- Lector: no ve borradores
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM intelligence_briefs WHERE id=b;
  res := res || '27-10 viewer no ve borrador (esperado 0): ' || n || E'\n';
  RESET ROLE;

  -- Gestor: nota corta rechazada, publica con nota
  PERFORM set_config('request.jwt.claims', json_build_object('sub', m, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN PERFORM review_intelligence_brief(b,'publish','corta');
    res := res || E'27-11 INESPERADO nota corta\n';
  EXCEPTION WHEN others THEN res := res || '27-11 OK nota >=10: ' || SQLERRM || E'\n'; END;
  PERFORM review_intelligence_brief(b,'publish','Citas comprobadas contra las fuentes');
  BEGIN PERFORM review_intelligence_brief(b,'reject','Rechazo tras publicar');
    res := res || E'27-12 INESPERADO revisa una publicada\n';
  EXCEPTION WHEN others THEN res := res || '27-12 OK solo desde draft: ' || SQLERRM || E'\n'; END;
  RESET ROLE;
  SELECT publication_status::text, reviewed_by, published_at INTO st, rb, pa FROM intelligence_briefs WHERE id=b;
  res := res || '27-13 publicada por gestor (esperado published/true/true): ' || st || '/' || (rb=m)::text || '/' || (pa IS NOT NULL)::text || E'\n';

  -- Lector: ve publicada, pero no los campos de revisión ni la vista staff
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM intelligence_briefs WHERE id=b;
  res := res || '27-14 viewer ve publicada (esperado 1): ' || n || E'\n';
  BEGIN SELECT count(review_notes) INTO n FROM intelligence_briefs;
    res := res || E'27-15 INESPERADO viewer lee review_notes\n';
  EXCEPTION WHEN others THEN res := res || '27-15 OK review_notes oculto: ' || SQLERRM || E'\n'; END;
  SELECT count(*) INTO n FROM staff_intelligence_briefs;
  res := res || '27-16 viewer no ve vista staff (esperado 0): ' || n || E'\n';
  RESET ROLE;
  SET LOCAL ROLE anon;
  BEGIN SELECT count(*) INTO n FROM intelligence_briefs;
    res := res || E'27-17 INESPERADO anon lee\n';
  EXCEPTION WHEN others THEN res := res || '27-17 OK anon no lee: ' || SQLERRM || E'\n'; END;
  RESET ROLE;

  -- Inmutabilidad (incluso como postgres)
  BEGIN UPDATE intelligence_briefs SET headline='Titular cambiado tras publicar' WHERE id=b;
    res := res || E'27-18 INESPERADO edita publicada\n';
  EXCEPTION WHEN others THEN res := res || '27-18 OK contenido inmutable: ' || SQLERRM || E'\n'; END;
  BEGIN UPDATE intelligence_briefs SET publication_status='draft' WHERE id=b;
    res := res || E'27-19 INESPERADO despublica\n';
  EXCEPTION WHEN others THEN res := res || '27-19 OK no se despublica: ' || SQLERRM || E'\n'; END;

  RAISE EXCEPTION E'RESULTADOS (revertido)\n%', res;
END $$;
