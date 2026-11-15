# ESTADO — Ventana A

> Actualizar al final de **cada** turno. Es la fuente que lee el orquestador.
> No escribir aquí planes largos: solo estado. Los entregables van en sus archivos.

**Última actualización:** 2026-11-15 (Ronda 2)
**Sprint:** 0
**Estado:** ENTREGABLES REDACTADOS + CONCILIACIÓN CON B. Todo es propuesta; nada ejecutado ni validado.

## Hecho en este turno (Ronda 2)

- Leídos completos los 6 documentos de B pedidos (PERSONAS, INVENTARIO, SISTEMA-DISENO, FICHAS-CLAVE, ESTRATEGIA-PRUEBAS, backlog-producto). De `REQUISITOS-Y-TRAZABILIDAD.md` solo leí 428 de 563 líneas (anexos sin leer).
- Respondidos los 8 puntos de B y los 3 puntos de §4 de RONDA2-A (`CONCILIACION-A-B.md`).
- 14 discrepancias documentadas (DIS-01…DIS-14); DIS-01 resuelta adoptando los criterios de B en `SISTEMA-IA.md`.
- Tabla de conflicto de calendario (168,5 d → 192,5 d con habilitadores frente a 16 semanas/353 pts Must).
- SQL corregido (a mano, sin ejecutar): RLS y REVOKE en las 3 particiones de `audit_logs`; `users_auth_fk` obligatorio y fail-closed; `timezone_assumed`; función `create_audit_partition`.
- `grep`: 26 `CREATE TABLE` (23 entidades + 3 particiones), 27 `ENABLE ROW LEVEL SECURITY`.

## NO verificado

- El SQL sigue sin ejecutarse en ningún Postgres (B-007). Los cambios de esta ronda tampoco.
- Supabase, fuentes bloqueadas (SIMV, BVRD, Hacienda, CNE, datos.gob.do), normas legales de memoria, Next 16: igual que el turno anterior.
- El factor 0,53 d/punto es ilustrativo (cociente de dos cifras sin calibrar), no una medición.
- B no ha confirmado mi lectura de RNF-02/03 (dataset de prueba) ni los 8 puntos de la bandeja.

## Bloqueos

- B-001…B-012 (míos y previos) siguen abiertos; B-013…B-015 los añadió B y los comparto (equipo, herramientas de prueba, anotadores).

## Decisiones propuestas (requieren aprobación del usuario)

- Previas: ADR-0001…0007; DM-01, DM-03; FD-01…05; SG-01…05.
- Nuevas (CONCILIACION §7): equipo y calendario; DIS-02, 03, 04, 05, 06, 07, 08; criterio de "fuente autorizada"; orden BCRD/Crédito Público; volumen del dataset de prueba; G2 con carga manual para el Módulo B.

## Solicitudes a la Ventana B

- Confirmar que RNF-02/03 son dataset de prueba y considerar ≈ 1,2 M filas de licitaciones/contratos (DIS-11).
- Corregir la inconsistencia interna sobre quién fusiona duplicados (PERSONAS §3.2 vs INVENTARIO AC-08-04) y reformular US-G-03/AC-10-03 (DIS-08).
- Mover US-A-02/A-11 a S4–S5 y/o invertir BCRD↔Crédito Público (DIS-12, DIS-14); alinear G2 (DIS-13).

## Solicitudes de cambio al contrato / alcance

- Ninguna. Observación: `CONCILIACION-A-B.md` no figura en la lista de rutas de A del contrato; se creó por orden del orquestador (RONDA2-A §5).

## Próximo paso

1. El usuario decide equipo/calendario y las decisiones de CONCILIACION §7.
2. Resolver B-003 (Supabase), T-PRE-05 (abogado) y ejecutar T-INF-01/02 para validar el SQL.
3. Verificar fuentes bloqueadas desde un navegador real (T-SRC-01…09).
