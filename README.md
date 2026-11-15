# AviTech Investment Intelligence

Plataforma SaaS de inteligencia económica, financiera y de oportunidades de negocio para República Dominicana, con expansión internacional.

> **Estado:** Sprint 0 — auditoría, requisitos y diseño. No hay código de producto todavía.

- **Organización:** AviTech Solutions Group
- **Versión:** 0.1.0
- **Repo:** `C:\Users\User\OneDrive\Escritorio\portal de inversiones`

---

## Empezar

```powershell
npm run dev      # http://localhost:3000
npm run lint
npm run build
```

Para instalar dependencias, **no uses `npm install` directo**:

```powershell
powershell -ExecutionPolicy Bypass -File tools\npm-install.ps1
```

Motivo: el proyecto está en OneDrive y `node_modules` es un junction a `C:\Users\User\.portal-deps`. Un `npm install` normal borra el junction y sincroniza cientos de MB a la nube.

---

## Cómo trabajan las 2 ventanas de Claude

Los prompts están listos para copiar y pegar:

| Ventana | Prompt | Responsabilidad |
|---|---|---|
| A | `docs/sprint-0/PROMPT-VENTANA-A.md` | Arquitectura, datos, fuentes, IA, seguridad |
| B | `docs/sprint-0/PROMPT-VENTANA-B.md` | Producto, requisitos, UX, QA |

Flujo recomendado:

1. **Coloca la SRS y el Plan Maestro** en `docs/requisitos/` (ver `B-001`/`B-002` en `docs/sprint-0/BLOQUEOS.md`). Sin ellos, las ventanas trabajarán con vacíos marcados.
2. Abre cada ventana en la carpeta del repo y pega su prompt.
3. Cada ventana responderá con un plan y pedirá `ADELANTE`. Revísalo antes de aprobar.
4. Al terminar, cada una entrega un bloque `ESTADO`. Pásalo a la otra ventana solo si necesita coordinación.
5. Tú apruebas el Sprint 0. **Nada de Sprint 1 sin esa aprobación.**

Reglas completas: `docs/CONTRATO-TRABAJO.md`.

---

## Documentación

```
docs/
├── prompts/PROMPT-MAESTRO.md        # requisitos y reglas del producto
├── CONTRATO-TRABAJO.md              # reparto y protocolo entre ventanas
├── requisitos/                      # SRS + Plan Maestro (los aporta el usuario)
├── sprint-0/
│   ├── AUDITORIA-ENTORNO.md
│   ├── PROMPT-VENTANA-A.md
│   ├── PROMPT-VENTANA-B.md
│   └── BLOQUEOS.md
├── arquitectura/                    # Ventana A
├── datos/                           # Ventana A
├── fuentes/                         # Ventana A
├── ia/                              # Ventana A
├── seguridad/                       # Ventana A
├── producto/                        # Ventana B
├── ux/                              # Ventana B
├── qa/                              # Ventana B
└── adr/                             # decisiones arquitectónicas
```

---

## Stack

- Next.js 16.4.6 (App Router) + TypeScript + Tailwind CSS 4
- Supabase (PostgreSQL, Auth, Storage, RLS)
- Python 3.12 para ETL/ELT
- Vitest; Playwright a evaluar en Sprint 0
- Arquitectura objetivo: monolito modular + workers asíncronos (sin microservicios en el MVP)

## Principios

1. Nada se declara funcionando sin prueba ejecutada.
2. Ningún dato sin fuente; ningún requisito inventado.
3. Dato confirmado, análisis IA e inferencia comercial se muestran distintos.
4. Sin secretos en el repo.
5. El proyecto queda ejecutable al final de cada iteración.

## Advertencia Next.js 16

Esta versión tiene cambios incompatibles con versiones anteriores. Antes de escribir código, leer `node_modules/next/dist/docs/` (ver `AGENTS.md`).
