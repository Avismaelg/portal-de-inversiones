# Auditoría de entorno y repositorio — Sprint 0

**Fecha:** 2026-11-15
**Ejecutada por:** orquestador (verificación real de comandos, sin inferencias)
**Estado:** BORRADOR — la completan las ventanas A y B con lo que encuentren

---

## 1. Repositorio

| Dato | Valor |
|---|---|
| Ruta | `C:\Users\User\OneDrive\Escritorio\portal de inversiones` |
| Git | Inicializado, **sin commits** |
| Framework | Next.js **16.4.6** (App Router, TypeScript, Tailwind 4) |
| Estructura | `src/app`, `public`, `docs`, `supabase/migrations` (vacía) |
| Estado | Scaffold base + documentación. Sin código de producto. |

### Advertencia importante sobre Next.js 16

`AGENTS.md` (generado por Next) indica que esta versión tiene cambios de API y convenciones que **no** coinciden con el conocimiento previo del modelo. Antes de escribir código, ambas ventanas deben leer:

```
node_modules/next/dist/docs/
```

No asumir APIs de Next 13/14/15.

### Herencia retirada

Se archivó el scaffold anterior de "portafolio personal" (fuera del alcance de este producto) en:

```
C:\Users\User\portal-inversiones\_archive-portfolio-v0
```

No forma parte del proyecto. No reutilizar sin justificarlo.

---

## 2. Toolchain instalado (verificado)

| Herramienta | Versión | Estado |
|---|---|---|
| Node.js | 24.20.0 | OK |
| npm | 11.19.0 | OK |
| Git | 2.55.0 | OK |
| Python | 3.12.10 | OK |
| pip | 25.0.1 | OK |
| TypeScript | 5.x (devDependency) | OK |
| Vitest | 5.1.0 | Instalado, sin configurar |

**No instalado:** Supabase CLI, Docker, psql, pandoc, uv, pnpm, bun.

Implicaciones:

- Para aplicar migraciones se usará el MCP de Supabase o el SQL Editor del dashboard, no `supabase db push`.
- Para leer los .docx se puede usar `python-docx` (instalable con pip) o convertirlos a PDF/Markdown antes de subirlos.
- No hay entorno local de Postgres: las pruebas de base de datos se harán contra una rama/entorno de Supabase, no en local.

---

## 3. Dependencias del proyecto

Producción:

- `next@16.4.6`, `react@19.3.0`, `react-dom@19.3.0`
- `@supabase/supabase-js@2.119.0`, `@supabase/ssr@0.12.7`
- `zod@4.6.7`

Desarrollo:

- `eslint@9`, `eslint-config-next@16.4.6`, `tailwindcss@4.3.3`
- `@types/node@24`, `@types/react@19`, `@types/react-dom@19`
- `vitest@5.1.0`

**Regla:** no instalar nada más en Sprint 0. Cada dependencia nueva requiere justificación y aprobación (Regla 5 del Prompt Maestro).

---

## 4. Infraestructura y credenciales

| Recurso | Estado |
|---|---|
| Supabase (MCP) | Hay un proyecto vinculado: `ecmqmgpruxclmpnnpgzv` |
| Acceso a la base de datos | **Falla**: "Database is possibly not accessible at the moment" |
| `.env.local` | No existe |
| Repo GitHub | No verificado / no configurado |
| CI/CD | No configurado |
| Dominio / Cloudflare | No verificado |

**Bloqueo:** antes de usar Supabase hay que confirmar si `ecmqmgpruxclmpnnpgzv` es el proyecto correcto para este producto o si pertenece a otro proyecto de AviTech (posiblemente `avitech-ia-agencia`). No aplicar migraciones hasta confirmarlo.

---

## 5. Documentación de requisitos

| Documento | Estado |
|---|---|
| `AviTech_Investment_Intelligence_SRS_IEEE830.docx` | **NO ENCONTRADO** |
| `AviTech_Investment_Intelligence_Plan_Maestro.docx` | **NO ENCONTRADO** |
| `docs/prompts/PROMPT-MAESTRO.md` | Disponible (fuente actual) |
| `docs/requisitos/` | Vacío |

Búsqueda realizada en Desktop, Downloads, Documents, OneDrive y repo `avitech-ia-agencia` (profundidad 4). No hay coincidencias.

**Acción requerida:** el usuario debe colocar ambos .docx en `docs/requisitos/`. Mientras no existan, las ventanas no deben inventar requisitos; deben marcar `[PENDIENTE SRS]` y registrar el bloqueo.

---

## 6. Activos reutilizables de AviTech

Existe un proyecto previo en `C:\Users\User\avitech-ia-agencia` con:

- `docs/diseno/` con propuestas y maquetas de marca (A–I), sistema visual y archivos `.dc.html`.
- `docs/srs/` con scripts de generación de SRS.
- SRS IEEE-830 propio de la agencia (no de este producto).
- Stack Vite + Cloudflare Workers + Supabase.

Uso permitido en este proyecto: **referencia de marca y estilo**. No copiar código ni esquema de datos sin evaluarlo y documentarlo. La plataforma de inversión es un producto distinto.

---

## 7. Riesgos de entorno detectados

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Proyecto en OneDrive | Sincronización de `node_modules`/`.next`, conflictos, latencia | `node_modules` y `.next` son junctions a `C:\Users\User\.portal-deps` (fuera de OneDrive). No ejecutar `npm install` directamente en el proyecto: usar `tools\npm-install.ps1`. |
| Next.js 16 sin documentación leída | Código con APIs obsoletas | Leer `node_modules/next/dist/docs/` antes de codificar. |
| Sin Supabase CLI/Docker | No hay entorno local reproducible | Usar MCP/SQL Editor + migraciones versionadas en `supabase/migrations`. |
| Sin SRS/Plan Maestro | Requisitos incompletos | Bloqueo documentado; no inventar. |
| Sin `.env.local` | Nada conecta a servicios | Sprint 1, tras aprobación. |
| Sin commits iniciales | Sin línea base de cambios | Primer commit al aprobar Sprint 0. |

---

## 8. Conclusión

El entorno **puede** soportar el Sprint 0 (documentación y diseño) hoy mismo. **No** está listo para Sprint 1 hasta que:

1. Se suban SRS y Plan Maestro.
2. Se confirme el proyecto Supabase correcto y se cree `.env.local`.
3. Se aprueben arquitectura, modelo de datos y backlog.
4. Se haga el commit inicial.
