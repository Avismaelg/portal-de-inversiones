# Contrato de trabajo — 2 ventanas de Claude en paralelo

Este archivo es la **constitución operativa** del proyecto. Las dos ventanas de Claude deben leerlo antes de actuar y respetarlo. Si algo aquí choca con el Prompt Maestro, gana el Prompt Maestro y se reporta la contradicción.

---

## 1. Contexto

- **Producto:** AviTech Investment Intelligence (plataforma SaaS de inteligencia económica y oportunidades).
- **Repo:** `C:\Users\User\OneDrive\Escritorio\portal de inversiones`
- **Fase actual:** Sprint 0 — auditoría, validación de requisitos y diseño arquitectónico.
- **Prohibido en Sprint 0:** escribir código de producto, crear tablas en Supabase, instalar dependencias, implementar conectores o agentes. Solo análisis y documentos.
- **Fuente de requisitos:** `docs/prompts/PROMPT-MAESTRO.md` + los .docx de `docs/requisitos/`.
- **Si un .docx no está:** no inventar su contenido. Registrar el bloqueo en `docs/sprint-0/BLOQUEOS.md` y continuar con lo que no dependa de él.

---

## 2. Reparto de responsabilidades

### Ventana A — Arquitectura, datos, fuentes e IA

Puede crear/editar **solo**:

```
docs/arquitectura/**
docs/datos/**
docs/fuentes/**
docs/ia/**
docs/seguridad/**
docs/adr/**
docs/sprint-0/backlog-tecnico.md
docs/sprint-0/BLOQUEOS.md              (solo añadir filas)
docs/sprint-0/BANDEJA.md               (solo añadir entradas o responder)
docs/sprint-0/ESTADO-VENTANA-A.md      (snapshot de estado de A)
```

Entregables:

1. `docs/arquitectura/ARQUITECTURA-MVP.md` — monolito modular + workers, límites de módulos, diagramas Mermaid, decisiones y alternativas.
2. `docs/datos/MODELO-DATOS.md` + `docs/datos/schema-propuesto.sql` — las 23 entidades del Prompt Maestro, PK/FK, índices, RLS, deduplicación, retención, auditoría.
3. `docs/fuentes/FUENTES-RD.md` — registro por fuente: API oficial (sí/no/desconocido), términos de uso, formato, frecuencia, límites, legalidad, estrategia (API/RSS/CSV/manual) y riesgo. **Verificar, no asumir.**
4. `docs/ia/SISTEMA-IA.md` — 6 agentes, contratos JSON, validación de esquemas, evals, prompt injection, control de costos, revisión humana.
5. `docs/seguridad/SEGURIDAD-Y-CUMPLIMIENTO.md` — modelo de amenazas, controles, obligaciones legales/regulatorias de RD (marcar lo que requiere abogado).
6. `docs/sprint-0/backlog-tecnico.md` — tareas con estimación, dependencias y riesgos.
7. ADRs de las decisiones irreversibles.

### Ventana B — Producto, UX, requisitos y QA

Puede crear/editar **solo**:

```
docs/producto/**
docs/ux/**
docs/qa/**
docs/adr/**                        (solo ADRs de producto/UX)
docs/sprint-0/backlog-producto.md
docs/sprint-0/BLOQUEOS.md              (solo añadir filas)
docs/sprint-0/BANDEJA.md               (solo añadir entradas o responder)
docs/sprint-0/ESTADO-VENTANA-B.md      (snapshot de estado de B)
```

Entregables:

1. `docs/producto/REQUISITOS-Y-TRAZABILIDAD.md` — matriz requisito → módulo → pantalla → prueba. Marcar `[PENDIENTE SRS]` en lo que no se pueda confirmar.
2. `docs/producto/PERSONAS-Y-CASOS-DE-USO.md` — usuarios, jobs-to-be-done, journeys, permisos por rol.
3. `docs/ux/INVENTARIO-PANTALLAS.md` — las 14 pantallas: propósito, datos, acciones, estados vacío/carga/error, permisos, responsive.
4. `docs/ux/SISTEMA-DISENO.md` — tokens, tipografía, color claro/oscuro, accesibilidad AA, componentes base, marca AviTech.
5. `docs/ux/FICHAS-CLAVE.md` — especificación de evento, oportunidad, proyecto/permiso, licitación, instrumento. Debe distinguir dato confirmado vs análisis IA vs inferencia.
6. `docs/qa/ESTRATEGIA-PRUEBAS.md` — unitarias, integración, E2E, seguridad, carga, calidad de datos; criterios de aceptación del MVP.
7. `docs/sprint-0/backlog-producto.md` — historias priorizadas MoSCoW + roadmap 16 semanas.

---

## 3. Archivos compartidos y congelados

Estos archivos son **solo lectura** para ambas ventanas. Cambiarlos requiere aprobación del usuario:

```
docs/prompts/PROMPT-MAESTRO.md
docs/CONTRATO-TRABAJO.md
docs/requisitos/**
package.json
```

Si una ventana cree que debe cambiar algo de esta lista, **no lo edita**: escribe una `SOLICITUD DE CAMBIO` en su entrega con: qué, por qué, impacto y alternativa.

---

## 4. Protocolo de colaboración

1. **Orden de lectura obligatorio** al empezar:
   1. `docs/prompts/PROMPT-MAESTRO.md`
   2. `docs/CONTRATO-TRABAJO.md`
   3. `docs/sprint-0/AUDITORIA-ENTORNO.md`
   4. `AGENTS.md`
   5. Los .docx de `docs/requisitos/` si existen.
2. **Confirmación previa:** antes de producir entregables, escribe 10 líneas con lo que entendiste, lo que falta y tu plan. Si hay contradicción con el contrato, para y repórtala.
3. **No pisar a la otra ventana:** nunca editar archivos fuera de tus carpetas. Nunca borrar archivos.
4. **Sin código en Sprint 0.** Si crees que necesitas código para validar algo, propón un experimento y pide aprobación.
5. **Sin datos inventados.** Todo dato debe llevar fuente o `[PENDIENTE]`. Toda afirmación técnica debe llevar evidencia (comando, archivo, URL).
6. **Cierre de turno:** termina siempre con el bloque `ESTADO` (plantilla abajo). El usuario lo copiará a la otra ventana si hace falta.

### Plantilla ESTADO

```
ESTADO — Ventana [A|B] — [fecha]
Hecho:
- ...
Archivos creados/modificados:
- ...
Decisiones tomadas:
- ...
Bloqueos:
- ...
Solicitudes de cambio al contrato:
- ...
Siguiente paso propuesto:
- ...
```

---

### Buzón compartido y estado (obligatorio)

Las dos ventanas comparten el repo, así que **no dependen del usuario para hablarse**:

- `docs/sprint-0/BANDEJA.md` — mensajes entre ventanas. Se lee al empezar cada turno y se añade al final. Nunca se edita una entrada ajena.
- `docs/sprint-0/ESTADO-VENTANA-A.md` y `ESTADO-VENTANA-B.md` — snapshot del estado de cada ventana. Se **reescribe** al final de cada turno (no es un log).

Si necesitas un dato, una validación o una decisión de la otra ventana, escríbelo en la bandeja y sigue con lo que no dependa de eso. No esperes bloqueado.

---

## 5. Reglas de evidencia

- Una API "existe" solo si se comprobó su documentación oficial en esta sesión; si no se pudo comprobar, se marca `DESCONOCIDO — verificar`.
- Un requisito "está cubierto" solo si existe una historia con criterios de aceptación y una prueba planificada.
- Un objetivo no funcional solo se declara cumplido con medición. En Sprint 0 se definen métricas y método de medición, no resultados.
- Prohibido decir "listo", "funciona" o "integrado" sin prueba ejecutada.

---

## 6. Definition of Done — Sprint 0

Sprint 0 termina cuando:

- [ ] Existe la auditoría de entorno y repositorio.
- [ ] SRS y Plan Maestro leídos, o bloqueo documentado con solicitud explícita.
- [ ] Arquitectura MVP aprobada con ADRs.
- [ ] Modelo de datos propuesto, con RLS y deduplicación.
- [ ] Registro de fuentes con verificación de legalidad/API.
- [ ] Diseño del sistema de IA con esquemas y evals.
- [ ] Seguridad y obligaciones regulatorias identificadas.
- [ ] Backlog técnico y de producto priorizado, con dependencias.
- [ ] Matriz de trazabilidad inicial.
- [ ] Inventario de pantallas y sistema de diseño.
- [ ] Riesgos y supuestos documentados.
- [ ] Aprobación explícita del usuario para pasar a Sprint 1.

**Nada de Sprint 1 se implementa antes de esa aprobación.**

---

## 7. División de la verdad

- **Requisitos funcionales:** los define la SRS. Si no está, el Prompt Maestro es la única fuente y toda ambigüedad se marca.
- **Arquitectura:** la propone Ventana A; la valida el usuario.
- **UX y alcance de producto:** los propone Ventana B; los valida el usuario.
- **Contradicciones:** las resuelve el usuario, no las ventanas entre sí.
