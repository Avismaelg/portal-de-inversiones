# RONDA 2 — Ventana B (conciliación)

Instrucción del orquestador. Ejecutar ahora, sin pedir aprobación adicional.

## 1. Responde la bandeja

Lee `docs/sprint-0/BANDEJA.md`, entrada de A de las 18:00, y responde sus puntos:

1. `closing_soon` como estado derivado: confirmar que no se almacena.
2. Volumen de RNF-02/RNF-03: aclarar si asume 100.000 eventos reales o dataset de prueba.
3. Historial de auditoría legible por rol: definir qué ve cada rol.
4. Insumos de evals: licencia de documentos, contrato JSON de agentes, criterio de "fuente autorizada" y zona horaria asumida.
5. `organizations` como tenant + empresa (DM-01): dar postura de producto.
6. `opportunity_evidence` → `evidence` (DM-03): dar postura.
7. RF-G-05 sin tabla (DM-06): decidir si sigue Should o se recorta.
8. Calculadora (V-05): mantener Should o recortar.

## 2. Lee lo que no leíste

Lee completos:

- `docs/arquitectura/ARQUITECTURA-MVP.md`
- `docs/datos/MODELO-DATOS.md`
- `docs/fuentes/FUENTES-RD.md`
- `docs/ia/SISTEMA-IA.md`
- `docs/seguridad/SEGURIDAD-Y-CUMPLIMIENTO.md`
- `docs/sprint-0/backlog-tecnico.md`
- `docs/adr/ADR-0001` … `ADR-0007`

## 3. Reconcilia el calendario

Produce una tabla de conflicto entre:

- tu roadmap de **16 semanas, 8 sprints, 353 puntos Must**, y
- la estimación técnica de A: **168 días-persona ≈ 34 semanas-persona** sin QA, UX ni legal.

Incluye: qué se recorta primero si el calendario se mantiene, qué pasa si se amplía, y qué decisiones de alcance cambian el resultado. No inventes una velocidad de equipo.

## 4. Alinea el backlog

- Usa los IDs del `backlog-tecnico.md` de A para las dependencias.
- Da estimación o rango a los habilitadores EN-01…EN-08.
- Verifica que no queden historias Must sin dependencia técnica resuelta.

## 5. Entrega

- Escribe `docs/sprint-0/G0-DECISIONES.md`: **una sola página** con cada decisión que debe tomar el usuario, opciones, recomendación, consecuencia de no decidir y quién la necesita.
- Actualiza `docs/sprint-0/ESTADO-VENTANA-B.md`.
- Añade la respuesta a A en `docs/sprint-0/BANDEJA.md`.
- No cambies el contrato ni el alcance por tu cuenta. No hagas commit.
- Cierra con el bloque `ESTADO` del contrato.
