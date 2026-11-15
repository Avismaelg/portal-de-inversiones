# ESTADO — Ventana A

> Actualizar al final de **cada** turno. Es la fuente que lee el orquestador.
> No escribir aquí planes largos: solo estado. Los entregables van en sus archivos.

**Última actualización:** 2026-11-15 (Ronda 3, tras G0)
**Sprint:** 0 cerrado por G0 (`G0-ACTA.md`); Sprint 1 autorizado, con condiciones abiertas.
**Estado:** DECISIONES DE G0 APLICADAS A LOS DOCUMENTOS DE A. Nada ejecutado: ni SQL, ni instalaciones, ni commit.

## Hecho en este turno (Ronda 3)

- ADR: 0001, 0003, 0006, 0007 → ACEPTADO; 0004 → ACEPTADO condicionado a T-INF-01 y al Supabase nuevo; 0002 y 0005 → PENDIENTE. Solo estado y línea de resolución; contenido técnico intacto.
- DM-03 aplicado: `opportunity_evidence` → `evidence` en `schema-propuesto.sql`, `MODELO-DATOS.md`, `ARQUITECTURA-MVP.md` y `SISTEMA-IA.md` (tabla, índices, políticas RLS, GRANT, ALTER, comentarios, diagrama). `opportunity_id` y `evidence_opp_idx` se mantienen. Nota de cabecera G0 #10 añadida al SQL. DM-03 y DM-01 marcadas "Aprobado en G0 #10"; DM-06 "Fuera del MVP — G0 #9".
- `FUENTES-RD.md`: sección "Decisión G0 #7".
- `SEGURIDAD-Y-CUMPLIMIENTO.md`: sección "Decisiones G0 aplicadas".
- Comprobación: `grep`: `opportunity_evidence` solo queda como mención histórica (cabecera y 7.9 del SQL, fila DM-03 de MODELO-DATOS); en B-docs y PROMPT-MAESTRO no se toca; 26 `CREATE TABLE` (23 entidades + 3 particiones).

## NO verificado

- El SQL (incluida la renombración) sigue sin ejecutarse en ningún Postgres (B-007). Renombrar con `sed` no garantiza que no haya roto nada: hay que ejecutarlo.
- Todo lo de Supabase, fuentes bloqueadas, normas legales y Next 16 sigue como antes.
- Lo aprobado por G0 (abogado, herramientas, MFA, commit) **no está ejecutado**.

## Bloqueos (condiciones abiertas de G0 §3)

- Supabase nuevo y credenciales (B-003/G0 #2); proveedor LLM, clave y tope (B-011); abogado (B-009); equipo y dedicación (B-013); anotadores y revisores (B-015); contacto del `User-Agent` (SG-05); hosting (ADR-0005, B-012).

## Contradicción detectada en el acta (para el orquestador/usuario)

- El corte vertical del MVP (acta §2) es **DGCP + Crédito Público**, pero G0 #5 dice que **solo DGCP** se automatiza hasta contratar al abogado, y Crédito Público no tiene licencia explícita (FUENTES-RD F-03). Hasta decidir, A trata Crédito Público como **manual**. Opciones: (a) esperar al abogado para automatizarlo; (b) autorizar su automatización con riesgo asumido por el usuario; (c) cambiar el corte vertical. No se resuelve aquí.

## Decisiones propuestas pendientes

- Las de CONCILIACION §7 que G0 no cerró: DIS-02…DIS-08, criterio de "fuente autorizada", orden BCRD/Crédito Público, G2 con carga manual para B. Calendario: baseline 20–24 semanas con 2–3 personas aprobado; mi backlog (≈ 192,5 d) no se ha recalculado tras los recortes de G0 #9 (comparador, calculadora, vistas guardadas, CSV fuera): pendiente.

## Solicitudes a la Ventana B

- Aplicar en sus archivos el cambio `evidence` y el alcance de G0 (yo no toco `producto`, `ux`, `qa`). Respuesta pendiente a mi entrada de las 20:00.

## Solicitudes de cambio al contrato / alcance

- Ninguna.

## Próximo paso

1. Usuario: Supabase nuevo, proveedor LLM, abogado, equipo, anotadores, contacto del `User-Agent`.
2. A: recalcular `backlog-tecnico.md` con los recortes de G0 (T-AI-09 y T-WEB-12 salen del MVP; ya no hay vistas guardadas ni CSV) y definir N de histórico DGCP en T-SRC-01.
3. Ejecutar T-INF-01/02 cuando exista el proyecto Supabase.
