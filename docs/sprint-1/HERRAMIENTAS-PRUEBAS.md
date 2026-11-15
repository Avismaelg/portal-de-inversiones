# Herramientas de prueba — estado real

Aprobadas en G0 #12. Esta tabla distingue **aprobado**, **instalado**, **configurado** y **ejecutado**.

| Herramienta | Estado | Cómo se ejecuta | Evidencia |
|---|---|---|---|
| Vitest 5.1.0 | Instalado, configurado y ejecutado | `npm test`, `npm run test:coverage` | 1/1 prueba; 100% sobre 1 archivo |
| Testing Library + jsdom | Instalado, configurado y ejecutado | Incluido en Vitest | React 19.3 |
| Playwright 1.65.1 | Instalado, configurado y ejecutado | `npm run test:e2e` | Chromium 159; 1/1 prueba |
| axe-core (Playwright) | Instalado, configurado y ejecutado | Incluido en el E2E | 0 violaciones críticas |
| gitleaks 8.30.1 | Instalado y ejecutado en local; job en CI | `npm run secret:scan` | 5 commits, 0 fugas |
| `npm audit` | Ejecutado | `npm run audit` | 0 altas/críticas; 7 moderadas |
| Dependabot | Configurado, no ejecutado | `.github/dependabot.yml` | Requiere remoto |
| k6 | Pendiente | — | Sin API estable todavía |
| OWASP ZAP | Pendiente | — | Sin app desplegada ni autorización |
| Lighthouse CI | Pendiente | — | Sin UI real y estable |

## gitleaks en local

El binario se instaló de forma portátil fuera de OneDrive:

```text
C:\Users\User\.portal-tools\gitleaks\gitleaks.exe
```

Versión: **8.30.1**. El wrapper del repo lo resuelve sin depender del `PATH`:

```powershell
npm run secret:scan
```

Equivale a:

```powershell
gitleaks detect --source . --verbose --redact --no-banner
```

En CI, el job `secrets` usa `gitleaks/gitleaks-action@v2` con `fetch-depth: 0`. En repos privados de una organización puede requerir `GITLEAKS_LICENSE`; el workflow deja la línea comentada.

## Vulnerabilidades actuales

`npm install` reportó **7 vulnerabilidades moderadas**. Cadena exacta:

```text
minimatch@10.2.6
  └─ @typescript-eslint/typescript-estree@8.72.2
       └─ typescript-eslint@8.72.2
            └─ eslint-config-next@16.4.6
```

No hay corrección compatible: `minimatch@10.2.6` es la última 10.x, `typescript-eslint@8.72.2` es la última publicada y la corrección está en `minimatch@11` (major). `npm audit fix --force` rompería el rango de dependencia; **no se ejecuta**. Es tooling de lint, no código de producción. El gate de CI es `npm audit --audit-level=high`, que pasa.

Revisar de nuevo con:

```powershell
npm audit
```

## Herramientas pendientes

- **k6:** se instala cuando exista una API estable que medir.
- **OWASP ZAP:** DAST contra una app desplegada; requiere autorización y entorno de staging.
- **Lighthouse CI:** se activa cuando la UI real esté estable y haya presupuesto de rendimiento.

## Regla

Una herramienta solo cuenta como «ejecutada» si hay salida verificable en `PLAN-SPRINT-1.md` §5. Aprobada, instalada y configurada no son sinónimos de ejecutada.
