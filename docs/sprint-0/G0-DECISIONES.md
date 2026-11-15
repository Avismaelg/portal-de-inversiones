> **CERRADO el 2026-11-15.** Las 14 decisiones fueron aprobadas. La resolución vinculante está en `G0-ACTA.md`.

# G0 — Decisiones que debe tomar el usuario antes de Sprint 1

Ventana B · 2026-11-15 · Fuente: `backlog-producto.md` §4.4–§7, `backlog-tecnico.md` (T-PRE, SG), `FUENTES-RD.md`, `MODELO-DATOS.md` §3. Las recomendaciones son de B; **no cambian alcance hasta que decidas**. Sin G0 aprobado no hay Sprint 1.

| # | Decisión | Opciones | Recomendación | Si no se decide | Lo necesita |
|---|---|---|---|---|---|
| 1 | **SRS y Plan Maestro** (B-001/002, `T-PRE-02`) | (a) esperarlos; (b) seguir con el Prompt Maestro y `[PENDIENTE SRS]` | (b), revalidando la matriz al llegar | No se congela el modelo de datos (RB-05); retraso indefinido | A, B |
| 2 | **Proyecto Supabase** (B-003, `T-PRE-03`) | (a) crear uno nuevo y exclusivo; (b) reactivar el vinculado | (a) | No corre el SQL ni la suite RLS (`T-INF-01…03`): **se para el camino crítico** | A, B (CC-02/03) |
| 3 | **ADRs**: aprobar 0001, 0003, 0004, 0006, 0007; hosting (0005) y lenguaje de workers (0002) | Aprobar / pedir cambios; 0002 tras experimento en Sprint 1 | Aprobar los cinco; decidir 0005 antes de `T-INF-08` | No empieza `T-INF-05` ni los entornos | A |
| 4 | **Proveedor LLM y tope mensual** (B-011, `T-PRE-06`) | Elegir proveedor y USD/mes | Uno solo al inicio, tope bajo, subir con datos | Sin `T-AI-01`; RNF-21 no medible | A, B |
| 5 | **Abogado dominicano** (L-01…L-12, `T-PRE-05`) | Contratar ya / después | Ya: antes de activar fuentes sin licencia y antes de G5 | No se automatiza ninguna fuente dudosa; comparador y calculadora siguen vetados; G5 bloqueado (RNF-27) | A, B, tú |
| 6 | **Equipo y calendario** (B-013) | (a) 16 sem con ≥ 3 personas; (b) 20–24 sem con 2–3; (c) 16 sem con MVP recortado al corte vertical DGCP + Crédito Público | (b) o (c); medir velocidad real en S1–S2 | El plan de 16 semanas no se puede validar: con 1–2 personas **no cabe** (§4.4) | A, B |
| 7 | **Cobertura de fuentes** (módulos B, E; SIMV, BVRD, CNE, MIMARENA) | (a) esperar a verificarlas; (b) declararlas **manuales** y publicar “cobertura pendiente” | (b); automatizar solo lo que verifique `T-SRC-04…06` | PM §16 (“identifique proyectos y permisos”) se incumpliría sin avisar | A, B |
| 8 | **Profundidad histórica de DGCP** (≈ 1,8 M filas citadas por OCP) | (a) todo el histórico; (b) últimos N años | (b), N tras `T-SRC-01` | Datasets de prueba, tiempos de carga y RNF-02/03 sin definir | A, B (QA) |
| 9 | **Comparador, calculadora (V-05), vistas guardadas (DM-06) y capa `Cálculo` (D-08)** | (a) fuera del MVP; (b) Should dentro | (a): L-02 sin respuesta y V-05 abierta; las vistas no tienen tabla | `T-AI-09` y la entidad 24 se estiman en vano | A, B |
| 10 | **Modelo de datos**: DM-01 (`organizations` = tenant y empresa) y DM-03 (`opportunity_evidence` → `evidence`) | Aprobar / separar tablas / mantener nombre | Aprobar DM-01 con el trigger actual; renombrar DM-03 **antes** de ejecutar el SQL (el PM lista el nombre, por eso decides tú) | Rehacer RLS o migrar después: caro | A |
| 11 | **Revisión humana**: política de publicación de eventos y quién revisa (B-015) | (a) todo evento no totalmente verificado a cola; (b) automática desde el día 1 | (a) (puerta P0); designar anotadores y revisores en G0 | La cola de revisión no tiene operadores; G-09 queda NO CONCLUYENTE | A, B |
| 12 | **Herramientas** (B-014, SG-04): gitleaks, `npm audit`, Dependabot, Playwright + axe, k6, ZAP, Lighthouse CI | Aprobar o descartar cada una | Aprobar, instalando fuera de OneDrive | Sin escaneo de secretos ni E2E; `T-INF-04` incompleta | A, B |
| 13 | **Supuestos de alcance**: alertas solo in-app (C-05); sin facturación (C-06); una organización (C-12) | Confirmar / cambiar | Confirmar los tres | Se rehacen RLS y onboarding | A, B |
| 14 | **Seguridad operativa**: MFA para admin (SG-02), contacto del `User-Agent` (SG-05), `.env.local` (B-004), primer commit (B-005, `T-PRE-04`) | Sí / No / definir | Sí; definir contacto; commit tras revisar secretos | `T-ING-01` no puede identificar el cliente; sin línea base | A |

**Lo que B ya asumió por defecto** (cámbialo si no estás de acuerdo): `closing_soon` es estado derivado (≤ 72 h, no se almacena); historial público sanitizado por rol (`PERSONAS` §3.3); 100 000 eventos es dataset de prueba, no volumen real.

**Pendiente de A (no es decisión tuya):** confirmar si `T-WEB-03…09` incluyen la interfaz; tareas para historial público, borrado/ajustes de cuenta y consentimiento (brechas de §4.5).
