# Riesgos de dependencias — registro de excepciones

Puerta de CI: `node tools/audit-check.mjs` (job «npm audit»).

- **Producción** (`npm audit --omit=dev`): cualquier aviso alto o crítico **bloquea**.
- **Desarrollo**: bloquea todo aviso alto/crítico que no esté en la lista de excepciones; una excepción vencida también bloquea.

## Estado verificado (2026-11-17, rama `sprint/estabilizacion`, base `e4f96f3`)

| Ámbito | Resultado |
|---|---|
| Producción | 0 vulnerabilidades |
| Desarrollo | 19 paquetes afectados (13 altos, 6 moderados) derivados de **2 avisos raíz** |

El CI de `main` falla desde `7fe8c0f` (2026-11-17) solo por el job `npm audit (high)`; lint, tipos, unitarias, build, E2E y gitleaks pasan. El aviso de `picomatch` se publicó después del último commit en verde.

## Excepciones vigentes

| Aviso | Paquete | Severidad | Alcance | Explotabilidad | Corrección | Revisar antes de | Estado |
|---|---|---|---|---|---|---|---|
| [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) | `picomatch` ≤4.0.7 (vía vite, vitest, tinyglobby, fdir, micromatch, fast-glob, eslint-config-next, typescript-eslint) | Alta (ReDoS) | Solo herramientas de desarrollo y CI. No forma parte del bundle ni del servidor en ejecución. | Baja: requiere que un atacante controle patrones glob que procesan las herramientas locales/CI. Los patrones vienen de archivos de configuración del propio repo. | **No existe versión corregida** (última publicada: 4.0.7). `npm audit fix --force` propone bajar `vitest` a 3.1.4 y `eslint-config-next` a 14.2.35: rechazado (regresión mayor). | 2026-12-17 | **Pendiente de aceptación formal** por el responsable de seguridad |

## Avisos moderados (no bloquean la puerta «alta»)

| Aviso | Paquete | Alcance | Acción |
|---|---|---|---|
| [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) | `minimatch` 7.0.0–11.0.0 (vía `@typescript-eslint/typescript-estree`) | Solo desarrollo (lint) | Corrección en 11.0.1+, cambio mayor respecto a lo que pide `typescript-eslint`. Esperar a que `typescript-eslint` lo adopte; no forzar `overrides`. |

## Procedimiento de revisión

1. Ejecutar `npm view picomatch versions` y `npm audit`.
2. Si hay versión corregida: actualizar con `tools\npm-install.ps1` y retirar la excepción.
3. Si no la hay al vencer: renovar la fecha **solo** con aprobación del responsable y anotar la decisión aquí.
