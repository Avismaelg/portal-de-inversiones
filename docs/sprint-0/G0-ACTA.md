# ACTA G0 — Cierre del Gate 0

**Fecha de cierre:** 2026-11-15
**Aprobado por:** usuario (instrucción directa: «aplica todo tal cual y cierra G0»)
**Veredicto:** **APROBADO CON RECORTES Y CONDICIONES**
**Efecto:** Sprint 1 queda autorizado. Sin este acta no se escribe código de producto.

---

## 1. Decisiones aprobadas

| # | Decisión | Resolución aprobada |
|---|---|---|
| 1 | SRS y Plan Maestro | **1b.** Seguir con el Prompt Maestro. Los vacíos permanecen marcados `[PENDIENTE SRS]` y la matriz de 86 RF es provisional. Se revalida cuando lleguen los documentos. |
| 2 | Proyecto Supabase | **2a.** Crear un proyecto nuevo y exclusivo. El proyecto `ecmqmgpruxclmpnnpgzv` no se reutiliza. |
| 3 | ADRs | **Aprobar** ADR-0001, 0003, 0004, 0006 y 0007. **ADR-0005** (hosting) se decide antes de `T-INF-08`. **ADR-0002** (lenguaje de workers) se decide tras el experimento de Sprint 1. |
| 4 | Proveedor LLM | **Un solo proveedor al inicio, con tope mensual bajo**, ampliable con datos de uso. Proveedor, clave y cifra exacta: pendientes de que los aporte el usuario. |
| 5 | Abogado dominicano | **Contratar ya**, antes de activar cualquier fuente sin licencia y antes de G5. Hasta entonces solo se automatiza DGCP (ODbL) tras verificación. |
| 6 | Equipo y calendario | **Baseline de 20–24 semanas con 2–3 personas.** Las 16 semanas quedan como escenario, no como compromiso. Velocidad real se mide en S1–S2. |
| 7 | Cobertura de fuentes | **7b.** Módulos con fuentes no verificadas se declaran **manuales** y publican «cobertura pendiente». Solo se automatiza lo que verifique `T-SRC-04…06`. |
| 8 | Histórico DGCP | **Últimos N años**, con N definido tras `T-SRC-01`. No se carga el histórico completo a ciegas. |
| 9 | Comparador, calculadora, vistas y capa `Cálculo` | **Fuera del MVP.** Comparador, calculadora V-05, vistas guardadas DM-06 y capa `Cálculo` (D-08) pasan a post-MVP. |
| 10 | Modelo de datos | **Aprobar DM-01** (`organizations` = tenant y empresa). **Renombrar `opportunity_evidence` → `evidence`** antes de ejecutar el SQL. |
| 11 | Revisión humana | **11a.** Todo evento no verificado al 100 % pasa por cola de revisión humana (puerta P0). Política aprobada; anotadores y revisores siguen pendientes de designación. |
| 12 | Herramientas de prueba | **Aprobar** gitleaks, `npm audit`, Dependabot, Playwright + axe, k6, OWASP ZAP y Lighthouse CI. Instalación fuera de OneDrive. |
| 13 | Supuestos de alcance | **Confirmados:** alertas solo in-app, sin facturación, una sola organización. |
| 14 | Seguridad operativa | **Sí:** MFA para admin, `.env.local` para secretos, primer commit tras revisión de secretos. Contacto del `User-Agent` pendiente de definir (SG-05). |

---

## 2. Alcance del MVP aprobado

**Corte vertical:** DGCP + Crédito Público.

Incluye: radar de eventos, proyectos y permisos con carga manual asistida, licitaciones, watchlist, alertas in-app y oportunidades con revisión humana.

**Excluido del MVP:** comparador, calculadora de inversión, búsquedas/vistas guardadas, capa `Cálculo`, alertas por correo, facturación, multi-tenant y exportación CSV.

---

## 3. Condiciones que siguen abiertas

Ninguna de estas condiciones impide cerrar G0, pero todas bloquean una parte de Sprint 1:

| Condición | Decisión | Responsable | Bloquea |
|---|---|---|---|
| Proyecto Supabase nuevo y credenciales | #2 | Usuario | SQL, RLS, `T-INF-01…03` |
| Proveedor LLM, clave y tope mensual | #4 | Usuario | `T-AI-01`, agentes |
| Abogado contratado | #5 | Usuario | Conectores distintos de DGCP, G5 |
| Nombres y dedicación del equipo | #6 | Usuario | Calendario y velocidad |
| Anotadores y revisores | #11 | Usuario | Golden sets, cola RF-F-11 |
| Contacto del `User-Agent` | #14 | Usuario | `T-ING-01` |
| Hosting (ADR-0005) | #3 | Usuario/A | `T-INF-08` |

---

## 4. Consecuencias asumidas

1. La aceptación del MVP será contra el Prompt Maestro, no contra una SRS inexistente.
2. Si la SRS llega y contradice un requisito, se reabre el alcance y se registra la decisión.
3. Los módulos B, C-03 y E no se presentan como «cubiertos»: se presentan como «cobertura manual / pendiente».
4. El calendario de 16 semanas no se promete a nadie.
5. Ningún conector se activa sin licencia o sin abogado.
6. Toda cifra de prueba (incluidos los 100 000 eventos) es dataset de prueba, no volumen real.

---

## 5. Trazabilidad

- Decisiones de entrada: `docs/sprint-0/G0-DECISIONES.md`
- Conciliación técnica: `docs/sprint-0/CONCILIACION-A-B.md`
- Bloqueos: `docs/sprint-0/BLOQUEOS.md`
- Estado de las ventanas: `docs/sprint-0/ESTADO-VENTANA-A.md`, `ESTADO-VENTANA-B.md`
